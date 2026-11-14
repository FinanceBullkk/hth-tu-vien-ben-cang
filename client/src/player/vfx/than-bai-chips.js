import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bell, softDot, sstep } from './aura-rhythm.js';
import { chipFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { chipMaskTexture } from './than-bai-textures.js';
import { allIn } from './than-bai-cards.js';

// Phỉnh và kim quang của Thần bài. Phỉnh là trụ dẹt 3D (mặt khảm chữ 財, vạch trắng quanh mép), ba màu
// đỏ son / đen / ngọc bích; đồng vàng khảm 財 đỏ. Mọi chuyển động chậm và nặng tay:
//  - Chồng phỉnh: ba chồng phỉnh lơ lửng trên mép bàn (mỗi chồng một màu), xếp hơi so le như tay người chồng,
//    trôi vòng rất chậm và nhấp nhô nhẹ; lúc tất tay cả ba chồng nâng lên.
//  - Nổ hũ: lúc tất tay một vòng phỉnh bung chậm từ tâm toả ra theo đường parabol cao, xoay nhẹ, rồi tan.
//  - Mưa tiền: chỉ lúc tất tay, đồng vàng rơi chậm như lá (gần 3 giây mới chạm đất), lật nhẹ, chạm đất thì tan.
//  - Kim quang: hạt vàng thưa, bay lên chậm, lấp lánh dịu.
const STACKS = 3, SPARK_LIFE = 6.5, RAIN_FALL = 2.8;
const chipGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 1); // dùng chung, không dispose
const CHIP = new THREE.Vector3(0.13, 0.022, 0.13), COIN = new THREE.Vector3(0.1, 0.014, 0.1);
export const CHIP_STACK = { radius: 1.22, y: 0.22, speed: 0.08 };

export function createThanBaiChips(parent, colors, lowQuality) {
  const perStack = lowQuality ? 4 : 7, jackpot = lowQuality ? 6 : 12, rain = lowQuality ? 6 : 14, sparkCount = lowQuality ? 10 : 22;
  const stackTotal = STACKS * perStack, total = stackTotal + jackpot + rain;
  const chips = instancedLayer(parent, 'than-bai-chips', chipGeo, litMaterial(chipFragment, {
    map: { value: chipMaskTexture() }, white: { value: new THREE.Color('#fff6e4') }, gold: { value: colors.gold }, light: { value: colors.light },
  }), total, 7);
  const sparks = billboardLayer(parent, 'than-bai-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const seeds = Array.from({ length: total }, (_, i) => ({
    a: hash(i + 1) * Math.PI * 2, off: hash(i + 11), spin: 0.6 + 0.6 * hash(i + 31), yaw: hash(i + 41) * 6.28,
    reach: 1.0 + 0.5 * hash(i + 51), lift: 1.4 + 0.5 * hash(i + 61),
  }));
  const sparkSeeds = Array.from({ length: sparkCount }, (_, i) => ({ a: hash(i + 71) * Math.PI * 2, off: hash(i + 81), r: 0.45 + 0.6 * hash(i + 91) }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const hit = allIn(rhythm);
      const b = sstep(0.45, 0.78, rhythm.phase), glow = bell(0.46, 0.05, rhythm.phase);
      const pour = sstep(0.46, 0.52, rhythm.phase) * (1 - sstep(0.8, 0.92, rhythm.phase));
      for (let i = 0; i < total; i++) {
        const s = seeds[i];
        let alpha = 1, scale = CHIP, variant = i % 3;
        if (i < stackTotal) {
          // Chồng phỉnh: chồng thứ st, lá thứ h từ dưới lên, so le nhẹ, xoay rất chậm.
          const st = Math.floor(i / perStack), h = i % perStack, a = st / STACKS * Math.PI * 2 + 0.5 + time * CHIP_STACK.speed;
          const bob = 0.03 * Math.sin(time * 0.6 + st * 2.1) + 0.25 * hit;
          p.set(Math.sin(a) * CHIP_STACK.radius + 0.008 * Math.sin(h * 2.3 + st), CHIP_STACK.y + bob + h * 0.026, Math.cos(a) * CHIP_STACK.radius + 0.008 * Math.cos(h * 1.7));
          e.set(0, s.yaw + time * 0.15, 0.03 * Math.sin(h * 1.9));
          variant = st;
        } else if (i < stackTotal + jackpot) {
          // Nổ hũ: bay theo parabol cao ra xa, chỉ hiện trong cửa sổ cao trào.
          const r = 0.2 + s.reach * b;
          p.set(Math.sin(s.a) * r, 0.3 + s.lift * b - (s.lift + 0.25) * b * b, Math.cos(s.a) * r);
          e.set(b * Math.PI * s.spin, s.yaw, b * Math.PI * 0.8);
          alpha = b > 0.001 && b < 0.999 ? Math.min(1, (1 - b) * 4, b * 20) : 0;
        } else {
          // Mưa tiền: rơi chậm đều như lá, lật nhẹ, chỉ lúc tất tay.
          const u = ((time / RAIN_FALL + s.off) % 1 + 1) % 1, r = 0.4 + 0.9 * s.off;
          p.set(Math.sin(s.a) * r + 0.06 * Math.sin(time * 1.1 + i), 2.6 - 2.55 * u, Math.cos(s.a) * r);
          e.set(time * s.spin + s.yaw, s.yaw, 0.6 * Math.sin(time * 0.9 + i));
          alpha = pour * Math.min(1, u * 5) * Math.min(1, (1 - u) * 6);
          scale = COIN; variant = 3;
        }
        q.setFromEuler(e);
        chips.set(i, m.compose(p, q, scale), alpha * f, variant);
      }
      chips.commit();
      chips.material.uniforms.time.value = time;
      sparkSeeds.forEach(({ a, off, r }, i) => {
        const u = ((time / SPARK_LIFE + off) % 1 + 1) % 1, ang = a + time * 0.12 + u * 1.2;
        const tw = 0.7 + 0.3 * Math.sin(time * 2 + i * 2.3), size = (0.035 + 0.025 * tw) * (1 + 0.6 * glow);
        sparks.set(i, Math.sin(ang) * r, 0.12 + u * 2.0, Math.cos(ang) * r, size, size,
          Math.sin(Math.PI * u) * tw * (0.55 + 0.35 * rhythm.pulse + glow) * f);
      });
      sparks.commit();
    },
    dispose() { chips.dispose(); sparks.dispose(); },
  };
}
