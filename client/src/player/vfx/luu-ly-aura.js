import * as THREE from 'three';
import { dropGeometry } from './drop-geometry.js';
import { crystalVertex, crystalFragment } from './luu-ly-shaders.js';
import { createLuuLyWheelLayers } from './luu-ly-wheel-layers.js';
import { createLuuLyPond } from './luu-ly-pond.js';
import { createLightArcs } from './aura-light-arcs.js';
import { createLuuLyBillboards } from './luu-ly-billboards.js';
import { createKoi } from './luu-ly-koi.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Lưu Ly Vân Thủy (effect 2) — Thủy Luân Lưu Ly. Khác kiếm luân của Kiếm Vũ ở chỗ thủy luân là
// một XOÁY NƯỚC chứ không phải vòng toả tròn đều:
//  Sau lưng: quầng pháp quang · xoáy nước vẽ canvas (sáu nhánh xoáy, sóng cuộn, sóng vảy, tâm 水)
//    · vành sóng vảy và giọt nước (không chữ) quay ngược · giọt lưu ly 3D trôi dọc sáu nhánh xoáy
//    từ tâm ra rìa (lớn dần rồi tan) · lưu ly châu ở tâm · vân thủy đỡ hai bên · lấp lánh.
//  Quanh thân: năm dải thủy quang hở đầu (đầu trắng ngà, đuôi ngả tím biếc) · giọt nước bay ngược ·
//    bọt nước · mảnh lưu ly rơi lả tả. Không có phiêu đái lụa (dấu hiệu của Kiếm Vũ).
//  Dưới chân: mặt hồ (sóng vảy, sóng cuộn, lá sen nổi) + thủy liên sáu cánh quẻ Khảm + gợn nước
//    loang + song lý lượn quanh + vân thủy. Không có vành chữ hay bát quái.
//  Nhịp 14 giây: tụ khí → xoáy nở chậm, sóng sáng lướt quanh, gợn rõ lên → lắng.
//  Tốc độ cố định, không có pha tăng tốc hay lóe gắt.
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
// Dải thủy quang: thấp và thoai thoải hơn Kiếm Vũ, như dòng nước xoắn quanh thân.
const WATER_ARCS = [
  { r: 1.25, y: 1.3, tilt: 0.85, yaw: 0.4, speed: 0.26, len: 3.9, w: 0.19 },
  { r: 1.45, y: 0.85, tilt: -0.6, yaw: 2.4, speed: -0.21, len: 3.4, w: 0.17 },
  { r: 1.1, y: 1.7, tilt: 0.45, yaw: 4.1, speed: 0.3, len: 2.7, w: 0.13 },
  { r: 1.65, y: 0.35, tilt: 1.3, yaw: 1.1, speed: 0.16, len: 4.6, w: 0.21 },
  { r: 1.8, y: 1.45, tilt: 1.15, yaw: 5.2, speed: -0.13, len: 2.3, w: 0.11 },
];
// Giọt trên nhánh xoáy: ARMS nhánh × PER giọt, trôi từ R0 ra R1, nhánh cong thêm TWIST rad.
const ARMS = 6, R0 = 0.2, R1 = 1.0, TWIST = 1.9;

function crystalMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, sweep: { value: 0 },
      sweepOn: { value: 0 }, ink: { value: ink } },
    vertexShader: crystalVertex, fragmentShader: crystalFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** reducedMotion: `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); giảm chuyển động = chậm ba lần. */
export function createLuuLyAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = LUU_LY_COLORS, per = lowQuality ? 3 : 5;
  const group = new THREE.Group(); group.name = 'luu-ly-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const geometries = [], materials = [group.material], meshes = [];
  const glowMat = crystalMaterial(colors, 0), inkMat = crystalMaterial(colors, 1);
  materials.push(glowMat, inkMat);

  const wheel = new THREE.Group(); wheel.name = 'luu-ly-wheel';
  wheel.position.set(0, 1.42, -0.42); group.add(wheel);
  // Giọt lưu ly trên nhánh xoáy: lớp sáng + lớp mực dùng chung ma trận instance.
  const drops = new THREE.InstancedMesh(dropGeometry(), glowMat, ARMS * per);
  drops.name = 'luu-ly-drops-3d'; drops.renderOrder = 8; wheel.add(drops); meshes.push(drops);
  if (!lowQuality) {
    const ink = new THREE.InstancedMesh(dropGeometry(), inkMat, ARMS * per);
    ink.instanceMatrix = drops.instanceMatrix; ink.renderOrder = 7; wheel.add(ink); meshes.push(ink);
  }
  // Lưu ly châu: viên ngọc mài nhiều mặt ở tâm xoáy.
  const pearlGeo = new THREE.IcosahedronGeometry(0.085, 0), pearlMat = new THREE.MeshBasicMaterial({ color: colors.core,
    transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  geometries.push(pearlGeo); materials.push(pearlMat);
  const pearl = new THREE.Mesh(pearlGeo, pearlMat); pearl.position.z = 0.04; wheel.add(pearl);

  const parts = [
    createLuuLyWheelLayers(wheel, colors, lowQuality),
    createLuuLyPond(group, colors, lowQuality),
    createLightArcs(group, colors, lowQuality, { arcs: WATER_ARCS, name: 'luu-ly-water-arcs' }),
    createLuuLyBillboards(group, colors, lowQuality),
    createKoi(group, colors, lowQuality),
  ];

  // Hạt thủy khí li ti bay lên quanh thân.
  const moteCount = lowQuality ? 10 : 24, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.06, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  geometries.push(moteGeo); materials.push(moteMat);
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  const dummy = new THREE.Object3D(), next = new THREE.Vector3();
  // Mỗi giọt trôi đều từ tâm ra rìa dọc nhánh xoáy (k = 0 → 1), lớn dần rồi thu nhỏ tan ở rìa;
  // đầu nhọn hướng theo chiều trôi. Cả xoáy quay chậm cùng chiều nhánh cuốn.
  function layWhirl(t, breathe) {
    const spin = -t * 0.06;
    // Điểm trên nhánh a ở tiến độ k (0 tâm → 1 rìa).
    const at = (a, k, out) => {
      const r = (R0 + (R1 - R0) * k) * (1 + breathe), ang = a * Math.PI * 2 / ARMS + spin + TWIST * Math.pow(k, 0.8);
      return out.set(Math.sin(ang) * r, Math.cos(ang) * r, 0);
    };
    for (let a = 0; a < ARMS; a++) for (let j = 0; j < per; j++) {
      const k = ((t * 0.045 + j / per + a * 0.07) % 1 + 1) % 1;
      at(a, k, dummy.position); at(a, k + 0.02, next);
      // Mũi giọt (+y cục bộ) hướng theo chiều trôi dọc nhánh.
      dummy.rotation.set(0, 0, Math.atan2(-(next.x - dummy.position.x), next.y - dummy.position.y));
      dummy.position.z = 0.02 * Math.sin(t * 0.8 + a + j);
      dummy.scale.setScalar((0.16 + 0.26 * k) * Math.min(1, k * 6) * (1 - Math.pow(k, 6)));
      dummy.updateMatrix(); drops.setMatrixAt(a * per + j, dummy.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = luuLyRhythm(time);
      layWhirl(time, 0.04 * rhythm.release - 0.02 * rhythm.gather);
      wheel.position.y = 1.42 + 0.04 * Math.sin(time * 0.45);
      pearl.rotation.set(time * 0.2, time * 0.35, 0); pearlMat.opacity = (0.55 + 0.4 * rhythm.pulse) * f;
      for (const m of [glowMat, inkMat]) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = rhythm.sweep; m.uniforms.sweepOn.value = rhythm.sweepOn;
      }
      glowMat.uniforms.opacity.value = 0.9 * f; inkMat.uniforms.opacity.value = 0.55 * f;
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
      meshes.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}
