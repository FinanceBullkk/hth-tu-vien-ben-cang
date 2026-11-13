import * as THREE from 'three';
import { petalGeometry, featherMaterial, featherSet } from './hong-lien-materials.js';

// Đài sen lửa 3D quanh bàn chân: hai tầng cánh (8 trong + 8 ngoài xen kẽ), cánh nhọn khum vào
// như ngọn lửa lụa, ngả ra ngoài vừa đủ để không che người. Hít vào thì sen thu búp, thở ra
// thì nở chậm; hai tầng trôi ngược chiều rất chậm. Chất lượng thấp chỉ giữ tầng trong.
const TIERS = [
  { n: 8, r: 0.4, len: 0.44, lean: 0.5, offset: 0, spin: 0.03 },
  { n: 8, r: 0.56, len: 0.36, lean: 0.98, offset: 0.5, spin: -0.02 },
];

export function createLotusSeat(parent, colors, lowQuality) {
  const tiers = lowQuality ? TIERS.slice(0, 1) : TIERS;
  const count = tiers.reduce((s, t) => s + t.n, 0);
  const glowMat = featherMaterial(colors, 0, 1), inkMat = featherMaterial(colors, 1, 1);
  const set = featherSet(parent, petalGeometry(), count, glowMat, inkMat, lowQuality, 'hong-lien-lotus');
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';

  return {
    update(time, rhythm, f) {
      const open = 0.12 * rhythm.release - 0.08 * rhythm.gather;
      let k = 0;
      for (const t of tiers) for (let i = 0; i < t.n; i++, k++) {
        const a = (i + t.offset) / t.n * Math.PI * 2 + time * t.spin;
        const lean = t.lean + open + 0.03 * Math.sin(time * 0.5 + i * 1.7);
        dummy.position.set(Math.sin(a) * t.r, 0.03, Math.cos(a) * t.r);
        dummy.rotation.set(lean, a, 0.04 * Math.sin(time * 0.4 + i));
        dummy.scale.set(t.len, t.len, -t.len); dummy.updateMatrix();
        set.glow.setMatrixAt(k, dummy.matrix);
      }
      set.glow.instanceMatrix.needsUpdate = true;
      for (const m of [glowMat, inkMat]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      glowMat.uniforms.opacity.value = (0.75 + 0.2 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.5 * f;
    },
    dispose() { set.dispose(); glowMat.dispose(); inkMat.dispose(); },
  };
}
