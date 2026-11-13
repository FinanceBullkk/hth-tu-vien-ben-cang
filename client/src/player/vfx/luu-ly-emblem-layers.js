import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { luuLyMandala, luuLyRim, luuLyGlow, luuLySealOuter, luuLySealInner } from './luu-ly-textures.js';

// Các lớp hoa văn phẳng của Lưu Ly Vân Thủy (texture canvas dùng chung mọi nhân vật):
//  sau lưng (con của wheel): quầng pháp quang → thủy luân (băng tinh, sóng cuộn, sóng vảy, 水)
//    → vành phù văn 24 chữ quay ngược → đốm sáng;
//  dưới chân: trận thủy văn (đứng yên) → thủy liên sáu cánh quay ngược → gợn nước loang như mặt hồ.
// Lớp nét nào cũng có bản mực để đọc được trên nền đá sáng; chất lượng thấp bỏ mực.
export function createLuuLyEmblemLayers(wheel, ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const wheelPlane = kit.plane(2.7), sealPlane = kit.plane(3.2), innerPlane = kit.plane(1.3);

  const halo = kit.own(sealMaterial(colors, 2)), ripple = kit.own(sealMaterial(colors, 1));
  const haloMesh = new THREE.Mesh(wheelPlane, halo); haloMesh.position.z = -0.09; haloMesh.renderOrder = 4; wheel.add(haloMesh);
  const mandala = kit.lines(wheel, wheelPlane, luuLyMandala(), -0.05, 5, { opacity: 0.72, goldMix: 0.5, chase: 4 });
  const rim = kit.lines(wheel, wheelPlane, luuLyRim(), -0.06, 5, { opacity: 0.75, goldMix: 0.9, chase: 2 });
  const sparkMat = kit.own(new THREE.MeshBasicMaterial({ map: luuLyGlow(), color: colors.core, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const sparks = new THREE.Mesh(wheelPlane, sparkMat); sparks.position.z = 0.003; sparks.renderOrder = 6; mandala.add(sparks);

  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  kit.lines(flat, sealPlane, luuLySealOuter(), 0, 4, { opacity: 0.68, goldMix: 0.55, chase: 6 });
  const lotus = kit.lines(flat, innerPlane, luuLySealInner(), 0.006, 4, { opacity: 0.65, goldMix: 0.3, chase: 3 });
  const rippleMesh = new THREE.Mesh(sealPlane, ripple); rippleMesh.name = 'luu-ly-ripple';
  rippleMesh.position.z = 0.01; rippleMesh.renderOrder = 5; flat.add(rippleMesh);

  return {
    update(time, rhythm, f) {
      mandala.rotation.z = time * 0.025; rim.rotation.z = -time * 0.018; lotus.rotation.z = -time * 0.05;
      kit.tick(time, rhythm, f);
      for (const m of [halo, ripple]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      halo.uniforms.opacity.value = 0.6 * f; ripple.uniforms.opacity.value = 0.75 * f;
      sparkMat.opacity = (0.35 + 0.45 * rhythm.pulse + 0.2 * rhythm.sweepOn) * f;
    },
    dispose() { kit.dispose(); },
  };
}
