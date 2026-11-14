import * as THREE from 'three';
import { ROD_POINTS, LINE } from './vua-cau-ca-rod.js';

// Tòa ngồi thiền của Vua Câu Cá, dựng bằng hàm add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của
// cultivation-manifestation. Cùng dáng với bản đứng, thu nhỏ theo người ngồi (đầu ở y ≈ 0.8):
//  tầng 3 (stage 0): hai con cá vọt chéo nhau trước gối;
//  tầng 4 (stage 1): sáu con cá vọt quanh người ngồi, hai vòng gợn nước dưới tòa;
//  tầng 5 (stage 2): cần câu vồng qua đầu, dây buông, cá chép lớn treo trước vai trái, gợn nước.
const SEATED_HEAD_Y = 0.8, STANDING_HEAD_Y = 1.07;
const ball = new THREE.SphereGeometry(1, 10, 6), cone = new THREE.ConeGeometry(1, 1, 6), line = new THREE.CylinderGeometry(1, 1, 1, 4);
const ripple = new THREE.TorusGeometry(1, 0.015, 4, 40);
const seated = ([x, y, z]) => new THREE.Vector3(x * 0.85, (y - STANDING_HEAD_Y) * 0.85 + SEATED_HEAD_Y, z * 0.9);

/** Cá giản lược tại (x, y, z): thân thoi + đuôi; đầu theo hướng yaw (quanh trục đứng), ngóc lên pitch. */
function fish(add, x, y, z, s, yaw, pitch) {
  add(ball, x, y, z, 0.14 * s, 0.06 * s, 0.035 * s, 0, yaw, pitch, 'YZX');
  const back = 0.19 * s, dx = Math.cos(pitch) * Math.cos(yaw), dy = Math.sin(pitch), dz = -Math.cos(pitch) * Math.sin(yaw);
  add(cone, x - dx * back, y - dy * back, z - dz * back, 0.07 * s, 0.11 * s, 0.02 * s, 0, yaw, pitch - Math.PI / 2, 'YZX');
}

function rings(add, radii) {
  for (const r of radii) add(ripple, 0, 0.03, 0, r, r, r, -Math.PI / 2, 0, 0);
}

export function buildVuaCauCaThrone(stage, add) {
  if (stage === 0) {
    fish(add, -0.24, 0.34, 0.55, 0.9, 0.3, 0.55);
    fish(add, 0.24, 0.34, 0.55, 0.9, Math.PI - 0.3, 0.55);
    return;
  }
  if (stage === 1) {
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) / 6 * Math.PI * 2;
      // Hướng bơi tiếp tuyến vòng tròn (ngược kim đồng hồ khi nhìn từ trên).
      fish(add, Math.sin(a) * 0.75, 0.32 + 0.08 * (i % 2), Math.cos(a) * 0.75, 1, a, 0.45);
    }
    rings(add, [0.5, 0.82]);
    return;
  }
  const pts = ROD_POINTS.map(seated), curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const rod = new THREE.TubeGeometry(curve, 40, 0.016, 5, false);
  add(rod, 0, 0, 0, 1, 1, 1); rod.dispose();
  const tip = pts[pts.length - 1], len = LINE.length * 0.85;
  add(line, tip.x, tip.y - len / 2, tip.z, 0.004, len, 0.004);
  // Cá chép lớn treo đầu lên ở cuối dây.
  fish(add, tip.x, tip.y - len - 0.2, tip.z, 1.5, 0, Math.PI / 2);
  rings(add, [0.45, 0.75, 1.0]);
}
