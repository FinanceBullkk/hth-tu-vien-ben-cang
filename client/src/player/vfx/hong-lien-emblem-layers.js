import * as THREE from 'three';
import { createEmblemKit } from './aura-emblem-materials.js';
import { hongLienBloom, hongLienBloomInner, hongLienBloomGlow } from './hong-lien-textures.js';

// Nền đất của Hồng Liên: đóa sen lửa phẳng nở dưới chân (texture canvas dùng chung).
//  Đóa ngoài 16 + 12 cánh, mép là mũi cánh (không vòng tròn, không chữ) · lõi gương sen quay ngược
//  · quầng sáng ở mũi cánh. Hít vào sen thu nhỏ, thở ra sen nở rộng.
// Mỗi lớp nét có bản mực đỏ son để đọc được trên nền sáng; chất lượng thấp bỏ mực.
export function createEmblemLayers(ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const bloomPlane = kit.plane(3.0), innerPlane = kit.plane(1.0);
  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  const bloom = kit.lines(flat, bloomPlane, hongLienBloom(), 0, 4, { opacity: 0.68, goldMix: 0.7, chase: 4 });
  bloom.name = 'hong-lien-bloom';
  const inner = kit.lines(flat, innerPlane, hongLienBloomInner(), 0.006, 4, { opacity: 0.66, chase: 2 });
  const glowMat = kit.own(new THREE.MeshBasicMaterial({ map: hongLienBloomGlow(), color: colors.core, transparent: true,
    opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const glow = new THREE.Mesh(bloomPlane, glowMat); glow.position.z = 0.01; glow.renderOrder = 5; flat.add(glow);

  return {
    update(time, rhythm, f) {
      const open = 0.94 + 0.08 * rhythm.release - 0.03 * rhythm.gather;
      bloom.scale.setScalar(open); glow.scale.setScalar(open);
      bloom.rotation.z = time * 0.012; inner.rotation.z = -time * 0.05;
      kit.tick(time, rhythm, f);
      glowMat.opacity = (0.22 + 0.28 * rhythm.pulse) * f;
    },
    dispose() { kit.dispose(); },
  };
}
