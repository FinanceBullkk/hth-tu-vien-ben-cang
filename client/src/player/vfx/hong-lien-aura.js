import * as THREE from 'three';
import { HONG_LIEN_COLORS } from './hong-lien-materials.js';
import { createEmblemLayers } from './hong-lien-emblem-layers.js';
import { createWings } from './hong-lien-wings.js';
import { createLotusSeat } from './hong-lien-lotus-seat.js';
import { createBillboards } from './hong-lien-billboards.js';
import { createRisingFeathers, createLotusLanterns } from './hong-lien-rising-feathers-lotus-lanterns.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Hồng Liên Hỏa Vũ (effect 4) — Chu Tước Hồng Liên. Cố ý tách dáng khỏi các aura pháp tướng khác
// (Kiếm Vũ...): KHÔNG có đĩa mandala tròn, vành chữ, trận đồ tròn, dải lưu quang hay phiêu đái.
// Ngôn ngữ hình chỉ gồm lông vũ, cánh chim, đuôi phượng và cánh sen nhọn; không bánh xe, không mây
// (đó là Xích Diễm Lưu Vân). Lửa mềm như lụa và lông vũ, không bùng gắt.
//  Sau lưng: quạt đuôi phượng xoè nửa vòng (13 lông có mắt lông) · đôi cánh chu tước 3D ba tầng lông
//    · phượng vĩ năm lông rủ sau lưng · hỏa tinh lấp lánh.
//  Quanh thân: lông vũ lửa xoắn ốc bay lên · hoa đăng sen trôi ngang hông · lông vũ rơi lả tả · sợi lửa lụa.
//  Dưới chân: đóa hồng liên 16 + 12 cánh (mép là mũi cánh, không có vòng tròn) · lõi gương sen quay ngược
//    · đài sen lửa 3D quanh bàn chân.
//  Nhịp 12 giây: hít vào cánh khép, sen thu búp → thở ra cánh và quạt xoè, sen nở.
//  Không có pha tăng tốc; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
export const HONG_LIEN_CYCLE = 12;
export const hongLienRhythm = time => breathRhythm(time, HONG_LIEN_CYCLE);

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm 3 lần. */
export function createHongLienAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = HONG_LIEN_COLORS;
  const group = new THREE.Group(); group.name = 'hong-lien-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  // Gốc quạt đuôi phượng: sau vai, thấp hơn đầu để quạt xoè quanh chứ không đè lên đầu.
  const fanAnchor = new THREE.Group(); fanAnchor.position.set(0, 1.22, -0.62); group.add(fanAnchor);

  const parts = [
    createEmblemLayers(fanAnchor, group, colors, lowQuality),
    createWings(group, colors, lowQuality),
    createLotusSeat(group, colors, lowQuality),
    createRisingFeathers(group, colors, lowQuality),
    createLotusLanterns(group, colors, lowQuality),
    createBillboards(group, colors, lowQuality),
  ];

  // Tàn hồng nhỏ bay lên quanh thân (một lần vẽ).
  const moteCount = lowQuality ? 10 : 24, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.gold, size: 0.06, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = hongLienRhythm(time);
      fanAnchor.position.y = 1.22 + 0.025 * Math.sin(time * 0.4);
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.045) % 1 + 1) % 1, a = i * 2.39996 + time * 0.08;
        const r = 0.7 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.2, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.5 + 0.3 * rhythm.release) * f;
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity.
    setColor() {},
    setWeapon() {},
    dispose() {
      parts.forEach(p => p.dispose());
      moteGeo.dispose(); moteMat.dispose(); group.material.dispose();
    },
  };
}
