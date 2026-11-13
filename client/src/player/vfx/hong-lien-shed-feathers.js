import * as THREE from 'three';
import { featherGeometry, featherMaterial, featherSet } from './hong-lien-materials.js';
import { hash } from './aura-billboard-layer.js';
import { WING, PRIMARIES, wingMatrix, armPoint } from './hong-lien-wing-frame.js';

// Động từ phụ của Hồng Liên: lông vũ lửa RỤNG khỏi mép cánh, chao xuống một chút rồi được hơi lửa
// nâng bay lên, chếch ra ngoài, lật nhẹ và tan. Mỗi chiếc một hành trình 9 giây lệch pha,
// tốc độ chậm và trơn (không giật). Lông 3D thật, cùng vật liệu với cánh.
const LIFE = 9;

export function createShedFeathers(parent, colors, lowQuality) {
  const n = lowQuality ? 4 : 9;
  const glowMat = featherMaterial(colors, 0), inkMat = featherMaterial(colors, 1);
  const set = featherSet(parent, featherGeometry(), n, glowMat, inkMat, lowQuality, 'hong-lien-shed');
  // Chỗ rụng cố định trên sải cánh (tư thế gốc), tính một lần.
  const frame = new THREE.Matrix4(), starts = [];
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1, [s, ang, len] = PRIMARIES[Math.floor(hash(k + 7) * PRIMARIES.length)];
    const d = len * (0.45 + 0.4 * hash(k + 11));
    const local = armPoint(side, s, WING.base, new THREE.Vector3()).add(new THREE.Vector3(side * Math.sin(ang) * d, Math.cos(ang) * d, 0));
    starts.push({ side, pos: local.applyMatrix4(wingMatrix(side, frame)), off: k / n + 0.07 * hash(k + 3) });
  }
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';

  return {
    update(time, rhythm, f) {
      starts.forEach(({ side, pos, off }, k) => {
        const u = ((time / LIFE + off) % 1 + 1) % 1, life = Math.sin(Math.PI * u);
        const flutter = Math.sin(time * 0.7 + k * 1.9);
        dummy.position.set(pos.x + side * 0.55 * u + 0.08 * flutter * u, pos.y + 1.4 * u - 0.3 * Math.sin(Math.PI * u), pos.z - 0.3 * u);
        dummy.rotation.set(0.5 * Math.sin(time * 0.45 + k), side * 0.4, -side * (1.3 + 1.2 * u) + 0.25 * flutter);
        const sc = 0.34 * Math.pow(life, 0.6);
        dummy.scale.set(side * sc, sc, sc); dummy.updateMatrix();
        set.glow.setMatrixAt(k, dummy.matrix);
      });
      set.glow.instanceMatrix.needsUpdate = true;
      for (const m of [glowMat, inkMat]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      glowMat.uniforms.opacity.value = (0.7 + 0.25 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.45 * f;
    },
    dispose() { set.dispose(); glowMat.dispose(); inkMat.dispose(); },
  };
}
