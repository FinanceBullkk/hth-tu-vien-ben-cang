import * as THREE from 'three';
import { createThanBaiGround } from './than-bai-ground.js';
import { createThanBaiCards } from './than-bai-cards.js';
import { createThanBaiChips } from './than-bai-chips.js';
import { breathRhythm } from './aura-rhythm.js';

// Thần Bài (effect 13) — hào quang chí tôn, chỉ mua được khi đã thắng đủ ván ở sòng (shared/shop.js).
//  Bóng dáng: QUẠT TỨ ÁT xoè sau đầu như vương miện, hào quang tia vàng xoay chậm phía sau.
//  Quanh thân: vòng lá bài bay ngang ngực, lần lượt lật lộ lưng đỏ chỉ vàng; phỉnh 財 tung lên
//    xoay tròn; kim quang li ti xoắn lên.
//  Nền đất: trận bàn sòng — vành ô đỏ đen kiểu cò quay, bốn chất bài, chữ 賭神財運.
//  Bảng màu: vàng kim + đỏ son + mực đen, khác Kim Long (vàng mây) ở chỗ có đỏ đen của sòng bài.
//  Nhịp 9 giây chỉ đổi độ sáng và độ xoè quạt, không đổi tốc độ.
const BASE_OPACITY = 0.9;
export const THAN_BAI_CYCLE = 9;
export const thanBaiRhythm = time => breathRhythm(time, THAN_BAI_CYCLE);
export const THAN_BAI_COLORS = {
  gold: new THREE.Color('#f2b632'), light: new THREE.Color('#ffe7a0'), red: new THREE.Color('#c8142c'), ink: new THREE.Color('#17141d'),
};

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createThanBaiAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const group = new THREE.Group(); group.name = 'than-bai-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createThanBaiGround(group, THAN_BAI_COLORS, lowQuality),
    createThanBaiCards(group, THAN_BAI_COLORS, lowQuality),
    createThanBaiChips(group, THAN_BAI_COLORS, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = thanBaiRhythm(time);
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
