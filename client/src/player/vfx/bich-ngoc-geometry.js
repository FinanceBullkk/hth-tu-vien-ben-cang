import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KIND } from './bich-ngoc-materials.js';
import { hash } from './aura-billboard-layer.js';

// Hình khối 3D của Bích Ngọc (aura đứng và tòa ngồi thiền). Mọi geometry mang đủ bộ attribute của
// shader khối đặc (part, across, kind, node, sway) để không đỉnh nào đọc giá trị rác.
// Lá, đá, măng cache cấp module, dùng chung mọi nhân vật: không dispose. Thân trúc người gọi dispose.
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

/** Gắn attribute shader cho geometry; fn(i) trả [part, across, node]; sway mặc định đứng yên. */
export function tag(geo, kind, fn, sway = [0, 0, 0, 0]) {
  const n = geo.attributes.position.count, attrs = { part: [], across: [], node: [] };
  for (let i = 0; i < n; i++) { const [p, a, d] = fn(i); attrs.part.push(p); attrs.across.push(a); attrs.node.push(d); }
  for (const k of ['part', 'across', 'node']) geo.setAttribute(k, new THREE.Float32BufferAttribute(attrs[k], 1));
  geo.setAttribute('kind', new THREE.Float32BufferAttribute(new Array(n).fill(kind), 1));
  geo.setAttribute('sway', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => sway).flat(), 4));
  geo.deleteAttribute('uv');
  return geo;
}

/** Hệ số lay của một thân: đỉnh lệch tối đa `amp` mét; hướng gió tiếp tuyến xoáy ngược kim đồng hồ
    nhìn từ trên (từ +x sang +z), cùng chiều lá cuốn. */
export function swayOf(stalk) {
  const r = Math.hypot(stalk.x, stalk.z) || 1;
  return [-stalk.z / r, stalk.x / r, stalk.phase, stalk.amp / (stalk.h * stalk.h)];
}

/** Trục thân trúc (đường thẳng hơi ngả ra ngoài) tại độ cao y. */
export function culmAxis(stalk, y) {
  const k = y / stalk.h;
  return new THREE.Vector3(stalk.x + stalk.lean[0] * k, y, stalk.z + stalk.lean[1] * k);
}

/** Thân trúc có đốt: mỗi lóng phình ở đốt, thắt nhẹ giữa lóng, thuôn dần lên ngọn rồi khép chóp.
    stalk.cut (m): thân bị kiếm khí chém — ngọn vát chéo (thấp phía trước, cao phía sau để mặt cắt
    ngửa về người nhìn), bịt bằng mặt cắt ngọc sáng. Trả mảng geometry. */
function culm(stalk, sides = 10) {
  const { h, r, node, cut = 0 } = stalk, rows = [];
  const count = Math.max(2, Math.round(h / node));
  for (let k = 0; k < count; k++) for (const [f, bulge] of [[0, 1.13], [0.06, 1], [0.5, 0.96], [0.94, 1]]) rows.push([(k + f) * h / count, bulge, 0]);
  // Bỏ các hàng nằm trên đường cắt để mặt vát không cắt chéo qua lưới (gập tam giác).
  if (cut) { rows.splice(0, rows.length, ...rows.filter(([y]) => y < h - cut - 0.01)); rows.push([h, 1, cut]); } else rows.push([h, 1.1, 0], [h + 0.04, 0.55, 0], [h + 0.16, 0.02, 0]);
  const pos = [], idx = [], meta = [], spacing = h / count;
  rows.forEach(([y, bulge, slant], i) => {
    const c = culmAxis(stalk, Math.min(y, h)), rad = r * (1 - 0.35 * Math.min(y, h) / h) * bulge;
    for (let s = 0; s < sides; s++) {
      const a = s / sides * Math.PI * 2, yy = y - slant * Math.sin(a);
      pos.push(c.x + Math.cos(a) * rad, yy, c.z + Math.sin(a) * rad); meta.push([Math.min(1, yy / h), s / sides, yy / spacing]);
      if (i < rows.length - 1) { const n = i * sides + s, n2 = i * sides + (s + 1) % sides; idx.push(n, n + sides, n2, n2, n + sides, n2 + sides); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const body = tag(g, KIND.culm, i => meta[i], swayOf(stalk));
  if (!cut) return [body];
  // Mặt cắt: quạt tam giác từ tâm tới vòng đỉnh vát.
  const top = pos.slice(-sides * 3), c = culmAxis(stalk, h), cap = [c.x, h, c.z, ...top], capIdx = [];
  for (let s = 0; s < sides; s++) capIdx.push(0, 1 + (s + 1) % sides, 1 + s);
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3)); face.setIndex(capIdx); face.computeVertexNormals();
  return [body, tag(face, KIND.jade, i => [i ? 0.15 : 0, 0, 0], swayOf(stalk))];
}

/** Cành con mảnh mọc từ đốt, vươn ra ngoài rồi vút lên; trả geometry và điểm ngọn (gắn chùm lá). */
export function twigPath(stalk, twig) {
  const base = culmAxis(stalk, twig.y), [dx, dz] = twig.dir, len = twig.len;
  return [base, base.clone().add(new THREE.Vector3(dx * len * 0.55, len * 0.18, dz * len * 0.55)),
    base.clone().add(new THREE.Vector3(dx * len, len * 0.42, dz * len))];
}
function twig(stalk, t) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(twigPath(stalk, t)), 6, stalk.r * 0.18, 4, false);
  const pos = g.attributes.position;
  return tag(g, KIND.twig, i => [pos.getY(i) / stalk.h, 0, 0], swayOf(stalk));
}

/** Cả rừng trúc (thân + cành con) gộp một geometry. */
export function groveGeometry(stalks) {
  const parts = stalks.flatMap(s => [...culm(s), ...s.twigs.map(t => twig(s, t))]);
  const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
  return merged;
}

/** Lá trúc: thuôn mũi giáo, rộng nhất gần cuống, chóp nhọn dài, rủ cong theo chiều dài; dài 1 theo +y. */
export function bambooLeafGeometry() {
  return cached('leaf', () => {
    const g = new THREE.PlaneGeometry(1, 1, 2, 10), pos = g.attributes.position, uv = g.attributes.uv, meta = [];
    for (let i = 0; i < pos.count; i++) {
      const t = uv.getY(i), x = uv.getX(i) * 2 - 1;
      const w = 0.085 * Math.sin(Math.PI * Math.min(1, Math.pow(t, 0.55) * 1.0)) * (t < 0.04 ? t / 0.04 : 1);
      pos.setXYZ(i, x * w, t, -0.22 * t * t + Math.abs(x) * w * 0.35); meta.push([t, x, 0]);
    }
    g.computeVertexNormals();
    return tag(g, KIND.leaf, i => meta[i]);
  });
}

/** Đá rêu: khối mười hai mặt méo, dẹt, đáy phẳng; rêu phủ mặt trên do shader tô theo pháp tuyến. */
export function mossStoneGeometry() {
  return cached('stone', () => {
    const g = new THREE.IcosahedronGeometry(1, 1), pos = g.attributes.position, speck = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), key = Math.round(x * 50) * 7 + Math.round(y * 50) * 13 + Math.round(z * 50) * 29;
      const n = 1 + 0.22 * (hash(key) - 0.5); speck.push(hash(key + 11));
      pos.setXYZ(i, x * n * 1.1, Math.max(-0.12, y * n * 0.8), z * n * 0.9);
    }
    g.computeVertexNormals();
    return tag(g, KIND.stone, i => [(pos.getY(i) + 0.12) / 1.0, pos.getX(i), speck[i]]);
  });
}

/** Măng trúc: búp nón nhiều lớp bẹ xếp chồng, chóp xanh; cao 1 theo +y, bán kính đáy 0.32. */
export function shootGeometry() {
  return cached('shoot', () => {
    const profile = [new THREE.Vector2(0, 0)];
    for (let k = 0; k < 6; k++) {
      const y = k / 6, r = 0.32 * (1 - y * 0.9);
      profile.push(new THREE.Vector2(r, y), new THREE.Vector2(r * 0.84, y + 0.15));
    }
    profile.push(new THREE.Vector2(0, 1));
    const g = new THREE.LatheGeometry(profile, 9), pos = g.attributes.position;
    g.computeVertexNormals();
    return tag(g, KIND.shoot, i => [pos.getY(i), 0, 0]);
  });
}

/** Độ lệch lay (dx, dz) của điểm ở độ cao y trên thân `stalk` — cùng hàm với shader. */
export function swayOffset(stalk, y, time, speed, bias) {
  const [tx, tz, phase, k] = swayOf(stalk), d = k * y * y * (bias + Math.sin(time * speed + phase));
  return [tx * d, tz * d];
}
