import * as THREE from 'three';
import { createBeadCurtain } from './luu-ly-bead-curtain.js';
import { createLuuLyPond } from './luu-ly-pond.js';
import { createLuuLyBillboards } from './luu-ly-billboards.js';
import { createKoi } from './luu-ly-koi.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Lưu Ly Vân Thủy (effect 2) — Lưu Ly Châu Liêm. Bóng dáng riêng (không dùng khuôn đĩa pháp
// luân sau lưng của Kiếm Vũ): một vòm thủy quang cong trên đầu, hai chân vòm tựa mây; từ vòm rủ
// mười lăm chuỗi hạt lưu ly như thác nước khung lấy người, màn nước trong chảy xuống giữa các
// chuỗi. Động từ chính là "chảy xuống": giọt sáng trượt dọc chuỗi, rèm đung đưa như trong gió;
// tương phản là giọt nước và bọt li ti bay ngược lên trời.
// Dưới chân: mặt hồ (sóng vảy, sóng cuộn, lá sen nổi) + thủy liên sáu cánh quẻ Khảm + gợn nước
// loang + song lý lượn quanh + vân thủy bồng bềnh. Không có vành chữ hay bát quái.
// Nhịp 14 giây (khác Kiếm Vũ 12 giây): tụ khí → vòm nở nhẹ, rèm dài ra, gợn rõ lên → lắng.
// Tốc độ cố định, không có pha tăng tốc hay lóe gắt.
const BASE_OPACITY = 0.9;
export const LUU_LY_CYCLE = 14;
/** Nhịp thở của Lưu Ly, hàm thuần của thời gian. */
export const luuLyRhythm = time => breathRhythm(time, LUU_LY_CYCLE);

// Bảng màu lưu ly: mực lam sâu, lam trong như kính, lõi trắng ngà ngọc trai, nhấn tím biếc
// (vào vị trí "gold" của bộ vật liệu dùng chung) — không dùng vàng kim để khác Kiếm Vũ.
export const LUU_LY_COLORS = {
  steel: new THREE.Color('#163f7a'), edge: new THREE.Color('#62b6ff'),
  core: new THREE.Color('#e4f3ff'), gold: new THREE.Color('#b394ff'),
};

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm ba lần. */
export function createLuuLyAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = LUU_LY_COLORS;
  const group = new THREE.Group(); group.name = 'luu-ly-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const parts = [
    createBeadCurtain(group, colors, lowQuality),
    createLuuLyPond(group, colors, lowQuality),
    createLuuLyBillboards(group, colors, lowQuality),
    createKoi(group, colors, lowQuality),
  ];

  // Hạt thủy khí li ti bay lên quanh thân.
  const moteCount = lowQuality ? 10 : 24, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.06, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = luuLyRhythm(time);
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.045) % 1 + 1) % 1, a = i * 2.39996 + time * 0.09;
        const r = 0.7 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.2, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.5 + 0.3 * rhythm.release) * f;
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity; không có material dùng chung để nhân bản.
    setColor() {},
    setWeapon() {},
    dispose() {
      parts.forEach(p => p.dispose());
      moteGeo.dispose(); moteMat.dispose(); group.material.dispose();
    },
  };
}
