import * as THREE from 'three';
import { NGUYET_BACH_COLORS } from './nguyet-bach-materials.js';
import { createMoon } from './nguyet-bach-moon.js';
import { createGuqin } from './nguyet-bach-guqin.js';
import { createSoundRipples } from './nguyet-bach-sound-ripples.js';
import { createWaterMirror } from './nguyet-bach-water-mirror.js';
import { createNguyetBachBillboards } from './nguyet-bach-billboards.js';
import { createSoundBlades } from './nguyet-bach-sound-blades.js';
import { createRocks } from './nguyet-bach-rocks.js';
import { nguyetBachRhythm } from './nguyet-bach-rhythm.js';

// Nguyệt Bạch Tri Âm (effect 7) — Cầm Nguyệt Thủy Kính. Theo bảng phân vai aura: bóng dáng riêng là
// VẦNG TRĂNG TRÒN LỚN LỆCH MỘT BÊN + CỔ CẦM DỰNG ĐỨNG, động từ riêng là RUNG; bố cục bất đối xứng
// như tranh thủy mặc, không đĩa mandala, không vòng chữ, không lưu quang hay phiêu đái.
//  Sau vai trái (+x), cao: trăng ngọc 3D dày, mặt vẽ Quảng Hàn cung và cây quế, vành bạc, nguyệt
//    nhận (lưỡi khuyết bạc có gai) ôm mép ngoài, quầng nguyệt hoa ngũ sắc, mây bạc vắt chéo, sao.
//  Sau vai phải (−x): cổ cầm sơn mài khảm bạc dựng đứng giữa thạch đài, cao hơn đầu, mười ba phím
//    huy, bảy dây ngân nối thành bảy dây sáng phóng lên trời, tua ngọc; sóng âm hình viên thuốc nở
//    đều từ dây; âm nhận khuyết bay ra phía ngoài; nốt giảm tự phổ bay qua đầu tới trăng.
//  Dưới chân: gương nước tĩnh lam đêm, bóng trăng vỡ vạch ngang, vệt trăng lấp lánh, bóng đàn;
//    tia trăng chéo rọi xuống mặt nước phía ngoài; sương mỏng ở mép; bụi trăng và sương giá bay lên.
//  Nhịp 16 giây: tụ khí → một tiếng gảy (dây ngân rộng ra, sóng âm và nốt đậm lên, trăng sáng nhẹ)
//    → tắt dần. Tần số rung và tốc độ lan cố định; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createNguyetBachAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = NGUYET_BACH_COLORS;
  const group = new THREE.Group(); group.name = 'nguyet-bach-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createWaterMirror(group, colors, lowQuality),
    createRocks(group, colors, lowQuality),
    createMoon(group, colors, lowQuality),
    createGuqin(group, colors, lowQuality),
    createSoundRipples(group, colors),
    createSoundBlades(group, colors, lowQuality),
    createNguyetBachBillboards(group, colors, lowQuality),
  ];
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = nguyetBachRhythm(time);
      parts.forEach(p => p.update(time, rhythm, f));
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity.
    setColor() {},
    setWeapon() {},
    dispose() { parts.forEach(p => p.dispose()); group.material.dispose(); },
  };
}
