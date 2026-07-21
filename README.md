# Overdare MCP

An [MCP](https://modelcontextprotocol.io) server that lets AI agents (Claude
Code / Claude Desktop) drive **OVERDARE Studio** — browse the DataModel, create
and edit instances, write Luau scripts, and start playtests.

## How it works

OVERDARE Studio already hosts a local JSON-RPC server (the same one its built-in
"diligent" agent uses). This MCP server is a thin bridge to it — much like
`unity-mcp`'s connector, except **Studio hosts the local server itself**, so
there's no plugin to install.

```
Claude  ──stdio──▶  overdare-mcp  ──HTTP POST──▶  Studio RPC (localhost:13377/rpc)
                                                      └─ OVERDARE Studio (must be running)
```

> Studio must be open with a project for tools to work. If Studio isn't running,
> tools return a clear "cannot reach Studio" error instead of hanging.

## Setup

```bash
npm install
npm run build
```

Verify the connection (open OVERDARE Studio first):

```bash
npm run probe                                   # smoke test + level.browse
npm run probe -- instance.read '{"path":"Workspace.Baseplate"}'   # inspect any method
```

## Register with Claude Code

Add to `.mcp.json` in your project (an example is included in this repo):

```json
{
  "mcpServers": {
    "overdare": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/overdare-mcp/dist/index.js"]
    }
  }
}
```

For **Claude Desktop**, add the same block under `mcpServers` in
`claude_desktop_config.json`.

### Configuration (env vars)

| Var | Default | Purpose |
| --- | --- | --- |
| `STUDIO_RPC_HOST` | `localhost` | Studio RPC host |
| `STUDIO_RPC_PORT` | `13377` | Studio RPC port |
| `STUDIO_RPC_TIMEOUT_MS` | `30000` | Per-call timeout |

## Tools

| Tool | RPC method | Purpose |
| --- | --- | --- |
| `overdare_level_browse` | `level.browse` | Browse the DataModel tree |
| `overdare_level_save` | `level.save.file` | Save the project |
| `overdare_level_apply` | `level.apply` | Apply a batch change set (advanced) |
| `overdare_level_publish` | `level.publish` | Publish to the OVERDARE Hub |
| `overdare_instance_read` | `instance.read` | Read one instance's properties |
| `overdare_instance_upsert` | `instance.upsert` | Create / update an instance |
| `overdare_instance_move` | `instance.move` | Reparent an instance |
| `overdare_instance_delete` | `instance.delete` | Delete an instance |
| `overdare_script_read` | `script.read` | Read Luau source |
| `overdare_script_add` | `script.add` | Create a script |
| `overdare_script_edit` | `script.edit` | Replace script source |
| `overdare_script_delete` | `script.delete` | Delete a script |
| `overdare_script_grep` | `script.grep` | Regex search across scripts |
| `overdare_game_play` | `game.play` | Start a playtest |
| `overdare_game_stop` | `game.stop` | Stop the playtest |
| `overdare_game_screenshot` | `game.screenshot` | Capture the viewport |
| `overdare_rpc` | _any_ | Escape hatch: call any RPC method with raw params |

## Smart mesh import (`overdare_mesh_prepare`)

OVERDARE caps imported meshes at **30,000 triangles per mesh** and recommends
**512px** textures (large 4K textures OOM the importer). `overdare_mesh_prepare`
runs **headless Blender** to make any `.fbx / .obj / .glb / .gltf / .blend`
import-ready:

- decimates an over-budget mesh to fit the triangle limit,
- downscales & re-embeds textures to the target size,
- writes a self-contained `<name>_overdare.fbx`.

The final Import into Studio (Home ▸ Import) is still a manual GUI step. Requires
Blender installed — Steam installs are auto-detected; set `OVERDARE_BLENDER` to
override the path.

## Switching projects (`overdare_set_project`)

The `.ovdrjm` file-edit tools now **auto-follow whichever project is open in
Studio** (recovered from its screenshot path). After switching projects in
Studio, call `overdare_set_project` with no args to re-detect, or pass a `dir` to
pin a specific project directory. `OVERDARE_PROJECT_DIR` remains a fallback.

## Status / next steps

The RPC endpoint, port, and method names were derived from the OVERDARE Studio
runtime. The exact **param/response field shapes** for each method still need to
be confirmed against a live Studio — use `npm run probe -- <method> '<json>'`
to capture real shapes, then tighten the Zod schemas in `src/tools.ts`. The
`overdare_rpc` tool works regardless and is the safe fallback while iterating.
