"""Cột cờ băng đỏ sọc vàng — 6 cây dọc lối chính (x ±5.6, z 6/14/22).
Toạ độ gốc: chân cột, lá băng vắt về phía +X cục bộ (code xoay ry để lá hướng vào lối đi).
Node 'cloth' được code lắc nhẹ theo gió; chữ HTH thêm bằng textTexture bên ba.
Chạy: blender --background --python banner.py -- <out.glb>
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
body = Batch(seed=51, jitter=0.04)
cloth = Batch(seed=52, jitter=0.05)

# ---- Chân đế đá, cột gỗ, núm đồng ----
body.cyl(0.2, 0.24, 0.16, P.STONE, 0, 0.08, 0, seg=8)
body.cyl(0.05, 0.07, 4.5, P.WOOD_DARK, 0, 2.33, 0, seg=7)
body.cyl(0.1, 0.1, 0.06, P.GOLD, 0, 4.6, 0, seg=8)
body.cyl(0.02, 0.09, 0.14, P.GOLD, 0, 4.7, 0, seg=6)

# ---- Tán ngang vắt về +X với dây treo nhỏ ----
body.box(1.3, 0.07, 0.07, P.WOOD_DARK, 0.35, 4.42, 0)
body.cyl(0.012, 0.012, 0.34, P.GOLD, 0.93, 4.25, 0, seg=4)
body.box(0.05, 0.05, 0.05, P.GOLD, 0.93, 4.05, 0)

# ---- Lá băng: lưới 6 hàng, viền vàng hai đầu, thân đỏ ----
COLS, ROWS = 5, 6
X0, X1 = 0.14, 1.0
Y0, Y1 = 4.36, 1.72
ROW_COLORS = [P.GOLD_BRIGHT, P.LANTERN_RED, P.LANTERN_RED, P.LANTERN_RED, P.LANTERN_RED, P.GOLD_BRIGHT]


def wob(y, x):
    """Lả theo chiều dọc và phồng ra sau nhẹ như vãi theo gió."""
    t = (Y0 - y) / (Y0 - Y1)
    u = (x - X0) / (X1 - X0)
    return 0.09 * (1 - t) * u + 0.22 * t * (1 - t)


for i in range(COLS):
    for j in range(ROWS):
        x0 = X0 + i * (X1 - X0) / COLS
        x1 = X0 + (i + 1) * (X1 - X0) / COLS
        y0 = Y0 - j * (Y0 - Y1) / ROWS
        y1 = Y0 - (j + 1) * (Y0 - Y1) / ROWS
        cloth.quad([
            (x0, y0, wob(y0, x0)), (x1, y0, wob(y0, x1)),
            (x1, y1, wob(y1, x1)), (x0, y1, wob(y1, x0)),
        ], ROW_COLORS[j], jitter=0.04)

_, _ = body.build('banner_body')
_, _ = cloth.build('cloth')
export_glb(sys.argv[-1], budget=2500)
