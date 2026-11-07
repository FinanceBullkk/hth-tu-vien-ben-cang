"""Hòn non bộ + tùng bonsai + bồn nước — dùng 2 lần với scale khác nhau.
Toạ độ gốc: tâm bồn, mặt đất y=0. Node 'water' được code thay material trong suốt.
Chạy: blender --background --python nonbo.py -- <out.glb>
"""
from math import cos, pi, sin

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
body = Batch(seed=41)
water = Batch(seed=42, jitter=0)

# ---- Bồn đá oval ----
body.cyl(1.45, 1.55, 0.4, P.STONE, 0, 0.2, 0, seg=12)
body.cyl(1.28, 1.3, 0.1, P.WATER_BED, 0, 0.38, 0, seg=12, jitter=0.02)
water.cyl(1.26, 1.3, 0.05, P.WATER, 0, 0.42, 0, seg=12)
# Sỏi quanh bồn
for i in range(7):
    a = i / 7 * 2 * pi + 0.3
    r = 1.75 + (i % 3) * 0.12
    body.rock(0.11, P.ROCK_LIGHT, sin(a) * r, 0.06, cos(a) * r, sy=0.7)

# ---- Khối đá dựng non bộ ----
body.rock(0.95, P.ROCK, -0.15, 0.95, 0.1, sx=1.0, sy=1.2, sz=0.9)
body.rock(0.6, P.ROCK_LIGHT, 0.72, 0.62, -0.42, sy=0.9)
body.rock(0.46, P.ROCK, 0.25, 1.62, 0.3, sy=0.85)
body.rock(0.36, P.ROCK_LIGHT, -0.68, 0.42, -0.5, sy=0.8)
body.rock(0.42, P.ROCK, -0.05, 2.15, -0.05, sy=1.05)

# ---- Tùng bonsai mọc trên sườn ----
tx, tz = 0.5, -0.3
segs = [(1.55, 1.95, 0.05), (1.95, 2.3, -0.02), (2.3, 2.6, 0.03)]
for i, (y0, y1, lean) in enumerate(segs):
    body.cyl(0.05, 0.07, y1 - y0, P.WOOD_DARK,
             tx + lean * (i + 1) * 0.5, (y0 + y1) / 2, tz, seg=5, rz=lean * 0.6)
body.cyl(0.0, 0.62, 0.5, P.PINE_DARK, tx + 0.55, 2.75, tz, seg=7, sy=0.6)
body.cyl(0.0, 0.48, 0.42, P.PINE_LIGHT, tx + 0.75, 3.02, tz - 0.08, seg=7, sy=0.55)
body.cyl(0.0, 0.4, 0.4, P.PINE_DARK, tx + 0.3, 2.95, tz + 0.2, seg=6, sy=0.5)
# Nhánh vượt khỏi đá kiểu bonsai
body.cyl(0.0, 0.34, 0.3, P.PINE_LIGHT, tx - 0.35, 2.4, tz + 0.15, seg=6, sy=0.45)

_, _ = body.build('nonbo_body')
_, _ = water.build('water')
export_glb(sys.argv[-1], budget=4000)
