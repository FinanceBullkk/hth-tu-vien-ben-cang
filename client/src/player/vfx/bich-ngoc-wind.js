import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { solidMaterial, windMaterial } from './bich-ngoc-materials.js';
import { bambooLeafGeometry } from './bich-ngoc-geometry.js';
import { bichNgocWindBand } from './bich-ngoc-textures.js';
import { hash } from './aura-billboard-layer.js';

// Gió xoáy ngang — động từ chính của Bích Ngọc. Ba dải gió xoắn (KHÔNG khép thành vòng: mỗi dải
// là một đoạn xoắn ốc 0.85–1.2 vòng, bán kính và độ cao đổi dần, hai đầu thuôn mờ) quấn ngang quanh
// người ở gối, eo, và một dải rộng luồn qua các thân trúc. Mọi dải nằm dưới vai — chừa trống mặt.
// Lá trúc 3D cuốn theo dải, lật đều. Tốc độ cố định: nhịp thở chỉ đổi MẬT ĐỘ (một nhóm lá "theo
// gió" hiện dần khi thở ra) và độ đậm dải gió — không lá nào bay nhanh hơn.
export const BANDS = [
  { a0: 0.4, turns: 1.2, y: [0.12, 0.42], r: [0.95, 0.72], w: 0.15 },
  { a0: 2.6, turns: 1.1, y: [0.4, 0.8], r: [0.62, 0.84], w: 0.13 },
  { a0: 4.4, turns: 0.85, y: [0.2, 0.74], r: [1.26, 1.04], w: 0.11 },
];
/** Tốc độ quay (rad/s) cả khối gió; ngược kim đồng hồ nhìn từ trên (từ +x sang +z). */
export const WIND_SPIN = 0.22, LEAF_RATE = 0.075, GUST_SHARE = 0.4;

/** Điểm trên dải b tại tham số s ∈ [0, 1] (chưa tính góc quay của khối gió). */
export function bandPoint(b, s, out = new THREE.Vector3()) {
  const a = b.a0 + s * b.turns * Math.PI * 2;
  const r = b.r[0] + (b.r[1] - b.r[0]) * s + 0.05 * Math.sin(s * Math.PI * 3);
  return out.set(Math.cos(a) * r, b.y[0] + (b.y[1] - b.y[0]) * s + 0.03 * Math.sin(a * 2), Math.sin(a) * r);
}
/** Xoay quanh trục đứng theo chiều gió (cùng phép xoay của nhóm dải gió). */
const spinAt = (v, time) => v.applyAxisAngle(new THREE.Vector3(0, 1, 0), -WIND_SPIN * time);

export function createWind(parent, colors, lowQuality) {
  const geometries = [], materials = [], own = m => (materials.push(m), m);
  const bands = lowQuality ? BANDS.slice(0, 2) : BANDS, SEG = 96;
  const strips = createRibbonStrips(BANDS.length, SEG); geometries.push(strips.geometry);
  const c = new THREE.Vector3(), n = new THREE.Vector3(), side = new THREE.Vector3();
  BANDS.forEach((b, k) => {
    if (!bands.includes(b)) { strips.collapse(k); return; }
    for (let j = 0; j <= SEG; j++) {
      const s = j / SEG;
      bandPoint(b, s, c); bandPoint(b, Math.min(1, s + 0.01), n).sub(bandPoint(b, Math.max(0, s - 0.01), side)).normalize();
      // Bề ngang dải nghiêng theo chiều dâng của xoắn: tấm gió đứng, hơi ngả theo hướng bay.
      side.set(0, 1, 0).addScaledVector(n, -0.35).normalize();
      strips.write(k, j, c, side, b.w * (0.6 + 0.4 * Math.sin(s * Math.PI)));
    }
  });
  strips.commit();
  const holder = new THREE.Group(); holder.name = 'bich-ngoc-wind'; parent.add(holder);
  const map = bichNgocWindBand();
  const layers = [[own(windMaterial(colors, map, 0, 4)), 7]];
  if (!lowQuality) layers.push([own(windMaterial(colors, map, 1, 4)), 6]);
  layers.forEach(([m, order]) => {
    const mesh = new THREE.Mesh(strips.geometry, m); mesh.name = 'bich-ngoc-wind-bands'; mesh.renderOrder = order; holder.add(mesh);
  });

  // Lá trúc cuốn theo dải gió.
  const count = lowQuality ? 24 : 54, body = own(solidMaterial(colors, 1)), glow = own(solidMaterial(colors, 0));
  const leafSet = [];
  for (const [mat, order, on] of [[body, 6, true], [glow, 8, !lowQuality]]) {
    if (!on) continue;
    const mesh = new THREE.InstancedMesh(bambooLeafGeometry(), mat, count); mesh.name = 'bich-ngoc-whirl-leaves'; mesh.renderOrder = order;
    if (leafSet.length) mesh.instanceMatrix = leafSet[0].instanceMatrix;
    parent.add(mesh); leafSet.push(mesh);
  }
  const seeds = Array.from({ length: count }, (_, i) => ({ b: bands[i % bands.length], u0: hash(i + 1), v: LEAF_RATE * (0.85 + 0.3 * hash(i + 2)),
    roll: 0.7 + 0.6 * hash(i + 3), ph: hash(i + 4) * 6.28, lift: (hash(i + 5) - 0.5) * 0.12, sz: 0.15 + 0.07 * hash(i + 6), gust: hash(i + 7) < GUST_SHARE }));
  const m4 = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), q = new THREE.Vector3();

  return {
    /** Vị trí và cỡ hiện tại của lá i (test dùng). */
    leafState: i => { const e = leafSet[0].instanceMatrix.array; return { x: e[i * 16 + 12], y: e[i * 16 + 13], z: e[i * 16 + 14], size: Math.hypot(e[i * 16 + 4], e[i * 16 + 5], e[i * 16 + 6]) }; },
    count,
    update(time, rhythm, f) {
      holder.rotation.y = -WIND_SPIN * time;
      layers.forEach(([m]) => {
        m.uniforms.time.value = time;
        m.uniforms.opacity.value = (m.uniforms.ink.value ? 0.7 : 1) * (0.8 + 0.25 * rhythm.release) * f;
      });
      body.uniforms.opacity.value = 0.95 * f; glow.uniforms.opacity.value = 0.8 * f; glow.uniforms.glow.value = rhythm.pulse;
      seeds.forEach((sd, i) => {
        const s = ((sd.u0 + time * sd.v) % 1 + 1) % 1;
        spinAt(bandPoint(sd.b, s, p), time); spinAt(bandPoint(sd.b, s + 0.01, q), time);
        p.y += sd.lift + 0.03 * Math.sin(time * 1.1 + sd.ph);
        Y.subVectors(q, p).setY(0).normalize(); X.crossVectors(Y, up).normalize(); Z.crossVectors(X, Y);
        const a = time * sd.roll + sd.ph, ca = Math.cos(a), sa = Math.sin(a);
        const fade = Math.min(1, s * 8, (1 - s) * 8) * (sd.gust ? 0.15 + 0.85 * rhythm.release : 1), sc = sd.sz * fade;
        // Lật đều quanh trục bay (tốc độ lật cố định riêng từng lá).
        m4.makeBasis(X.clone().multiplyScalar(ca).addScaledVector(Z, sa), Y, Z.clone().multiplyScalar(ca).addScaledVector(X, -sa));
        m4.scale(new THREE.Vector3(sc, sc, sc)); m4.setPosition(p);
        leafSet[0].setMatrixAt(i, m4);
      });
      leafSet[0].instanceMatrix.needsUpdate = true;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
