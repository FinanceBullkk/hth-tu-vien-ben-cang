import { featherGeometry, petalGeometry } from './hong-lien-materials.js';

// Tòa ngồi thiền của Hồng Liên (effect 4), riêng khỏi cánh pha lê của Hắc Ám (8).
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) là bộ gộp hình của cultivation-manifestation.
//  Tầng 3 (stage 0): búp hỏa liên sáu cánh quanh người + ba lông vũ lửa nhỏ lơ lửng.
//  Tầng 4 (stage 1): đài sen lửa hai tầng 8 + 8 cánh dưới người ngồi.
//  Tầng 5 (stage 2): đôi cánh chu tước xoè sau lưng (mỗi bên chín lông) + phượng vĩ năm lông rủ sau tòa.
const lotusRing = (add, n, r, len, lean, offset = 0) => {
  for (let i = 0; i < n; i++) {
    const a = (i + offset) * Math.PI * 2 / n;
    add(petalGeometry(), Math.sin(a) * r, 0.04, Math.cos(a) * r, len * 1.7, len, -len, lean, a, 0, 'YXZ');
  }
};

export function buildHongLienThrone(add, stage) {
  if (stage === 0) {
    lotusRing(add, 6, 0.5, 0.36, 0.55, 0.5);
    for (const [x, y, z, rz] of [[-0.62, 0.62, -0.25, 0.7], [0.66, 0.78, -0.3, -0.8], [0.1, 1.45, -0.55, -0.25]]) {
      add(featherGeometry(), x, y, z, 0.55, 0.32, 0.32, 0.2, 0, rz);
    }
  } else if (stage === 1) {
    lotusRing(add, 8, 0.42, 0.55, 0.55);
    lotusRing(add, 8, 0.6, 0.45, 1.0, 0.5);
  } else {
    const armA = 0.95, yaw = 0.42;
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const d = (0.1 + i * 0.09) * 0.8, ang = 1.9 - i * 0.2, len = 0.62 + i * 0.07;
      const lx = side * Math.sin(armA) * d, ly = Math.cos(armA) * d;
      add(featherGeometry(), side * 0.22 + lx * Math.cos(yaw), 0.88 + ly, -0.5 - Math.abs(lx) * Math.sin(yaw),
        side * len * 1.8, len, len, 0, side * yaw, -side * ang, 'YXZ');
    }
    for (let k = 0; k < 5; k++) {
      const spread = (k - 2) * 0.32, len = 1.15 - Math.abs(k - 2) * 0.12;
      add(featherGeometry(), 0, 0.32, -0.45, len * 1.8, len, len, -1.25, spread, 0, 'YXZ');
    }
  }
}
