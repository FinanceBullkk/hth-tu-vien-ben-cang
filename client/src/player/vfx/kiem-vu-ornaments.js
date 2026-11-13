import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';

// Mưa kiếm của Kiếm Vũ — factory trả { update(time, rhythm, f), dispose }.
// rhythm: { phase, gather, release, sweep, sweepOn, pulse } — nhịp 8 giây do kiem-vu-aura tính.
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** Vạn kiếm quy tông: tám kiếm hư ảnh rơi cắm vào tám kiếm ấn của trận đồ ở nhịp xuất kiếm. */
export function createSwordRain(parent, makeMaterial) {
  const mat = makeMaterial(0);
  const mesh = new THREE.InstancedMesh(swordGeometry(), mat, 8);
  mesh.name = 'kiem-vu-rain'; mesh.renderOrder = 7; mesh.frustumCulled = false; parent.add(mesh);
  const dummy = new THREE.Object3D();
  return {
    update(time, rhythm, f) {
      const ph = rhythm.phase;
      const fall = sstep(0.2, 0.33, ph), sink = sstep(0.56, 0.72, ph);
      const visible = ph > 0.2 && ph < 0.72;
      mesh.visible = visible;
      if (!visible) return;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, lag = k % 2 ? 0.03 : 0, drop = sstep(0.2 + lag, 0.33, ph);
        const y = 0.35 + (1 - drop * drop) * 2.8 - sink * 0.35;
        dummy.position.set(Math.sin(a) * 0.84, y, -Math.cos(a) * 0.84);
        dummy.rotation.set(Math.PI, a, 0); dummy.scale.setScalar(0.55); dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const flash = Math.exp(-Math.pow((ph - 0.335) / 0.03, 2));
      mat.uniforms.time.value = time;
      mat.uniforms.opacity.value = (0.45 * fall + 0.6 * flash) * (1 - sink) * f;
    },
    dispose() { mesh.dispose(); mat.dispose(); },
  };
}
