import * as THREE from 'three';
import { cloudLiteGeometry } from './xich-diem-cloud-geometry.js';
import { TURN } from './xich-diem-layout.js';

// Tòa ngồi thiền của Xích Diễm (thay đoá sen theme 0 đang rơi về), dựng bằng hàm
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của cultivation-manifestation. Cùng bóng dáng khi
// đứng: THẤP và RỘNG, người ngồi trên đài mây; không dựng gì sau lưng hay trên đầu (đầu ở y ≈ 0.8).
//  tầng 3 (stage 0): ba cuộn mây lửa nhỏ lơ lửng quanh hông;
//  tầng 4 (stage 1): đài mây — một vòng cuộn tường vân thấp làm bệ;
//  tầng 5 (stage 2): đài mây hai tầng + vòng lửa nằm ngang quanh eo có bốn khóa mây (thay tầng 4).

/** Một cuộn mây đứng ở góc a quanh người, bán kính r, mặt xoay xéo ra ngoài. */
function cloud(add, a, r, y, s, flip = 1) {
  add(cloudLiteGeometry(), Math.sin(a) * r, y, Math.cos(a) * r, s * flip, s, s, -0.12, a + TURN, 0, 'YXZ');
}

function bank(add, n, r, y, s, offset = 0) {
  for (let i = 0; i < n; i++) cloud(add, (i + offset) * Math.PI * 2 / n, r, y, s, i % 3 === 1 ? -1 : 1);
}

export function buildXichDiemThrone(stage, add) {
  if (stage === 0) {
    cloud(add, -1.3, 0.66, 0.2, 0.32); cloud(add, 1.6, 0.66, 0.26, 0.3, -1); cloud(add, Math.PI, 0.66, 0.16, 0.34);
    return;
  }
  if (stage === 1) { bank(add, 9, 0.78, -0.02, 0.42); return; }
  bank(add, 11, 0.98, -0.03, 0.46);
  bank(add, 7, 0.62, 0.08, 0.34, 0.5);
  // Vòng lửa ngang eo: vành dẹt nằm ngang + bốn khóa mây nhỏ.
  const ring = new THREE.TorusGeometry(0.72, 0.024, 6, 72);
  add(ring, 0, 0.42, 0, 1, 1, 0.5, Math.PI / 2, 0, 0); ring.dispose();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    add(cloudLiteGeometry(), Math.sin(a) * 0.72, 0.36, Math.cos(a) * 0.72, 0.16, 0.16, 0.16, 0, a, 0, 'YXZ');
  }
}
