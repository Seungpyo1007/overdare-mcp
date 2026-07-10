/**
 * Smoke test: act as an MCP client over stdio, connect to our own server,
 * list the tools, and make one live call (overdare_browse). This is exactly
 * what Claude / Cursor do when they connect.
 *
 *   npm run build && node dist/mcptest.js
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
  });
  const client = new Client({ name: "overdare-mcp-test", version: "0.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`Connected. ${tools.length} tools exposed:`);
  for (const t of tools) console.log(`  - ${t.name}`);

  console.log("\nCalling overdare_browse ...");
  const res = await client.callTool({ name: "overdare_browse", arguments: {} });
  const text = (res.content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  console.log(text.slice(0, 400) + (text.length > 400 ? "\n..." : ""));

  await client.close();
}

main().catch((err) => {
  console.error("MCP test failed:", err);
  process.exit(1);
});
