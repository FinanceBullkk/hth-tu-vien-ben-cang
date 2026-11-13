import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';

// Mưa kiếm của Kiếm Vũ — factory trả { update(time, rhythm, f), dispose }.
// rhythm: { phase, gather, release, sweep, sweepOn, pulse } — nhịp thở do kiem-vu-aura tính.
const clamp01 = x => Math.max(0, Math.min(1, x));
const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);

/** Vạn kiếm quy tông: tám kiếm hư ảnh trôi nhẹ từ trời xuống như lá rơi — lắc lư, chậm dần khi
    gần đất rồi đáp êm vào tám kiếm ấn của trận đồ, đứng một lúc và chìm dần vào đất. */
export function createSwordRain(parent, makeMaterial) {
  const mat = makeMaterial(0);
  const mesh = new THREE.InstancedMesh(swordGeometry(), mat, 8);
  mesh.name = 'kiem-vu-rain'; mesh.renderOrder = 7; mesh.frustumCulled = false; parent.add(mesh);
  const dummy = new THREE.Object3D();
  return {
    update(time, rhythm, f) {
      const ph = rhythm.phase;
      const visible = ph > 0.12 && ph < 0.88;
      mesh.visible = visible;
      if (!visible) return;
      const appear = sstep(0.12, 0.24, ph), sink = sstep(0.66, 0.88, ph);
      for (let k = 0; k < 8; k++) {
        // Từng thanh lệch nhịp nhẹ theo vòng — đáp lần lượt chứ không cùng lúc.
        const a = k * Math.PI / 4, start = 0.12 + k * 0.012, d = easeOut((ph - start) / 0.34);
        const drift = (1 - d), sway = Math.sin(time * 0.9 + k * 1.7) * 0.12 * drift;
        const y = 0.35 + drift * 2.4 - sink * 0.3;
        const r = 0.84 + 0.25 * drift;
        dummy.position.set(Math.sin(a) * r + Math.cos(a) * sway, y, -Math.cos(a) * r + Math.sin(a) * sway);
        dummy.rotation.set(Math.PI + 0.25 * drift * Math.sin(time * 0.7 + k), a, 0.2 * sway);
        dummy.scale.setScalar(0.55); dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const land = Math.exp(-Math.pow((ph - 0.48) / 0.08, 2));
      mat.uniforms.time.value = time;
      mat.uniforms.opacity.value = (0.45 * appear + 0.2 * land) * (1 - sink) * f;
    },
    dispose() { mesh.dispose(); mat.dispose(); },
  };
}
