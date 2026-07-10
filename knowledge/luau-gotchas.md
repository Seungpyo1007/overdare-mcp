# Luau / API gotchas (OVERDARE ≠ Roblox)

OVERDARE mirrors the Roblox API but is **not identical**. Assigning a non-existent property **throws and halts the whole script**. Verified live while building UI.

## Debugging: read Play.log

`<project>/Play.log` (e.g. `C:\Users\29\Desktop\NewWorld\Play.log`) captures `print()` output and Lua errors from the last playtest. Errors look like:
`Lua execution error: /User/Lua/<Script>.<Script>:<line>: "<Prop>" is not a valid member.`
This is how you self-verify scripts. `overdare_screenshot` captures the **3D viewport only** — no ScreenGui/HUD — so UI never shows up in a screenshot. To verify UI, play and read the log (or ask the user to look).

## UI property differences (authoritative: runtime overdare-types.d.lua)

- **`ScreenGui`** (extends LayerCollector): ONLY `DisplayOrder`. **No `ResetOnSpawn`, no `IgnoreGuiInset`.**
- **`GuiObject`** (Frame/labels/buttons base): Active, AnchorPoint, BackgroundColor3, BackgroundTransparency, ClipsDescendants, LayoutOrder, Position, Rotation, Size, Visible, ZIndex, InputBegan/InputChanged/InputEnded. **No `BorderSizePixel`.**
- **`Frame`** adds: BorderColor3, BorderMode, **`BorderPixelSize`** (NOT BorderSizePixel).
- **`GuiButton`** adds ONLY **`Activated`**. **No `MouseButton1Click`, no MouseEnter/MouseLeave, no AutoButtonColor.** Use `Activated` for clicks; InputBegan/InputEnded for pointer events.
- **`TextLabel`/`TextButton`**: Text, TextColor3, TextScaled, TextSize, TextTransparency, TextWrapped, TextXAlignment, TextYAlignment, **`Bold`** (boolean), LocalizedText. **No `Font` property — use `Bold`.**
- Safe pattern for uncertain props: `pcall(function() obj[name] = value end)` so one bad prop doesn't kill the script.

## DANGER: bad asset_drawer.import id hangs Studio

Calling `overdare_asset_import` (RPC `asset_drawer.import`) with an INVALID id blocks Studio's main thread indefinitely → ALL later RPC (browse/stop/save) times out; only the USER pressing Stop (or restarting Studio) recovers. **Never import a guessed id.** Use `overdare_assets`. External arbitrary 3D files (FBX/glTF) **cannot** be imported via the API — only Asset Drawer store models (by id, `overdare_asset_import`) and local images (`overdare_image_import`). `MeshPart.MeshId` exists for meshes.

## DANGER: never write to the level during an active playtest

`overdare_script_add` / `overdare_save` / any `.ovdrjm` write (create/update/move/delete) WHILE `overdare_play` is running hangs Studio's main thread → all RPC times out until the user presses Stop. **Always `overdare_stop` before any write**, then play to test. Safe sequence: stop → write → save → play → screenshot/log.

## Humanoid props: set on the server

Setting `Humanoid.WalkSpeed`/`JumpPower` from a LocalScript logs "<Prop> should be set on the server" and is not authoritative. To freeze a player, do it **server-side**: anchor the HumanoidRootPart (`hrp.Anchored = true`) in a `Script`; release via a `RemoteEvent` the client fires on a button press. RemoteEvents can be created at runtime (`Instance.new` in ReplicatedStorage) since the `instance.upsert` RPC is absent.

## Confirmed-working APIs

`Instance.new`, `Vector3`/`Vector2`/`UDim2`/`Color3.fromRGB`, `CFrame.Angles`, `task.wait`, `RunService.Heartbeat`, `Model:GetExtentsSize()`, `Part.Touched`, `Players.PlayerAdded`/`CharacterAdded`, `game:GetService`, `BasePart.Color`/`Size`/`Position`/`Anchored`.

## Editor vs runtime

On this build the `instance.upsert` RPC is absent, so persistent editor instances are created by editing the `.ovdrjm` (the `overdare_create_*` / `overdare_update_instance` / `overdare_move_instance` tools). Runtime objects (RemoteEvents, dynamic UI) are created in scripts with `Instance.new`. Static UI is best as editor instances under StarterGui; when that's impractical, a LocalScript can build the ScreenGui into PlayerGui at runtime.
