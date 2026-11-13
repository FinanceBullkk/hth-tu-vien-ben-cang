import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { inkWisp } from './huyen-da-textures.js';
import { pathSeed, inwardPoint, inwardFade } from './huyen-da-inward-path.js';

// Hạt bị hút: cụm khói mực đen (normal blend) và hạt sáng tím bạc cùng trôi theo đường hút xoáy
// vào tâm nhật thực, nhỏ dần rồi tan. Mỗi lớp MỘT InstancedMesh billboard. Tốc độ cố định; nhịp thở
// chỉ đổi độ đậm (hít vào: hạt sáng rõ hơn như ánh sáng bị nuốt), không đổi tốc độ.
export const WISP_LIFE = 14, SPARK_LIFE = 11;

export function createInwardMotes(parent, colors, lowQuality) {
  const wispN = lowQuality ? 5 : 12, sparkN = lowQuality ? 12 : 30;
  const wisps = layer(parent, 'huyen-da-ink-wisps', inkWisp(), wispN, colors.deep, THREE.NormalBlending);
  const sparks = layer(parent, 'huyen-da-sparks', softDot(), sparkN, colors.edge.clone().lerp(colors.core, 0.45), THREE.AdditiveBlending);
  const wispSeeds = Array.from({ length: wispN }, (_, k) => pathSeed(k, 200));
  const sparkSeeds = Array.from({ length: sparkN }, (_, k) => pathSeed(k, 300));
  const p = { x: 0, y: 0, z: 0 };

  return {
    update(time, rhythm, f) {
      const spin = -time * 0.03;
      wispSeeds.forEach((s, i) => {
        const u = ((time / WISP_LIFE + i / wispN) % 1 + 1) % 1, fade = inwardFade(u);
        inwardPoint(s, u, spin, p);
        const sz = 0.42 * (1 - 0.7 * u);
        wisps.set(i, p.x, p.y, p.z, sz, sz * 0.8, fade * 0.75, hash(i + 5) + time * 0.02);
      });
      wisps.commit(); wisps.material.uniforms.opacity.value = 0.85 * f;
      sparkSeeds.forEach((s, i) => {
        const u = ((time / SPARK_LIFE + hash(i + 7)) % 1 + 1) % 1, fade = inwardFade(u);
        inwardPoint(s, u, spin, p);
        const tw = 0.6 + 0.4 * Math.sin(time * (0.8 + hash(i + 9)) + i * 2.3);
        const sz = (0.05 + 0.05 * hash(i + 11)) * (1 - 0.5 * u);
        sparks.set(i, p.x, p.y, p.z, sz, sz, fade * tw * (0.7 + 0.3 * rhythm.gather), 0);
      });
      sparks.commit(); sparks.material.uniforms.opacity.value = f;
    },
    dispose() { wisps.dispose(); sparks.dispose(); },
  };
}
