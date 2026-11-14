import * as THREE from 'three';
import { createThanBaiGround } from './than-bai-ground.js';
import { createThanBaiCards } from './than-bai-cards.js';
import { createThanBaiChips } from './than-bai-chips.js';
import { createThanBaiDice } from './than-bai-dice.js';
import { createLightArcs } from './aura-light-arcs.js';
import { breathRhythm } from './aura-rhythm.js';

// Thần Bài (effect 13) — hào quang chí tôn, chỉ mua được khi đã thắng đủ ván ở sòng (shared/shop.js).
//  Bóng dáng: QUẠT THÙNG PHÁ SẢNH — năm lá 10 J Q K A bích 3D phủ kim tuyến xoè sau đầu như đuôi công,
//    hào quang tia vàng xoay chậm phía sau.
//  Quanh thân: lốc bài xoắn kép cuộn từ chân lên quá đầu; ba xúc xắc vàng chấm hồng ngọc bay vòng ngang hông;
//    mạch phỉnh 3D tung lên; dải kim quang đỏ vàng uốn lượn; kim quang li ti.
//  Nền đất: bàn cò quay pháp trận — vành ô đỏ đen quay, phím ngăn vàng, bi ngà chạy rãnh, bốn chất bài
//    đúc vàng bay vòng ngoài, cột kim quang quanh vành.
//  Cao trào "TẤT TAY" mỗi nhịp 9 giây: quạt lật sóng từng lá và lóe sáng, ấn triện 賭神 đóng xuống trên đỉnh
//    quạt, xúc xắc nảy vọt, phỉnh nổ hũ toả bốn phía, sóng chấn vàng loang khỏi bàn.
//  Bảng màu: vàng kim + đỏ son + mực đen, khác Kim Long (vàng mây) ở chỗ có đỏ đen của sòng bài.
const BASE_OPACITY = 0.9;
export const THAN_BAI_CYCLE = 9;
export const thanBaiRhythm = time => breathRhythm(time, THAN_BAI_CYCLE);
export const THAN_BAI_COLORS = {
  deep: new THREE.Color('#7a4106'), gold: new THREE.Color('#f2b632'), light: new THREE.Color('#fff1c2'),
  red: new THREE.Color('#e0142c'), ink: new THREE.Color('#2a1206'),
  // Dải kim quang (bộ lưu quang chung): mép vàng, lõi ngà, đuôi ngả đỏ son.
  edge: new THREE.Color('#ffc845'), core: new THREE.Color('#fff7dc'), arcTail: new THREE.Color('#ff3b2f'),
};
const ARCS = [
  { r: 1.05, y: 1.1, tilt: 1.0, yaw: 0.4, speed: 0.42, len: 3.6, w: 0.11 },
  { r: 1.25, y: 0.7, tilt: -0.75, yaw: 2.3, speed: -0.34, len: 3.0, w: 0.09 },
  { r: 0.95, y: 1.55, tilt: 0.5, yaw: 4.2, speed: 0.5, len: 2.6, w: 0.07 },
];

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createThanBaiAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const c = THAN_BAI_COLORS;
  const group = new THREE.Group(); group.name = 'than-bai-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createThanBaiGround(group, c, lowQuality),
    createThanBaiCards(group, c, lowQuality),
    createThanBaiDice(group, c, lowQuality),
    createThanBaiChips(group, c, lowQuality),
    createLightArcs(group, { edge: c.edge, core: c.core, gold: c.arcTail }, lowQuality,
      { arcs: lowQuality ? ARCS.slice(0, 2) : ARCS, name: 'than-bai-light-arcs' }),
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
