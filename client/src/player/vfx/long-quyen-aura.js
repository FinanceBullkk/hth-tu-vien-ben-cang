import * as THREE from 'three';
import { LONG_QUYEN_COLORS, LONG_QUYEN_CYCLE, longQuyenRhythm } from './long-quyen-materials.js';
import { createDragonBody } from './long-quyen-dragon-body.js';
import { createDragonHead } from './long-quyen-head.js';
import { createFistSeal } from './long-quyen-fist-seal.js';
import { createCrackGround } from './long-quyen-ground.js';

// Long Quyền (effect 9) — Hỏa Long Thăng Quyền. Theo bảng phân vai aura: bóng dáng riêng là con RỒNG
// LỬA thân dày có vảy, XOẮN ỐC từ chân lên quanh thân rồi VƯƠN RA TRƯỚC theo cánh tay phải như đang
// tung quyền, ấn quyền vuông rực trước miệng rồng. Động từ: CUỘN LÊN (vảy, lửa, tàn lửa trôi từ đuôi
// lên đầu). Nền đất: vết nứt chấn địa, dung nham trong khe. Không đĩa tròn sau lưng, không vòng chữ,
// không lưu quang hay phiêu đái; lửa chỉ nằm trên thân rồng (không cánh, không mây); không long châu.
//  Thân: ống vảy mực + lửa · vây lưng răng cưa mực + lửa · lưỡi lửa dọc sống lưng · tàn lửa · long khí.
//  Đầu: sọ mực + lửa · sừng nai và râu vàng kim · mắt · bờm lửa.
//  Ấn quyền: triện 拳 vuông (mực + lửa) · quầng · vòng sóng bát giác · lửa phả từ miệng.
//  Đất: hố cháy · quầng ấm · khe nứt mực + dung nham · đá vỡ · tàn lửa từ khe.
//  Nhịp 11 giây: hít vào lửa dồn về chân; thở ra dải sáng chạy dọc thân lên đầu, ấn sáng dịu.
//  Tốc độ cố định, không pha tăng tốc hay lóe gắt; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
export { LONG_QUYEN_CYCLE, longQuyenRhythm };

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createLongQuyenAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = LONG_QUYEN_COLORS;
  const group = new THREE.Group(); group.name = 'long-quyen-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const head = createDragonHead(group, colors, lowQuality); // cập nhật trước để ấn đọc vị trí miệng mới
  const parts = [
    createCrackGround(group, colors, lowQuality),
    createDragonBody(group, colors, lowQuality),
    head,
    createFistSeal(group, colors, lowQuality, out => out.copy(head.mouth())),
  ];
  // Head phải chạy trước ấn quyền: giữ thứ tự [đất, thân, đầu, ấn].
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = longQuyenRhythm(time);
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
