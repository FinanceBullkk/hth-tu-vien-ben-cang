import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';
import { KIEM_VU_COLORS, swordMaterial } from './kiem-vu-materials.js';
import { createEmblemLayers } from './kiem-vu-emblem-layers.js';
import { createSwordRain } from './kiem-vu-ornaments.js';
import { createLightArcs } from './kiem-vu-light-arcs.js';
import { createSilkSashes } from './kiem-vu-silk-sashes.js';
import { createBillboards } from './kiem-vu-billboards.js';
import { createFlyingSwords } from './kiem-vu-flying-swords.js';

// Thanh Phong Kiếm Vũ (effect 12) — Vạn Kiếm Quy Tông Trận, theo công thức nhiều lớp của Kim Liên:
//  Pháp tướng sau lưng: quầng pháp quang · mandala kiếm hoa (12 kiếm vẽ, lưới sao đan xen, vành
//    mây, kiếm tâm 劍) · vành phù văn 24 chữ quay ngược · 12 kiếm 3D vòng ngoài + 8 vòng trong
//    quay ngược chiều · ngọc kiếm tâm · tường vân đỡ hai bên · sao lấp lánh.
//  Quanh thân: bốn dải lưu quang lượn trên các mặt phẳng trôi (thay vòng tròn cứng) · phiêu đái
//    hai dải lụa sau vai · ba phi kiếm kéo vệt kiếm khí và tua vàng · vệt khí và hạt bay lên.
//  Dưới chân thêm mây tường vân bồng bềnh.
//  Dưới chân: trận đồ bát quái tám kiếm ấn, 24 chữ, sao đan xen + kiếm liên 16 cánh quay ngược.
//  Nhịp 8 giây: tụ kiếm → xuất kiếm (kiếm luân bung, sóng sáng quét quanh mọi vành, tám kiếm
//    hư ảnh rơi cắm vào trận đồ, xung sáng loang) → ổn định. Mọi chuyển động là hàm thuần của thời gian.
const BASE_OPACITY = 0.9, CYCLE = 8;
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const bell = (c, w, x) => Math.exp(-((x - c) * (x - c)) / (w * w));

let dotTexture = null;
function dot() {
  if (dotTexture) return dotTexture;
  const px = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const r = Math.hypot((i % 16 - 7.5) / 7.5, (Math.floor(i / 16) - 7.5) / 7.5);
    px.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 2)], i * 4);
  }
  dotTexture = new THREE.DataTexture(px, 16, 16); dotTexture.needsUpdate = true;
  return dotTexture;
}

/** Nhịp 8 giây, hàm thuần của thời gian. */
export function kiemVuRhythm(time) {
  const phase = ((time / CYCLE) % 1 + 1) % 1;
  return { phase, gather: bell(0.22, 0.1, phase),
    release: sstep(0.3, 0.37, phase) * (1 - sstep(0.4, 0.75, phase)),
    sweepOn: sstep(0.3, 0.36, phase) * (1 - sstep(0.62, 0.72, phase)),
    sweep: sstep(0.32, 0.68, phase) * Math.PI * 2, pulse: bell(0.36, 0.08, phase) };
}

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
      const push = 0.08 * rhythm.release - 0.035 * rhythm.gather;
      layRing(outer.mesh, 0.42, 0.62, 0, time, push, 0);
      layRing(inner.mesh, 0.58, 0.32, -0.14, time, -push * 0.6, 0.5, true);
      outer.rotation.z = time * 0.1; inner.rotation.z = -time * 0.16;
      wheel.position.y = 1.42 + 0.03 * Math.sin(time * 0.7);
      gem.rotation.y = time * 1.2; gemMat.opacity = (0.6 + 0.4 * rhythm.pulse) * f;
      for (const m of [glowMat, inkMat]) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = rhythm.sweep; m.uniforms.sweepOn.value = rhythm.sweepOn;
      }
      glowMat.uniforms.opacity.value = 0.85 * f; inkMat.uniforms.opacity.value = 0.55 * f;
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.09) % 1 + 1) % 1, a = i * 2.39996 + time * 0.2;
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
