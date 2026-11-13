import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hình khối đầu hỏa long, toạ độ riêng: gốc ở gáy, mõm hướng +z, đỉnh đầu +y, dài khoảng 0,4.
// Sọ trứng dẹt, mõm thon có u mũi, gờ mày nổi, hàm dưới há nhẹ, nanh, mang cánh ở má; sừng nai hai
// nhánh vút ra sau; hai râu dài uốn sóng. Dùng chung mọi nhân vật và cả tòa ngồi thiền — không dispose.
let cached = null;

const sphere = new THREE.SphereGeometry(1, 14, 10), cone = new THREE.ConeGeometry(1, 1, 8);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();

function collect() {
  const parts = [];
  const put = (geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    q.setFromEuler(e.set(rx, ry, rz));
    parts.push(geo.clone().applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz))));
  };
  return { parts, put };
}

const tube = (points, radius) => new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 20, radius, 5, false);

function skull() {
  const { parts, put } = collect();
  put(sphere, 0, 0.02, 0.08, 0.105, 0.085, 0.13); // sọ
  const snout = new THREE.CylinderGeometry(0.05, 0.072, 0.18, 12);
  put(snout, 0, 0.0, 0.24, 1, 1, 1, Math.PI / 2 - 0.08); // mõm (trục y quay thành +z)
  put(sphere, 0, 0.022, 0.33, 0.058, 0.04, 0.045); // u mũi
  for (const s of [-1, 1]) {
    put(sphere, s * 0.056, 0.074, 0.14, 0.04, 0.024, 0.075, 0.2, s * 0.25); // gờ mày
    put(cone, s * 0.1, -0.005, 0.02, 0.028, 0.13, 0.028, -Math.PI / 2 - 0.3, 0, s * 0.9); // mang cánh ở má, chĩa ra sau
    put(cone, s * 0.03, -0.045, 0.3, 0.012, 0.05, 0.012, Math.PI); // nanh
  }
  const jaw = new THREE.CylinderGeometry(0.034, 0.056, 0.17, 10);
  put(jaw, 0, -0.065, 0.19, 1, 1, 1, Math.PI / 2 + 0.32); // hàm dưới há nhẹ
  snout.dispose(); jaw.dispose();
  const merged = mergeGeometries(parts); parts.forEach(g => g.dispose());
  return merged;
}

function horns() {
  const list = [];
  for (const s of [-1, 1]) {
    // Sừng vút ngang về sau (thấp), không dựng đứng — giữ trống trước mặt người.
    list.push(tube([[s * 0.05, 0.08, 0.06], [s * 0.08, 0.13, -0.04], [s * 0.1, 0.16, -0.17], [s * 0.1, 0.17, -0.3]], 0.013));
    list.push(tube([[s * 0.075, 0.12, -0.02], [s * 0.12, 0.16, 0.0], [s * 0.15, 0.19, -0.03]], 0.009)); // nhánh sừng
    // Râu dài: từ mép mũi uốn sóng ra hai bên rồi rủ xuống, về sau.
    list.push(tube([[s * 0.05, 0.0, 0.33], [s * 0.12, -0.05, 0.36], [s * 0.18, -0.04, 0.24], [s * 0.2, -0.12, 0.08],
      [s * 0.18, -0.2, -0.08], [s * 0.2, -0.22, -0.2]], 0.006));
  }
  const merged = mergeGeometries(list); list.forEach(g => g.dispose());
  return merged;
}

function eyes() {
  const { parts, put } = collect();
  for (const s of [-1, 1]) put(sphere, s * 0.072, 0.05, 0.17, 0.022, 0.018, 0.022);
  const merged = mergeGeometries(parts); parts.forEach(g => g.dispose());
  return merged;
}

/** { skull, horns, eyes } — ba geometry đầu rồng dùng chung. */
export function dragonHeadGeometry() {
  if (!cached) cached = { skull: skull(), horns: horns(), eyes: eyes() };
  return cached;
}

/** Vị trí miệng rồng trong toạ độ đầu (trước u mũi, giữa hai hàm). */
export const MOUTH = new THREE.Vector3(0, -0.03, 0.36);
