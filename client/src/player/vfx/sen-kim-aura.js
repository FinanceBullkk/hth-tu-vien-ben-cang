import * as THREE from 'three';
import { SEN_KIM_COLORS } from './sen-kim-materials.js';
import { SEN_KIM_CYCLE } from './sen-kim-layout.js';
import { createPool } from './sen-kim-pool.js';
import { createLotusPlatform } from './sen-kim-platform.js';
import { createStamens } from './sen-kim-stamens.js';
import { createDew } from './sen-kim-dew.js';
import { createPollen } from './sen-kim-pollen.js';
import { breathRhythm } from './aura-rhythm.js';

// Sen kim (effect 1) — Cửu Phẩm Kim Liên. Theo bảng phân vai aura: bóng dáng riêng là người
// ĐỨNG TRÊN ĐÀI SEN VÀNG NỞ — đài sen ba tầng cuốn ngược ôm chân, đế đài vàng, bồ nhụy hé lộ
// sau lưng. Động từ: NỞ LỆCH NHỊP — từng cánh nở/khép lệch pha, gân cánh chảy khí, hoạt lộ
// lăn theo gân rồi rụng, bụi vàng dâng chậm. Không mandala, không vòng chữ triện, không trận
// đồ, không trụ sáng, không vòm kết giới. Nhịp 11 giây, tốc độ cố định.
const BASE_OPACITY = 0.9;
export { SEN_KIM_CYCLE };
export const senKimRhythm = time => breathRhythm(time, SEN_KIM_CYCLE);

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm 3 lần. */
export function createSenKimAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = SEN_KIM_COLORS;
  const group = new THREE.Group(); group.name = 'sen-kim-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createPool(group, colors, lowQuality),
    createLotusPlatform(group, colors, lowQuality),
    createStamens(group, colors, lowQuality),
    createDew(group, colors, lowQuality),
    createPollen(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = senKimRhythm(time);
      parts.forEach(p => p.update(time, rhythm, f));
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity.
    setColor() {},
    setWeapon() {},
    dispose() {
      parts.forEach(p => p.dispose());
      group.material.dispose();
    },
  };
}
