import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hình cành đào 3D dùng chung cho Đào Hoa (aura đứng và tòa ngồi thiền). Mỗi đỉnh mang:
//  part   0→1 từ gốc ra ngọn (cánh: tâm hoa → mép; lá: cuống → chóp; cành: gốc → ngọn),
//  across -1..1 ngang cánh/lá (shader khía chóp cánh đào và vẽ gân lá),
//  kind   0 cánh hoa · 1 nhụy · 2 nụ · 3 lá non · 4 vỏ cành.
// Geometry cache ở cấp module, dùng chung mọi nhân vật: không dispose.
export const KIND = { petal: 0, stamen: 1, bud: 2, leaf: 3, bark: 4 };
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

function tag(geo, kind, partOf, acrossOf) {
  const pos = geo.attributes.position, n = pos.count;
  const part = new Float32Array(n), across = new Float32Array(n), kinds = new Float32Array(n).fill(kind);
  for (let i = 0; i < n; i++) { part[i] = partOf(i); across[i] = acrossOf(i); }
  geo.setAttribute('part', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('across', new THREE.BufferAttribute(across, 1));
  geo.setAttribute('kind', new THREE.BufferAttribute(kinds, 1));
  geo.deleteAttribute('uv');
  return geo;
}

/** Một cánh đào: tròn đầy về phía mép, khum lên (+z), dài 1 theo +y. */
function petalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 6, 10), pos = g.attributes.position, uv = g.attributes.uv;
  const ts = [], xs = [];
  for (let i = 0; i < pos.count; i++) {
    const t = uv.getY(i), x = uv.getX(i) * 2 - 1;
    const w = 0.26 * Math.pow(Math.sin(Math.PI * Math.min(0.04 + t * 0.62, 0.97)), 0.7);
    pos.setXYZ(i, x * w, t, 0.22 * t * t + 0.05 * x * x * t);
    ts.push(t); xs.push(x);
  }
  g.computeVertexNormals();
  return tag(g, KIND.petal, i => ts[i], i => xs[i]);
}

/** Bông đào năm cánh, mặt hoa hướng +z, bán kính ~0.62. Nhụy: tám tua quanh đài. */
export function blossomGeometry() {
  return cached('blossom', () => {
    const base = petalGeometry(), parts = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 5; i++) {
      e.set(0.3, 0, i * Math.PI * 2 / 5, 'ZXY'); q.setFromEuler(e);
      const a = i * Math.PI * 2 / 5;
      m.compose(new THREE.Vector3(-Math.sin(a) * 0.05, Math.cos(a) * 0.05, 0), q, new THREE.Vector3(1, 0.58, 1));
      parts.push(base.clone().applyMatrix4(m));
    }
    const stamen = new THREE.OctahedronGeometry(0.035, 0);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const s = stamen.clone().translate(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.12);
      parts.push(tag(s.index ? s.toNonIndexed() : s, KIND.stamen, () => 1, () => 0));
    }
    const heart = new THREE.SphereGeometry(0.07, 8, 5).toNonIndexed().scale(1, 1, 0.6).translate(0, 0, 0.04);
    parts.push(tag(heart, KIND.stamen, () => 0.3, () => 0));
    const merged = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)));
    parts.forEach(p => p.dispose()); base.dispose(); stamen.dispose();
    return merged;
  });
}

/** Nụ đào: giọt thuôn, gốc hồng đậm, chóp hé trắng; cao 1 theo +y. */
export function budGeometry() {
  return cached('bud', () => {
    const g = new THREE.SphereGeometry(0.5, 8, 7);
    const pos = g.attributes.position, ys = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 0.5, pinch = 1 - 0.45 * y * y;
      pos.setXYZ(i, pos.getX(i) * 0.7 * pinch, y, pos.getZ(i) * 0.7 * pinch); ys.push(y);
    }
    g.computeVertexNormals();
    return tag(g, KIND.bud, i => ys[i], () => 0);
  });
}

/** Lá non: thuôn dài, gập nhẹ theo gân giữa; cuống ở gốc, chóp +y dài 1. */
export function leafGeometry() {
  return cached('leaf', () => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 8), pos = g.attributes.position, uv = g.attributes.uv, ts = [], xs = [];
    for (let i = 0; i < pos.count; i++) {
      const t = uv.getY(i), x = uv.getX(i) * 2 - 1, w = 0.17 * Math.pow(Math.sin(Math.PI * t), 0.8);
      pos.setXYZ(i, x * w, t, Math.abs(x) * w * 0.6 + 0.08 * t * t); ts.push(t); xs.push(x);
    }
    g.computeVertexNormals();
    return tag(g, KIND.leaf, i => ts[i], i => xs[i]);
  });
}

/** Cành thuôn dần theo đường cong qua các điểm (toạ độ tương đối gốc cành). */
export function branchGeometry(points, radius, sides = 5, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(seg, false), pos = [], part = [], idx = [];
  const p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, r = radius * (1 - 0.72 * u);
    curve.getPointAt(u, p);
    for (let k = 0; k < sides; k++) {
      const a = k / sides * Math.PI * 2;
      v.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + v.x * r, p.y + v.y * r, p.z + v.z * r); part.push(u);
      if (i < seg) { const n = i * sides + k, n2 = i * sides + (k + 1) % sides; idx.push(n, n + sides, n2, n2, n + sides, n2 + sides); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return tag(g, KIND.bark, i => part[i], () => 0);
}

/** Nguyệt môn kiến trúc: vòng cổng dày (vành khuyên đùn sâu `depth`, vát mép) tâm ở gốc toạ độ,
    mặt trước hướng +z, đáy chạm y = -outer; kèm hai đế đá đỡ chân cổng. Người gọi tự dispose. */
export function moonGateGeometry(outer, inner, depth) {
  const shape = new THREE.Shape().absarc(0, 0, outer, 0, Math.PI * 2, false);
  shape.holes.push(new THREE.Path().absarc(0, 0, inner, 0, Math.PI * 2, true));
  const bevel = depth * 0.12;
  const ring = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 72, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 }).translate(0, 0, -depth / 2);
  const feet = [-1, 1].map(s => new THREE.BoxGeometry(outer * 0.32, outer * 0.08, depth * 2.2)
    .translate(s * outer * 0.26, -outer + outer * 0.04, 0).toNonIndexed());
  const merged = mergeGeometries([ring.index ? ring.toNonIndexed() : ring, ...feet]);
  ring.dispose(); feet.forEach(g => g.dispose());
  return merged;
}

/** Điểm trên cành (u 0..1) — để đặt hoa, nụ, lá dọc cành. */
export function branchPoint(points, u) {
  return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))).getPointAt(u);
}
