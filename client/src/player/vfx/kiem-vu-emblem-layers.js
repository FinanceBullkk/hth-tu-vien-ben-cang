import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { kiemVuMandala, kiemVuRim, kiemVuGlow, kiemVuSealOuter, kiemVuSealInner } from './kiem-vu-textures.js';

// Các lớp hoa văn phẳng của Kiếm Vũ, vẽ bằng texture canvas dùng chung:
//  sau lưng (con của wheel): quầng pháp quang → mandala nội tâm → vành phù văn quay ngược → đốm sáng;
//  dưới chân: trận đồ ngoài (đứng yên, khớp chỗ mưa kiếm cắm) → kiếm liên trong quay ngược → xung sáng.
// Mỗi lớp nét có thêm bản "mực" (normal blending) để vẫn đọc rõ trên nền đá sáng; chất lượng thấp bỏ mực.
export function createEmblemLayers(wheel, ground, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const wheelPlane = kit.plane(2.7), sealPlane = kit.plane(3.2), innerPlane = kit.plane(1.25);

  const halo = kit.own(sealMaterial(colors, 2)), pulse = kit.own(sealMaterial(colors, 0));
  const haloMesh = new THREE.Mesh(wheelPlane, halo); haloMesh.position.z = -0.09; haloMesh.renderOrder = 4; wheel.add(haloMesh);
  const mandala = kit.lines(wheel, wheelPlane, kiemVuMandala(), -0.05, 5, { opacity: 0.7, chase: 3 });
  const rim = kit.lines(wheel, wheelPlane, kiemVuRim(), -0.06, 5, { opacity: 0.75, goldMix: 0.85, chase: 2 });
  const sparkMat = kit.own(new THREE.MeshBasicMaterial({ map: kiemVuGlow(), color: colors.core, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const sparks = new THREE.Mesh(wheelPlane, sparkMat); sparks.position.z = 0.003; sparks.renderOrder = 6; mandala.add(sparks);

  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  kit.lines(flat, sealPlane, kiemVuSealOuter(), 0, 4, { opacity: 0.7, goldMix: 0.6, chase: 4 });
  const lotus = kit.lines(flat, innerPlane, kiemVuSealInner(), 0.006, 4, { opacity: 0.65, chase: 2 });
  const pulseMesh = new THREE.Mesh(sealPlane, pulse); pulseMesh.position.z = 0.01; pulseMesh.renderOrder = 5; flat.add(pulseMesh);

  return {
    update(time, rhythm, f) {
      mandala.rotation.z = time * 0.03; rim.rotation.z = -time * 0.02; lotus.rotation.z = -time * 0.06;
      kit.tick(time, rhythm, f);
      for (const m of [halo, pulse]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      halo.uniforms.opacity.value = 0.55 * f; pulse.uniforms.opacity.value = 0.8 * f;
      sparkMat.opacity = (0.35 + 0.5 * rhythm.pulse + 0.25 * rhythm.sweepOn) * f;
    },
    dispose() { kit.dispose(); },
  };
}
