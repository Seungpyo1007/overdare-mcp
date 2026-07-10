/**
 * Standalone probe: verify the MCP can reach OVERDARE Studio and inspect the
 * real RPC response shapes (used to confirm/refine tool schemas).
 *
 *   npm run build && npm run probe
 *   npm run probe -- instance.read '{"path":"Workspace.Baseplate"}'
 */

import { StudioRpcClient } from "./rpcClient.js";

async function main() {
  const client = new StudioRpcClient();
  console.log(`Probing ${client.endpoint} ...\n`);

  const [method, rawParams] = process.argv.slice(2);

  if (method) {
    const params = rawParams ? JSON.parse(rawParams) : {};
    const result = await client.call(method, params);
    console.log(`${method} =>\n`, JSON.stringify(result, null, 2));
    return;
  }

  // Default smoke test.
  const reachable = await client.ping();
  console.log(`Studio reachable: ${reachable ? "YES ✅" : "NO ❌"}`);
  if (!reachable) {
    console.log(
      "\nOpen OVERDARE Studio with a project, then re-run. If it still fails,\n" +
        "the RPC port differs — set STUDIO_RPC_PORT to match.",
    );
    process.exit(reachable ? 0 : 2);
  }

  const tree = await client.call("level.browse", { depth: 2 });
  console.log("\nlevel.browse(depth=2) =>\n", JSON.stringify(tree, null, 2));
}

main().catch((err) => {
  console.error("Probe failed:", err);
  process.exit(1);
});
