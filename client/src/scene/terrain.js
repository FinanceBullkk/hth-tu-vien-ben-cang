// Địa hình quanh gò: dốc xuống cảng ở phía đông, đồi ở các phía còn lại, rừng cây xa xa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flatMaterial, rng } from './builders.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function noise(x, z) {
  const f = (a, b) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = f(ix, iz);
  const b = f(ix + 1, iz);
  const c = f(ix, iz + 1);
  const d = f(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export const QUAY_Y = -16;
export const SEA_Y = -19;

/** Độ cao mặt đất tại (x, z) bên ngoài sân. */
export function terrainHeight(x, z) {
  const dx = Math.max(Math.abs(x) - 31, 0);
  const dz = Math.max(z > 0 ? z - 41 : -z - 31, 0);
  const d = Math.hypot(dx, dz);
  if (d === 0) return -0.06;

  let y = QUAY_Y * smooth(0, 26, d);
  const n = noise(x * 0.03, z * 0.03) - 0.5;
  // Phía tây, bắc, nam: đồi nhấp nhô.
  const inland = smooth(40, -30, x);
  y += inland * smooth(30, 170, d) * (34 + n * 42);
  y += n * 3 * smooth(6, 30, d) * inland;
  // Phía đông: nền cảng phẳng rồi ra biển, bờ bên kia có núi.
  if (x > 40) {
    const landEnd = 124;
    if (x > landEnd) y = QUAY_Y - 18 * smooth(landEnd, landEnd + 16, x);
    y += smooth(460, 700, x) * (70 + n * 70);
  }
  // Cut the approach below the stair treads; feather into the surrounding slope.
  const approach = smooth(6.5, 4.8, Math.abs(x)) * smooth(41, 41.5, z) * (1 - smooth(53, 58, z));
  return y + (Math.min(y, -0.55 - (z - 41) * 0.48 / 1.02) - y) * approach;
}

function gridLines(min, max, innerMin, innerMax, innerStep, outerStep) {
  const lines = [];
  for (let v = min; v < innerMin; v += outerStep) lines.push(v);
  for (let v = innerMin; v < innerMax; v += innerStep) lines.push(v);
  for (let v = innerMax; v <= max; v += outerStep) lines.push(v);
  return lines;
}

export function createTerrain(lowQuality) {
  const q = lowQuality ? 1.6 : 1;
  const xs = [...new Set([...gridLines(-420, 980, -90, 130, 6 * q, 28 * q), -6.5, -4.8, 0, 4.8, 6.5])].sort((a, b) => a - b);
  const zs = [...new Set([...gridLines(-620, 620, -100, 110, 6 * q, 28 * q), 41, 41.5, 53, 58])].sort((a, b) => a - b);
  const pos = [];
  const col = [];
  const grass = new THREE.Color('#a0b780');
  const dark = new THREE.Color('#7e9c6c');
  const dirt = new THREE.Color('#b6a17b');
  const far = new THREE.Color('#8ca9a6');
  const tmp = new THREE.Color();
  const H = (x, z) => terrainHeight(x, z);
  const pushTri = (a, b, c) => {
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const cz = (a[2] + b[2] + c[2]) / 3;
    tmp.copy(grass).lerp(dark, noise(cx * 0.08, cz * 0.08));
    if (cy < -13 && cx > 30) tmp.lerp(dirt, 0.7);
    if (cx > 440) tmp.lerp(far, 0.75);
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const a = [xs[i], H(xs[i], zs[j]), zs[j]];
      const b = [xs[i + 1], H(xs[i + 1], zs[j]), zs[j]];
      const c = [xs[i + 1], H(xs[i + 1], zs[j + 1]), zs[j + 1]];
      const d = [xs[i], H(xs[i], zs[j + 1]), zs[j + 1]];
      pushTri(a, d, c);
      pushTri(a, c, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, flatMaterial());
  mesh.receiveShadow = true;
  return mesh;
}

/** Rừng cây xa bằng InstancedMesh. */
export function createForest(lowQuality) {
  const cone1 = new THREE.ConeGeometry(2.6, 5, 6).toNonIndexed();
  cone1.translate(0, 5, 0);
  const cone2 = new THREE.ConeGeometry(1.9, 4, 6).toNonIndexed();
  cone2.translate(0, 8, 0);
  const trunk = new THREE.CylinderGeometry(0.35, 0.5, 3, 5).toNonIndexed();
  trunk.translate(0, 1.5, 0);
  const paint = (geo, hex) => {
    const col = new THREE.Color(hex);
    const arr = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = col.r;
      arr[i + 1] = col.g;
      arr[i + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    return geo;
  };
  const geo = mergeGeometries([paint(trunk, '#846244'), paint(cone1, '#68865c'), paint(cone2, '#87a373')]);
  const N = lowQuality ? 130 : 280;
  const mesh = new THREE.InstancedMesh(geo, flatMaterial(), N);
  const rand = rng(1234);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const col = new THREE.Color();
  let placed = 0;
  let guard = 0;
  while (placed < N && guard++ < 5000) {
    const x = -300 + rand() * 340;
    const z = -420 + rand() * 840;
    if (Math.abs(x) < 36 && z > -36 && z < 46) continue;
    if (x > 30 && x < 56 && rand() < 0.6) continue;
    if (Math.abs(x) < 8 && z > 40 && z < 70) continue;
    const y = terrainHeight(x, z);
    const scale = 0.7 + rand() * 0.9;
    q.setFromAxisAngle(up, rand() * 6.28);
    m.compose(p.set(x, y - 0.3, z), q, s.set(scale, scale * (0.85 + rand() * 0.4), scale));
    mesh.setMatrixAt(placed, m);
    col.setHSL(0.26 + rand() * 0.07, 0.34, 0.75 + rand() * 0.25);
    mesh.setColorAt(placed, col);
    placed++;
  }
  mesh.count = placed;
  return mesh;
}
