import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { luuLyMandala, luuLyRim, luuLyGlow } from './luu-ly-textures.js';

// Các lớp hoa văn phẳng của thủy luân sau lưng Lưu Ly (con của wheel), texture canvas dùng chung:
// quầng pháp quang → xoáy nước (sáu nhánh xoáy, sóng cuộn, sóng vảy, tâm 水) → vành sóng không chữ
// quay ngược chiều → đốm sáng dọc nhánh xoáy. Mỗi lớp nét có bản mực; chất lượng thấp bỏ mực.
export function createLuuLyWheelLayers(wheel, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const wheelPlane = kit.plane(2.7);
  const halo = kit.own(sealMaterial(colors, 2));
  const haloMesh = new THREE.Mesh(wheelPlane, halo); haloMesh.position.z = -0.09; haloMesh.renderOrder = 4; wheel.add(haloMesh);
  const whirl = kit.lines(wheel, wheelPlane, luuLyMandala(), -0.05, 5, { opacity: 0.72, goldMix: 0.5, chase: 6 });
  const rim = kit.lines(wheel, wheelPlane, luuLyRim(), -0.06, 5, { opacity: 0.72, goldMix: 0.9, chase: 3 });
  const sparkMat = kit.own(new THREE.MeshBasicMaterial({ map: luuLyGlow(), color: colors.core, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const sparks = new THREE.Mesh(wheelPlane, sparkMat); sparks.position.z = 0.003; sparks.renderOrder = 6; whirl.add(sparks);

  return {
    update(time, rhythm, f) {
      // Xoáy nước quay theo chiều nhánh xoáy cuốn vào; vành sóng trôi ngược chiều, chậm hơn.
      whirl.rotation.z = -time * 0.035; rim.rotation.z = time * 0.015;
      kit.tick(time, rhythm, f);
      halo.uniforms.time.value = time; halo.uniforms.pulse.value = rhythm.pulse;
      halo.uniforms.opacity.value = 0.6 * f;
      sparkMat.opacity = (0.35 + 0.45 * rhythm.pulse + 0.2 * rhythm.sweepOn) * f;
    },
    dispose() { kit.dispose(); },
  };
}
