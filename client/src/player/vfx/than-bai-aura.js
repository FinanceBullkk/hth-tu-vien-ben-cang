import * as THREE from 'three';
import { createThanBaiGround } from './than-bai-ground.js';
import { createThanBaiCards } from './than-bai-cards.js';
import { createThanBaiChips } from './than-bai-chips.js';
import { createThanBaiDice } from './than-bai-dice.js';
import { createThanBaiLightning } from './than-bai-lightning.js';
import { createThanBaiFootprints } from './than-bai-footprints.js';
import { createLightArcs } from './aura-light-arcs.js';
import { breathRhythm } from './aura-rhythm.js';

// Thần Bài (effect 13) — hào quang chí tôn, chỉ mua được khi đã thắng đủ ván ở sòng (shared/shop.js).
//  Bóng dáng: QUẠT THÙNG PHÁ SẢNH — năm lá 10 J Q K A bích 3D phủ kim tuyến xoè sau đầu như đuôi công,
//    hào quang tia vàng xoay chậm phía sau.
//  Quanh thân: Thiên Bài Hoàn — vành mười hai lá bài lớn trôi nghiêng quanh ngực, lần lượt lật chậm; ba xúc xắc
//    vàng chấm hồng ngọc trôi vòng ngang hông; ba chồng phỉnh 3D lơ lửng; dải kim quang đỏ vàng lượn chậm.
//  Nguyên tắc: ít, to, chậm — không có gì bay vèo hay lộn nhào loạn; nhịp chủ yếu đổi độ sáng.
//  Nền đất: bàn cò quay pháp trận — vành ô đỏ đen quay, phím ngăn vàng, bi ngà chạy rãnh, bốn chất bài
//    đúc vàng bay vòng ngoài, cột kim quang quanh vành.
//  Cao trào "TẤT TAY" mỗi nhịp 12 giây: vành bài nâng thành vương miện quanh đầu, quạt lật sóng chậm từng lá,
//    ấn triện 賭神 đóng xuống trên đỉnh quạt, vài tia sét vàng giật xuống vương miện, xúc xắc và chồng phỉnh
//    nâng lên, phỉnh nổ hũ bay cao, tiền vàng rơi chậm như lá, sóng chấn vàng loang khỏi bàn — rồi hạ êm.
//  Bước đi: mỗi bước một lá bài xoay tròn rơi xuống nằm ngửa trên đất rồi mờ dần.
//  Bảng màu: vàng kim + đỏ son + mực đen, khác Kim Long (vàng mây) ở chỗ có đỏ đen của sòng bài.
const BASE_OPACITY = 0.9;
export const THAN_BAI_CYCLE = 12;
export const thanBaiRhythm = time => breathRhythm(time, THAN_BAI_CYCLE);
export const THAN_BAI_COLORS = {
  deep: new THREE.Color('#7a4106'), gold: new THREE.Color('#f2b632'), light: new THREE.Color('#fff1c2'),
  red: new THREE.Color('#e0142c'), ink: new THREE.Color('#2a1206'),
  // Dải kim quang (bộ lưu quang chung): mép vàng, lõi ngà, đuôi ngả đỏ son.
  edge: new THREE.Color('#ffc845'), core: new THREE.Color('#fff7dc'), arcTail: new THREE.Color('#ff3b2f'),
};
const ARCS = [
  { r: 1.05, y: 1.1, tilt: 1.0, yaw: 0.4, speed: 0.16, len: 3.6, w: 0.11 },
  { r: 1.25, y: 0.7, tilt: -0.75, yaw: 2.3, speed: -0.12, len: 3.0, w: 0.09 },
  { r: 0.95, y: 1.55, tilt: 0.5, yaw: 4.2, speed: 0.2, len: 2.6, w: 0.07 },
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
    createThanBaiLightning(group, c, lowQuality),
    createThanBaiFootprints(group, c),
    createLightArcs(group, { edge: c.edge, core: c.core, gold: c.arcTail }, lowQuality,
      { arcs: lowQuality ? ARCS.slice(0, 2) : ARCS, name: 'than-bai-light-arcs' }),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t, walk = 0) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = thanBaiRhythm(time);
      parts.forEach(p => p.update(time, rhythm, f, walk));
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
