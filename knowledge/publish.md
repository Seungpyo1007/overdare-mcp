# Publishing a world

Adapted from the diligent `world-publish` skill. Publishing makes the current world live on the OVERDARE Hub.

## Tooling on this MCP

- `overdare_publish` calls `level.publish` with **no params** — fine when the backend world **already exists** (republish): Studio opens its publish webview and the user confirms there.
- For a **first-time** publish you must send metadata. This MCP's `overdare_publish` doesn't take params yet, so send them via the escape hatch:
  `overdare_rpc { method: "level.publish", params: { worldName, description, category, keyword } }`.
- Always `overdare_save` first so the publish reflects the latest edits.

## Does the backend world already exist?

The key question (not "was it ever published"). Decide from `CommandletArgs.json` in the project folder:

1. **Missing** → treat as **not created** → send metadata params.
2. **Present** → read the array element with `"fieldName": "ContentId"`; its `option` is the `worldId` (numeric, may be stored as a string). If `ContentId`/worldId is missing or not a positive integer → treat as **not created**.
3. If you can verify the id against the Hub and it exists → **already created** → publish **without** metadata params.

(The built-in agent uses `hub_world_lookup`/`hub_world_categories_list` for this; those aren't wrapped here. If you can't verify, the safe path is: save → `overdare_publish` and let the user complete metadata in the Studio webview.)

## Metadata params (first-time create)

```json
{
  "worldName": "World Name",
  "description": "Made with OVERDARE Studio.",
  "category": ["<a valid Hub category>"],
  "keyword": ["OVERDARE"]
}
```

Use exactly these keys inside `params`: `worldName`, `description`, `category`, `keyword` (NOT name/categories/keywords).

Rules:
- **worldName**: 1-50 chars (raw), no leading/trailing spaces. Default = project folder name (truncate to 50).
- **description**: 1-500 chars measured on the **raw** value. Studio drops it into the webview URL **without** encoding, so **URL-encode right before sending** — at minimum newlines → `%0A` (full component encoding is safer). Don't double-encode.
- **category**: 1-3 items, each an exact label the Hub accepts (preserve case). Don't invent labels — if unsure, ask the user or omit and let them pick in the webview.
- **keyword**: 0-5 items (omit the field if none), each 1-50 chars, no dupes. e.g. `action`, `obby`, `rpg`, `pvp`, `parkour`, `racing`.

Infer metadata from the conversation + the world's tree/scripts/template (genre hints: PvP/combat→action, obby/platforming→adventure, quests/classes→rpg, tycoon/driving→simulation, hangout/lobby→social).

## Errors

- `-32009` = the user canceled in the Studio UI. Final outcome — **don't auto-retry**; tell the user and ask if they want to try again.
- Any other error: report it and stop; never claim success that didn't happen.

## After success

Tell the user: created-new vs republished, that the publish webview should be open, anything they must confirm there, and (if metadata was sent) the **raw** metadata used (not the URL-encoded description). Keep it short.
