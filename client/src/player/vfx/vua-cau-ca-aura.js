import * as THREE from 'three';
import { createVuaCauCaGround } from './vua-cau-ca-ground.js';
import { createLeapingFish } from './vua-cau-ca-leaping-fish.js';
import { createFishingRod } from './vua-cau-ca-rod.js';
import { breathRhythm } from './aura-rhythm.js';

// Vua Câu Cá (effect 14) — hào quang chí tôn, chỉ mua được khi đã câu đủ mọi loài trong Sổ cá (shared/shop.js).
//  Bóng dáng: CẦN CÂU VÀNG cong vồng vắt qua đầu, ngọn chúc xuống trước vai trái như dính cá lớn;
//    dây câu treo con cá chép vàng to đang quẫy, nước nhỏ giọt.
//  Quanh thân: cá chép vàng và cá bạc lần lượt vọt khỏi mặt nước theo vòng cung rồi lặn,
//    toé nước và loang gợn ở chỗ vọt lên, chỗ lặn xuống; bọt nước nổi lăn tăn.
//  Nền đất: trận biển — sóng vảy, tám lưỡi câu vàng, chữ 漁王, gợn nước loang đều từ chân.
//  Bảng màu: xanh biển sâu + lam ngọc + vàng kim; khác Lưu Ly (lam kính, tím biếc, xoáy nước sau lưng).
//  Nhịp 12 giây chỉ đổi độ sáng, không đổi tốc độ.
const BASE_OPACITY = 0.9;
export const VUA_CAU_CA_CYCLE = 12;
export const vuaCauCaRhythm = time => breathRhythm(time, VUA_CAU_CA_CYCLE);
export const VUA_CAU_CA_COLORS = {
  deep: new THREE.Color('#8a4b06'), gold: new THREE.Color('#f2b632'), light: new THREE.Color('#fff1b8'),
  aqua: new THREE.Color('#5fe3f0'), foam: new THREE.Color('#e9fdff'), sea: new THREE.Color('#0d4f6b'),
};

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createVuaCauCaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const group = new THREE.Group(); group.name = 'vua-cau-ca-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createVuaCauCaGround(group, VUA_CAU_CA_COLORS, lowQuality),
    createLeapingFish(group, VUA_CAU_CA_COLORS, lowQuality),
    createFishingRod(group, VUA_CAU_CA_COLORS, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = vuaCauCaRhythm(time);
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
