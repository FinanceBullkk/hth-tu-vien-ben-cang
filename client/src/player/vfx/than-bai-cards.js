import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas, sunburstTexture } from './than-bai-textures.js';
import { sstep } from './aura-rhythm.js';

// Bài của Thần bài, hai lớp atlas (mỗi lớp một lần vẽ) và một hào quang tia:
//  Quạt Tứ Át — bóng dáng riêng: bốn lá Át (♠♥♦♣) xoè quạt sau đầu như vương miện, hai mặt đều
//    là mặt bài; nhịp thở xoè rộng thêm rồi khép lại. Phía sau là hào quang tia vàng xoay rất chậm.
//  Vòng bài bay — các lá bài bay vòng ngang ngực, mặt hướng ra ngoài, lần lượt lật để lộ lưng đỏ
//    chỉ vàng rồi lật lại; vòng hơi nghiêng như đang được tung tráo trên không.
// Không có: rồng, mây, trăng, kiếm, sen, cánh — những thứ của các hào quang khác.
export const FAN = { x: 0, y: 1.32, z: -0.5, radius: 0.42, spread: 0.4 };
export const RING = { radius: 0.9, y: 0.78, tilt: 0.12, speed: 0.32 };
const FAN_CELLS = [CARD_CELLS.aceSpade, CARD_CELLS.aceHeart, CARD_CELLS.aceDiamond, CARD_CELLS.aceClub];
const RING_CELLS = [CARD_CELLS.kingHeart, CARD_CELLS.aceSpade, CARD_CELLS.queenSpade, CARD_CELLS.aceHeart,
  CARD_CELLS.jackDiamond, CARD_CELLS.aceDiamond, CARD_CELLS.kingHeart, CARD_CELLS.aceClub];
// Kích thước tấm theo ô atlas 1:2 (lá bài chiếm phần giữa ô).
const RING_SIZE = new THREE.Vector3(0.24, 0.48, 1), FAN_SIZE = new THREE.Vector3(0.42, 0.84, 1);

export function createThanBaiCards(parent, colors, lowQuality) {
  const atlas = cardAtlas(), ringCount = lowQuality ? 5 : 8;
  const burst = billboardLayer(parent, 'than-bai-sunburst', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  burst.mesh.renderOrder = 3;
  const fan = atlasPlaneLayer(parent, 'than-bai-ace-fan', atlas, FAN_CELLS.length, { ...CARD_ATLAS, renderOrder: 6 });
  const ring = atlasPlaneLayer(parent, 'than-bai-card-ring', atlas, ringCount, { ...CARD_ATLAS, renderOrder: 7 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      // Hào quang tia: một tấm lớn quay chậm sau quạt, sáng theo nhịp.
      burst.set(0, FAN.x, FAN.y + 0.2, FAN.z - 0.06, 2.1, 2.1, (0.38 + 0.4 * rhythm.pulse) * f, (time * 0.015) % 1);
      burst.commit();

      // Quạt Tứ Át: xoè theo nhịp thở, mép quạt rung nhẹ.
      const spread = FAN.spread * (1 + 0.22 * rhythm.release - 0.08 * rhythm.gather);
      FAN_CELLS.forEach((cell, i) => {
        const k = i - (FAN_CELLS.length - 1) / 2, a = k * spread + 0.02 * Math.sin(time * 1.3 + i);
        p.set(FAN.x + Math.sin(a) * FAN.radius, FAN.y + Math.cos(a) * FAN.radius + 0.02 * Math.sin(time * 0.8), FAN.z - Math.abs(k) * 0.012);
        q.setFromEuler(e.set(0, 0, -a));
        fan.set(i, m.compose(p, q, FAN_SIZE), f, cell, cell);
      });
      fan.commit();

      // Vòng bài bay: mặt hướng ra ngoài; mỗi 7 giây một lá lật lộ lưng chừng 1.7 giây rồi lật lại.
      for (let i = 0; i < ringCount; i++) {
        const a = i / ringCount * Math.PI * 2 + time * RING.speed;
        const phase = ((time / 7 + i / ringCount) % 1 + 1) % 1;
        const flip = -Math.PI * (sstep(0, 0.08, phase) - sstep(0.25, 0.33, phase));
        p.set(Math.sin(a) * RING.radius, RING.y + RING.tilt * Math.cos(a + 0.6) + 0.04 * Math.sin(time * 1.1 + i * 1.7), Math.cos(a) * RING.radius);
        q.setFromEuler(e.set(0.18 * Math.sin(time * 0.7 + i), a + flip, 0.12 * Math.sin(a * 2 + time * 0.5), 'YXZ'));
        ring.set(i, m.compose(p, q, RING_SIZE), f * (0.85 + 0.15 * rhythm.pulse), RING_CELLS[i % RING_CELLS.length], CARD_CELLS.back);
      }
      ring.commit();
    },
    dispose() { burst.dispose(); fan.dispose(); ring.dispose(); },
  };
}
