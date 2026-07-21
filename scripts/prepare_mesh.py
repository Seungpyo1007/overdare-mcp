"""
prepare_mesh.py — headless Blender pipeline that makes any 3D file OVERDARE-import-ready.

Run:  blender --background --python prepare_mesh.py -- <input> <outDir> <maxTris> <texSize> <mode>
  input    : .fbx / .obj / .glb / .gltf / .blend
  outDir   : where to write <name>_overdare.fbx
  maxTris  : triangle budget per mesh (OVERDARE limit = 30000)
  texSize  : max texture dimension (OVERDARE recommends 512; 1024 is a safe detail/size balance; 4K OOMs on import)
  mode     : "decimate" (single mesh, reduced to fit) | "keep" (no reduction, just texture fit)

Prints one line:  PREPARE_RESULT_JSON {...}
"""
import bpy, sys, os, json

argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
inp = argv[0] if len(argv) > 0 else ""
outdir = argv[1] if len(argv) > 1 else os.path.dirname(inp)
max_tris = int(argv[2]) if len(argv) > 2 else 30000
tex_size = int(argv[3]) if len(argv) > 3 else 1024
mode = argv[4] if len(argv) > 4 else "decimate"

result = {"input": inp, "ok": False}


def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


try:
    bpy.ops.wm.read_factory_settings(use_empty=True)

    ext = os.path.splitext(inp)[1].lower()
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=inp)
    elif ext == ".obj":
        try:
            bpy.ops.wm.obj_import(filepath=inp)
        except Exception:
            bpy.ops.import_scene.obj(filepath=inp)
    elif ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=inp)
    elif ext == ".blend":
        with bpy.data.libraries.load(inp) as (df, dt):
            dt.objects = list(df.objects)
        for o in dt.objects:
            if o:
                bpy.context.collection.objects.link(o)
    else:
        raise Exception("unsupported format: " + ext)

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise Exception("no mesh found in file")

    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "PreparedMesh"

    in_tris = tri_count(obj)
    out_tris = in_tris

    if in_tris > max_tris and mode == "decimate":
        # collapse decimate; iterate up to 3x since the ratio is approximate
        target = float(max_tris)
        for _ in range(3):
            cur = tri_count(obj)
            if cur <= max_tris:
                break
            ratio = max(0.01, (target / float(cur)) * 0.97)
            m = obj.modifiers.new("dec", type="DECIMATE")
            m.decimate_type = "COLLAPSE"
            m.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=m.name)
        out_tris = tri_count(obj)

    # textures: downscale to budget + pack so the FBX is self-contained
    tex_info = []
    imgs = set()
    for slot in obj.material_slots:
        mat = slot.material
        if mat and mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image:
                    imgs.add(n.image)
    tex_dir = os.path.join(outdir, "_tex_tmp")
    os.makedirs(tex_dir, exist_ok=True)
    for i, img in enumerate(imgs):
        try:
            if max(img.size) > tex_size:
                img.scale(tex_size, tex_size)
            # Write the (scaled) pixels to disk and re-point, so export embeds the
            # small version — NOT any stale 4K packed data from the source file.
            safe = "".join(c for c in img.name if c.isalnum() or c in "._-") or ("tex%d" % i)
            if not safe.lower().endswith(".png"):
                safe += ".png"
            p = os.path.join(tex_dir, "%02d_%s" % (i, safe))
            img.filepath_raw = p
            img.file_format = "PNG"
            img.save()
            if img.packed_file:
                try:
                    img.unpack(method="REMOVE")
                except Exception:
                    pass
            img.filepath = p
            tex_info.append([img.name, list(img.size)])
        except Exception as e:
            tex_info.append([img.name, "err:" + str(e)])

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    except Exception:
        pass

    os.makedirs(outdir, exist_ok=True)
    base = os.path.splitext(os.path.basename(inp))[0]
    out_fbx = os.path.join(outdir, base + "_overdare.fbx")
    bpy.ops.export_scene.fbx(
        filepath=out_fbx,
        use_selection=True,
        path_mode="COPY",
        embed_textures=True,
        add_leaf_bones=False,
        bake_anim=False,
        object_types={"MESH"},
    )

    result.update({
        "ok": True,
        "output": out_fbx,
        "inputTris": in_tris,
        "outputTris": out_tris,
        "maxTris": max_tris,
        "decimated": out_tris < in_tris,
        "overBudget": out_tris > max_tris,
        "textures": tex_info,
        "materials": len(obj.material_slots),
        "fileSizeMB": round(os.path.getsize(out_fbx) / 1048576.0, 2),
    })
except Exception as e:
    result["error"] = str(e)

print("PREPARE_RESULT_JSON " + json.dumps(result))
