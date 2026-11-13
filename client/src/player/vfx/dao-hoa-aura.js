import * as THREE from 'three';
import { DAO_HOA_COLORS } from './dao-hoa-materials.js';
import { createJadeGate } from './dao-hoa-jade-gate.js';
import { createGround } from './dao-hoa-ground.js';
import { createBranches } from './dao-hoa-branches.js';
import { createBillboards } from './dao-hoa-billboards.js';
import { createRedThreads } from './dao-hoa-red-threads.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Đào Hoa Tri Kỷ (effect 5) — Đào Nguyên Nguyệt Môn. Theo bảng phân vai aura: bóng dáng riêng là
// NGUYỆT MÔN KIẾN TRÚC, động từ riêng là RƠI; không đĩa mandala, không vòng chữ, không trận đồ,
// không dải lưu quang/phiêu đái, không trăng, không mặt nước.
//  Sau lưng: vòng cổng ngọc trắng hồng 3D dày, chạm đất trên hai đế đá, cao hơn đầu, lòng cổng rỗng;
//    mặt trước chạm dây hoa đào, đỉnh treo biển 桃源 · một cành đào già nấp sau chân cổng, leo vắt
//    vòm qua đỉnh rồi rủ xuống bên phải, đầy hoa, nụ, lá non · chỉ hồng tri kỷ thắt đồng tâm kết.
//  Rơi: cánh đào rụng từ tán xoắn rơi chậm, bông đào và lá non rơi theo; phấn hoa lấp lánh.
//  Dưới chân: thảm cánh đào rải dày ở chân cổng, bóng cành đổ lay theo cành.
//  Nhịp 14 giây: thở ra thì một đợt cánh rụng dày hơn (mật độ, không đổi tốc độ), hoa hé nở, đường
//  chạm trên cổng sáng lên. Không có pha tăng tốc; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây). */
export const DAO_HOA_CYCLE = 14;
export const daoHoaRhythm = time => breathRhythm(time, DAO_HOA_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createDaoHoaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = DAO_HOA_COLORS;
  const group = new THREE.Group(); group.name = 'dao-hoa-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const branches = createBranches(group, colors, lowQuality);
  const parts = [
    createJadeGate(group, colors, lowQuality),
    createGround(group, lowQuality),
    branches,
    createRedThreads(group, colors, branches, lowQuality), // sau cành: neo theo cành đã lắc
    createBillboards(group, colors, lowQuality),
  ];

  // Phấn hoa bay lên quanh thân (vàng mơ).
  const moteCount = lowQuality ? 8 : 22, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.gold, size: 0.06, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = daoHoaRhythm(time);
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.04) % 1 + 1) % 1, a = i * 2.39996 + time * 0.08;
        const r = 0.7 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.0, Math.sin(a) * r], i * 3);
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
