#!/usr/bin/env node
/**
 * Overdare MCP — entry point.
 *
 * Exposes OVERDARE Studio's local RPC (localhost:13377/rpc) as MCP tools over
 * stdio. Like unity-mcp's connector, this process just bridges to the local
 * server that Studio already hosts; Studio must be running with a project open.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StudioRpcClient, loadRpcConfig } from "./rpcClient.js";
import { registerTools } from "./tools.js";
import { INSTRUCTIONS } from "./instructions.js";

async function main() {
  const config = loadRpcConfig();
  const client = new StudioRpcClient(config);

  const server = new McpServer(
    {
      name: "overdare-mcp",
      version: "0.1.0",
    },
    { instructions: INSTRUCTIONS },
  );

  registerTools(server, client);

  // stderr is safe for logs (stdout is the MCP transport).
  console.error(
    `[overdare-mcp] bridging Studio RPC at ${client.endpoint} (set STUDIO_HOST/STUDIO_PORT to override)`,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[overdare-mcp] ready (stdio). Open OVERDARE Studio to serve requests.");
}

main().catch((err) => {
  console.error("[overdare-mcp] fatal:", err);
  process.exit(1);
});
