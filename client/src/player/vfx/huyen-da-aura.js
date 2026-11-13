import * as THREE from 'three';
import { HUYEN_DA_COLORS } from './huyen-da-materials.js';
import { createEclipse } from './huyen-da-eclipse.js';
import { createCrowFeathers } from './huyen-da-feathers.js';
import { createInkSmoke } from './huyen-da-smoke.js';
import { createInwardMotes } from './huyen-da-motes.js';
import { createInkGround } from './huyen-da-ground.js';
import { breathRhythm } from './aura-rhythm.js';

// Huyền Dạ Du Hành (effect 8) — Nhật Thực Huyền Nha. Theo bảng phân vai aura: bóng dáng riêng là
// VẦNG NHẬT THỰC ĐEN nhỏ và đậm sau đầu (khoảng âm), động từ riêng là HÚT XOÁY VÀO TRONG, nền đất
// là xoáy mực đen. Aura duy nhất lấy lớp tối normal blend làm chủ đạo; cộng màu chỉ làm viền tím.
// Không đĩa mandala, không vòng vật thể toả tròn, không vòng chữ, không lưu quang hay phiêu đái.
//  Sau đầu: xoáy mực · đĩa hắc diệu thạch 3D · vành ngọc đen chạm cuộn · corona tia lông vũ ·
//    nhẫn kim cương bạc dịu.
//  Quanh thân: lông quạ đen 3D, sợi khói mực, cụm khói và hạt sáng đều trôi theo đường hút xoáy
//    vào tâm nhật thực rồi tan.
//  Dưới chân: vũng tối, xoáy mực lớn và nhỏ, vũng mực loang bị cuốn vào tâm, viền tím mảnh.
//  Nhịp 15 giây: hít vào thì corona co lại, sáng hơn, xoáy đậm; thở ra thì corona nở nhẹ.
//  Tốc độ cố định, không pha tăng tốc hay lóe gắt; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây). */
export const HUYEN_DA_CYCLE = 15;
export const huyenDaRhythm = time => breathRhythm(time, HUYEN_DA_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createHuyenDaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = HUYEN_DA_COLORS;
  const group = new THREE.Group(); group.name = 'huyen-da-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createInkGround(group, colors, lowQuality),
    createEclipse(group, colors, lowQuality),
    createInkSmoke(group, colors, lowQuality),
    createCrowFeathers(group, colors, lowQuality),
    createInwardMotes(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = huyenDaRhythm(time);
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
