import * as THREE from 'three';
import { HONG_LIEN_COLORS } from './hong-lien-materials.js';
import { createEmblemLayers } from './hong-lien-emblem-layers.js';
import { createWings } from './hong-lien-wings.js';
import { createPlumes } from './hong-lien-plumes.js';
import { createShedFeathers } from './hong-lien-shed-feathers.js';
import { createWingFlames } from './hong-lien-wing-flames.js';
import { createBillboards } from './hong-lien-billboards.js';
import { HONG_LIEN_CYCLE } from './hong-lien-wing-frame.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Hồng Liên Hỏa Vũ (effect 4) — Chu Tước Giang Dực, theo bảng phân vai aura:
//  bóng dáng chính là đôi cánh chu tước GIANG NGANG thành chữ V rộng hai bên vai; khối thứ hai là
//  phượng vĩ dài rủ từ thắt lưng xuống đất. Sau đầu để trống: không đĩa mandala, không vòng tròn,
//  không vành chữ, không bát quái (khuôn của Kiếm Vũ); không dải lưu quang hay phiêu đái làm lớp chính;
//  không mây, không vòng lửa ngang eo (của Xích Diễm); không đài sen dựng (của Kim Liên).
//  Động từ: VỖ CÁNH rất chậm (một nhịp mỗi 14 giây); lông vũ lửa RỤNG khỏi mép cánh rồi BAY LÊN.
//  Lớp: lông cánh 3D ba tầng (sáng + mực) · cánh hư ảnh vỗ trễ nhịp · lưỡi lửa lụa ở ngọn mỗi lông ·
//    quầng lửa theo bố cục lông · mép cánh lửa lụa ·
//    phượng vĩ có mắt lông · lông rụng 3D · hỏa tinh dọc sải cánh · sợi lửa lụa từ mũi cánh sen ·
//    tàn hồng bay lên · dưới chân đóa sen lửa phẳng nở theo nhịp.
//  Lửa mềm như lụa và lông vũ, không bùng gắt; tốc độ trơn và chậm, mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
export { HONG_LIEN_CYCLE };
export const hongLienRhythm = time => breathRhythm(time, HONG_LIEN_CYCLE);

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm 3 lần. */
export function createHongLienAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = HONG_LIEN_COLORS;
  const group = new THREE.Group(); group.name = 'hong-lien-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });

  const wings = createWings(group, colors, lowQuality); // cập nhật trước để lưỡi lửa đọc ngọn lông mới
  const parts = [
    wings,
    createWingFlames(group, colors, wings.tips),
    createPlumes(group, colors, lowQuality),
    createShedFeathers(group, colors, lowQuality),
    createEmblemLayers(group, colors, lowQuality),
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
