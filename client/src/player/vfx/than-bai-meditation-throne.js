import * as THREE from 'three';

// Tòa ngồi thiền của Thần Bài, dựng bằng hàm add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của
// cultivation-manifestation (mọi mảnh gộp thành một khối, tô bằng shader viền sáng chung):
//  tầng 3 (stage 0): bốn lá Át xoè nhỏ trước gối;
//  tầng 4 (stage 1): tám lá bài dựng quanh người ngồi, mặt hướng ra ngoài, ba chồng phỉnh;
//  tầng 5 (stage 2): quạt Tứ Át lớn sau đầu và vành chồng phỉnh quanh tòa (thay tầng 4).
const card = new THREE.BoxGeometry(1, 1, 1), chip = new THREE.CylinderGeometry(1, 1, 1, 14);
const CARD_W = 0.17, CARD_H = 0.24, CARD_T = 0.006;

/** Quạt n lá xoè quanh tâm (cx, cy, cz), lá giữa dựng thẳng, mỗi lá lệch spread rad. */
function fan(add, cx, cy, cz, scale, n, spread) {
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2, a = k * spread, r = 0.18 * scale;
    add(card, cx + Math.sin(a) * r, cy + Math.cos(a) * r, cz - Math.abs(k) * 0.01, CARD_W * scale, CARD_H * scale, CARD_T, 0, 0, -a);
  }
}

function chipStack(add, x, z, height) {
  for (let i = 0; i < height; i++) add(chip, x, 0.02 + i * 0.022, z, 0.06, 0.018, 0.06);
}

export function buildThanBaiThrone(stage, add) {
  if (stage === 0) {
    fan(add, 0, 0.28, 0.55, 1, 4, 0.32);
    return;
  }
  if (stage === 1) {
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2;
      add(card, Math.sin(a) * 0.72, 0.2, Math.cos(a) * 0.72, CARD_W, CARD_H, CARD_T, -0.15, a, 0, 'YXZ');
    }
    chipStack(add, -0.5, 0.45, 5); chipStack(add, 0.5, 0.45, 4); chipStack(add, 0, -0.62, 6);
    return;
  }
  fan(add, 0, 0.95, -0.55, 2.2, 4, 0.36);
  for (let i = 0; i < 10; i++) {
    const a = (i + 0.5) / 10 * Math.PI * 2;
    chipStack(add, Math.sin(a) * 0.78, Math.cos(a) * 0.78, 2 + (i % 3));
  }
}
