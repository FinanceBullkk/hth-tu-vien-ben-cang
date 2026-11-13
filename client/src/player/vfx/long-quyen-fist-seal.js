import * as THREE from 'three';
import { billboardLayer } from './aura-billboard-layer.js';
import { createEmblemKit } from './aura-emblem-materials.js';
import { softDot } from './aura-rhythm.js';
import { instancedFlatMaterial } from './long-quyen-materials.js';
import { fistSeal, octagonRing } from './long-quyen-textures.js';
import { spineFrame } from './long-quyen-spine.js';

// Ấn quyền ở mũi cú đấm: triện VUÔNG chữ 拳 dựng đứng trước miệng rồng, mặt hướng theo cú tung quyền
// (không phải đĩa tròn sau lưng). Lửa từ miệng rồng phả thành chuỗi đốm trôi đều vào ấn; ba vòng sóng
// quyền bát giác loang chậm về phía trước. Khi dải sáng dọc thân tới đầu rồng (strike) ấn sáng dịu lên,
// phồng nhẹ — không lóe, không đổi tốc độ.
export const SEAL_SIZE = 0.48, SEAL_REACH = 0.94, RING_LIFE = 3.6, PUFF_LIFE = 1.8;

/** Tâm ấn và hướng tung quyền trong toạ độ aura. */
export function sealPlacement() {
  const f = spineFrame(1);
  return { center: f.p.clone().addScaledVector(f.t, SEAL_REACH), dir: f.t.clone() };
}

export function createFistSeal(parent, colors, lowQuality, mouthAt) {
  const { center, dir } = sealPlacement();
  const facing = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
  const seal = new THREE.Group(); seal.name = 'long-quyen-fist-seal';
  seal.position.copy(center); seal.quaternion.copy(facing); parent.add(seal);

  const kit = createEmblemKit({ steel: colors.deep, edge: colors.edge, core: colors.core, gold: colors.hot }, lowQuality);
  const halo = new THREE.Mesh(kit.plane(SEAL_SIZE * 2.2), kit.own(new THREE.MeshBasicMaterial({ map: softDot(), color: colors.edge,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 })));
  halo.name = 'long-quyen-seal-halo'; halo.position.z = -0.02; halo.renderOrder = 6; seal.add(halo);
  kit.lines(seal, kit.plane(SEAL_SIZE), fistSeal(), 0, 8, { opacity: 0.95, chase: 4, goldMix: 0.6 }).name = 'long-quyen-seal-lines';

  // Vòng sóng quyền: một InstancedMesh ba bản, bay dọc hướng tung quyền.
  const ringN = 3, ringGeo = kit.plane(1), ringMat = kit.own(instancedFlatMaterial(octagonRing(), colors.core));
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, ringN);
  rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ringN * 3), 3);
  rings.name = 'long-quyen-fist-rings'; rings.renderOrder = 8; parent.add(rings);

  const puffN = lowQuality ? 5 : 10;
  const puffs = billboardLayer(parent, 'long-quyen-breath', softDot(), puffN, colors.core.clone().lerp(colors.edge, 0.3), THREE.AdditiveBlending);
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), scale = new THREE.Vector3(), tint = new THREE.Color(), mouth = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const glow = { ...rhythm, pulse: rhythm.strike };
      kit.tick(time, glow, f);
      seal.scale.setScalar(1 + 0.05 * rhythm.strike);
      halo.material.opacity = (0.3 + 0.25 * rhythm.strike) * f;
      for (let i = 0; i < ringN; i++) {
        const u = ((time / RING_LIFE + i / ringN) % 1 + 1) % 1, s = 0.3 + 0.42 * u;
        pos.copy(center).addScaledVector(dir, 0.04 + 0.4 * u);
        rings.setMatrixAt(i, m4.compose(pos, facing, scale.set(s, s, s)));
        const alpha = Math.pow(1 - u, 1.3) * Math.min(1, u * 7) * (0.55 + 0.3 * rhythm.strike);
        rings.setColorAt(i, tint.setRGB(alpha, 0, 0));
      }
      rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
      ringMat.uniforms.opacity.value = f;
      mouthAt(mouth);
      for (let i = 0; i < puffN; i++) {
        const u = ((time / PUFF_LIFE + i / puffN) % 1 + 1) % 1;
        pos.lerpVectors(mouth, center, u);
        pos.y += 0.015 * Math.sin(i * 2.3 + u * 6);
        const size = 0.05 + 0.06 * Math.sin(u * Math.PI);
        puffs.set(i, pos.x, pos.y, pos.z, size, size, Math.sin(u * Math.PI) ** 2 * 0.8);
      }
      puffs.commit(); puffs.material.uniforms.opacity.value = f;
    },
    dispose() { kit.dispose(); rings.dispose(); puffs.dispose(); },
  };
}
