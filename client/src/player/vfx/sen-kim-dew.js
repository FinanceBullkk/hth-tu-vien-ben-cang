import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { dewDrop } from './sen-kim-textures.js';
import { PETAL_COUNT, petalPoint } from './sen-kim-layout.js';
import { sstep } from './aura-rhythm.js';

// Hoạt lộ: giọt sương vàng bám gân cánh, lăn chậm từ gốc lên ngọn theo dòng khí rồi rụng
// khỏi mép cánh, tan trước khi chạm đất. Mỗi giọt gắn một cánh, pha lệch nhau — hàm thuần
// của thời gian.
const RIDE = 0.52, FALL_END = 0.86;

export function createDew(parent, colors, lowQuality) {
  const count = lowQuality ? 8 : 14;
  const drops = billboardLayer(parent, 'sen-kim-dew', dewDrop(), count, colors.core, THREE.AdditiveBlending);
  const p = { x: 0, y: 0, z: 0 };

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < count; i++) {
        const life = (time / 7 + hash(i * 5 + 3)) % 1;
        const petal = i % PETAL_COUNT;
        if (life < RIDE) {
          const v = 0.3 + (life / RIDE) * 0.72; // lăn trên gân từ gốc lên gần ngọn
          petalPoint(petal, v, time, p);
          const a = 0.85 * sstep(0, 0.08, life) * f;
          drops.set(i, p.x, p.y + 0.015, p.z, 0.05, 0.08, a);
        } else if (life < FALL_END) {
          const d = (life - RIDE) / (FALL_END - RIDE); // rụng khỏi ngọn cánh
          petalPoint(petal, 1 + d * 0.55, time, p);
          const a = 0.85 * (1 - sstep(0.55, 1, d)) * f;
          drops.set(i, p.x, p.y, p.z, 0.05, 0.08, a);
        } else drops.set(i, 0, -1, 0, 0.001, 0.001, 0); // hết đời: gom về điểm mờ
      }
      drops.commit();
    },
    dispose() { drops.dispose(); },
  };
}
