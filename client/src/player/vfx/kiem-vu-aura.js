import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';
import { KIEM_VU_COLORS, swordMaterial } from './kiem-vu-materials.js';
import { createEmblemLayers } from './kiem-vu-emblem-layers.js';
import { createSwordRain } from './kiem-vu-ornaments.js';
import { createLightArcs } from './aura-light-arcs.js';
import { createSilkSashes } from './aura-silk-sashes.js';
import { createBillboards } from './kiem-vu-billboards.js';
import { createFlyingSwords } from './kiem-vu-flying-swords.js';
import { breathRhythm, softDot as dot } from './aura-rhythm.js';

// Thanh Phong Kiếm Vũ (effect 12) — Vạn Kiếm Quy Tông Trận, theo công thức nhiều lớp của Kim Liên:
//  Pháp tướng sau lưng: quầng pháp quang · mandala kiếm hoa (12 kiếm vẽ, lưới sao đan xen, vành
//    mây, kiếm tâm 劍) · vành phù văn 24 chữ quay ngược · 12 kiếm 3D vòng ngoài + 8 vòng trong
//    quay ngược chiều · ngọc kiếm tâm · tường vân đỡ hai bên · sao lấp lánh.
//  Quanh thân: bốn dải lưu quang lượn trên các mặt phẳng trôi (thay vòng tròn cứng) · phiêu đái
//    hai dải lụa sau vai · ba phi kiếm kéo vệt kiếm khí và tua vàng · vệt khí và hạt bay lên.
//  Dưới chân thêm mây tường vân bồng bềnh.
//  Dưới chân: trận đồ bát quái tám kiếm ấn, 24 chữ, sao đan xen + kiếm liên 16 cánh quay ngược.
//  Nhịp 12 giây êm như hơi thở: tụ khí → kiếm luân nở ra chậm, sóng sáng lướt quanh các vành, tám
//    kiếm hư ảnh trôi nhẹ xuống đáp vào trận đồ → lắng. Không có pha tăng tốc; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9;
/** Chu kỳ nhịp (giây): dài và êm — mọi thay đổi là phồng/xẹp mềm, không có pha tăng tốc. */
export const KIEM_VU_CYCLE = 12;

/** Nhịp thở của trận, hàm thuần của thời gian. */
export const kiemVuRhythm = time => breathRhythm(time, KIEM_VU_CYCLE);

/** reducedMotion: đối tượng `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); mặc định
    đọc thẳng thiết lập hệ điều hành. Giảm chuyển động = chậm ba lần, không tắt hình. */
export function createKiemVuAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = KIEM_VU_COLORS;
  const group = new THREE.Group(); group.name = 'kiem-vu-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần (giống ribbon-aura).
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const geometries = [], materials = [group.material], parts = [];
  const glowMat = swordMaterial(colors, 0), inkMat = swordMaterial(colors, 1);
  materials.push(glowMat, inkMat);
  const swordSets = [];
  // Lớp sáng + lớp mực dùng chung ma trận instance và nằm chung một nhóm để quay cùng nhau.
  function swords(count, parent) {
    const holder = new THREE.Group(); parent.add(holder);
    const glow = new THREE.InstancedMesh(swordGeometry(), glowMat, count);
    glow.renderOrder = 8; holder.add(glow);
    if (!lowQuality) {
      const ink = new THREE.InstancedMesh(swordGeometry(), inkMat, count);
      ink.instanceMatrix = glow.instanceMatrix; ink.renderOrder = 7; holder.add(ink);
    }
    swordSets.push(glow); holder.mesh = glow; return holder;
  }

  const wheel = new THREE.Group(); wheel.name = 'kiem-vu-wheel';
  wheel.position.set(0, 1.42, -0.42); group.add(wheel);
  const outer = swords(12, wheel), inner = swords(lowQuality ? 6 : 8, wheel);
  // Ngọc kiếm tâm giữa kiếm luân (thấy khi nhìn chéo hoặc từ sau).
  const gemGeo = new THREE.OctahedronGeometry(0.075), gemMat = new THREE.MeshBasicMaterial({ color: colors.core,
    transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  geometries.push(gemGeo); materials.push(gemMat);
  const gem = new THREE.Mesh(gemGeo, gemMat); gem.scale.set(1, 1.5, 1); gem.position.z = 0.04; wheel.add(gem);

  parts.push(createEmblemLayers(wheel, group, colors, lowQuality));
  parts.push(createLightArcs(group, colors, lowQuality));
  parts.push(createSilkSashes(group, colors, lowQuality));
  parts.push(createBillboards(group, colors, lowQuality));
  parts.push(createFlyingSwords(group, colors, swords, lowQuality));
  if (!lowQuality) parts.push(createSwordRain(group, ink => swordMaterial(colors, ink)));

  // Hạt kiếm khí bay lên quanh thân.
  const moteCount = lowQuality ? 10 : 26, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.07, map: dot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  geometries.push(moteGeo); materials.push(moteMat);
  group.add(new THREE.Points(moteGeo, moteMat));
  group.traverse(o => { o.frustumCulled = false; });

  const dummy = new THREE.Object3D();
  // inward = mũi kiếm chĩa vào tâm (vòng trong "quy tông"), chuôi nằm ngoài tránh rối quanh đầu.
  function layRing(mesh, radius, length, z, t, push, offset, inward = false) {
    for (let i = 0; i < mesh.count; i++) {
      const a = (i + offset) / mesh.count * Math.PI * 2, r = radius + push + 0.012 * Math.sin(t * 1.3 + i * 1.7);
      dummy.position.set(Math.sin(a) * r, Math.cos(a) * r, z);
      dummy.rotation.set(0, 0, inward ? Math.PI - a : -a); dummy.scale.setScalar(length); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = kiemVuRhythm(time);
      const push = 0.045 * rhythm.release - 0.025 * rhythm.gather;
      layRing(outer.mesh, 0.42, 0.62, 0, time, push, 0);
      layRing(inner.mesh, 0.58, 0.32, -0.14, time, -push * 0.6, 0.5, true);
      outer.rotation.z = time * 0.045; inner.rotation.z = -time * 0.07;
      wheel.position.y = 1.42 + 0.04 * Math.sin(time * 0.45);
      gem.rotation.y = time * 0.4; gemMat.opacity = (0.6 + 0.4 * rhythm.pulse) * f;
      for (const m of [glowMat, inkMat]) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = rhythm.sweep; m.uniforms.sweepOn.value = rhythm.sweepOn;
      }
      glowMat.uniforms.opacity.value = 0.85 * f; inkMat.uniforms.opacity.value = 0.55 * f;
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.05) % 1 + 1) % 1, a = i * 2.39996 + time * 0.1;
        const r = 0.75 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.2, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.55 + 0.3 * rhythm.release) * f;
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity; không có material dùng chung để nhân bản.
    setColor() {},
    setWeapon() {},
    dispose() {
      parts.forEach(p => p.dispose());
      swordSets.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}
