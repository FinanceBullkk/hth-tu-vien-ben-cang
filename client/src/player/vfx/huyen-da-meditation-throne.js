import * as THREE from 'three';
import { featherGeometry } from './hong-lien-materials.js';

// Tòa ngồi thiền của Huyền Dạ (thay đôi cánh tinh thể đang dùng chung với Hồng Liên), dựng bằng
// hàm add(geo, x, y, z, sx, sy, sz, rx, ry, rz) của cultivation-manifestation. Lớp tòa vẽ cộng màu
// nên khoảng âm của nhật thực là LÒNG VÀNH ĐỂ TRỐNG. Toạ độ sau lưng người ngồi (đầu ở y ≈ 0.8):
//  tầng 3 (stage 0): ba lông quạ nhỏ lơ lửng quanh vai và sau đầu;
//  tầng 4 (stage 1): vành nhật thực sau đầu, tia corona ngắn cong xoắn vào tâm, lòng rỗng;
//  tầng 5 (stage 2): vành lớn hơn + ba nhánh lông quạ xếp xoắn ốc cuộn vào vành (thay tầng 4).
const C = { y: 1.12, z: -0.6 };
const ray = new THREE.OctahedronGeometry(1);

function eclipseRing(add, radius, rays) {
  const ring = new THREE.TorusGeometry(radius, 0.045, 10, 72), inner = new THREE.TorusGeometry(radius - 0.06, 0.012, 6, 72);
  add(ring, 0, C.y, C.z, 1, 1, 1); add(inner, 0, C.y, C.z, 1, 1, 1);
  ring.dispose(); inner.dispose();
  // Tia corona: mũi nhọn dài ngắn xen kẽ, nghiêng theo chiều xoáy như bị cuốn vào tâm.
  for (let i = 0; i < rays; i++) {
    const a = i * Math.PI * 2 / rays, len = (i % 2 ? 0.1 : 0.17) * radius / 0.36, r = radius + 0.06 + len;
    add(ray, Math.sin(a) * r, C.y + Math.cos(a) * r, C.z, 0.022, len, 0.018, 0, 0, -a + 0.45);
  }
}

/** Lông quạ dọc nhánh xoắn: tiến độ k 0 (ngoài) → 1 (sát vành), mũi lông hướng theo chiều hút. */
function featherArm(add, arm, arms, count, outer, inner) {
  const at = k => {
    const r = outer + (inner - outer) * k, th = arm * Math.PI * 2 / arms + 0.4 - 2.1 * k;
    return [Math.sin(th) * r, C.y + Math.cos(th) * r];
  };
  for (let j = 0; j < count; j++) {
    const k = j / count, [x, y] = at(k), [nx, ny] = at(k + 0.05), s = 0.42 - 0.2 * k;
    add(featherGeometry(), x, y, C.z + 0.03 * j, s, s, s, 0.25, 0.3 * Math.sin(j + arm), Math.atan2(-(nx - x), ny - y));
  }
}

export function buildHuyenDaThrone(stage, add) {
  if (stage === 0) {
    add(featherGeometry(), -0.62, 0.62, -0.3, 0.36, 0.36, 0.36, 0.3, 0.4, 0.7);
    add(featherGeometry(), 0.64, 0.72, -0.34, 0.32, 0.32, 0.32, 0.2, -0.4, -0.9);
    add(featherGeometry(), 0.12, 1.18, -0.6, 0.3, 0.3, 0.3, 0, 0, -0.35);
    return;
  }
  if (stage === 1) { eclipseRing(add, 0.36, 18); return; }
  eclipseRing(add, 0.42, 24);
  for (let arm = 0; arm < 3; arm++) featherArm(add, arm, 3, 4, 1.15, 0.6);
}
