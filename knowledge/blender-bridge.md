# Blender ↔ OVERDARE bridge (cross-MCP)

When the **Blender MCP** is also connected (tools `mcp__blender__*`), you can use Blender as a content factory for OVERDARE. Orchestration happens at the agent level: you call Blender MCP to produce something, then OVERDARE MCP to bring it in.

## Hard limit (state it upfront)

**OVERDARE cannot import meshes via API** (no FBX/glTF/OBJ). Blender's 3D geometry does NOT transfer as 3D. What transfers is **images**. For 3D shapes in OVERDARE you either rebuild with parts (reference workflow below) or import Asset Drawer models (`overdare_assets` → `overdare_asset_import`).

## Bridge A — Texture / decal / UI art (WORKS TODAY)

Blender makes the image, OVERDARE consumes it:
1. In Blender, produce a flat image:
   - download a PBR texture: `mcp__blender__search_polyhaven_assets` (asset_type `textures`) → `download_polyhaven_asset`; or
   - render the viewport / a baked texture / an icon to a PNG via `mcp__blender__execute_blender_code` (`bpy.context.scene.render.filepath = "C:/.../out.png"; bpy.ops.render.render(write_still=True)`); or
   - generate art with Hyper3D/Hunyuan and render it.
2. Note the absolute PNG path on disk.
3. OVERDARE: `overdare_image_import { file: "C:/.../out.png" }` → returns an asset id.
4. Use that id as image content:
   - a **Decal/Texture** on a Part's face (create a Texture/Decal instance, set its image content to the id);
   - an **ImageLabel/ImageButton** `Image` in UI (see `ui-recipes`);
   - a **SurfaceGui** ImageLabel for a billboard/sign.
   STOP the playtest before the import (write hazard).

Good uses: signage, posters, skyboxes/backdrops (render a panorama), UI icons & logos, custom surface textures that the built-in Material enum can't do.

## Bridge B — Reference rebuild (Blender as the design canvas)

Use a rich Blender scene to drive OVERDARE geometry you build with parts:
1. `mcp__blender__get_viewport_screenshot` to SEE the scene; `mcp__blender__get_scene_info` / `get_object_info` to read object names, locations, and dimensions.
2. Translate layout → OVERDARE: recreate major shapes with `overdare_create_instances` (Parts), matching relative positions/proportions. **Scale matters**: OVERDARE characters are huge (capsule height ~160), so multiply Blender meters by a large factor and size geometry to the character, not to Blender units.
3. Iterate visually: `overdare_screenshot` (3D) and compare to the Blender reference.

This is how you "bring a Blender city into OVERDARE" honestly — as a faithfully rebuilt blockout, not a mesh copy.

## Bridge C — Experimental mesh path (UNCONFIRMED — probe before promising)

OVERDARE is Unreal-based, so in theory UE Remote Control could import an FBX into the Unreal content browser via AssetTools (and `overdare_rc_python` if the Python plugin exists). BUT an imported UE StaticMesh likely does NOT become a usable OVERDARE `MeshPart` (MeshId expects an `ovdrassetid`, not a UE asset path). Treat as research:
1. `overdare_status` → confirm UE Remote Control + Unreal Python availability.
2. If Python is available, probe a tiny import via `overdare_rc_python` and inspect with `overdare_rc_search_assets`.
3. Only build a real tool if a path from imported asset → in-game MeshPart is proven. Until then, do NOT tell the user meshes can be imported.

## Etiquette (borrowed from Blender MCP)

- Blender's `execute_blender_code` and OVERDARE's `overdare_rc_python` are powerful but dangerous — save first, keep steps small.
- Check capabilities before relying on them: Blender side `mcp__blender__get_polyhaven_status` / `get_sketchfab_status` / `get_hyper3d_status`; OVERDARE side `overdare_status`.
