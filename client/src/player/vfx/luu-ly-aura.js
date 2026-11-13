import * as THREE from 'three';
import { dropGeometry } from './drop-geometry.js';
import { crystalVertex, crystalFragment } from './luu-ly-shaders.js';
import { createLuuLyEmblemLayers } from './luu-ly-emblem-layers.js';
import { createLightArcs } from './aura-light-arcs.js';
import { createSilkSashes } from './aura-silk-sashes.js';
import { createLuuLyBillboards } from './luu-ly-billboards.js';
import { createKoi } from './luu-ly-koi.js';
import { breathRhythm, softDot } from './aura-rhythm.js';

// Lưu Ly Vân Thủy (effect 2) — Thủy Luân Lưu Ly, theo công thức nhiều lớp của Kiếm Vũ:
//  Pháp tướng sau lưng: quầng pháp quang · thủy luân vẽ canvas (sáu nhánh băng tinh, lục mang
//    tinh, tám sóng cuộn, dải sóng vảy, tâm 水) · vành phù văn 24 chữ quay ngược · 12 giọt lưu ly
//    3D vòng ngoài + 8 giọt vòng trong quay ngược chiều · lưu ly châu ở tâm · vân thủy đỡ hai bên.
//  Quanh thân: năm dải thủy quang hở đầu (đầu trắng ngà, đuôi ngả tím biếc) · phiêu đái lụa lam ·
//    giọt nước bay ngược · bọt nước · lấp lánh sáu tia · mảnh lưu ly rơi lả tả.
//  Dưới chân: trận thủy văn (24 chữ, sóng cuộn, băng tinh) + thủy liên sáu cánh quẻ Khảm quay
//    ngược + gợn nước loang như mặt hồ + song lý lượn quanh + vân thủy bồng bềnh.
//  Nhịp 12 giây êm như hơi thở: tụ khí → thủy luân nở chậm, sóng sáng lướt quanh vành, gợn nước
//    rõ lên, giọt nước dâng → lắng. Tốc độ cố định, không có pha tăng tốc hay lóe gắt.
const BASE_OPACITY = 0.9;
export const LUU_LY_CYCLE = 12;
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
  const colors = LUU_LY_COLORS;
  const group = new THREE.Group(); group.name = 'luu-ly-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const geometries = [], materials = [group.material], parts = [], drops = [];
  const glowMat = crystalMaterial(colors, 0), inkMat = crystalMaterial(colors, 1);
  materials.push(glowMat, inkMat);
  // Một vòng giọt: lớp sáng + lớp mực dùng chung ma trận instance, chung nhóm để quay cùng.
  function ring(count, parent) {
    const holder = new THREE.Group(); parent.add(holder);
    const glow = new THREE.InstancedMesh(dropGeometry(), glowMat, count);
    glow.name = 'luu-ly-drops-3d'; glow.renderOrder = 8; holder.add(glow);
    if (!lowQuality) {
      const ink = new THREE.InstancedMesh(dropGeometry(), inkMat, count);
      ink.instanceMatrix = glow.instanceMatrix; ink.renderOrder = 7; holder.add(ink);
    }
    drops.push(glow); holder.mesh = glow; return holder;
  }

  const wheel = new THREE.Group(); wheel.name = 'luu-ly-wheel';
  wheel.position.set(0, 1.42, -0.42); group.add(wheel);
  const outer = ring(12, wheel), inner = ring(lowQuality ? 6 : 8, wheel);
  // Lưu ly châu: viên ngọc mài nhiều mặt ở tâm thủy luân.
  const pearlGeo = new THREE.IcosahedronGeometry(0.08, 0), pearlMat = new THREE.MeshBasicMaterial({ color: colors.core,
    transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  geometries.push(pearlGeo); materials.push(pearlMat);
  const pearl = new THREE.Mesh(pearlGeo, pearlMat); pearl.position.z = 0.04; wheel.add(pearl);

  parts.push(createLuuLyEmblemLayers(wheel, group, colors, lowQuality));
  parts.push(createLightArcs(group, colors, lowQuality, { arcs: WATER_ARCS, name: 'luu-ly-water-arcs' }));
  parts.push(createSilkSashes(group, colors, lowQuality, { name: 'luu-ly-silk', reach: 1.55, width: 0.16 }));
  parts.push(createLuuLyBillboards(group, colors, lowQuality));
  parts.push(createKoi(group, colors, lowQuality));

  // Hạt thủy khí li ti bay lên quanh thân.
  const moteCount = lowQuality ? 10 : 24, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.06, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  geometries.push(moteGeo); materials.push(moteMat);
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  const dummy = new THREE.Object3D();
  // Giọt xếp hướng tâm: vòng ngoài đầu nhọn chĩa ra như bánh xe sóng toả; inward = vòng trong
  // chĩa vào tâm, đáy tròn nằm ngoài để không rối quanh đầu.
  function layRing(mesh, radius, length, z, t, push, offset, inward = false) {
    for (let i = 0; i < mesh.count; i++) {
      const a = (i + offset) / mesh.count * Math.PI * 2, r = radius + push + 0.012 * Math.sin(t * 1.1 + i * 1.7);
      dummy.position.set(Math.sin(a) * r, Math.cos(a) * r, z);
      dummy.rotation.set(0, 0, inward ? Math.PI - a : -a);
      dummy.scale.set(length * (0.92 + 0.08 * Math.sin(t * 0.7 + i)), length, length); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = luuLyRhythm(time);
      const push = 0.045 * rhythm.release - 0.025 * rhythm.gather;
      layRing(outer.mesh, 0.66, 0.36, 0, time, push, 0);
      layRing(inner.mesh, 0.5, 0.2, -0.12, time, -push * 0.6, 0.5, true);
      outer.rotation.z = time * 0.04; inner.rotation.z = -time * 0.06;
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
      drops.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}
