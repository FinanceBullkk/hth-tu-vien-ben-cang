"""Helper dựng asset low-poly trong Blender headless, mirror đúng toán của game.

Quy ước toạ độ: script viết theo toạ độ GAME (Y-lên-trời, mét, mặt phẳng XZ là đất)
để khớp client/src/scene/builders.js. lib.py tự chuyển sang Blender (Z-up) khi dựng
và exporter glTF chuyển ngược lại, nên GLB cuối ra đúng toạ độ game.

Vertex colors: tô theo CORNER (mỗi tam giác một màu phẳng) — khớp style Batch
non-indexed của game; material bên ba dùng flatMaterial() với vertexColors.
"""
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette as P  # noqa: E402

# game (x, y, z) -> blender (x, -z, y)
GAME2BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def game_matrix(x=0.0, y=0.0, z=0.0, rx=0.0, ry=0.0, rz=0.0, sx=1.0, sy=1.0, sz=1.0):
    """Ma trận đặt khối theo lệ game: Euler thứ tự YXZ như Batch.add (builders.js:36)."""
    t = Matrix.Translation((x, y, z))
    r = Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Rotation(rz, 4, 'Z')
    s = Matrix.Diagonal((sx, sy, sz, 1.0))
    m = t @ r @ s
    return GAME2BLENDER @ m @ GAME2BLENDER.inverted()


class Batch:
    """Gộp nhiều khối vào một bmesh duy nhất, màu tô theo góc — bản Python của Batch (builders.js:24)."""

    def __init__(self, seed=7, jitter=0.04):
        self.bm = bmesh.new()
        self.cl = self.bm.loops.layers.color.new('Col')
        self.rand = random.Random(seed)
        self.jitter = jitter

    def _shade(self, color, jitter=None):
        j = self.jitter if jitter is None else jitter
        shade = 1 + (self.rand.random() - 0.5) * j * 2
        return tuple(min(1.0, c * shade) for c in color)

    def _paint(self, faces, color):
        for f in faces:
            for lp in f.loops:
                lp[self.cl] = (color[0], color[1], color[2], 1.0)

    def box(self, w, h, d, color, x, y, z, rx=0.0, ry=0.0, rz=0.0, jitter=None):
        m = game_matrix(x, y, z, rx, ry, rz, w, h, d)
        before = set(self.bm.faces)
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        self._paint(set(self.bm.faces) - before, self._shade(P.linear(color), jitter))

    def cyl(self, r_top, r_bottom, h, color, x, y, z, seg=8, rx=0.0, ry=0.0, rz=0.0,
            sx=1.0, sy=1.0, sz=1.0, jitter=None):
        """Trụ đứng theo trục Y game, y là tâm trụ (khớp Batch.cyl); sy nén dọc."""
        m = game_matrix(x, y, z, rx, ry, rz, sx, sy, sz)
        before = set(self.bm.faces)
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=seg,
                              radius1=r_bottom, radius2=r_top, depth=h, matrix=m)
        self._paint(set(self.bm.faces) - before, self._shade(P.linear(color), jitter))

    def rock(self, r, color, x, y, z, ry=None, sx=1.0, sy=1.0, sz=1.0, jitter=None):
        """Đá tạc từ icosphere, xoay ngẫu nhiên có hạt giống."""
        m = game_matrix(x, y, z, 0, self.rand.random() * 6.28 if ry is None else ry, 0, sx, sy, sz)
        before = set(self.bm.faces)
        bmesh.ops.create_icosphere(self.bm, subdivisions=1, radius=r, matrix=m)
        self._paint(set(self.bm.faces) - before, self._shade(P.linear(color), jitter))

    def _pt(self, m, v):
        p = m @ Vector((v[0], v[1], v[2], 1.0))
        return (p.x, p.y, p.z)

    def quad(self, pts, color, jitter=None, matrix=None):
        """Một mặt 4 đỉnh (2 tam giác) trong toạ độ game — dùng cho vải băng, màn."""
        m = matrix if matrix is not None else GAME2BLENDER
        vs = [self.bm.verts.new(self._pt(m, p)) for p in pts]
        f1 = self.bm.faces.new([vs[0], vs[1], vs[2]])
        f2 = self.bm.faces.new([vs[0], vs[2], vs[3]])
        self._paint([f1, f2], self._shade(P.linear(color), self.jitter if jitter is None else jitter))

    def roof(self, w, d, h, x, y, z, ry=0.0, lift=None, curve=1.75, seg=14,
             a=P.TILE_A, b=P.TILE_B, ridge=P.RIDGE, finial=True):
        """Mái cong kiểu Việt — tái tạo curvedRoofGeometry + tileColors + addRoof (builders.js:86-144)."""
        if lift is None:
            lift = min(w, d) * 0.08
        ridge_frac = max(0.0, (w - d) / w)
        # Điểm p là toạ độ game cục bộ quanh gốc mái: convert thẳng G @ (T @ R) @ p,
        # KHÔNG conjugate như box/cyl (nơi matrix nhúng qua bmesh op trên geometry local).
        m = GAME2BLENDER @ Matrix.Translation((x, y, z)) @ Matrix.Rotation(ry, 4, 'Y')

        def point(i, j):
            u = -1 + (2 * i) / seg
            v = -1 + (2 * j) / seg
            du = max(0.0, (abs(u) - ridge_frac) / max(1e-3, 1 - ridge_frac))
            dv = abs(v)
            s = max(du, dv)
            yy = h * (1 - s) ** curve + lift * (abs(u) * dv) ** 3
            return (u * w / 2, yy, v * d / 2)

        ca, cb = P.linear(a), P.linear(b)
        step = w / 14
        for i in range(seg):
            for j in range(seg):
                tri_pts = [point(i, j), point(i + 1, j + 1), point(i, j + 1),
                           point(i, j), point(i + 1, j), point(i + 1, j + 1)]
                for k in (0, 3):
                    tri = tri_pts[k:k + 3]
                    vs = [self.bm.verts.new(self._pt(m, p)) for p in tri]
                    f = self.bm.faces.new(vs)
                    ax = sum(p[0] for p in tri) / 3
                    self._paint([f], ca if int((ax + 1000) / step) % 2 == 0 else cb)

        # Nóc mái + hai đầu đao, y hệt addRoof
        ridge_len = max(w - d, 0.2) + 0.5
        self.box(ridge_len, 0.22, 0.3, ridge, x, y + h + 0.03, z, ry=ry, jitter=0)
        cos, sin = _cos_sin(ry)
        if finial:
            for side in (-1, 1):
                ox = (side * ridge_len) / 2
                self.box(0.7, 0.16, 0.2, ridge, x + ox * cos, y + h + 0.16, z - ox * sin,
                         ry=ry, rz=side * 0.55, jitter=0)

    def build(self, name):
        """Xuất bmesh thành object Blender, trả về (object, số tam giác)."""
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        _activate_colors(me)
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        me.calc_loop_triangles()
        return obj, len(me.loop_triangles)


def _cos_sin(a):
    from math import cos, sin
    return cos(a), sin(a)


def _activate_colors(me):
    """Bảo đảm lớp màu được đánh dấu active để exporter glTF lấy đúng."""
    try:
        if len(me.color_attributes):
            attr = me.color_attributes[0]
            me.color_attributes.active_color = attr
            me.color_attributes.render_color = attr
    except (AttributeError, RuntimeError):
        pass


def assign_material(objs, name='flat'):
    """Material trắng tối giản: màu thật nằm trong vertex colors, ba bên đọc qua COLOR_0."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (1.0, 1.0, 1.0, 1.0)
            bsdf.inputs['Metallic'].default_value = 0.0
            bsdf.inputs['Roughness'].default_value = 0.9
    for obj in objs:
        obj.data.materials.clear()
        obj.data.materials.append(mat)


def export_glb(out_path, budget=None, objects=None):
    """Export GLB (toàn scene) và in dòng ASSET_OK để build_all tổng hợp."""
    if objects:
        assign_material(objects)
    kw = {'filepath': out_path, 'export_format': 'GLB', 'export_yup': True}
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    names = {p.identifier for p in props}
    if 'export_vertex_colors' in names:
        p = next(p for p in props if p.identifier == 'export_vertex_colors')
        kw['export_vertex_colors'] = 'LINEAR' if p.type == 'ENUM' else True
    elif 'export_colors' in names:
        kw['export_colors'] = True
    bpy.ops.export_scene.gltf(**kw)

    tris = 0
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.data.calc_loop_triangles()
            tris += len(obj.data.loop_triangles)
    size = os.path.getsize(out_path)
    verdict = ''
    if budget:
        verdict = ' BUDGET_OK' if tris <= budget else f' BUDGET_OVER({tris}>{budget})'
    print(f'ASSET_OK {os.path.basename(out_path)} tris={tris} bytes={size}{verdict}')


def new_scene():
    """Scene trống cho từng asset, chạy đầu mỗi script."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
