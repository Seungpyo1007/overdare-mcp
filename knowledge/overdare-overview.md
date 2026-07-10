# OVERDARE build playbook (overview)

You drive OVERDARE Studio through this MCP. OVERDARE is a Roblox-like, **Luau**-scripted, Unreal-based UGC maker; its DataModel mirrors Roblox (Workspace, Players, ReplicatedStorage, ServerScriptService, StarterGui, StarterPlayer, Lighting, …).

## The two ways to add content (pick deliberately)

1. **Import pro-made content** — `overdare_assets` (list the curated catalog) → `overdare_asset_import` (insert by id). This is how you get polished UI screens and a whole PvP combat game in one shot, instead of hand-stacking cubes. See `ui-templates` and `combat-tpa` recipes.
2. **Build it yourself** — `overdare_create_part` / `overdare_create_instance` / `overdare_create_instances` for geometry & objects; `overdare_script_add` for Luau behavior. See `ui-recipes` for hand-built UI.

Prefer **import-then-customize** when an official template fits; build directly only for bespoke needs.

## Golden path

1. `overdare_browse` FIRST — every tool targets nodes by their `guid`.
2. **STOP before writing**: `overdare_stop`. Editing/importing during an active playtest hangs Studio (see `luau-gotchas`).
3. Make the change: import an asset, or create parts/instances, or add a script. Imports land under **Workspace** — relocate with `overdare_move_instance` (UI → StarterGui).
4. `overdare_save`.
5. Verify: `overdare_play` then read `Play.log` for script errors; `overdare_screenshot` to see the 3D scene. **Screenshots show the 3D viewport only — UI/ScreenGui never appears** (see `luau-gotchas`).
6. `overdare_stop` before the next edit.

## Hard constraints (memorize)

- **Luau uses TABS** for indentation.
- **Character scale is large**: capsule height ~160 (`GetExtentsSize().Y ≈ 160`). Size world geometry to that, not Roblox's ~5-stud scale.
- **A bad `overdare_asset_import` id permanently HANGS Studio.** Only import ids from `overdare_assets`, or ids the user gave you. Never "probe" a guessed id.
- **No write during play.** stop → write → save → play.
- Don't delete pre-existing instances you didn't create without the user asking.

## Debug discipline (from the debug-expert skill)

Classify a failure in this order: **script → session → 3D → UI**. The primary evidence is `Play.log` (captures `print()` and Lua errors). For a repeating bug, add `print()` markers, replay, re-read the log. Don't guess from the tree alone — read the log.

## When unsure of capability

`overdare_recipe` (this set) for playbooks; `overdare_browse`/`overdare_rc_describe` to inspect; `overdare_rpc` as a raw escape hatch for protocol methods without a dedicated tool.
