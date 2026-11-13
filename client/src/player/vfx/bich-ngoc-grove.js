import * as THREE from 'three';
import { solidMaterial, SWAY_SPEED, SWAY_BIAS } from './bich-ngoc-materials.js';
import { groveGeometry, bambooLeafGeometry, twigPath, culmAxis, swayOffset } from './bich-ngoc-geometry.js';
import { hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';

// Rừng trúc ngọc — bóng dáng chính của Bích Ngọc: mười thân trúc 3D cao thấp vây ba phía (trái,
// phải, sau), xếp thành cụm lệch nhau, KHÔNG thành vòng tròn, hở phía trước và hở ngay sau đầu.
// Toạ độ mét, gốc ở chân nhân vật, +z là phía trước. lean: độ ngả ra ngoài ở ngọn; node: dài lóng.
export const makeStalk = (x, z, h, r, lean, node, phase, amp) => ({ x, z, h, r, lean, node, phase, amp, twigs: [] });
const S = makeStalk;
export const STALKS = [
  S(-0.95, 0.05, 2.55, 0.062, [-0.1, 0.02], 0.36, 0.0, 0.07),
  S(-1.22, -0.28, 2.95, 0.074, [-0.14, -0.04], 0.4, 1.3, 0.09),
  S(-0.8, 0.38, 1.5, 0.05, [-0.06, 0.05], 0.3, 2.1, 0.04),
  S(-0.64, -0.98, 2.3, 0.058, [-0.05, -0.08], 0.35, 3.4, 0.06),
  S(-1.08, -0.82, 1.85, 0.052, [-0.08, -0.05], 0.32, 4.6, 0.05),
  S(1.02, -0.12, 2.7, 0.068, [0.12, 0], 0.38, 0.7, 0.08),
  S(1.26, 0.26, 1.72, 0.052, [0.08, 0.04], 0.31, 2.7, 0.05),
  S(0.82, 0.42, 1.25, 0.046, [0.05, 0.05], 0.28, 5.1, 0.035),
  S(0.7, -1.02, 2.45, 0.06, [0.06, -0.07], 0.37, 1.9, 0.07),
  S(1.12, -0.86, 2.02, 0.054, [0.09, -0.04], 0.34, 3.9, 0.055),
];
// Ba thân thấp đã bị kiếm khí chém ngang: ngọn vát chéo, lộ mặt cắt ngọc.
for (const [i, cut] of [[2, 0.13], [4, 0.12], [7, 0.12]]) STALKS[i].cut = cut;

/** Cành con ở nửa trên mỗi thân, vươn ra ngoài (không bao giờ quay vào phía mặt người). */
export function growTwigs(stalks) {
  stalks.forEach((s, k) => {
  const r = Math.hypot(s.x, s.z), out = Math.atan2(s.z / r, s.x / r), side = Math.sign(s.x);
  const n = s.h > 2.2 ? 4 : s.h > 1.6 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    let a = out + (hash(k * 17 + i) - 0.5) * 1.8, dx = Math.cos(a);
    if (dx * side < 0.35) { a = out - (a - out); dx = Math.cos(a); }
    if (dx * side < 0.35) { a = out; dx = Math.cos(a); }
    s.twigs.push({ y: s.h * (0.5 + 0.42 * (i + hash(k * 5 + i) * 0.6) / n), dir: [dx, Math.sin(a)], len: 0.22 + 0.12 * hash(k * 3 + i) });
  }
  });
  return stalks;
}
growTwigs(STALKS);

/** Chùm lá: ngọn mỗi cành con 5–6 lá xoè quạt rủ xuống, ngọn thân 4 lá vút lên. size: tỉ lệ lá. */
export function leafLayout(stalks, size = 1) {
  const leaves = [], up = new THREE.Vector3(0, 1, 0);
  const spray = (stalk, at, d, n, lift, sz, seed) => {
    const out = new THREE.Vector3(d[0], 0, d[1]), side = new THREE.Vector3(-d[1], 0, d[0]);
    for (let j = 0; j < n; j++) {
      const s = (j / (n - 1) - 0.5) * 1.9 + (hash(seed + j) - 0.5) * 0.3, e = lift - 0.45 * hash(seed + j + 50);
      const y = out.clone().multiplyScalar(Math.cos(s)).addScaledVector(side, Math.sin(s)).addScaledVector(up, e).normalize();
      const x = new THREE.Vector3().crossVectors(y, up).normalize(), z = new THREE.Vector3().crossVectors(x, y);
      const m = new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(1, 1, 1).multiplyScalar(sz * (0.8 + 0.4 * hash(seed + j + 90))));
      m.setPosition(at); leaves.push({ stalk, base: m, y: at.y, ph: hash(seed + j + 7) * 6.28 });
    }
  };
  stalks.forEach((s, k) => {
    s.twigs.forEach((t, i) => spray(s, twigPath(s, t)[2], t.dir, 5 + (i % 2), 0.05, 0.3 * size, k * 100 + i * 10));
    const r = Math.hypot(s.x, s.z);
    if (!s.cut) spray(s, culmAxis(s, s.h + 0.1), [s.x / r, s.z / r], 4, 1.4, 0.27 * size, k * 100 + 90);
  });
  return leaves;
}

export function createGrove(parent, colors, lowQuality) {
  const geometries = [], materials = [];
  const own = m => (materials.push(m), m);
  const body = own(solidMaterial(colors, 1)), glow = own(solidMaterial(colors, 0));
  const geo = groveGeometry(STALKS); geometries.push(geo);
  const culms = new THREE.Mesh(geo, body); culms.name = 'bich-ngoc-culms'; culms.renderOrder = 5; parent.add(culms);
  const culmGlow = new THREE.Mesh(geo, glow); culmGlow.name = 'bich-ngoc-culms'; culmGlow.renderOrder = 8; parent.add(culmGlow);

  const items = leafLayout(STALKS), leafSet = [];
  for (const [mat, order, on] of [[body, 5, true], [glow, 8, !lowQuality]]) {
    if (!on) continue;
    const mesh = new THREE.InstancedMesh(bambooLeafGeometry(), mat, items.length); mesh.name = 'bich-ngoc-leaves'; mesh.renderOrder = order;
    if (leafSet.length) mesh.instanceMatrix = leafSet[0].instanceMatrix;
    parent.add(mesh); leafSet.push(mesh);
  }

  // Đốt trúc phát sáng: một đốm mềm ở mỗi đốt, sáng dần lên khi thở ra.
  const nodes = lowQuality ? [] : STALKS.flatMap(s => {
    const n = Math.max(2, Math.round(s.h / s.node));
    return Array.from({ length: n - 1 }, (_, i) => ({ s, y: (i + 1) * s.h / n }));
  });
  let dots = null, dotPos = null;
  if (nodes.length) {
    dotPos = new Float32Array(nodes.length * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dotPos, 3)); geometries.push(g);
    const m = own(new THREE.PointsMaterial({ color: colors.gold.clone().lerp(colors.core, 0.3), size: 0.13, map: softDot(),
      transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    dots = new THREE.Points(g, m); dots.name = 'bich-ngoc-node-glow'; dots.renderOrder = 9; parent.add(dots);
  }
  const m4 = new THREE.Matrix4();

  return {
    update(time, rhythm, f) {
      for (const m of [body, glow]) m.uniforms.time.value = time;
      body.uniforms.opacity.value = 0.95 * f; glow.uniforms.opacity.value = 0.85 * f; glow.uniforms.glow.value = rhythm.pulse;
      items.forEach((it, i) => {
        const [dx, dz] = swayOffset(it.stalk, it.y, time, SWAY_SPEED, SWAY_BIAS);
        m4.copy(it.base); m4.elements[12] += dx; m4.elements[13] += 0.008 * Math.sin(time * 0.9 + it.ph); m4.elements[14] += dz;
        leafSet[0].setMatrixAt(i, m4);
      });
      leafSet[0].instanceMatrix.needsUpdate = true;
      if (dots) {
        nodes.forEach((nd, i) => {
          const c = culmAxis(nd.s, nd.y), [dx, dz] = swayOffset(nd.s, nd.y, time, SWAY_SPEED, SWAY_BIAS);
          dotPos.set([c.x + dx, c.y, c.z + dz], i * 3);
        });
        dots.geometry.attributes.position.needsUpdate = true;
        dots.material.opacity = (0.4 + 0.3 * rhythm.release) * f;
      }
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
