import * as THREE from 'three';
import { createDecoGround } from './than-bai-deco-ground.js';
import { createDecoHalo } from './than-bai-deco-halo.js';
import { createKinhLucCards } from './than-bai-kinh-luc.js';
import { createAceOfSpades } from './than-bai-ace.js';
import { createThanBaiFootprints } from './than-bai-footprints.js';
import { aceTimeline } from './than-bai-climax.js';
import { breathRhythm } from './aura-rhythm.js';

// Thần Bài (effect 13) — "ĐỔ THẦN · KÌNH LỰC KIM BÀI", hào quang chí tôn, chỉ mua được khi đã thắng đủ ván ở sòng.
// Hướng mỹ thuật (tham khảo: hình tượng Đổ Thần — điềm tĩnh rồi lật con Át đúng lúc; ngôn ngữ Art Deco của sòng bài
// Macau — vàng trên đen, đối xứng, tia nan quạt; VFX lá bài chuyên nghiệp — tụ, bùng dứt khoát, vỡ lật lả tả):
//  TĨNH (uy): hào quang nan quạt Art Deco vàng đúc sau đầu (nan vát cạnh, cung bậc, hồng ngọc), đĩa sơn mài đen
//    chỉ vàng dưới chân, bốn chất bài đúc vàng đứng như tượng. Phần lớn thời gian đứng yên, chỉ thở và lóe sao.
//  ĐỘNG (ngầu): ba lá Kình Lực Bài bay quỹ đạo chữ S, bọc lửa đỏ tím, lách tách tia điện, kéo dải khí bụng–cổ–đuôi.
//  CAO TRÀO "ÁT CHỦ BÀI" mỗi nhịp 12 giây (xem than-bai-climax.js): ba lá xoáy tụ về sau đầu, hào quang nén lại,
//    chỉ vàng sáng dồn vào tâm → lá Át bích khổng lồ bật hiện, sao lóe bốn cánh, hào quang bật xoè, sóng chấn →
//    lơ lửng một nhịp → vỡ thành mảnh bài vàng lật lả tả rơi, ba lá kình lực tái sinh bay về quỹ đạo.
//  Bước đi: mỗi bước một lá bài rơi nằm ngửa trên đất rồi mờ dần.
//  Không có: đạo cụ sòng bài vụn (xúc xắc, phỉnh, bàn quay), rồng, mây, trăng, kiếm, sen, cánh.
//  Bảng màu: vàng kim + đen sơn mài + đỏ son, năng lượng đỏ thắm ngả tím.
const BASE_OPACITY = 0.9;
export const THAN_BAI_CYCLE = 12;
export const thanBaiRhythm = time => breathRhythm(time, THAN_BAI_CYCLE);
export const THAN_BAI_COLORS = {
  deep: new THREE.Color('#6e3a05'), gold: new THREE.Color('#f0b43a'), light: new THREE.Color('#fff3cc'),
  red: new THREE.Color('#e3163a'), ink: new THREE.Color('#1c0d04'),
  rubyDeep: new THREE.Color('#4a0010'), rubyLight: new THREE.Color('#ff8fa6'),
  ember: new THREE.Color('#ff2f6e'), violet: new THREE.Color('#7b2cff'),
};

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createThanBaiAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const c = THAN_BAI_COLORS;
  const group = new THREE.Group(); group.name = 'than-bai-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const ground = createDecoGround(group, c, lowQuality);
  const halo = createDecoHalo(group, c, lowQuality);
  const cards = createKinhLucCards(group, c, lowQuality);
  const ace = createAceOfSpades(group, c, lowQuality);
  const footprints = createThanBaiFootprints(group, c);
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t, walk = 0) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = thanBaiRhythm(time), climax = aceTimeline(rhythm.phase);
      ground.update(time, rhythm, f, climax.charge, climax.burst, climax.shock);
      halo.update(time, rhythm, f, climax.charge, climax.burst);
      cards.update(time, rhythm, f, climax.converge, 1 - climax.present);
      ace.update(time, rhythm, f, climax);
      footprints.update(time, rhythm, f, walk);
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity.
    setColor() {},
    setWeapon() {},
    dispose() {
      [ground, halo, cards, ace, footprints].forEach(p => p.dispose());
      group.material.dispose();
    },
  };
}
