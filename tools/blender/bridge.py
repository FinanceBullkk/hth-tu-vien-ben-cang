"""Cầu vòm gỗ vượt hồ sen — trục Đông Tây, đặt tại (-19, 0, -12).
Vòm khớp floorHeight() trong shared/layout.js: y = 0.06 + 1.15*(1-(x/5.6)^2).
Toạ độ gốc: giữa nhịp, mặt nước y=0, nhịp dọc theo trục X.
Chạy: blender --background --python bridge.py -- <out.glb>
"""
from math import atan

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
b = Batch(seed=33)

HALF = 5.6
PEAK = 1.15


def arch(x):
    return 0.06 + PEAK * (1 - (x / HALF) ** 2)


def slope(x):
    """Độ dốc vòm tại x để xoan thanh lan can."""
    return atan(-2 * PEAK * x / HALF ** 2) if abs(x) > 1e-4 else 0.0

# ---- Mặt cầu: ván gỗ men theo vòm ----
N = 28
for i in range(N):
    x = -HALF + (i + 0.5) * (2 * HALF / N)
    b.box(0.36, 0.08, 1.9, P.WOOD, x, arch(x) - 0.02, 0, jitter=0.06)

# ---- Dầm cột hai bên men theo vòm ----
for side in (-1, 1):
    for i in range(12):
        x0 = -HALF + (i + 0.5) * (2 * HALF / 12)
        b.box(0.78, 0.16, 0.2, P.WOOD_DARK, x0, arch(x0) - 0.13, side * 0.86,
              rz=slope(x0), jitter=0.04)

# ---- Xà ngang dưới mặt cầu ----
for i in range(7):
    x = -4.8 + i * 1.6
    b.box(0.16, 0.2, 1.68, P.WOOD_DARK, x, arch(x) - 0.2, 0)

# ---- Lan can: cột + tay vịn + thanh giữa, đỏ sẫm kiểu võ hiệp ----
for i in range(9):
    x = -HALF + 0.35 + i * 1.3
    for side in (-1, 1):
        b.box(0.09, 0.9, 0.09, P.PILLAR, x, arch(x) + 0.45, side * 0.9)
        b.box(0.13, 0.05, 0.13, P.GOLD, x, arch(x) + 0.93, side * 0.9, jitter=0)
for i in range(8):
    x0 = -HALF + 0.35 + (i + 0.5) * 1.3
    for side in (-1, 1):
        b.box(1.32, 0.07, 0.12, P.WOOD_DARK, x0, arch(x0) + 0.86, side * 0.9,
              rz=slope(x0), jitter=0)
        b.box(1.32, 0.05, 0.08, P.PILLAR, x0, arch(x0) + 0.47, side * 0.9,
              rz=slope(x0), jitter=0)

# ---- Trụ đầu cầu đá + bệ ----
for sx in (-1, 1):
    for sz in (-1, 1):
        b.box(0.5, 1.15, 0.5, P.STONE, sx * 5.45, 0.57, sz * 0.95, jitter=0.03)
        b.cyl(0.3, 0.34, 0.12, P.STONE_LIGHT, sx * 5.45, 1.2, sz * 0.95, seg=8)
    b.box(0.56, 0.18, 2.3, P.STONE, sx * 5.55, 0.09, 0, jitter=0.02)
# Hai trụ giữa đỡ nhịp
for sx in (-1, 1):
    b.cyl(0.24, 0.3, 0.9, P.STONE, sx * 2.2, 0.28, 0, seg=8)

# ---- Cặp đèn lồng treo đầu cầu ----
for sx in (-1, 1):
    b.box(0.06, 0.06, 0.5, P.WOOD_DARK, sx * 5.2, 1.06, 0.62, rz=0.6)
    b.box(0.2, 0.26, 0.2, P.LANTERN_RED, sx * 5.05, 0.86, 0.78, jitter=0)
    b.box(0.16, 0.03, 0.16, P.GOLD, sx * 5.05, 0.72, 0.78, jitter=0)

_, tris = b.build('bridge_body')
export_glb(sys.argv[-1], budget=9000)
