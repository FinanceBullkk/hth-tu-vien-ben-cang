"""Đèn đá kiểu Kasuga — 8 chiếc quanh hồ, cạnh tháp và vườn đá.
Toạ độ gốc: chân đèn, mặt đất y=0. Node 'flame' là ô lửa sáng (code đổi MeshBasicMaterial).
Chạy: blender --background --python stone-lantern.py -- <out.glb>
"""
import sys

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
body = Batch(seed=61)
flame = Batch(seed=62, jitter=0)

# ---- Bệ, cột, đế đèn ----
body.cyl(0.26, 0.3, 0.14, P.STONE, 0, 0.07, 0, seg=8)
body.cyl(0.08, 0.1, 0.7, P.STONE_LIGHT, 0, 0.49, 0, seg=7)
body.cyl(0.2, 0.24, 0.07, P.STONE, 0, 0.87, 0, seg=8)

# ---- Hộp lửa đá, mở 4 ô ----
body.box(0.32, 0.26, 0.32, P.STONE_LIGHT, 0, 1.03, 0, jitter=0.03)
for dx, dz in ((0, 1), (0, -1), (1, 0), (-1, 0)):
    body.box(0.14, 0.13, 0.05, P.STONE, dx * 0.16, 1.03, dz * 0.16,
             jitter=0)  # bờ ô lửa

# ---- Mái nón 6 cạnh + núm đồng ----
body.cyl(0.06, 0.44, 0.3, P.STONE, 0, 1.31, 0, seg=6)
body.cyl(0.02, 0.07, 0.12, P.GOLD, 0, 1.5, 0, seg=6, jitter=0)

# ---- Ô lửa sáng 4 mặt (node 'flame') ----
for dx, dz in ((0, 1), (0, -1), (1, 0), (-1, 0)):
    flame.box(0.13, 0.12, 0.03, P.FLAME, dx * 0.17, 1.03, dz * 0.17)

_, _ = body.build('stone_lantern_body')
_, _ = flame.build('flame')
export_glb(sys.argv[-1], budget=2500)
