import * as THREE from 'three';
import { sstep } from './aura-rhythm.js';
import { tubeGeometry } from './long-quyen-body-geometry.js';
import { dragonHeadGeometry } from './long-quyen-head-geometry.js';
import { spineRadius } from './long-quyen-spine.js';

// Tòa ngồi thiền của Long Quyền (thay việc mượn tòa sóng Lưu Ly), dựng bằng hàm
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của cultivation-manifestation. Người ngồi có đầu ở
// y ≈ 0.8, nhìn về +z. Cùng bóng dáng với lúc đứng: hỏa long xoắn từ đất lên rồi vươn ra trước bên phải.
//  tầng 3 (stage 0): nửa vòng thân rồng nhỏ cuộn quanh gối, đầu ngẩng bên hông phải;
//  tầng 4 (stage 1): rồng xoắn một vòng quanh người ngồi, đầu vươn ra trước ngực phải;
//  tầng 5 (stage 2): xoắn 1,5 vòng lên cao sau lưng, đầu vươn qua vai phải ra trước + ấn quyền vuông.
const STAGES = [
  { turns: 0.5, r: [0.62, 0.6], y: [0.05, 0.3], tilt: 0, end: [0.52, 0.34, 0.4], thick: 0.7, head: 0.9 },
  { turns: 1, r: [0.68, 0.6], y: [0.04, 0.45], tilt: 0.12, end: [0.5, 0.48, 0.5], thick: 0.85, head: 1.05 },
  { turns: 1.5, r: [0.72, 0.62], y: [0.04, 0.62], tilt: 0.2, end: [0.5, 0.6, 0.55], thick: 1, head: 1.2 },
];
const COIL = 0.75;

/** Đường thân rồng của một tầng: đoạn xoắn (s ≤ COIL) rồi đoạn vươn bậc ba tới gáy. */
function stagePath(st) {
  const [x3, y3, z3] = st.end;
  return (s, out) => {
    if (s <= COIL) {
      const k = s / COIL, phi = Math.PI / 2 + st.turns * Math.PI * 2 * (1 - k);
      const r = st.r[0] + (st.r[1] - st.r[0]) * k;
      return out.set(r * Math.sin(phi), st.y[0] + (st.y[1] - st.y[0]) * k - st.tilt * sstep(0.2, 0.8, k) * Math.cos(phi), r * Math.cos(phi));
    }
    const u = (s - COIL) / (1 - COIL), v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
    const r1 = st.r[1], y1 = st.y[1];
    return out.set(a * r1 + b * r1 + c * (x3 + 0.02) + d * x3, a * y1 + b * y1 + c * y3 + d * y3,
      b * 0.22 + c * (z3 - 0.18) + d * z3);
  };
}

/** Khung { p, t, n, b } theo đường bất kỳ: bụng ôm vào người khi xoắn, chúc xuống khi vươn. */
function pathFrame(point) {
  const ta = new THREE.Vector3(), tb = new THREE.Vector3();
  return (s, f = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }) => {
    point(s, f.p); point(Math.min(1, s + 0.002), ta); point(Math.max(0, s - 0.002), tb);
    f.t.subVectors(ta, tb).normalize();
    const len = Math.hypot(f.p.x, f.p.z) || 1, w = sstep(COIL - 0.05, COIL + 0.12, s);
    f.n.set(-f.p.x / len * (1 - w), -w, -f.p.z / len * (1 - w));
    f.n.addScaledVector(f.t, -f.n.dot(f.t)).normalize();
    f.b.crossVectors(f.t, f.n);
    return f;
  };
}

const spike = new THREE.ConeGeometry(1, 1, 5), box = new THREE.BoxGeometry(1, 1, 1);

export function buildLongQuyenThrone(stage, add) {
  const st = STAGES[stage], frameAt = pathFrame(stagePath(st)), radius = s => spineRadius(s) * st.thick;
  const body = tubeGeometry(frameAt, radius, 70, 8, false);
  add(body, 0, 0, 0, 1, 1, 1); body.dispose();
  // Gai lưng: chóp nhọn dọc sống lưng (−n), chếch về phía đuôi.
  const f = frameAt(0), dir = new THREE.Vector3(), e = new THREE.Euler(), q = new THREE.Quaternion();
  for (let s = 0.18; s < 0.95; s += 0.06) {
    frameAt(s, f);
    const r = radius(s), h = 0.05 + 0.04 * Math.sin(Math.PI * s);
    dir.copy(f.n).multiplyScalar(-0.85).addScaledVector(f.t, -0.45).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); e.setFromQuaternion(q);
    const p = f.p.clone().addScaledVector(f.n, -r).addScaledVector(dir, h * 0.5);
    add(spike, p.x, p.y, p.z, 0.022 * st.thick, h, 0.012, e.x, e.y, e.z);
  }
  // Đầu rồng theo tiếp tuyến cuối thân (order YXZ: quay hướng rồi ngẩng).
  frameAt(1, f);
  const yaw = Math.atan2(f.t.x, f.t.z), pitch = -Math.asin(Math.max(-1, Math.min(1, f.t.y))), hs = st.head;
  const head = dragonHeadGeometry();
  for (const g of [head.skull, head.horns]) add(g, f.p.x, f.p.y, f.p.z, hs, hs, hs, pitch, yaw, 0, 'YXZ');
  if (stage < 2) return;
  // Ấn quyền vuông: khung bốn thanh + chữ thập giữa, dựng đứng trước miệng rồng.
  const c = f.p.clone().addScaledVector(f.t, 0.36 * hs + 0.3), half = 0.17;
  for (const [dx, dy, w, h] of [[0, half, half * 2, 0.025], [0, -half, half * 2, 0.025], [half, 0, 0.025, half * 2],
    [-half, 0, 0.025, half * 2], [0, 0, half * 1.2, 0.018], [0, 0, 0.018, half * 1.2]]) {
    add(box, c.x + Math.cos(yaw) * dx, c.y + dy, c.z - Math.sin(yaw) * dx, w, h, 0.02, 0, yaw, 0);
  }
}
