/**
 * MCP server "instructions" — the short handshake the client shows the model.
 * Shared by BOTH entrypoints (index.ts stdio, http.ts) so they can't drift.
 * Keep it short: it points at the deeper recipes/catalog rather than inlining
 * them (those are overdare_recipe + the overdare://knowledge/* resources).
 */
export const INSTRUCTIONS = [
  "Tools to build games in OVERDARE Studio (a Roblox-like, Luau-scripted, Unreal-based UGC platform).",
  "OVERDARE Studio must be running with a project open; otherwise tools return a 'cannot reach Studio' error.",
  "Workflow: call overdare_browse FIRST to read the DataModel tree — every other tool targets nodes by their `guid`.",
  "Before building UI, combat, or publishing, consult overdare_recipe (or the overdare://knowledge/* resources) for battle-tested playbooks.",
  "For polished results, pick an asset id with overdare_assets and import it with overdare_asset_import — never guess an id (a bad id hangs Studio).",
  "STOP the playtest (overdare_stop) before any edit or import; writing during an active playtest hangs Studio.",
  "Verify visually: overdare_screenshot shows the 3D viewport only (UI never appears) — to check UI, overdare_play then read Play.log.",
  "Luau scripts use TABS for indentation. Save with overdare_save when done.",
].join(" ");
