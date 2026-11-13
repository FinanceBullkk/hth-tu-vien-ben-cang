// Núi đá dựng kiểu Trương Gia Giới mọc từ thung lũng mây quanh gò: cột đá nhiều tầng gờ, đỉnh phủ xanh,
// tùng mọc trên đỉnh. Ba dáng cột dùng InstancedMesh, mỗi cột co giãn khác nhau; không đổ bóng, sương mù làm nhạt dần.
import * as THREE from 'three';
import { rng } from './builders.js';
import { terrainHeight } from './terrain.js';
import { ringPlacements } from './xianxia-backdrop-layout.js';

const ROCK_LOW = new THREE.Color('#77837f');
const ROCK_HIGH = new THREE.Color('#a9b0a6');
const MOSS = new THREE.Color('#5d8452');
const PINE = new THREE.Color('#3f6640');

/** Cột đá cao 1, bán kính chân 1: mỗi tầng thắt/phình ngẫu nhiên, đỉnh thu nhỏ, màu theo độ cao. */
function pillarGeometry(seed) {
  const r = rng(seed);
  const levels = 7;
  const geo = new THREE.CylinderGeometry(0.62, 1, 1, 7, levels);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  const ring = Array.from({ length: levels + 1 }, () => 0.82 + r() * 0.3);
  const jag = Array.from({ length: 7 }, () => 0.85 + r() * 0.3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const level = Math.round(y * levels);
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    // % 7 để hai đỉnh trùng nhau ở đường nối (góc ±π) cùng hệ số, không nứt khe.
    const k = ring[level] * jag[Math.round(((a + Math.PI) / (Math.PI * 2)) * 7) % 7];
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  const flat = geo.toNonIndexed();
  geo.dispose();
  const p = flat.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    if (y > 0.93) c.copy(MOSS);
    else c.copy(ROCK_LOW).lerp(ROCK_HIGH, y).multiplyScalar(0.9 + r() * 0.18);
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.computeVertexNormals();
  return flat;
}

export function createKarstPeaks(lowQuality) {
  const group = new THREE.Group();
  const count = lowQuality ? 24 : 44;
  const spots = ringPlacements(count, 95, 400, 7311);
  const variants = [0, 1, 2].map((v) => pillarGeometry(900 + v));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const meshes = variants.map((g) => new THREE.InstancedMesh(g, material, count));
  const used = [0, 0, 0];
  const pineGeo = new THREE.ConeGeometry(1, 2.4, 6);
  pineGeo.translate(0, 1.2, 0);
  const pines = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ color: PINE, flatShading: true }), count * 3);
  let pineCount = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  spots.forEach((spot, i) => {
    const { r } = spot;
    // Núi xa cao và to hơn để còn nổi lên khỏi biển mây và sương.
    const far = (spot.d - 95) / 305;
    const height = 40 + far * 80 + r() * 45;
    const radius = 6 + far * 9 + r() * 6;
    const base = terrainHeight(spot.x, spot.z) - 10;
    const v = i % 3;
    q.setFromAxisAngle(up, r() * Math.PI * 2);
    m.compose(p.set(spot.x, base, spot.z), q, s.set(radius, height, radius * (0.8 + r() * 0.4)));
    meshes[v].setMatrixAt(used[v]++, m);
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2;
      const d = r() * radius * 0.4;
      const size = 1.6 + r() * 1.8;
      m.compose(p.set(spot.x + Math.cos(a) * d, base + height - 0.6, spot.z + Math.sin(a) * d), q, s.set(size, size * 1.3, size));
      pines.setMatrixAt(pineCount++, m);
    }
  });
  meshes.forEach((mesh, v) => {
    mesh.count = used[v];
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  pines.count = pineCount;
  pines.instanceMatrix.needsUpdate = true;
  group.add(pines);
  return group;
}
