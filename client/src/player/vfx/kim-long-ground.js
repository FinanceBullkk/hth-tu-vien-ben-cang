import * as THREE from 'three';
import { cloudSeaMaterial, tickAll } from './kim-long-materials.js';
import { cloudSeaTile, flatCloud } from './kim-long-textures.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';

// Nền đất Kim Long: BIỂN MÂY VÀNG — thảm tường vân vẽ màu (normal blend, viền mực nâu) trôi ngang
// rất chậm, mép tròn tan; lớp sáng cộng màu chỉ có ở chất lượng đủ. Quanh chân là vòng cụm mây
// thấp dựng đứng như rồng vừa đáp xuống mây. Không vòng chữ, không bát quái, không trận tròn.
const MOUNDS = 8;

export function createCloudGround(parent, colors, lowQuality) {
  const ticks = [], owned = [];
  const geo = new THREE.PlaneGeometry(3.4, 3.4); owned.push(geo);
  const tile = cloudSeaTile();
  for (const glow of lowQuality ? [0] : [0, 1]) {
    const mat = cloudSeaMaterial(tile, glow ? colors.gold.clone().multiplyScalar(0.5) : new THREE.Color(1, 1, 1), glow);
    owned.push(mat); ticks.push({ m: mat, base: glow ? 0.5 : 0.82, breathe: glow ? 0.35 : 0 });
    const mesh = new THREE.Mesh(geo, mat); mesh.name = glow ? 'kim-long-cloud-sea-glow' : 'kim-long-cloud-sea';
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.014 + glow * 0.004; mesh.renderOrder = 1 + glow; parent.add(mesh);
  }
  const tex = flatCloud(), layers = [billboardLayer(parent, 'kim-long-cloud-mounds', tex, MOUNDS, new THREE.Color(1, 1, 1), THREE.NormalBlending)];
  if (!lowQuality) layers.push(billboardLayer(parent, 'kim-long-cloud-mounds-glow', tex, MOUNDS, colors.gold.clone().multiplyScalar(0.4), THREE.AdditiveBlending));
  const seeds = Array.from({ length: MOUNDS }, (_, i) => ({
    a: (i + 0.5) / MOUNDS * Math.PI * 2 + 0.25 * hash(i + 5), r: 1.0 + 0.25 * hash(i + 7), s: 0.55 + 0.25 * hash(i + 9),
  }));

  return {
    update(time, rhythm, f) {
      tickAll(ticks, time, rhythm, f);
      seeds.forEach(({ a, r, s }, i) => {
        const x = Math.sin(a) * r + 0.03 * Math.sin(time * 0.15 + i), z = Math.cos(a) * r;
        for (const [k, l] of layers.entries()) l.set(i, x, 0.2 + 0.02 * Math.sin(time * 0.25 + i * 1.3), z, s * 1.7, s, k ? 0.7 : 0.95);
      });
      layers.forEach(l => { l.commit(); l.material.uniforms.opacity.value = f; });
    },
    dispose() { layers.forEach(l => l.dispose()); owned.forEach(o => o.dispose()); },
  };
}
