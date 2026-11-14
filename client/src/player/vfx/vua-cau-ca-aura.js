import * as THREE from 'three';
import { createFishBodies, FISH_KIND } from './vua-cau-ca-fish-body.js';
import { CARP, createGiantCarp } from './vua-cau-ca-giant-carp.js';
import { createOcean } from './vua-cau-ca-ocean.js';
import { createLeapingFish } from './vua-cau-ca-leaping-fish.js';
import { createFishingRod, HOOKED } from './vua-cau-ca-rod.js';
import { createGeyser } from './vua-cau-ca-geyser.js';
import { createRainbow } from './vua-cau-ca-rainbow.js';
import { createVuaCauCaFootprints } from './vua-cau-ca-footprints.js';
import { breathRhythm } from './aura-rhythm.js';

// Vua Câu Cá (effect 14) — hào quang chí tôn, chỉ mua được khi đã câu đủ mọi loài trong Sổ cá (shared/shop.js).
//  Bóng dáng: KIM LÝ VƯỢT SÓNG — cá chép vàng 3D khổng lồ (vảy, vây lụa, râu) bơi vòng đứng sau lưng, vọt khỏi
//    mặt biển bên phải, vồng qua sau đầu, lặn xuống bên trái, kéo dải kim quang và vệt nước nhỏ giọt.
//  CẦN CÂU NGƯ VƯƠNG vàng đúc (khoen, ống cuộn) vắt qua đầu, dây kim quang treo cá chép 3D quẫy mình.
//  Quanh thân: đàn cá chép vàng và cá bạc 3D lần lượt vọt khỏi mặt nước, toé nước, loang gợn; bọt và kim quang.
//  Nền đất: mặt biển sống (sóng, caustic, xoáy nước, ấn 漁王 chìm), ba con sóng cuộn bạc đầu chạy vòng.
//  Cao trào mỗi nhịp 12 giây: "LÝ NGƯ HOÁ LONG" — đúng lúc cá chép vắt ngang trên đầu thì mọc sừng rồng vàng,
//    râu dài, bờm vây vươn cao, hào quang tia bùng; cùng lúc "THUỶ TRỤ LỤC HỢP" sáu cột nước phun vọt, sóng
//    cuộn dâng cao, sóng chấn loang; nước hạ thì cầu vồng hiện sau lưng.
//  Bước đi: mỗi bước đạp lên như mặt nước — vũng gợn loang và giọt nước toé.
//  Bảng màu: xanh biển sâu + lam ngọc + vàng kim; khác Lưu Ly (lam kính, tím biếc, xoáy nước sau lưng).
const BASE_OPACITY = 0.9;
export const VUA_CAU_CA_CYCLE = 12;
export const vuaCauCaRhythm = time => breathRhythm(time, VUA_CAU_CA_CYCLE);
export const VUA_CAU_CA_COLORS = {
  deep: new THREE.Color('#9a4a06'), gold: new THREE.Color('#f5b83a'), light: new THREE.Color('#fff3c4'), belly: new THREE.Color('#fff4d8'),
  silver: new THREE.Color('#c9e4f2'), silverDeep: new THREE.Color('#2f6d96'), ink: new THREE.Color('#2a1404'),
  finGold: new THREE.Color('#ffb03a'), finTip: new THREE.Color('#ff5a1f'), finSilver: new THREE.Color('#9fd6f0'),
  aqua: new THREE.Color('#4fdcef'), foam: new THREE.Color('#ecfdff'), sea: new THREE.Color('#0a3d58'), seaMid: new THREE.Color('#1680a3'),
};

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createVuaCauCaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const c = VUA_CAU_CA_COLORS, schoolCount = lowQuality ? 3 : 6;
  const group = new THREE.Group(); group.name = 'vua-cau-ca-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const specs = [
    { ...CARP, kind: FISH_KIND.carp },
    { ...HOOKED, kind: FISH_KIND.carp },
    ...Array.from({ length: schoolCount }, (_, i) => ({ length: 0.4, height: 0.13, width: 0.075, kind: i % 2 ? FISH_KIND.silver : FISH_KIND.carp })),
  ];
  const bodies = createFishBodies(group, specs, c, lowQuality);
  const ocean = createOcean(group, c, lowQuality);
  const geyser = createGeyser(group, c, lowQuality);
  const parts = [
    createGiantCarp(group, bodies, 0, c, lowQuality),
    createFishingRod(group, bodies, 1, c, lowQuality),
    createLeapingFish(group, bodies, 2, schoolCount, c),
    createRainbow(group),
    createVuaCauCaFootprints(group, c),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t, walk = 0) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = vuaCauCaRhythm(time);
      const k = geyser.update(time, rhythm, f);
      ocean.update(time, rhythm, f, k);
      parts.forEach(p => p.update(time, rhythm, f, walk));
      bodies.commit(time, f, 0.3 * rhythm.pulse + 0.5 * k);
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity.
    setColor() {},
    setWeapon() {},
    dispose() {
      [bodies, ocean, geyser, ...parts].forEach(p => p.dispose());
      group.material.dispose();
    },
  };
}
