import * as THREE from 'three';
import { spineControl, HEAD_Y } from './kim-long-spine.js';
import { sstep } from './aura-rhythm.js';

// Tòa ngồi thiền của Kim Long, dựng bằng hàm add(geo, x, y, z, sx, sy, sz, rx, ry, rz) của
// cultivation-manifestation. Vòm rồng thu nhỏ cùng dáng với bản đứng (đầu người ngồi ở y ≈ 0.8):
//  tầng 3 (stage 0): long châu lơ lửng trước gối, hai cụm mây vàng hai bên;
//  tầng 4 (stage 1): nửa thân rồng từ vai trái vươn lên sau đầu, đầu rồng ngậm châu ở đỉnh;
//  tầng 5 (stage 2): vòm rồng đầy đủ qua đầu, vây lưng, đầu rồng ở vai phải ngậm châu, cung bán
//    nguyệt sau lưng, đài mây dưới gối (thay tầng 4).
export const SEATED_HEAD_Y = 0.8;
const ball = new THREE.SphereGeometry(1, 12, 8), cone = new THREE.ConeGeometry(1, 1, 5);
const seated = ([x, y, z]) => new THREE.Vector3(x * 0.82, (y - HEAD_Y) * 0.85 + SEATED_HEAD_Y, z * 0.9 - 0.05);

/** Ống thuôn dọc đường cong: bán kính radius(u). */
function taperedTube(curve, segs, radius) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, 8, false), pos = geo.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPointAt(u, c);
    for (let j = 0; j <= 8; j++) {
      const k = i * 9 + j;
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * radius(u), c.y + (pos.getY(k) - c.y) * radius(u), c.z + (pos.getZ(k) - c.z) * radius(u));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const cloudPuff = (add, x, y, z, s) => {
  add(ball, x, y, z, 0.2 * s, 0.09 * s, 0.14 * s);
  add(ball, x - 0.14 * s, y - 0.02, z + 0.02, 0.12 * s, 0.07 * s, 0.1 * s);
  add(ball, x + 0.15 * s, y - 0.01, z - 0.02, 0.13 * s, 0.075 * s, 0.1 * s);
};

/** Đầu rồng giản lược tại p, mõm theo hướng dir; long châu trước mõm. */
function head(add, p, dir) {
  const yaw = Math.atan2(dir.x, dir.z), pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
  const at = d => p.clone().add(dir.clone().multiplyScalar(d));
  add(ball, p.x, p.y, p.z, 0.08, 0.07, 0.1, pitch, yaw, 0, 'YXZ');
  const snout = at(0.12); add(ball, snout.x, snout.y, snout.z, 0.055, 0.04, 0.1, pitch, yaw, 0, 'YXZ');
  for (const s of [-1, 1]) add(cone, p.x + s * 0.05, p.y + 0.1, p.z - 0.04, 0.018, 0.16, 0.018, -0.5, 0, s * 0.35);
  const pearl = at(0.24); add(ball, pearl.x, pearl.y, pearl.z, 0.07, 0.07, 0.07);
}

function dragon(add, from, to, withHead) {
  const pts = spineControl().map(seated), curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const sub = new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => curve.getPointAt(from + (to - from) * i / 24)), false, 'centripetal');
  const geo = taperedTube(sub, 48, u => 0.015 + 0.075 * sstep(0, 0.45, from + (to - from) * u));
  add(geo, 0, 0, 0, 1, 1, 1); geo.dispose();
  // Vây lưng: gai nhỏ nhô ra ngoài vòm (xa trục giữa).
  for (let i = 1; i < 12; i++) {
    const u = from + (to - from) * i / 12, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const out = new THREE.Vector3(-t.y, t.x, 0).normalize();
    if (out.dot(new THREE.Vector3(p.x, p.y - SEATED_HEAD_Y, 0)) < 0) out.negate();
    add(cone, p.x + out.x * 0.08, p.y + out.y * 0.08, p.z, 0.025, 0.1, 0.012, 0, 0, Math.atan2(-out.x, out.y));
  }
  if (withHead) head(add, curve.getPointAt(to), curve.getTangentAt(to));
}

export function buildKimLongThrone(stage, add) {
  if (stage === 0) {
    add(ball, 0, 0.36, 0.55, 0.09, 0.09, 0.09);
    cloudPuff(add, -0.62, 0.14, 0.12, 1); cloudPuff(add, 0.62, 0.14, 0.12, 1);
    return;
  }
  if (stage === 1) { dragon(add, 0, 0.5, true); return; }
  dragon(add, 0, 1, true);
  const arc = new THREE.TorusGeometry(0.62, 0.02, 6, 40, Math.PI);
  add(arc, 0, SEATED_HEAD_Y + 0.42, -0.75, 1, 1, 1); arc.dispose();
  for (let i = 0; i < 6; i++) {
    const a = (i + 0.5) / 6 * Math.PI * 2;
    cloudPuff(add, Math.sin(a) * 0.72, 0.06, Math.cos(a) * 0.72, 0.9);
  }
}
