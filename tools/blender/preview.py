"""Render preview PNG cho một GLB theo ánh sáng + màu sắc của game.
Chạy: blender --background --python preview.py -- <in.glb> <out.png>
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
in_path, out_path = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=in_path)

# ---- Bề mặt đất cỏ theo màu terrain của game (#5d6f3a) ----
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
mins = Vector((min(o.matrix_world @ Vector(c) for o in objs for c in o.bound_box)))
maxs = Vector((max(o.matrix_world @ Vector(c) for o in objs for c in o.bound_box)))
center = (mins + maxs) / 2
size = max((maxs - mins).length, 1.0)

ground = bpy.data.meshes.new("ground")
import bmesh
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size * 3)
bm.to_mesh(ground)
ground_obj = bpy.data.objects.new("ground", ground)
bpy.context.scene.collection.objects.link(ground_obj)
gm = bpy.data.materials.new("grass")
gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.117, 0.156, 0.077, 1)
ground_obj.data.materials.append(gm)
ground_obj.location.z = mins.z - 0.02

# ---- Ánh sáng kiểu game: mặt trời ấm + trời hiên ----
def light(kind, energy, color, loc):
    li = bpy.data.lights.new(kind, kind)
    li.energy = energy
    li.color = color
    if kind == "SUN":
        li.angle = 0.35
    ob = bpy.data.objects.new(kind, li)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    return ob

sun = light("SUN", 4.0, (1.0, 0.7, 0.48), (size * 0.8, -size * 0.6, size * 1.4))
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
hemi = light("AREA", 800 * size * size / 100, (1.0, 0.79, 0.63), (0, 0, size * 2))
hemi.data.size = size * 4

world = bpy.data.worlds.new("sky")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.55, 0.42, 0.55, 1)  # tím hoàng hôn nhạt
bg.inputs[1].default_value = 0.7
bpy.context.scene.world = world

# ---- Camera góc 3/4 nhìn xuống như third-person ----
cam = bpy.data.cameras.new("cam")
cam_ob = bpy.data.objects.new("cam", cam)
bpy.context.scene.collection.objects.link(cam_ob)
bpy.context.scene.camera = cam_ob
azim = math.radians(-125)
elev = math.radians(24)
dist = size * 1.75
cam.lens = 32
cam_ob.location = (
    center.x + dist * math.cos(elev) * math.cos(azim),
    center.y + dist * math.cos(elev) * math.sin(azim),
    center.z + dist * math.sin(elev),
)
direction = center - cam_ob.location
cam_ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

# ---- Render: Standard (không tone mapping) khớp game ----
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.display_settings.display_device = "sRGB"
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.filepath = out_path
scene.render.image_settings.file_format = "PNG"
bpy.ops.render.render(write_still=True)
print(f"PREVIEW_OK {os.path.basename(out_path)}")
