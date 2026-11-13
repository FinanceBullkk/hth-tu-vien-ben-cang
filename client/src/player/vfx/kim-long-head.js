import * as THREE from 'three';
import { restFrame, newFrame } from './kim-long-spine.js';
import { dragonHeadGeometry, PEARL_LOCAL, PEARL_R } from './kim-long-head-geometry.js';
import { goldMaterial, strandMaterial, pearlMaterial, tickAll } from './kim-long-materials.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { softDot } from './aura-rhythm.js';

// Đầu rồng ở cuối vòm (vai phải), ngóc lên nhìn vào trong, miệng há ngậm LONG CHÂU. Cổ gần như
// không chịu sóng nên đầu và ngọc đứng vững, chỉ gật rất khẽ. Bờm là các sợi lửa vàng bay ra sau
// theo cổ, đôi râu dài uốn lượn, chòm râu cằm rủ xuống — tất cả trên một bộ dải động.
const HEAD_SCALE = 1.45;
const UP = new THREE.Vector3(0, 1, 0);

/** Ma trận đặt đầu tại thời điểm t: gốc ở cuối trục, mõm theo tiếp tuyến cuối. */
export function headMatrix(t, out = new THREE.Matrix4()) {
  const fr = restFrame(1, newFrame()), f = fr.t.clone();
  const up = UP.clone().addScaledVector(f, -UP.dot(f)).normalize(), side = new THREE.Vector3().crossVectors(up, f);
  const nod = 0.05 * Math.sin(t * 0.45);
  const rot = new THREE.Matrix4().makeBasis(side, up, f).multiply(new THREE.Matrix4().makeRotationX(nod));
  return out.copy(rot).scale(new THREE.Vector3(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE)).setPosition(fr.p);
}

// Sợi dải: [gốc local, hướng bay local, dài, rộng, kiểu] — kiểu 0 bờm, 1 râu, 2 râu cằm.
const STRANDS = [
  ...[-1, 1].flatMap(s => [
    [[s * 0.05, 0.1, -0.1], [s * 0.35, 0.2, -1], 0.42, 0.04, 0], [[s * 0.1, 0.05, -0.08], [s * 0.7, 0.1, -1], 0.36, 0.035, 0],
    [[s * 0.11, -0.02, -0.06], [s * 0.8, -0.35, -1], 0.3, 0.03, 0],
  ]),
  [[0, 0.12, -0.08], [0, 0.4, -1], 0.46, 0.042, 0], [[0, 0.07, -0.12], [0, -0.05, -1], 0.4, 0.04, 0],
  [[-0.06, 0.03, 0.32], [-0.45, -0.25, -1], 0.72, 0.012, 1], [[0.06, 0.03, 0.32], [0.45, -0.25, -1], 0.72, 0.012, 1],
  [[-0.03, -0.1, 0.17], [-0.4, -0.45, -1], 0.2, 0.022, 2], [[0.03, -0.1, 0.17], [0.4, -0.45, -1], 0.2, 0.022, 2],
];

export function createDragonHead(parent, colors, lowQuality) {
  const ticks = [], owned = [];
  const geo = dragonHeadGeometry(); owned.push(geo);
  const skin = goldMaterial(colors, 0); ticks.push({ m: skin, base: 0.98 }); owned.push(skin);
  const head = new THREE.Mesh(geo, skin); head.name = 'kim-long-head'; head.matrixAutoUpdate = false; head.renderOrder = 7;
  parent.add(head);
  const meshes = [head];
  if (!lowQuality) {
    const g = goldMaterial(colors, 1); ticks.push({ m: g, base: 0.6, breathe: 0.4 }); owned.push(g);
    const rim = new THREE.Mesh(geo, g); rim.name = 'kim-long-head-glow'; rim.matrixAutoUpdate = false; rim.renderOrder = 10;
    parent.add(rim); meshes.push(rim);
  }

  // Long châu + quầng sáng mềm (không lóe: chỉ thở theo nhịp).
  const pearlGeo = new THREE.SphereGeometry(PEARL_R * HEAD_SCALE, 28, 18), pearlMat = pearlMaterial(colors);
  owned.push(pearlGeo, pearlMat); ticks.push({ m: pearlMat, base: 1 });
  const pearl = new THREE.Mesh(pearlGeo, pearlMat); pearl.name = 'kim-long-pearl'; pearl.renderOrder = 8; parent.add(pearl);
  const haloMat = new THREE.SpriteMaterial({ map: softDot(), color: colors.light, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.7 });
  owned.push(haloMat);
  const halo = new THREE.Sprite(haloMat); halo.name = 'kim-long-pearl-halo'; halo.renderOrder = 11; parent.add(halo);

  const seg = lowQuality ? 8 : 14, strands = STRANDS.filter(s => !lowQuality || s[4] !== 0 || s[1][1] > 0.1);
  const strips = createRibbonStrips(strands.length, seg); owned.push(strips.geometry);
  const strandMeshes = [];
  for (const glow of lowQuality ? [0] : [0, 1]) {
    const mat = strandMaterial(colors, glow); owned.push(mat);
    ticks.push({ m: mat, base: glow ? 0.55 : 0.92, breathe: glow ? 0.4 : 0 });
    const mesh = new THREE.Mesh(strips.geometry, mat); mesh.name = glow ? 'kim-long-mane-glow' : 'kim-long-mane';
    mesh.renderOrder = glow ? 10 : 6; parent.add(mesh); strandMeshes.push(mesh);
  }

  const M = new THREE.Matrix4(), local = new THREE.Vector3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  const dir = new THREE.Vector3(), wobble = new THREE.Vector3();
  return {
    pearl,
    update(time, rhythm, f) {
      headMatrix(time, M);
      for (const mesh of meshes) mesh.matrix.copy(M);
      pearl.position.copy(PEARL_LOCAL).applyMatrix4(M);
      halo.position.copy(pearl.position);
      halo.scale.setScalar(0.5 + 0.06 * rhythm.pulse);
      haloMat.opacity = (0.4 + 0.15 * rhythm.pulse) * f;
      strands.forEach(([root, d, len, width, kind], k) => {
        dir.set(...d).normalize();
        for (let j = 0; j <= seg; j++) {
          const v = j / seg, wave = Math.sin(v * 5 - time * 0.9 + k * 1.3) * v;
          wobble.set(kind === 1 ? 0 : 0.12 * wave, kind === 1 ? 0.12 * wave : 0, kind === 2 ? 0.05 * wave : 0);
          local.set(...root).addScaledVector(dir, len * v).add(wobble);
          if (kind === 1) local.y -= 0.18 * v * v;
          c.copy(local).applyMatrix4(M);
          s.set(kind === 1 ? 0 : 1, kind === 1 ? 1 : 0, 0).transformDirection(M);
          strips.write(k, j, c, s, width * HEAD_SCALE * (1 - 0.75 * v));
        }
      });
      strips.commit();
      tickAll(ticks, time, rhythm, f);
    },
    dispose() { owned.forEach(o => o.dispose()); },
  };
}
