import * as THREE from 'three';
import { cloudBlobGeometry, cloudReliefGeometry } from './xich-diem-cloud-geometry.js';
import { cloudMaterial } from './xich-diem-materials.js';
import { CLOUDS, DRIFT, RING, TURN, ringPoint, spread } from './xich-diem-layout.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { softGlow } from './xich-diem-textures.js';

// Khối chính của Xích Diễm: HỎA VÂN ĐÀI — 16 cuộn tường vân 3D dày xếp hai vòng so le sát đất, cả
// đài TRÔI VÒNG rất chậm (DRIFT cố định) quanh người đứng trên mây; mỗi cuộn bập bềnh nhẹ. Thêm 3
// "khóa mây" nhỏ cùng hình cưỡi trên vòng lửa eo. Mọi cuộn dùng chung một hình (instanced):
//  thân đặc đỏ son (normal blend) · quầng viền vàng cam · gờ xoắn ốc vàng kim · quầng sáng sau cuộn.
export const KNOTS = 3;
const KNOT_SCALE = 0.2;

export function createCloudPlatform(parent, colors, lowQuality) {
  const count = CLOUDS.length + KNOTS, owned = [], ticks = [], meshes = [];
  const layer = (geo, mode, name, order) => {
    const m = cloudMaterial(colors, mode); owned.push(m); ticks.push(m);
    const mesh = new THREE.InstancedMesh(geo, m, count);
    mesh.name = name; mesh.renderOrder = order; mesh.frustumCulled = false; parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  const solid = layer(cloudBlobGeometry(), 0, 'xich-diem-clouds', 4);
  const relief = layer(cloudReliefGeometry(), 2, 'xich-diem-cloud-relief', 7);
  relief.instanceMatrix = solid.instanceMatrix;
  let glow = null;
  if (!lowQuality) { glow = layer(cloudBlobGeometry(), 1, 'xich-diem-clouds-glow', 6); glow.instanceMatrix = solid.instanceMatrix; }
  // Quầng sáng mềm sau mỗi cuộn vòng trong (lớp phụ, bỏ ở chất lượng thấp).
  const inner = CLOUDS.filter((_, i) => i % 2 === 0);
  const halo = lowQuality ? null : billboardLayer(parent, 'xich-diem-cloud-halo', softGlow(), inner.length, colors.ember, THREE.AdditiveBlending);

  const dummy = new THREE.Object3D(), ring = new THREE.Vector3();
  return {
    update(time, rhythm, f) {
      const drift = time * DRIFT, k = spread(rhythm);
      CLOUDS.forEach((c, i) => {
        const a = c.a + drift, r = c.r * k, bob = 0.015 * Math.sin(time * 0.5 + i * 1.7);
        dummy.position.set(Math.sin(a) * r, c.lift + bob, Math.cos(a) * r);
        // Mặt cuộn hướng xéo ra ngoài, đỉnh ngả nhẹ ra ngoài để đài mây mở rộng.
        dummy.rotation.set(-0.12, a + TURN, 0, 'YXZ');
        dummy.scale.set(c.s * c.flip, c.s * (1 + 0.04 * rhythm.release), c.s);
        dummy.updateMatrix(); solid.setMatrixAt(i, dummy.matrix);
      });
      for (let j = 0; j < KNOTS; j++) {
        const th = j * Math.PI * 2 / KNOTS + time * RING.spin;
        ringPoint(th, time, ring);
        dummy.position.set(ring.x, ring.y - 0.06, ring.z);
        dummy.rotation.set(0, th, 0, 'YXZ');
        dummy.scale.setScalar(KNOT_SCALE);
        dummy.updateMatrix(); solid.setMatrixAt(CLOUDS.length + j, dummy.matrix);
      }
      solid.instanceMatrix.needsUpdate = true;
      for (const m of ticks) {
        m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse;
        const base = m.uniforms.mode.value === 0 ? 1 : m.uniforms.mode.value === 1 ? 0.75 : 0.9;
        m.uniforms.opacity.value = base * (m.uniforms.mode.value ? 1 + 0.15 * rhythm.gather : 1) * f;
      }
      if (halo) {
        inner.forEach((c, i) => {
          const a = c.a + drift, r = c.r * k - 0.12;
          halo.set(i, Math.sin(a) * r, 0.24, Math.cos(a) * r, 1.0 * c.s * 1.6, 0.7 * c.s, (0.32 + 0.12 * rhythm.gather) * f);
        });
        halo.commit();
      }
    },
    dispose() { halo?.dispose(); meshes.forEach(m => m.dispose()); owned.forEach(o => o.dispose()); },
  };
}
