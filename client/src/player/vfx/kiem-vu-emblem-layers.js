import * as THREE from 'three';
import { emblemMaterial, sealMaterial } from './kiem-vu-materials.js';
import { kiemVuMandala, kiemVuRim, kiemVuGlow, kiemVuSealOuter, kiemVuSealInner } from './kiem-vu-textures.js';

// Các lớp hoa văn phẳng của Kiếm Vũ, vẽ bằng texture canvas dùng chung:
//  sau lưng (con của wheel): quầng pháp quang → mandala nội tâm → vành phù văn quay ngược → đốm sáng;
//  dưới chân: trận đồ ngoài (đứng yên, khớp chỗ mưa kiếm cắm) → kiếm liên trong quay ngược → xung sáng.
// Mỗi lớp nét có thêm bản "mực" (normal blending) để vẫn đọc rõ trên nền đá sáng; chất lượng thấp bỏ mực.
export function createEmblemLayers(wheel, ground, colors, lowQuality) {
  const geometries = [], materials = [], chasers = [];
  const plane = size => { const g = new THREE.PlaneGeometry(size, size); geometries.push(g); return g; };
  const wheelPlane = plane(2.7), sealPlane = plane(3.2), innerPlane = plane(1.25);

  function lines(parent, geo, map, z, order, opts) {
    const holder = new THREE.Group(); holder.position.z = z; parent.add(holder);
    const glow = emblemMaterial(colors, map, opts); materials.push(glow); chasers.push({ m: glow, base: opts.opacity });
    const mesh = new THREE.Mesh(geo, glow); mesh.renderOrder = order; holder.add(mesh);
    if (!lowQuality) {
      const ink = emblemMaterial(colors, map, { ...opts, ink: 1 }); materials.push(ink);
      chasers.push({ m: ink, base: opts.opacity * 0.8 });
      const shade = new THREE.Mesh(geo, ink); shade.position.z = -0.004; shade.renderOrder = order - 1; holder.add(shade);
    }
    return holder;
  }

  const halo = sealMaterial(colors, 2), pulse = sealMaterial(colors, 0);
  materials.push(halo, pulse);
  const haloMesh = new THREE.Mesh(wheelPlane, halo); haloMesh.position.z = -0.09; haloMesh.renderOrder = 4; wheel.add(haloMesh);
  const mandala = lines(wheel, wheelPlane, kiemVuMandala(), -0.05, 5, { opacity: 0.7, chase: 3 });
  const rim = lines(wheel, wheelPlane, kiemVuRim(), -0.06, 5, { opacity: 0.75, goldMix: 0.85, chase: 2 });
  const sparkMat = new THREE.MeshBasicMaterial({ map: kiemVuGlow(), color: colors.core, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  materials.push(sparkMat);
  const sparks = new THREE.Mesh(wheelPlane, sparkMat); sparks.position.z = 0.003; sparks.renderOrder = 6; mandala.add(sparks);

  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035; ground.add(flat);
  lines(flat, sealPlane, kiemVuSealOuter(), 0, 4, { opacity: 0.7, goldMix: 0.6, chase: 4 });
  const lotus = lines(flat, innerPlane, kiemVuSealInner(), 0.006, 4, { opacity: 0.65, chase: 2 });
  const pulseMesh = new THREE.Mesh(sealPlane, pulse); pulseMesh.position.z = 0.01; pulseMesh.renderOrder = 5; flat.add(pulseMesh);

  return {
    update(time, rhythm, f) {
      mandala.rotation.z = time * 0.03; rim.rotation.z = -time * 0.02; lotus.rotation.z = -time * 0.06;
      for (const { m, base } of chasers) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = rhythm.sweep; m.uniforms.sweepOn.value = rhythm.sweepOn;
        m.uniforms.opacity.value = base * (0.85 + 0.25 * rhythm.pulse) * f;
      }
      for (const m of [halo, pulse]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      halo.uniforms.opacity.value = 0.55 * f; pulse.uniforms.opacity.value = 0.8 * f;
      sparkMat.opacity = (0.35 + 0.5 * rhythm.pulse + 0.25 * rhythm.sweepOn) * f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
