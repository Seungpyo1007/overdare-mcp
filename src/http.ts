#!/usr/bin/env node
/**
 * Overdare MCP — standalone HTTP server (unity-mcp style).
 *
 * Runs as a long-lived background process exposing the Streamable HTTP MCP
 * transport at  http://<host>:<port>/mcp . MCP clients (Claude Code, Cursor,
 * Claude Desktop) connect by URL — no per-session stdio spawn. Multiple
 * clients can connect concurrently; each gets its own MCP session.
 *
 *   node dist/http.js                 # start on 0.0.0.0:8080
 *   MCP_PORT=9000 node dist/http.js   # custom port
 *
 * Bridges to OVERDARE Studio's local RPC (127.0.0.1:13377) like the stdio
 * variant — Studio must be running with a project open.
 */

import { randomUUID } from "node:crypto";
import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StudioRpcClient, loadRpcConfig } from "./rpcClient.js";
import { registerTools } from "./tools.js";
import { INSTRUCTIONS } from "./instructions.js";

const PORT = Number(process.env.MCP_PORT ?? 8080);
// Bind to loopback only — this server controls the local Studio (and can read
// the Hub token). Do NOT expose to the network unless you know what you're doing.
const HOST = process.env.MCP_HOST ?? "127.0.0.1";

const rpcConfig = loadRpcConfig();

/** Build a fresh MCP server (one per client session). */
function createServer(): McpServer {
  const server = new McpServer(
    { name: "overdare-mcp", version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, new StudioRpcClient(rpcConfig));
  return server;
}

const app = express();
app.use(express.json({ limit: "16mb" }));

// One transport per MCP session id.
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Health check (handy for "is the server up?").
app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "overdare-mcp", sessions: Object.keys(transports).length });
});

/*
 * No-op OAuth.
 * This is a local, loopback-only server with no real auth, but GUI MCP clients
 * (editor panels, desktop apps) probe the OAuth discovery endpoints and refuse
 * to connect — or crash parsing Express's HTML 404 — when they're missing. So
 * we advertise an authorization server and auto-grant: register → authorize
 * (issues a code immediately) → token (issues a token). /mcp accepts any token.
 */
const ISSUER = `http://127.0.0.1:${PORT}`;

const protectedResourceMetadata = (_req: Request, res: Response) =>
  res.json({ resource: `${ISSUER}/mcp`, authorization_servers: [ISSUER] });
app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceMetadata);

const authServerMetadata = (_req: Request, res: Response) =>
  res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    registration_endpoint: `${ISSUER}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
  });
app.get("/.well-known/oauth-authorization-server", authServerMetadata);
app.get("/.well-known/oauth-authorization-server/mcp", authServerMetadata);

app.post("/register", (req: Request, res: Response) => {
  res.status(201).json({
    client_id: "overdare-local",
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: (req.body && req.body.redirect_uris) || [],
  });
});

app.get("/authorize", (req: Request, res: Response) => {
  const redirectUri = req.query.redirect_uri as string | undefined;
  if (!redirectUri) {
    res.status(400).send("missing redirect_uri");
    return;
  }
  const u = new URL(redirectUri);
  u.searchParams.set("code", "overdare-local-code");
  if (req.query.state) u.searchParams.set("state", String(req.query.state));
  res.redirect(u.toString());
});

app.post("/token", (_req: Request, res: Response) => {
  res.json({
    access_token: "overdare-local-token",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "overdare-local-refresh",
    scope: "",
  });
});

// Main MCP endpoint — POST carries JSON-RPC messages.
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports[sessionId] : undefined;

  if (!transport) {
    if (sessionId || !isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session; send an initialize request first." },
        id: null,
      });
      return;
    }
    // New session: create transport + server and wire them up.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport as StreamableHTTPServerTransport;
      },
    });
    transport.onclose = () => {
      if (transport?.sessionId) delete transports[transport.sessionId];
    };
    await createServer().connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

// GET = server-to-client stream (SSE); DELETE = end session.
const sessionRoute = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports[sessionId] : undefined;
  if (!transport) {
    res.status(400).send("Invalid or missing session id");
    return;
  }
  await transport.handleRequest(req, res);
};
app.get("/mcp", sessionRoute);
app.delete("/mcp", sessionRoute);

// JSON (never HTML) for anything unmatched — OAuth probers choke on HTML.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found" });
});

app.listen(PORT, HOST, () => {
  console.error(`[overdare-mcp] HTTP MCP server on http://${HOST}:${PORT}/mcp`);
  console.error(
    `[overdare-mcp] bridging Studio RPC at tcp://${rpcConfig.host}:${rpcConfig.port} — open OVERDARE Studio to serve requests.`,
  );
});
