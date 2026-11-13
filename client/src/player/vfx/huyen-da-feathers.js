import * as THREE from 'three';
import { featherGeometry } from './hong-lien-materials.js';
import { crowFeatherMaterial } from './huyen-da-materials.js';
import { pathSeed, inwardPoint, inwardFade } from './huyen-da-inward-path.js';

// Vật thể chủ đề: LÔNG QUẠ ĐEN 3D trôi theo đường hút xoáy — từ quỹ đạo rộng quanh hông, xoắn ốc
// thu nhỏ dần rồi chìm vào đĩa nhật thực. Lông lật nhẹ quanh trục cuống khi trôi. Mỗi chiếc một
// hành trình LIFE giây lệch pha, tốc độ cố định (hàm thuần của thời gian, không có pha tăng tốc).
// Lớp chủ đạo là phiến lông đen (normal blend); lớp viền tím chỉ có ở chất lượng đủ.
export const FEATHER_LIFE = 13;
const UP = new THREE.Vector3(0, 1, 0);

export function createCrowFeathers(parent, colors, lowQuality) {
  const n = lowQuality ? 6 : 12, geo = featherGeometry();
  const inkMat = crowFeatherMaterial(colors, 1), mats = [inkMat];
  const body = new THREE.InstancedMesh(geo, inkMat, n);
  body.name = 'huyen-da-crow-feathers'; body.renderOrder = 7; body.frustumCulled = false; parent.add(body);
  const meshes = [body];
  if (!lowQuality) {
    const glowMat = crowFeatherMaterial(colors, 0); mats.push(glowMat);
    const rim = new THREE.InstancedMesh(geo, glowMat, n);
    rim.name = 'huyen-da-crow-feathers'; rim.instanceMatrix = body.instanceMatrix; rim.renderOrder = 9; rim.frustumCulled = false;
    parent.add(rim); meshes.push(rim);
  }
  const seeds = Array.from({ length: n }, (_, k) => ({ ...pathSeed(k, 40), off: k / n }));
  const dummy = new THREE.Object3D(), a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
  const roll = new THREE.Quaternion();

  return {
    update(time, rhythm, f) {
      seeds.forEach((p, k) => {
        const u = ((time / FEATHER_LIFE + p.off) % 1 + 1) % 1, spin = -time * 0.03;
        inwardPoint(p, u, spin, a); inwardPoint(p, Math.min(1, u + 0.01), spin, b);
        dir.subVectors(b, a); if (dir.lengthSq() < 1e-10) dir.copy(UP); dir.normalize();
        dummy.position.copy(a);
        dummy.quaternion.setFromUnitVectors(UP, dir);
        dummy.quaternion.multiply(roll.setFromAxisAngle(UP, 1.2 * Math.sin(time * 0.5 + k * 1.7)));
        const sc = (0.55 - 0.3 * u) * Math.pow(inwardFade(u), 0.5);
        dummy.scale.setScalar(sc); dummy.updateMatrix();
        body.setMatrixAt(k, dummy.matrix);
      });
      body.instanceMatrix.needsUpdate = true;
      for (const m of mats) m.uniforms.time.value = time;
      inkMat.uniforms.opacity.value = 0.95 * f;
      if (mats[1]) mats[1].uniforms.opacity.value = (0.6 + 0.25 * rhythm.gather) * f;
    },
    dispose() { meshes.forEach(m => m.dispose()); mats.forEach(m => m.dispose()); },
  };
}
