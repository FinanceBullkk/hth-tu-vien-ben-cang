import * as THREE from 'three';
import { createEmblemKit } from './aura-emblem-materials.js';
import { moonGateGeometry } from './dao-hoa-geometry.js';
import { jadeMaterial } from './dao-hoa-materials.js';
import { daoHoaGateCarving, daoHoaPlaque, PLAQUE_SIZE } from './dao-hoa-textures.js';

// Nguyệt môn kiến trúc bằng ngọc trắng hồng — bóng dáng chính của Đào Hoa: vòng cổng 3D dày đứng
// trên hai đế đá sau lưng nhân vật, cao hơn đầu, LÒNG CỔNG RỖNG (không mandala, không tranh).
// Mặt trước chạm dây hoa đào (nét sáng + mực, luồng sáng chạy chậm quanh rãnh); đỉnh treo biển 桃源.
export const GATE = { outer: 1.25, inner: 1.04, depth: 0.2, y: 1.27, z: -0.62 };

export function createJadeGate(parent, colors, lowQuality) {
  const group = new THREE.Group(); group.name = 'dao-hoa-gate'; group.position.set(0, GATE.y, GATE.z); parent.add(group);
  const kit = createEmblemKit(colors, lowQuality);
  const geo = moonGateGeometry(GATE.outer, GATE.inner, GATE.depth); kit.geometries.push(geo);
  const body = kit.own(jadeMaterial(colors, 1)), glow = kit.own(jadeMaterial(colors, 0));
  const stone = new THREE.Mesh(geo, body); stone.name = 'dao-hoa-jade-gate'; stone.renderOrder = 3; group.add(stone);
  if (!lowQuality) { const rim = new THREE.Mesh(geo, glow); rim.name = 'dao-hoa-jade-gate'; rim.renderOrder = 4; group.add(rim); }
  // Hoa văn chạm: tấm 2.6 m áp sát mặt trước (mặt cổng ở r 1.04–1.25 m ↔ 410–492 px).
  const face = GATE.depth / 2 + GATE.depth * 0.12 + 0.004;
  const carving = kit.lines(group, kit.plane(2.6), daoHoaGateCarving(), face, 5, { opacity: 1, goldMix: 0.45, chase: 2, inkScale: 1 });
  carving.name = 'dao-hoa-gate-carving';
  const plaqueGeo = new THREE.PlaneGeometry(...PLAQUE_SIZE); kit.geometries.push(plaqueGeo);
  const plaque = kit.own(new THREE.MeshBasicMaterial({ map: daoHoaPlaque(), transparent: true, depthWrite: false, toneMapped: false }));
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaque); plaqueMesh.name = 'dao-hoa-plaque';
  plaqueMesh.position.set(0, GATE.outer - 0.09, face + 0.02); plaqueMesh.renderOrder = 6; group.add(plaqueMesh);

  return {
    update(time, rhythm, f) {
      kit.tick(time, rhythm, f);
      body.uniforms.opacity.value = 0.92 * f; glow.uniforms.opacity.value = 0.9 * f;
      glow.uniforms.glow.value = rhythm.pulse; plaque.opacity = f;
    },
    dispose() { kit.dispose(); },
  };
}
