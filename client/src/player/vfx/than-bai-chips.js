import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { chipTexture } from './than-bai-textures.js';

// Phỉnh sòng và kim quang của Thần bài: phỉnh đỏ chữ 財 tung từ quanh chân lên cao, xoay tròn,
// chậm dần rồi tan như vừa được ném lên bàn ăn tiền; hạt vàng li ti xoắn lên quanh thân.
const CHIP_LIFE = 3.4, SPARK_LIFE = 4.2;

export function createThanBaiChips(parent, colors, lowQuality) {
  const chipCount = lowQuality ? 7 : 14, sparkCount = lowQuality ? 12 : 26;
  const chips = billboardLayer(parent, 'than-bai-chips', chipTexture(), chipCount, new THREE.Color(1, 1, 1), THREE.NormalBlending);
  const sparks = billboardLayer(parent, 'than-bai-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const chipSeeds = Array.from({ length: chipCount }, (_, i) => ({
    a: i / chipCount * Math.PI * 2 + hash(i + 1) * 0.6, off: hash(i + 11), h: 1.3 + 0.6 * hash(i + 21), s: 0.1 + 0.03 * hash(i + 31),
  }));
  const sparkSeeds = Array.from({ length: sparkCount }, (_, i) => ({ a: hash(i + 41) * Math.PI * 2, off: hash(i + 51), r: 0.45 + 0.55 * hash(i + 61) }));

  return {
    update(time, rhythm, f) {
      chipSeeds.forEach(({ a, off, h, s }, i) => {
        const u = ((time / CHIP_LIFE + off) % 1 + 1) % 1;
        const ang = a + u * 1.4, r = 0.5 + 0.5 * u;
        const y = 0.08 + h * (1 - (1 - u) * (1 - u)); // vọt nhanh rồi chậm dần
        const alpha = Math.min(1, u * 8) * Math.pow(1 - u, 0.7);
        chips.set(i, Math.sin(ang) * r, y, Math.cos(ang) * r, s, s, alpha * f, (u * 2.5 + off) % 1);
      });
      chips.commit();
      sparkSeeds.forEach(({ a, off, r }, i) => {
        const u = ((time / SPARK_LIFE + off) % 1 + 1) % 1, ang = a + time * 0.5 + u * 2.2;
        const tw = 0.6 + 0.4 * Math.sin(time * 6 + i * 2.3);
        const size = 0.035 + 0.03 * tw;
        sparks.set(i, Math.sin(ang) * r, 0.1 + u * 1.9, Math.cos(ang) * r, size, size, Math.sin(Math.PI * u) * tw * (0.6 + 0.4 * rhythm.pulse) * f);
      });
      sparks.commit();
    },
    dispose() { chips.dispose(); sparks.dispose(); },
  };
}
