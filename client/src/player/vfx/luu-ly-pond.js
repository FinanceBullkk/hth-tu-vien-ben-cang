import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { luuLySealOuter, luuLySealInner } from './luu-ly-textures.js';

// Mặt hồ dưới chân Lưu Ly (texture canvas dùng chung mọi nhân vật): hoa văn mặt hồ đứng yên
// (sóng vảy, sóng cuộn, lá sen nổi) → thủy liên sáu cánh quẻ Khảm quay ngược rất chậm → gợn nước
// đồng tâm loang ra như mặt hồ. Không có vành chữ hay bát quái. Chất lượng thấp bỏ lớp mực.
export function createLuuLyPond(ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const pondPlane = kit.plane(3.3), innerPlane = kit.plane(1.3);
  const ripple = kit.own(sealMaterial(colors, 1));

  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  kit.lines(flat, pondPlane, luuLySealOuter(), 0, 4, { opacity: 0.66, goldMix: 0.55, chase: 5 });
  const lotus = kit.lines(flat, innerPlane, luuLySealInner(), 0.006, 4, { opacity: 0.65, goldMix: 0.3, chase: 3 });
  const rippleMesh = new THREE.Mesh(pondPlane, ripple); rippleMesh.name = 'luu-ly-ripple';
  rippleMesh.position.z = 0.01; rippleMesh.renderOrder = 5; flat.add(rippleMesh);

  return {
    update(time, rhythm, f) {
      lotus.rotation.z = -time * 0.04;
      kit.tick(time, rhythm, f);
      ripple.uniforms.time.value = time; ripple.uniforms.pulse.value = rhythm.pulse;
      ripple.uniforms.opacity.value = 0.85 * f;
    },
    dispose() { kit.dispose(); },
  };
}
