"""Bảo tháp 3 tầng kiểu võ hiệp — điểm nhấn góc Đông Bắc sân (đặt tại 17, 12).
Toạ độ gốc: tâm nền tháp, mặt đất y=0. Node 'glow' là ô vách sáng ban đêm.
Chạy: blender --background --python pagoda.py -- <out.glb>
"""
import sys

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
body = Batch(seed=21)
glow = Batch(seed=22, jitter=0)

# ---- Nền đá hai cấp + bậc phía nam ----
body.box(7.6, 0.36, 7.6, P.STONE, 0, 0.18, 0, jitter=0.02)
body.box(6.6, 0.34, 6.6, P.STONE_LIGHT, 0, 0.51, 0, jitter=0.02)
for i, (sy, sz) in enumerate([(0.12, 4.15), (0.36, 3.75), (0.6, 3.35)]):
    body.box(2.4, 0.24, 0.9, P.STONE_LIGHT, 0, sy, sz, jitter=0.02)

# ---- Tầng 1: cột đỏ, lõi vôi, dầm ----
for dx in (-2.5, 2.5):
    for dz in (-2.5, 2.5):
        body.cyl(0.20, 0.24, 2.6, P.PILLAR, dx, 1.8, dz, seg=7)
        body.cyl(0.38, 0.42, 0.14, P.STONE, dx, 0.75, dz, seg=8)
body.box(4.4, 2.6, 4.4, P.PLASTER, 0, 1.8, 0, jitter=0.02)
body.box(5.0, 0.25, 5.0, P.WOOD_DARK, 0, 3.22, 0)
# Sập cống gỗ dưới hiên
body.box(4.7, 0.1, 4.7, P.WOOD, 0, 0.72, 0, jitter=0.02)

# ---- Mái tầng 1 ----
body.roof(8.8, 8.8, 1.8, 0, 3.42, 0)

# ---- Tầng 2 ----
for dx in (-1.7, 1.7):
    for dz in (-1.7, 1.7):
        body.cyl(0.17, 0.2, 2.0, P.PILLAR, dx, 6.0, dz, seg=7)
body.box(3.2, 1.9, 3.2, P.PLASTER, 0, 6.0, 0, jitter=0.02)
body.box(3.7, 0.22, 3.7, P.WOOD_DARK, 0, 7.05, 0)
body.roof(6.4, 6.4, 1.5, 0, 7.25, 0)

# ---- Tầng 3 ----
for dx in (-1.2, 1.2):
    for dz in (-1.2, 1.2):
        body.cyl(0.15, 0.18, 1.5, P.PILLAR, dx, 9.35, dz, seg=7)
body.box(2.2, 1.5, 2.2, P.PLASTER, 0, 9.35, 0, jitter=0.02)
body.box(2.6, 0.2, 2.6, P.WOOD_DARK, 0, 10.15, 0)
body.roof(4.4, 4.4, 1.2, 0, 10.35, 0)

# ---- Chóp tháp bằng đồng ----
sp = 11.55
body.cyl(0.05, 0.09, 1.3, P.GOLD, 0, sp, 0, seg=6)
for i in range(3):
    body.cyl(0.15, 0.15, 0.07, P.GOLD, 0, sp + 0.28 + i * 0.34, 0, seg=8)
body.cyl(0.02, 0.16, 0.18, P.GOLD, 0, sp + 1.36, 0, seg=8)
body.cyl(0.0, 0.07, 0.28, P.GOLD_BRIGHT, 0, sp + 1.58, 0, seg=6)

# ---- Ô vách sáng 4 phía mỗi tầng (node 'glow') ----
for level, (cy, half) in enumerate([(1.9, 2.21), (6.0, 1.61), (9.35, 1.11)]):
    wh = (1.1, 1.1, 0.7)[level]
    for axis in (-1, 1):
        glow.box(0.9, wh, 0.06, P.GLOW_WARM, 0, cy, axis * half, jitter=0)
        glow.box(0.06, wh, 0.9, P.GLOW_WARM, axis * half, cy, 0, jitter=0)

_, tris_body = body.build('pagoda_body')
_, tris_glow = glow.build('glow')
export_glb(sys.argv[-1], budget=12000)
