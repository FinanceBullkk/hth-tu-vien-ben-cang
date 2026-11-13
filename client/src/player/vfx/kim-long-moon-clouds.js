import * as THREE from 'three';
import { moonMaterial, tickAll } from './kim-long-materials.js';
import { goldCloud, goldFlake } from './kim-long-textures.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { restFrame, newFrame } from './kim-long-spine.js';
import { sstep } from './aura-rhythm.js';

// Phía sau và quanh vòm rồng:
//  · NỬA VẦNG TRĂNG mờ (bán nguyệt ngà, nửa dưới tan vào dải mây) nằm trong lòng vòm, sau đầu —
//    không tròn đầy, không vành, không chữ.
//  · Tường vân vàng: cụm mây ôm chóp đuôi, đỡ khuỷu cổ, và dải mây cắt ngang chân trăng (chừa
//    trống ngay trên đầu). Mây chỉ bồng bềnh tại chỗ, biên độ nhỏ.
//  · Vảy kim quang rụng từ thân rồng, rơi chậm, xoay nhẹ rồi tan.
export const MOON = { x: 0, y: 1.78, z: -0.8, size: 3.0 };
export const FLAKE_LIFE = 8;
// [x, y, z, cỡ]
const CLOUDS = [
  [-0.98, 0.3, 0.12, 0.62, 1], [-0.7, 0.14, 0.32, 0.5, -1], [1.02, 0.62, 0.1, 0.6, -1], [0.82, 0.3, 0.36, 0.5, 1],
  [-0.88, 1.55, -0.8, 0.6, 1], [0.9, 1.58, -0.82, 0.62, -1], [-0.66, 2.32, -0.7, 0.44, -1], [0.7, 2.38, -0.72, 0.4, 1],
];

export function createMoonAndClouds(parent, colors, lowQuality) {
  const ticks = [], owned = [];
  const moonGeo = new THREE.PlaneGeometry(MOON.size, MOON.size); owned.push(moonGeo);
  const layers = lowQuality ? [0] : [1, 0];
  for (const glow of layers) {
    const mat = moonMaterial(colors, glow); owned.push(mat); ticks.push({ m: mat, base: glow ? 0.55 : 0.85, breathe: 0.25 });
    const mesh = new THREE.Mesh(moonGeo, mat); mesh.name = glow ? 'kim-long-moon-halo' : 'kim-long-half-moon';
    mesh.position.set(MOON.x, MOON.y, MOON.z + (glow ? -0.01 : 0)); mesh.renderOrder = glow ? 2 : 3; parent.add(mesh);
  }

  const cloudTex = goldCloud(), cloudLayers = [];
  cloudLayers.push(billboardLayer(parent, 'kim-long-clouds', cloudTex, CLOUDS.length, new THREE.Color(1, 1, 1), THREE.NormalBlending));
  if (!lowQuality) cloudLayers.push(billboardLayer(parent, 'kim-long-clouds-glow', cloudTex, CLOUDS.length, colors.gold.clone().multiplyScalar(0.45), THREE.AdditiveBlending));

  const flakeN = lowQuality ? 12 : 28;
  const flakes = billboardLayer(parent, 'kim-long-flakes', goldFlake(), flakeN, colors.light, THREE.AdditiveBlending);
  // Điểm rụng cố định trên thân (tránh đoạn đỉnh vòm ngay trên đầu để vảy không rơi trước mặt).
  const fr = newFrame();
  const starts = Array.from({ length: flakeN }, (_, i) => {
    const k = hash(i + 11), u = k < 0.5 ? 0.08 + 0.3 * (k / 0.5) : 0.62 + 0.28 * ((k - 0.5) / 0.5);
    restFrame(u, fr);
    return { p: fr.p.clone(), off: i / flakeN, sway: hash(i + 31) * Math.PI * 2 };
  });

  return {
    update(time, rhythm, f) {
      tickAll(ticks, time, rhythm, f);
      CLOUDS.forEach(([x, y, z, s], i) => {
        const bx = x + 0.04 * Math.sin(time * 0.12 + i * 1.7), by = y + 0.025 * Math.sin(time * 0.3 + i);
        for (const [k, layer] of cloudLayers.entries()) layer.set(i, bx, by, z + k * 0.01, s * 1.6, s, k ? 0.8 : 0.96);
      });
      starts.forEach((st, i) => {
        const u = ((time / FLAKE_LIFE + st.off) % 1 + 1) % 1;
        const a = sstep(0, 0.12, u) * (1 - sstep(0.7, 1, u));
        flakes.set(i, st.p.x + 0.06 * Math.sin(time * 0.5 + st.sway) * u, st.p.y - 0.62 * u, st.p.z + 0.04 * Math.cos(time * 0.4 + st.sway),
          0.07, 0.07, a, (time * 0.05 + st.sway) % 1);
      });
      cloudLayers.forEach(l => { l.commit(); l.material.uniforms.opacity.value = f; });
      flakes.commit(); flakes.material.uniforms.opacity.value = (0.75 + 0.2 * rhythm.pulse) * f;
    },
    dispose() { cloudLayers.forEach(l => l.dispose()); flakes.dispose(); owned.forEach(o => o.dispose()); },
  };
}
