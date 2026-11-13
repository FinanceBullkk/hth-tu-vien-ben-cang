import * as THREE from 'three';
import { createEmblemKit } from './aura-emblem-materials.js';
import { hongLienFan, hongLienFanGlow, hongLienBloom, hongLienBloomInner, hongLienBloomGlow } from './hong-lien-textures.js';

// Các lớp hoa văn phẳng của Hồng Liên (texture canvas dùng chung), dáng riêng không tròn:
//  sau lưng: quạt đuôi phượng xoè nửa vòng trên vai (không quay — chỉ xoè/khép và đung đưa rất nhẹ)
//    + đốm sáng ở mắt lông;
//  dưới chân: đóa hồng liên 16 + 12 cánh (trôi rất chậm) → lõi gương sen quay ngược → quầng sáng.
// Mỗi lớp nét có bản mực đỏ son để đọc được trên nền sáng; chất lượng thấp bỏ mực.
export function createEmblemLayers(fanAnchor, ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const fanPlane = kit.plane(3.4), bloomPlane = kit.plane(3.0), innerPlane = kit.plane(1.0);
  const glow = (map, opacity) => kit.own(new THREE.MeshBasicMaterial({ map, color: colors.core, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));

  const fan = kit.lines(fanAnchor, fanPlane, hongLienFan(), 0, 5, { opacity: 0.72, goldMix: 0.9, chase: 2 });
  fan.name = 'hong-lien-fan';
  const fanGlowMat = glow(hongLienFanGlow(), 0.5);
  const fanGlow = new THREE.Mesh(fanPlane, fanGlowMat); fanGlow.position.z = 0.004; fanGlow.renderOrder = 6; fan.add(fanGlow);

  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  const bloom = kit.lines(flat, bloomPlane, hongLienBloom(), 0, 4, { opacity: 0.66, goldMix: 0.7, chase: 4 });
  bloom.name = 'hong-lien-bloom';
  const inner = kit.lines(flat, innerPlane, hongLienBloomInner(), 0.006, 4, { opacity: 0.66, chase: 2 });
  const bloomGlowMat = glow(hongLienBloomGlow(), 0.4);
  const bloomGlow = new THREE.Mesh(bloomPlane, bloomGlowMat); bloomGlow.position.z = 0.01; bloomGlow.renderOrder = 5; flat.add(bloomGlow);

  return {
    update(time, rhythm, f) {
      const open = 1 + 0.035 * rhythm.release - 0.02 * rhythm.gather;
      fan.scale.set(open, open, 1); fan.rotation.z = 0.025 * Math.sin(time * 0.3);
      bloom.rotation.z = time * 0.012; inner.rotation.z = -time * 0.05;
      bloom.scale.setScalar(open); bloomGlow.scale.setScalar(open);
      kit.tick(time, rhythm, f);
      fanGlowMat.opacity = (0.3 + 0.4 * rhythm.pulse + 0.15 * rhythm.sweepOn) * f;
      bloomGlowMat.opacity = (0.22 + 0.25 * rhythm.pulse) * f;
    },
    dispose() { kit.dispose(); },
  };
}
