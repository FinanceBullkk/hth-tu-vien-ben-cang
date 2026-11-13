import * as THREE from 'three';
import { DAO_HOA_COLORS } from './dao-hoa-materials.js';
import { createEmblemLayers } from './dao-hoa-emblem-layers.js';
import { createBranches } from './dao-hoa-branches.js';
import { createBillboards } from './dao-hoa-billboards.js';
import { createRedThreads } from './dao-hoa-red-threads.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Đào Hoa Tri Kỷ (effect 5) — Nguyệt Môn Đào Ảnh. Cố ý KHÔNG theo khuôn chung của các aura khác
// (mandala quay sau lưng, dải lưu quang/phiêu đái trắng, trận chữ tròn dưới chân):
//  Sau lưng: nguyệt môn nét bút lông hở hai chỗ, đứng trên đất, ôm trọn nhân vật; trong cổng là bức
//    thủy mặc (trăng ngà treo trên đầu, núi xa, sương, rừng đào, chim yến) · hai cành đào 3D vắt qua
//    cổng với hoa, nụ, lá non · chỉ hồng tri kỷ buộc đồng tâm kết treo trên cành.
//  Quanh thân: lốc cánh đào ba dòng xoắn quanh người · cánh đào, bông đào, lá non rơi lả tả ·
//    phấn hoa lấp lánh · sương hồng ôm gốc cành.
//  Dưới chân: mặt ao — bờ nước nét bút, gợn loang nơi cánh rơi chạm nước, vòng hoa trôi.
//  Nhịp 12 giây êm như hơi thở: hít vào nụ khép → thở ra hoa hé nở, trăng sáng lên, vòng xoắn nở
//  rộng như gió nhẹ → lắng. Không có pha tăng tốc; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây). */
export const DAO_HOA_CYCLE = 12;
/** Tâm nguyệt môn (m): vành cổng chạm đất, đầu nhân vật (y ≈ 1.07) nằm trong vùng trống giữa cổng. */
export const DAO_HOA_GATE = new THREE.Vector3(0, 1.32, -0.5);

export const daoHoaRhythm = time => breathRhythm(time, DAO_HOA_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; giảm chuyển động = chậm ba lần, không tắt hình. */
export function createDaoHoaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = DAO_HOA_COLORS;
  const group = new THREE.Group(); group.name = 'dao-hoa-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const gate = new THREE.Group(); gate.name = 'dao-hoa-gate'; gate.position.copy(DAO_HOA_GATE); group.add(gate);

  const branches = createBranches(group, colors, lowQuality);
  const parts = [
    createEmblemLayers(gate, group, colors, lowQuality),
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
      gate.position.y = DAO_HOA_GATE.y + 0.015 * Math.sin(time * 0.4);
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
