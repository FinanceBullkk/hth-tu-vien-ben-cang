import * as THREE from 'three';
import { KIM_LONG_COLORS } from './kim-long-materials.js';
import { createDragonBody } from './kim-long-body.js';
import { createDragonHead } from './kim-long-head.js';
import { createDragonFins } from './kim-long-fins.js';
import { createMoonAndClouds } from './kim-long-moon-clouds.js';
import { createCloudGround } from './kim-long-ground.js';
import { breathRhythm } from './aura-rhythm.js';

// Kim Long Nguyệt Ảnh (effect 11) — "Kim Long chầu nguyệt". Theo bảng phân vai aura:
//  Bóng dáng: MỘT RỒNG VÀNG thân dày vắt VÒM qua đầu từ vai trái (đuôi) sang vai phải (đầu),
//    vảy viền mực, bụng ngà, vây lưng lửa, bốn chân, sừng nai, bờm, râu; miệng ngậm long châu.
//  Phía sau: nửa vầng trăng mờ trong lòng vòm, chân trăng tan vào dải mây.
//  Động từ: LƯỢN UỐN — sóng chạy chậm từ đầu về đuôi, tốc độ cố định.
//  Nền đất: biển mây vàng + vòng cụm mây thấp quanh chân.
//  Không có: xoắn ốc quanh thân (của Long Quyền), trăng tròn đầy (của Nguyệt Bạch), khung cổng
//  tròn (của Đào Hoa), đĩa mandala, vòng chữ, bát quái, lưu quang, phiêu đái.
//  Nhịp 11 giây chỉ đổi độ sáng (vảy, ngọc, quầng trăng), không đổi tốc độ.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây). */
export const KIM_LONG_CYCLE = 11;
export const kimLongRhythm = time => breathRhythm(time, KIM_LONG_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createKimLongAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = KIM_LONG_COLORS;
  const group = new THREE.Group(); group.name = 'kim-long-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createCloudGround(group, colors, lowQuality),
    createMoonAndClouds(group, colors, lowQuality),
    createDragonBody(group, colors, lowQuality),
    createDragonFins(group, colors, lowQuality),
    createDragonHead(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t / 3 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = kimLongRhythm(time);
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
