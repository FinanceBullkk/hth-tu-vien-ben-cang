import * as THREE from 'three';
import { XICH_DIEM_COLORS } from './xich-diem-materials.js';
import { XICH_DIEM_CYCLE } from './xich-diem-layout.js';
import { createCloudSea } from './xich-diem-ground.js';
import { createCloudPlatform } from './xich-diem-cloud-platform.js';
import { createPuffs } from './xich-diem-puffs.js';
import { createFireStrips } from './xich-diem-fire-strips.js';
import { createWaistRing } from './xich-diem-waist-ring.js';
import { breathRhythm } from './aura-rhythm.js';

// Xích Diễm Lưu Vân (effect 10) — Hỏa Vân Đài. Theo bảng phân vai aura: bóng dáng riêng là người
// ĐẠP MÂY LỬA — đài mây lửa thấp và rộng như bệ dưới chân, cộng một vòng lửa NẰM NGANG quanh eo.
// Động từ: TRÔI NGANG (đài mây trôi vòng, vòng eo lượn sóng nhẹ). Nền đất chính là mây lửa.
// Không bánh xe hay đĩa dựng sau lưng, không trụ lửa cao bao quanh người, không trận đồ, không vòng
// chữ, không lưu quang hay phiêu đái. Từ vai trở lên để trống.
//  Đài mây: 12 cuộn tường vân 3D dày (thân đỏ son + quầng viền + gờ xoắn ốc vàng kim) · quầng sáng
//    sau cuộn · cụm mây lửa mềm chèn giữa · lưỡi lửa liếm ngang khỏi đỉnh cuộn · lưu vân trôi vòng.
//  Quanh eo: vành lửa dẹt nằm ngang + bản mực · mào lửa nhỏ · hạt hỏa tinh · ba khóa mây.
//  Dưới chân: bóng đỏ thẫm · ánh lửa · biển mây tường vân (mực + sáng) mép múi mây · biển mây nhỏ.
//  Nhịp 11 giây: hít vào mây gom lại, lõi sáng hơn; thở ra đài mây toả rộng. Tốc độ cố định.
const BASE_OPACITY = 0.9;
export { XICH_DIEM_CYCLE };
export const xichDiemRhythm = time => breathRhythm(time, XICH_DIEM_CYCLE);

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm 3 lần. */
export function createXichDiemAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = XICH_DIEM_COLORS;
  const group = new THREE.Group(); group.name = 'xich-diem-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createCloudSea(group, colors, lowQuality),
    createCloudPlatform(group, colors, lowQuality),
    createPuffs(group, colors, lowQuality),
    createFireStrips(group, colors, lowQuality),
    createWaistRing(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = xichDiemRhythm(time);
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
