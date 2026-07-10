# UI recipes (hand-built, non-template)

Adapted from the diligent `ui-generator` skill. Use this for **bespoke** UI. If the request matches an official screen (HUD, popup, loading, leaderboard, boss HP, character select, result screens), prefer importing the template — see `ui-templates`.

## Target & placement

- Design for **mobile landscape**, reference size **~1386 x 640**.
- Screen-space UI lives under **StarterGui** (a `ScreenGui`). At runtime it's copied into each player's `PlayerGui`; behavior scripts look it up there with `WaitForChild`.
- GUI input & camera logic go in a **LocalScript** (StarterPlayer.StarterPlayerScripts or inside the ScreenGui).
- Imported UI often arrives under **Workspace** — move it to StarterGui with `overdare_move_instance`.
- Build parent containers first, then children one level at a time. Keep existing UI unless the user asks to replace it.

## Mobile safe areas (do NOT cover)

- Top-left = system menu. Bottom-left = movement joystick. Bottom-right = default jump button.
- Put custom action buttons **above or inward** from the bottom-right jump area.
- Reference anchors: top-center HUD `Pos(0.5,0) Anchor(0.5,0) +18px Y`; left status `Pos(0,0.4) Anchor(0,0.5) +40px X`; bottom-center `Pos(0.5,1) Anchor(0.5,1)`; right action cluster `Pos(1,0.5) Anchor(0.5,0.5) -230px X`; jump ref ~`Pos(1,1) Anchor(0.5,0.5) Offset(-230,-160) Size 180x180`.

## Layout rules (UDim2 = X{Scale,Offset}, Y{Scale,Offset})

- **Position → mostly Scale** (relative), Offset only for padding/margin.
- **Size → mostly Offset** (fixed px); use Scale for full/half/stretch panels. Image UI uses Offset to keep fidelity.
- Action button size e.g. 84x84 or 100x100. Full-screen root `Size = {1,0},{1,0}`.
- Center a modal: `AnchorPoint = 0.5,0.5`, `Position = {0.5,0},{0.5,0}`.

## Text rules

- Absolute sizes (don't rely on auto-scale). Min ~24px for important labels/buttons; titles 32px+; central score/time 28px+; secondary 18-22px.
- `TextWrapped` for long text. Avoid emoji/special Unicode. High contrast (add a dark/translucent backing if the scene behind is busy).
- **No `Font` property — use `Bold` (boolean).** See `luau-gotchas`.

## Layering: ZIndex / DisplayOrder

- `ZIndex` orders within a ScreenGui; `DisplayOrder` orders ScreenGui groups.
- Bands: **0-99** normal HUD; **100-199** overlays (menus, modal popups, loading, tutorial blockers); **200+** debug. Modal dimmer ~100, modal content ~110+.
- Don't push normal buttons into the overlay band to silence overlap — fix the layout.

## Naming (stable, for later scripts)

Suffixes: Root, Panel, Frame, Button, Label, Image, List, Bar/Fill/Background. e.g. `GameHUDRoot`, `ScoreboardPanel`, `ShootButton`, `HealthBarFill`, `PopupDialogRoot`.

## Click wiring (LocalScript, uses Activated)

```lua
local Players = game:GetService("Players")
local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local screenGui = playerGui:WaitForChild("ScreenGui")
local button = screenGui:WaitForChild("ShootButton")

local function onActivated()
	print("shoot")
end

button.Activated:Connect(onActivated)
```

For nested/imported UI, walk the hierarchy with `WaitForChild` step by step.

## World-space GUI

`BillboardGui` for camera-facing labels (nameplates, floating bars, interaction hints); `SurfaceGui` for UI on a part face (signs, posters, keypads). Keep normal HUD under StarterGui; use world-space only when the UI is attached to a world object. Large, high-contrast text for mobile.

## Building the instances

Static UI = editor instances via `overdare_create_instance` (className `ScreenGui`/`Frame`/`TextLabel`/`TextButton`/`ImageLabel`/`ImageButton`/`ScrollingFrame`/`UIListLayout`/…), parented appropriately, props set via the `props.raw` escape hatch for UI-specific fields (Position/Size as UDim2 objects, ZIndex, Text, Bold, …). NOTE: these classes may have no clone-template in a fresh project — see `engine` notes; if a class won't persist, build it at runtime in a LocalScript with `Instance.new` instead. Always stop → build → save → play → read Play.log.
