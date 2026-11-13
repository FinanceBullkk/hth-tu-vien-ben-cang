import { featherGeometry } from './hong-lien-materials.js';
import { WING, PRIMARIES, SECONDARIES, COVERTS } from './hong-lien-wing-frame.js';

// Tòa ngồi thiền của Hồng Liên (effect 4): đôi cánh chu tước lớn dần theo tầng, không đài sen
// (đài sen là của Kim Liên), không cánh pha lê như Hắc Ám (8).
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) là bộ gộp hình của cultivation-manifestation.
//  Tầng 3 (stage 0): phượng vĩ năm lông xoè trên đất sau lưng + ba lông vũ lơ lửng.
//  Tầng 4 (stage 1): đôi cánh khép hờ dựng sau vai, ngọn ôm về trước.
//  Tầng 5 (stage 2): đôi cánh giang ngang chữ V rộng (thay cho tầng 4), phượng vĩ tầng 3 vẫn trải sau.
const ROOT_Y = 0.92, ROOT_Z = -0.42;

// Một bên cánh: lông xoè từ cánh tay góc armA, ngả về sau/trước theo yaw, thu nhỏ theo scale.
function wing(add, side, feathers, armA, yaw, scale) {
  for (const [s, ang, len, dz] of feathers) {
    const d = s * WING.arm * scale, lx = side * Math.sin(armA) * d, ly = Math.cos(armA) * d, l = len * scale;
    const a = ang + (armA - WING.base);
    add(featherGeometry(), side * 0.2 + lx * Math.cos(yaw), ROOT_Y + ly, ROOT_Z + dz - lx * Math.sin(side * yaw),
      side * l * 1.8, l, l, 0, side * yaw, -side * a, 'YXZ');
  }
}

export function buildHongLienThrone(add, stage) {
  if (stage === 0) {
    for (let k = 0; k < 5; k++) {
      const spread = (k - 2) * 0.36, len = 1.25 - Math.abs(k - 2) * 0.14;
      add(featherGeometry(), 0, 0.12, -0.42, len * 1.8, len, len, -1.42, spread, 0, 'YXZ');
    }
    for (const [x, y, z, rz] of [[-0.66, 0.7, -0.2, 0.9], [0.7, 0.85, -0.25, -1.0], [-0.2, 1.55, -0.45, 0.35]]) {
      add(featherGeometry(), x, y, z, 0.55, 0.32, 0.32, 0.2, 0, rz);
    }
  } else if (stage === 1) {
    const folded = [...PRIMARIES, ...SECONDARIES.slice(0, 4)].map(([s, ang, len, dz]) => [s, ang * 0.55, len * 0.7, dz]);
    for (const side of [-1, 1]) wing(add, side, folded, 0.45, -0.45, 0.75);
  } else {
    for (const side of [-1, 1]) wing(add, side, [...PRIMARIES, ...SECONDARIES, ...COVERTS], WING.base, WING.yaw, 0.85);
  }
}
