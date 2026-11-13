import * as THREE from 'three';
import { BICH_NGOC_COLORS } from './bich-ngoc-materials.js';
import { createGrove } from './bich-ngoc-grove.js';
import { createGround } from './bich-ngoc-ground.js';
import { createWind } from './bich-ngoc-wind.js';
import { createWindChime } from './bich-ngoc-wind-chime.js';
import { createBillboards } from './bich-ngoc-billboards.js';
import { breathRhythm } from './aura-rhythm.js';

// Bích Ngọc Thanh Phong (effect 6) — Trúc Lâm Phong Quyển. Theo bảng phân vai aura: bóng dáng
// riêng là RỪNG TRÚC THẲNG ĐỨNG vây quanh người, động từ riêng là GIÓ XOÁY NGANG; không vòng tròn,
// không đĩa sau lưng, không vòng chữ, không trận đồ, không dải lưu quang/phiêu đái.
//  Rừng trúc: mười thân trúc ngọc 3D có đốt, cao thấp, ba cụm lệch trái-phải-sau, hở trước mặt
//    và sau đầu; cành con chìa ra ngoài mang chùm lá rủ; ngọn trúc lay xuôi gió.
//  Gió xoáy: ba dải gió xoắn vân mây cuộn quấn ngang dưới vai, lá trúc 3D cuốn vòng theo dải;
//    vệt gió lượn trên các ngọn trúc; bụi ngọc bay lên.
//  Chuông gió ngọc treo trên cần trúc bên phải, thẻ ngọc 風.
//  Nền đất: thảm rêu dưới từng cụm, bóng trúc đổ chéo, đá rêu và măng trúc 3D.
//  Nhịp 12 giây: thở ra thì gió dày hơn (thêm lá cuốn, dải gió đậm hơn) — không tăng tốc;
//  mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây). */
export const BICH_NGOC_CYCLE = 12;
export const bichNgocRhythm = time => breathRhythm(time, BICH_NGOC_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createBichNgocAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = BICH_NGOC_COLORS;
  const group = new THREE.Group(); group.name = 'bich-ngoc-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const wind = createWind(group, colors, lowQuality);
  const parts = [
    createGround(group, colors, lowQuality),
    createGrove(group, colors, lowQuality),
    wind,
    createWindChime(group, colors, lowQuality),
    createBillboards(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    wind,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = bichNgocRhythm(time);
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
