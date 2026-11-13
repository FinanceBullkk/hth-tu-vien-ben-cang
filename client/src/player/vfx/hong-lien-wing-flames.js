import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { hongLienFlameTongue } from './hong-lien-billboard-textures.js';

// Lông vũ lửa đang cháy: ở ngọn mỗi lông bay và lông giữa có một lưỡi lửa lụa bốc lên, cao thấp
// lệch nhịp và nghiêng theo gió rất chậm. Bám theo ngọn lông (tips do createWings ghi mỗi khung)
// nên cánh vỗ thì cả viền lửa đi theo. Một InstancedMesh, cộng sáng; không lóe, không giật.
export function createWingFlames(parent, colors, tips) {
  const n = tips.length;
  const tint = colors.edge.clone().lerp(colors.gold, 0.45);
  const flames = layer(parent, 'hong-lien-wing-flames', hongLienFlameTongue(), n, tint, THREE.AdditiveBlending);
  return {
    update(time, rhythm, f) {
      tips.forEach((tip, i) => {
        const sway = Math.sin(time * (0.55 + hash(i) * 0.3) + i * 1.7), breath = 0.5 + 0.5 * Math.sin(time * 0.7 + i * 2.3);
        const h = (0.4 + 0.16 * breath + 0.1 * rhythm.release) * (0.75 + 0.5 * hash(i + 9));
        flames.set(i, tip.x, tip.y + h * 0.36, tip.z, h * 0.62, h, 0.55 + 0.3 * breath, 0.04 * sway + (tip.x > 0 ? -0.015 : 0.015));
      });
      flames.commit();
      flames.material.uniforms.opacity.value = (0.8 + 0.2 * rhythm.release) * f;
    },
    dispose() { flames.dispose(); },
  };
}
