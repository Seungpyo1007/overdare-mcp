# Official UI templates (import by id)

Adapted from the diligent `overdare-ui-templates` skill. These are professionally-made screens you **import** with `overdare_asset_import` instead of hand-building. List them anytime with `overdare_assets` (category `ui`).

## The catalog (asset ids)

| Template | Use for | Asset id |
|---|---|---|
| IngameHUD | persistent HUD: HP, currency, action, menu | `ovdrassetid://32883100` |
| PopupGui | text modal: notice, warning, confirm, announce | `ovdrassetid://32884100` |
| IconPopupGui | icon confirmation: purchase, reward, item, skill | `ovdrassetid://32883200` |
| LoadingScreenGui | pre-entry loading: name, bar, text | `ovdrassetid://32911200` |
| LeaderboardHUD | top-right leaderboard + "show all" popup | `ovdrassetid://32912100` |
| BossHPHUD | boss HP bar (name, level, bar) | `ovdrassetid://32913100` |
| CharacterSelectGui | character select (scroll + Back/Go) | `ovdrassetid://32914100` |
| GameOverGui | game over (time + desc + 3 buttons) | `ovdrassetid://32915100` |
| GameDefeatGui | defeat (desc + 3 buttons) | `ovdrassetid://32912200` |
| GameVictoryGui | victory (desc + 3 buttons) | `ovdrassetid://32916100` |
| GameScoreResultGui | personal score (my score + 3 buttons) | `ovdrassetid://32916200` |
| GameRankResultGui | rank list (scroll slots + 3 buttons) | `ovdrassetid://32917100` |

"3 buttons" = Lobby / Okay / Retry. Result screens highlight the local player's row.

## Which template (conflict priority)

1. Loading → LoadingScreenGui
2. End/result: time→GameOver, win→Victory, lose→Defeat, my score→Score, ranking→Rank
3. Persistent HUD: general→IngameHUD, leaderboard→LeaderboardHUD, boss→BossHPHUD
4. Character pick → CharacterSelectGui
5. Icon-centric confirm → IconPopupGui
6. Plain text modal → PopupGui

**Don't force-fit.** If none truly matches (wrong interaction model, info overload, needs reserved-area overflow, the main feature would replace the template's purpose), build it bespoke per `ui-recipes` instead.

## Import → place → wire flow

1. `overdare_stop` (never import during play).
2. `overdare_asset_import { assetId, confirmStopped: true }` — the screen lands under **Workspace**.
3. `overdare_browse` to get its guid; `overdare_move_instance` it under **StarterGui** (most templates) — UI must be under StarterGui to show in-game.
4. Rename the root ScreenGui to its purpose (`overdare_update_instance { name }`); keep all layout/positions.
5. Edit **L2 only** (text, numbers, icons, names, data, script wiring). Don't move/resize/recolor or change button counts unless the user explicitly asked.
6. Wire behavior in a LocalScript (find the UI in PlayerGui via `WaitForChild`, connect `Activated`). See `ui-recipes`.
7. `overdare_save` → `overdare_play` → read Play.log.

## Editing rules (match diligent's discipline)

- Before adding/removing/destroying elements or changing button counts, **confirm scope with the user** (the built-in agent uses a mandatory choice dialog; here, just ask a short question if it's ambiguous). Default: keep the full template.
- To remove an element, `Destroy` it — don't just set `Visible=false` and leave it.
- Stay inside the frame and screen bounds; don't invade the mobile safe areas (joystick / jump / top-left menu).
- IngameHUD: confirm which regions (HP / currency / actions / menu) the user wants before trimming; unselected regions are kept by default.
