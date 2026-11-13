import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hình khối tĩnh của Kim Long, mỗi phần gắn thuộc tính tone (0 vàng, 1 ngà, 2 mắt sáng) để một
// shader tô cả khối. Hệ toạ độ đầu: +Z mõm, +Y đỉnh đầu, X sang bên; miệng há, ngậm long châu ở
// PEARL_LOCAL. Chân rồng: +Y hướng lưng, +Z hướng đầu, chân vươn xuống −Y và ra +X.
export const PEARL_LOCAL = new THREE.Vector3(0, -0.03, 0.31);
export const PEARL_R = 0.072;
const ball = new THREE.SphereGeometry(1, 16, 12);
const cone = new THREE.ConeGeometry(1, 1, 6);
const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();

function placed(list, geo, tone, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0]) {
  const g = geo.clone().applyMatrix4(m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  g.setAttribute('tone', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(tone), 1));
  list.push(g);
}
function tube(list, tone, points, radius) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 6, false);
  placed(list, g, tone, [0, 0, 0], [1, 1, 1]); g.dispose();
}
function merge(list) {
  const out = mergeGeometries(list); list.forEach(g => g.dispose());
  return out;
}

/** Đầu rồng: sọ, mõm, hàm dưới há, răng nanh, mày, mắt, mang vây, đôi sừng nai có nhánh, mào. */
export function dragonHeadGeometry() {
  const L = [];
  placed(L, ball, 0, [0, 0.02, 0.0], [0.12, 0.1, 0.15]);
  placed(L, ball, 0, [0, 0.03, 0.17], [0.085, 0.052, 0.17]);
  placed(L, ball, 0, [0, 0.048, 0.31], [0.064, 0.045, 0.05]);
  for (const s of [-1, 1]) {
    placed(L, ball, 1, [s * 0.036, 0.074, 0.33], [0.02, 0.016, 0.02]);
    placed(L, ball, 0, [s * 0.07, 0.095, 0.07], [0.05, 0.026, 0.075], [0, 0, s * 0.3]);
    placed(L, ball, 2, [s * 0.084, 0.064, 0.085], [0.024, 0.024, 0.024]);
    placed(L, cone, 1, [s * 0.05, -0.04, 0.26], [0.012, 0.05, 0.012], [Math.PI, 0, 0]);
    placed(L, cone, 1, [s * 0.044, -0.085, 0.24], [0.01, 0.04, 0.01], [0.35, 0, 0]);
    // Mang vây hai bên má, xoè ra sau.
    for (let k = 0; k < 3; k++) placed(L, cone, 0, [s * 0.12, -0.02 + k * 0.03, -0.04 - k * 0.02], [0.022, 0.12, 0.012], [-1.2, 0, -s * (1.3 - k * 0.15)]);
    // Sừng nai: nhánh chính cong ra sau lên, một nhánh phụ hướng ra ngoài.
    tube(L, 1, [[s * 0.05, 0.1, -0.02], [s * 0.09, 0.2, -0.12], [s * 0.1, 0.28, -0.26], [s * 0.07, 0.33, -0.4]], 0.017);
    tube(L, 1, [[s * 0.09, 0.2, -0.12], [s * 0.15, 0.27, -0.13], [s * 0.18, 0.31, -0.08]], 0.011);
    tube(L, 1, [[s * 0.1, 0.28, -0.26], [s * 0.15, 0.36, -0.27]], 0.009);
  }
  placed(L, ball, 0, [0, -0.07, 0.15], [0.068, 0.03, 0.15], [0.35, 0, 0]);
  // Mào lửa dọc đỉnh đầu.
  for (let k = 0; k < 4; k++) placed(L, cone, 0, [0, 0.11 - k * 0.005, 0.06 - k * 0.07], [0.016, 0.09 - k * 0.012, 0.03], [-0.9, 0, 0]);
  return merge(L);
}

/** Chân rồng (một bên): đùi, cẳng, bàn ba móng vuốt ngà, chỏm lông lửa ở khuỷu. */
export function dragonLegGeometry() {
  const L = [];
  tube(L, 0, [[0, 0, 0], [0.07, -0.1, -0.03], [0.13, -0.17, 0.03], [0.15, -0.2, 0.11]], 0.032);
  placed(L, ball, 0, [0.15, -0.2, 0.12], [0.04, 0.03, 0.045]);
  for (let k = -1; k <= 1; k++) placed(L, cone, 1, [0.15 + k * 0.03, -0.21, 0.17], [0.011, 0.07, 0.011], [Math.PI / 2 + 0.4, 0, -k * 0.4]);
  placed(L, cone, 0, [0.09, -0.12, -0.06], [0.016, 0.1, 0.012], [-2.3, 0, -0.5]);
  return merge(L);
}

/** Vây lưng: màng lửa tam giác, gốc dọc +Z (uv.x), ngọn vuốt về sau (−Z) và lên +Y (uv.y). */
export function finGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 6), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const s = uv.getX(i), h = uv.getY(i), w = 1 - h * 0.92;
    p.setXYZ(i, 0.03 * h * Math.sin(s * Math.PI), h, (s - 0.5) * w - h * 0.55 + 0.12 * Math.sin(h * Math.PI) * (s - 0.5));
  }
  g.computeVertexNormals();
  return g;
}
