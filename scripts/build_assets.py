# Dựng asset tiên hiệp low-poly bằng Blender headless, export .glb vào client/public/models/.
# Chạy: blender -b -P scripts/build_assets.py -- --out client/public/models
# Model flat-shaded, khớp phong cách low-poly của game. Tên node mà code game đọc:
#   sword.glb: "blade" ; whisk.glb: "strands" ;
#   dragon.glb: "head" (nhóm), "seg" (nhóm) ; phoenix.glb: "body", "wingL", "wingR", "tail1..3".
import bpy
import math
import sys
from math import radians

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_dir = argv[argv.index('--out') + 1] if '--out' in argv else 'client/public/models'


def wipe():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def mat(name, color, emission=(0, 0, 0, 1), strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Metallic'].default_value = 0.05
    if strength > 0:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = strength
    return m


def flat(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def paint(obj, material):
    obj.data.materials.append(material)
    return obj


def anchor(name, loc=(0, 0, 0)):
    """Empty làm node nhóm: GLTFLoader trả về Group cùng tên."""
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    empty.location = loc
    empty.empty_display_size = 0.05
    return empty


def child(parent, obj, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    obj.parent = parent
    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = scale
    return obj


def prim(op, name, material, **kw):
    op(**kw)
    obj = bpy.context.object
    obj.name = name
    paint(obj, material)
    return flat(obj)


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True,
    )
    print(f'da xuat {path}')


STEEL = lambda: mat('steel', (0.8, 0.87, 0.95, 1), emission=(0.35, 0.55, 0.8, 1), strength=0.4)
GOLD = lambda: mat('gold', (0.83, 0.64, 0.34, 1))
RED = lambda: mat('red', (0.42, 0.14, 0.1, 1))
WOOD = lambda: mat('wood', (0.38, 0.26, 0.16, 1))
HAIR = lambda: mat('hair', (0.93, 0.9, 0.83, 1))
SCALE = lambda: mat('scale', (0.29, 0.47, 0.62, 1))
BELLY = lambda: mat('belly', (0.85, 0.72, 0.45, 1))
HORN = lambda: mat('horn', (0.85, 0.65, 0.32, 1))
EYE = lambda: mat('eye', (1, 0.8, 0.3, 1), emission=(1, 0.75, 0.25, 1), strength=2.0)
FLAME = lambda: mat('flame', (0.95, 0.45, 0.2, 1))
FGOLD = lambda: mat('fgold', (0.95, 0.72, 0.3, 1))
PEYE = lambda: mat('peye', (0.15, 0.1, 0.08, 1))


# ================= KIẾM: lưỡi "blade" dọc trục, cán dưới gốc =================
def build_sword():
    wipe()
    root = anchor('sword', (0, 0, 0))
    # Lưỡi: hình thoi 4 cạnh nhọn dần (cone 4 vertices), ép dẹp theo một chiều.
    blade = prim(bpy.ops.mesh.primitive_cone_add, 'blade', STEEL(),
                 vertices=4, radius1=0.034, radius2=0.0, depth=0.64, location=(0, 0, 0.32))
    child(root, blade, (0, 0, 0.32), scale=(1, 0.35, 1))
    guard = prim(bpy.ops.mesh.primitive_cylinder_add, 'guard', GOLD(),
                 vertices=8, radius=0.058, depth=0.024, location=(0, 0, 0.008))
    child(root, guard, (0, 0, 0.008))
    grip = prim(bpy.ops.mesh.primitive_cylinder_add, 'grip', RED(),
                vertices=8, radius=0.018, depth=0.18, location=(0, 0, -0.09))
    child(root, grip, (0, 0, -0.09))
    for i in range(3):
        ring = prim(bpy.ops.mesh.primitive_torus_add, f'ring{i}', GOLD(),
                    major_radius=0.021, minor_radius=0.005, location=(0, 0, -0.04 - i * 0.05))
        child(root, ring, (0, 0, -0.04 - i * 0.05), rot=(radians(90), 0, 0))
    pommel = prim(bpy.ops.mesh.primitive_uv_sphere_add, 'pommel', GOLD(),
                  radius=0.027, segments=8, ring_count=6, location=(0, 0, -0.185))
    child(root, pommel, (0, 0, -0.185))
    export(f'{out_dir}/sword.glb')


# ================= PHẬT TRẦN: chùm lông trong node "strands" =================
def build_whisk():
    wipe()
    root = anchor('whisk', (0, 0, 0))
    handle = prim(bpy.ops.mesh.primitive_cylinder_add, 'handle', WOOD(),
                  vertices=8, radius=0.017, depth=0.44, location=(0, 0, 0.22))
    child(root, handle, (0, 0, 0.22))
    knot = prim(bpy.ops.mesh.primitive_torus_add, 'knot', GOLD(),
                major_radius=0.032, minor_radius=0.012, location=(0, 0, 0.44))
    child(root, knot, (0, 0, 0.44), rot=(radians(90), 0, 0))
    strands = anchor('strands', (0, 0, 0.44))
    for i in range(9):
        a = (i / 9) * math.tau
        s = prim(bpy.ops.mesh.primitive_cone_add, f'str{i}', HAIR(),
                 vertices=5, radius1=0.012, radius2=0.001, depth=0.34)
        child(strands, s,
              loc=(math.cos(a) * 0.04, math.sin(a) * 0.04, -0.15),
              rot=(radians(-16) * math.cos(a), radians(-16) * math.sin(a), 0))
    export(f'{out_dir}/whisk.glb')


# ================= RỒNG: nhóm "head" chi tiết + đốt thân "seg" nhân bản được =================
def build_dragon():
    wipe()
    # --- đầu ---
    head = anchor('head', (0, 0, 0))
    skull = prim(bpy.ops.mesh.primitive_cube_add, 'skull', SCALE(), size=1)
    child(head, skull, (0, 0, 0), scale=(0.4, 0.34, 0.28))
    snout = prim(bpy.ops.mesh.primitive_cube_add, 'snout', SCALE(), size=1)
    child(head, snout, (0, -0.3, -0.03), scale=(0.2, 0.3, 0.14))
    jaw = prim(bpy.ops.mesh.primitive_cube_add, 'jaw', BELLY(), size=1)
    child(head, jaw, (0, -0.28, -0.13), scale=(0.16, 0.26, 0.05))
    for side in (-1, 1):
        antler = prim(bpy.ops.mesh.primitive_cone_add, f'antler{side}', HORN(),
                      vertices=6, radius1=0.045, radius2=0.006, depth=0.44)
        child(head, antler, (side * 0.13, 0.1, 0.24), rot=(radians(-28), radians(side * -20), 0))
        branch = prim(bpy.ops.mesh.primitive_cone_add, f'branch{side}', HORN(),
                      vertices=5, radius1=0.02, radius2=0.003, depth=0.2)
        child(head, branch, (side * 0.2, 0.0, 0.32), rot=(radians(-64), radians(side * -38), 0))
        whisker = prim(bpy.ops.mesh.primitive_cylinder_add, f'whisker{side}', HORN(),
                       vertices=5, radius=0.006, depth=0.58)
        child(head, whisker, (side * 0.13, -0.48, -0.1), rot=(radians(112), 0, radians(side * 16)))
        eye = prim(bpy.ops.mesh.primitive_uv_sphere_add, f'eye{side}', EYE(),
                   radius=0.036, segments=7, ring_count=5)
        child(head, eye, (side * 0.16, -0.12, 0.07))
    for i in range(4):
        mane = prim(bpy.ops.mesh.primitive_cone_add, f'mane{i}', HORN(),
                    vertices=4, radius1=0.09, radius2=0.008, depth=0.24)
        child(head, mane, (0, 0.13 - i * 0.1, 0.14 - i * 0.03), rot=(radians(100 + i * 10), 0, 0))
    # --- một đốt thân: cầu dẹt + bụng + vây, game nhân bản theo đường bay ---
    seg = anchor('seg', (0, 0, 0))
    orb = prim(bpy.ops.mesh.primitive_ico_sphere_add, 'orb', SCALE(),
               subdivisions=1, radius=0.26)
    child(seg, orb, (0, 0, 0), scale=(1, 1, 0.8))
    under = prim(bpy.ops.mesh.primitive_uv_sphere_add, 'under', BELLY(),
                 radius=0.2, segments=8, ring_count=6)
    child(seg, under, (0, 0, -0.07), scale=(0.8, 1, 0.6))
    fin = prim(bpy.ops.mesh.primitive_cone_add, 'fin', HORN(),
               vertices=4, radius1=0.09, radius2=0.004, depth=0.26)
    child(seg, fin, (0, 0, 0.22), rot=(0, 0, radians(45)))
    export(f'{out_dir}/dragon.glb')


# ================= PHƯỢNG: "body" + cánh/tail gốc tại khớp để code vỗ/làm trễ =================
def build_phoenix():
    wipe()
    body = anchor('body', (0, 0, 0))
    torso = prim(bpy.ops.mesh.primitive_cone_add, 'torso', FLAME(),
                 vertices=7, radius1=0.16, radius2=0.05, depth=0.52)
    child(body, torso, (0, 0.06, 0), rot=(radians(90), 0, 0))
    neck = prim(bpy.ops.mesh.primitive_cylinder_add, 'neck', FGOLD(),
                vertices=7, radius=0.046, depth=0.28)
    child(body, neck, (0, -0.18, 0.13), rot=(radians(-52), 0, 0))
    phead = prim(bpy.ops.mesh.primitive_uv_sphere_add, 'phead', FGOLD(),
                 radius=0.09, segments=8, ring_count=6)
    child(body, phead, (0, -0.28, 0.24))
    beak = prim(bpy.ops.mesh.primitive_cone_add, 'beak', FGOLD(),
                vertices=5, radius1=0.03, radius2=0.0, depth=0.15)
    child(body, beak, (0, -0.4, 0.22), rot=(radians(-90), 0, 0))
    for i, (dx, dz) in enumerate([(-0.03, 0.05), (0, 0.07), (0.03, 0.05)]):
        crest = prim(bpy.ops.mesh.primitive_cone_add, f'crest{i}', FLAME(),
                     vertices=4, radius1=0.02, radius2=0.001, depth=0.17)
        child(body, crest, (dx, -0.26, 0.32 + dz), rot=(radians(-22 - i * 12), 0, dx * 8))
    for side in (-1, 1):
        pe = prim(bpy.ops.mesh.primitive_uv_sphere_add, f'peye{side}', PEYE(),
                  radius=0.018, segments=6, ring_count=5)
        child(body, pe, (side * 0.05, -0.33, 0.28))
    # Cánh: hạt diamonds dẹt nằm ngang, gốc xoay tại vai qua empty wingL/wingR.
    for side, name in ((-1, 'wingL'), (1, 'wingR')):
        pivot = anchor(name, (side * 0.13, 0.02, 0.1))
        w = prim(bpy.ops.mesh.primitive_cone_add, name + 'mesh', FLAME(),
                 vertices=4, radius1=0.5, radius2=0.0, depth=0.024)
        child(pivot, w, (side * 0.2, 0, 0), rot=(0, 0, radians(180) if side < 0 else 0), scale=(1.15, 0.6, 1))
    # Ba lông đuôi: empty tail1..3 tại chóp đuôi, lông con đặt lệch dần.
    for i, (dx, droop) in enumerate([(-0.07, 0.16), (0, 0.0), (0.07, 0.16)]):
        name = f'tail{i + 1}'
        L = 0.95 - i * 0.14
        pivot = anchor(name, (0, 0.24, 0.0))
        t = prim(bpy.ops.mesh.primitive_cone_add, name + 'mesh', FGOLD() if i == 1 else FLAME(),
                 vertices=3, radius1=0.085, radius2=0.0, depth=L)
        child(pivot, t, (dx, L / 2, -droop * L * 0.35), rot=(radians(-90 + droop * 40), 0, 0), scale=(0.4, 1, 1))
    export(f'{out_dir}/phoenix.glb')


build_sword()
build_whisk()
build_dragon()
build_phoenix()
print('XONG')
