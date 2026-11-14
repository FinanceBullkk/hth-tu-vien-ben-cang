import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { TOP_Y } from './sen-kim-layout.js';

// Bụi vàng li ti dâng chậm quanh đài sen như phấn hoa mang ánh sáng: vòng bụng thấp quanh
// mép đài, dọc đường dâng lượn nhẹ và tan dần — không bao giờ dâng cao quá vai hay lọt vào
// vùng chừa quanh mặt.
const COUNT_FULL = 40, COUNT_LOW = 20, RISE = 9.5;

export function createPollen(parent, colors, lowQuality) {
  const count = lowQuality ? COUNT_LOW : COUNT_FULL;
  const pollen = billboardLayer(parent, 'sen-kim-pollen', softDot(), count, colors.gold, THREE.AdditiveBlending);

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < count; i++) {
        const life = (time / RISE + hash(i * 3 + 1)) % 1;
        const a = hash(i * 7 + 2) * Math.PI * 2 + time * (0.06 + hash(i + 5) * 0.05) * (i % 2 ? 1 : -1);
        const r = 0.34 + hash(i * 11 + 4) * 0.72;
        // Dâng thấp dần tan: y luôn dưới 0.58 để khỏi đè vùng mặt.
        const y = 0.09 + 0.49 * life;
        const sway = 0.05 * Math.sin(time * 0.7 + i * 1.7);
        const alpha = Math.sin(life * Math.PI) * 0.5 * f;
        pollen.set(i, Math.sin(a) * r + sway, Math.min(y, TOP_Y - 0.34), Math.cos(a) * r + sway,
          0.035 + hash(i + 9) * 0.03, 0.035 + hash(i + 9) * 0.03, alpha);
      }
      pollen.commit();
    },
    dispose() { pollen.dispose(); },
  };
}
