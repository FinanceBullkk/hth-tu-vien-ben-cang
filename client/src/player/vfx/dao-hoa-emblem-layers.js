import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { daoHoaMoonGate, daoHoaMoonGlow, daoHoaPond, daoHoaDriftingPetals } from './dao-hoa-textures.js';
import { daoHoaGardenView, daoHoaPlaque, PLAQUE_SIZE } from './dao-hoa-garden-painting.js';

// Các lớp phẳng của Đào Hoa — không mandala quay, không trận chữ tròn:
//  sau lưng (con của gate): bức thủy mặc nhìn qua cổng (normal blend, màu thật) → quầng trăng cộng
//    sáng thở theo nhịp → nguyệt môn nét bút lông (đứng yên, chỗ hở khớp cành đào 3D) → biển đề 桃源;
//  dưới chân: mặt ao (bờ nước, gợn loang, cánh rơi) → vòng hoa trôi quay rất chậm → gợn nước loang.
// Lớp nét có bản mực normal-blend để đọc rõ trên nền sáng; chất lượng thấp bỏ mực.
export function createEmblemLayers(gate, ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const gatePlane = kit.plane(2.7), pondPlane = kit.plane(3.4), driftPlane = kit.plane(1.9);

  const painting = kit.own(new THREE.MeshBasicMaterial({ map: daoHoaGardenView(), transparent: true, opacity: 0.9,
    depthWrite: false, toneMapped: false })); // một mặt: nhìn từ sau lưng thấy xuyên qua cổng, không che người
  const paintMesh = new THREE.Mesh(gatePlane, painting); paintMesh.name = 'dao-hoa-garden-view';
  paintMesh.position.z = -0.08; paintMesh.renderOrder = 3; gate.add(paintMesh);
  const moon = kit.own(new THREE.MeshBasicMaterial({ map: daoHoaMoonGlow(), color: colors.core, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const moonMesh = new THREE.Mesh(gatePlane, moon); moonMesh.position.z = -0.07; moonMesh.renderOrder = 4; gate.add(moonMesh);
  kit.lines(gate, gatePlane, daoHoaMoonGate(), -0.03, 5, { opacity: 0.9, goldMix: 0.2, chase: 2, inkScale: 1 });
  // Biển đề 桃源 treo trên đỉnh cổng (khung gỗ màu thật, normal blend).
  const plaque = kit.own(new THREE.MeshBasicMaterial({ map: daoHoaPlaque(), transparent: true, depthWrite: false,
    toneMapped: false })); // một mặt: không lộ chữ ngược khi nhìn từ sau
  const plaqueGeo = new THREE.PlaneGeometry(...PLAQUE_SIZE); kit.geometries.push(plaqueGeo);
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaque);
  plaqueMesh.name = 'dao-hoa-plaque'; plaqueMesh.position.set(0, 1.47, 0.02); plaqueMesh.renderOrder = 6; gate.add(plaqueMesh);

  const ripple = kit.own(sealMaterial(colors, 1));
  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  kit.lines(flat, pondPlane, daoHoaPond(), 0, 4, { opacity: 0.65, goldMix: 0.15, chase: 3 });
  const drift = kit.lines(flat, driftPlane, daoHoaDriftingPetals(), 0.006, 4, { opacity: 0.7, chase: 2 });
  const rippleMesh = new THREE.Mesh(pondPlane, ripple); rippleMesh.position.z = 0.01; rippleMesh.renderOrder = 5; flat.add(rippleMesh);

  return {
    update(time, rhythm, f) {
      drift.rotation.z = time * 0.03;
      kit.tick(time, rhythm, f);
      ripple.uniforms.time.value = time; ripple.uniforms.pulse.value = rhythm.pulse;
      ripple.uniforms.opacity.value = 0.7 * f;
      painting.opacity = 0.9 * f; plaque.opacity = f;
      moon.opacity = (0.35 + 0.25 * rhythm.pulse) * f;
    },
    dispose() { kit.dispose(); },
  };
}
