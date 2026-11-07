"""Khung quán trà dựng lại bằng Blender — thay phần shell trong buildTea (monastery.js:372-378).
Toạ độ gốc: (TEA.x, TEA.z) trên mặt sân, KHỚP CHÍNH XÁC footprint cũ:
sàn 10x8.2 tại z+0.3, cột (±4.4, dz -3.2/+3.8), dầm y3.2, mái 12.2x9.8 h2.1 tại y3.25.
Bàn/ấm/xi nghi/biển hiệu vẫn do code dựng. Chạy: blender ... -- <out.glb>
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import Batch, export_glb, new_scene
import palette as P

new_scene()
b = Batch(seed=71)

# ---- Sàn gỗ ----
b.box(10, 0.16, 8.2, '#6d4a2c', 0, 0.08, 0.3, jitter=0.02)

# ---- Bốn cột đỏ ----
for dx in (-4.4, 4.4):
    for dz in (-3.2, 3.8):
        b.cyl(0.17, 0.22, 3.2, P.PILLAR, dx, 1.6, dz + 0.3, seg=8)

# ---- Xà dọc + ngang ----
for dz in (-3.2, 3.8):
    b.box(9.2, 0.22, 0.22, P.WOOD_DARK, 0, 3.2, dz + 0.3)
for dx in (-4.4, 4.4):
    b.box(0.22, 0.22, 7.4, P.WOOD_DARK, dx, 3.2, 0.3)

# ---- Khối đầu hiêu (bracket) dưới mép mái, chi tiết kiểu võ hiệp ----
for dx in (-4.4, 0, 4.4):
    for dz in (-3.2, 3.8):
        b.box(0.26, 0.26, 0.26, P.WOOD_DARK, dx, 3.42, dz + 0.3)

# ---- Mái cong lớn + nóc + đầu đao (kích thước y hệt code cũ) ----
b.roof(12.2, 9.8, 2.1, 0, 3.25, 0.3)

# ---- Biển hiệu gỗ trống làm nền cho chữ "Quán trà" (code đặt plane chữ tại z+3.95,
# phía nam của tấm này nên chữ vẫn thấy rõ từ sân) ----
b.box(2.6, 0.7, 0.08, P.WOOD_DARK, 0, 2.75, 3.55)
b.box(2.7, 0.06, 0.1, P.GOLD, 0, 3.12, 3.55)

_, _ = b.build('tea_pavilion_body')
export_glb(sys.argv[-1], budget=9000)
