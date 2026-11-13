import * as THREE from 'three';
import { spineFrame, spineRadius } from './long-quyen-spine.js';

// Hình khối thân hỏa long: ống tiện theo sống lưng, bán kính đổi dọc thân, và dải vây lưng răng cưa.
// uv.x = s (0 đuôi → 1 gáy), uv.y = vòng quanh thân (0 = giữa bụng). Thuộc tính "spine" là tâm sống
// lưng tại cùng s để shader cộng sóng cơ (mọi đỉnh một lát cắt dời cùng một vectơ, thân không méo).
// Geometry cố định, dùng chung mọi nhân vật theo mức chất lượng — không bao giờ dispose.

/** Ống tổng quát: frameAt(s, frame) trả khung { p, t, n, b }; radius(s); segs đoạn dọc, radial cạnh quanh.
    withSpine = false bỏ thuộc tính spine (dùng cho tòa ngồi thiền, ghép chung với hình khác). */
export function tubeGeometry(frameAt, radius, segs, radial, withSpine = true, s0 = 0, s1 = 1) {
  const pos = [], nor = [], uv = [], spine = [], idx = [], f = frameAt(s0);
  for (let j = 0; j <= segs; j++) {
    const s = s0 + (s1 - s0) * j / segs, r = radius(s);
    frameAt(s, f);
    for (let i = 0; i <= radial; i++) {
      const th = i / radial * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const nx = f.n.x * c + f.b.x * sn, ny = f.n.y * c + f.b.y * sn, nz = f.n.z * c + f.b.z * sn;
      pos.push(f.p.x + nx * r, f.p.y + ny * r, f.p.z + nz * r); nor.push(nx, ny, nz);
      uv.push(s, i / radial); spine.push(f.p.x, f.p.y, f.p.z);
      if (j < segs && i < radial) {
        const a = j * (radial + 1) + i, b = a + radial + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (withSpine) geo.setAttribute('spine', new THREE.Float32BufferAttribute(spine, 3));
  geo.setIndex(idx); geo.computeBoundingSphere();
  return geo;
}

/** Dải vây lưng: chân bám sống lưng phía lưng (−n), ngọn chếch về phía đuôi; răng cưa cắt bằng shader. */
function finGeometry(segs) {
  const pos = [], uv = [], spine = [], idx = [], f = spineFrame(0), S0 = 0.14, S1 = 0.97;
  for (let j = 0; j <= segs; j++) {
    const s = S0 + (S1 - S0) * j / segs, r = spineRadius(s), env = Math.pow(Math.sin(Math.PI * j / segs), 0.6);
    spineFrame(s, f);
    const h = 0.045 + 0.095 * env;
    const base = f.p.clone().addScaledVector(f.n, -r * 0.8);
    const dir = f.n.clone().multiplyScalar(-0.85).addScaledVector(f.t, -0.5).normalize();
    pos.push(base.x, base.y, base.z, base.x + dir.x * h, base.y + dir.y * h, base.z + dir.z * h);
    uv.push(s, 0, s, 1); spine.push(f.p.x, f.p.y, f.p.z, f.p.x, f.p.y, f.p.z);
    if (j < segs) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('spine', new THREE.Float32BufferAttribute(spine, 3));
  geo.setIndex(idx); geo.computeBoundingSphere();
  return geo;
}

const cache = new Map();
/** { body, fins } dùng chung theo mức chất lượng. */
export function dragonGeometry(lowQuality) {
  const key = lowQuality ? 'low' : 'full';
  if (!cache.has(key)) cache.set(key, {
    body: tubeGeometry(spineFrame, spineRadius, lowQuality ? 110 : 190, lowQuality ? 9 : 14),
    fins: finGeometry(lowQuality ? 90 : 160),
  });
  return cache.get(key);
}
