import * as THREE from 'three';
import { spineFrame, newFrame, bodyRadius } from './kim-long-spine.js';
import { finGeometry, dragonLegGeometry } from './kim-long-head-geometry.js';
import { finMaterial, goldMaterial, tickAll } from './kim-long-materials.js';

// Vây lưng lửa chạy dọc sống lưng, chùm vây đuôi xoè ở chóp đuôi, và bốn chân móng vuốt bám mây.
// Tất cả là InstancedMesh đặt theo khung trục mỗi khung nên lượn cùng sóng của thân.
const DORSAL_FROM = 0.1, DORSAL_TO = 0.86;
const TAIL_FAN = [-0.9, -0.45, 0, 0.45, 0.9];
// [u, bên (+1/−1 theo sườn B)] — đôi chân trước gần cổ, đôi chân sau ở nửa đuôi.
const LEGS = [[0.78, 1], [0.78, -1], [0.26, 1], [0.26, -1]];

export function createDragonFins(parent, colors, lowQuality) {
  const ticks = [], owned = [];
  const dorsalN = lowQuality ? 16 : 30, n = dorsalN + TAIL_FAN.length;
  const fin = finGeometry(); owned.push(fin);
  const finMat = finMaterial(colors, 0); ticks.push({ m: finMat, base: 0.92 }); owned.push(finMat);
  const fins = new THREE.InstancedMesh(fin, finMat, n); fins.name = 'kim-long-fins'; fins.renderOrder = 5; parent.add(fins);
  const finMeshes = [fins];
  if (!lowQuality) {
    const g = finMaterial(colors, 1); ticks.push({ m: g, base: 0.6, breathe: 0.4 }); owned.push(g);
    const rim = new THREE.InstancedMesh(fin, g, n); rim.name = 'kim-long-fins-glow'; rim.instanceMatrix = fins.instanceMatrix;
    rim.renderOrder = 9; parent.add(rim); finMeshes.push(rim);
  }
  const leg = dragonLegGeometry(); owned.push(leg);
  const legMat = goldMaterial(colors, 0); ticks.push({ m: legMat, base: 0.97 }); owned.push(legMat);
  const legs = new THREE.InstancedMesh(leg, legMat, LEGS.length); legs.name = 'kim-long-legs'; legs.renderOrder = 6; parent.add(legs);
  finMeshes.forEach(m => { m.frustumCulled = false; }); legs.frustumCulled = false;

  const fr = newFrame(), m = new THREE.Matrix4(), tilt = new THREE.Matrix4(), side = new THREE.Vector3(), up = new THREE.Vector3();
  const place = (mesh, i, u, time, size, roll = 0, sideSign = 1, lift = 0.82) => {
    spineFrame(u, time, fr);
    side.copy(fr.b).multiplyScalar(sideSign);
    m.makeBasis(side, fr.n, fr.t);
    if (roll) m.multiply(tilt.makeRotationZ(roll));
    m.scale(new THREE.Vector3(size, size, size));
    up.copy(fr.n).multiplyScalar(bodyRadius(u) * lift);
    m.setPosition(fr.p.x + up.x, fr.p.y + up.y, fr.p.z + up.z);
    mesh.setMatrixAt(i, m);
  };

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < dorsalN; i++) {
        const u = DORSAL_FROM + (DORSAL_TO - DORSAL_FROM) * (i / (dorsalN - 1));
        // Vây cao nhất ở giữa thân, thấp dần về cổ và đuôi; phập phồng rất nhẹ theo sóng.
        const size = (0.09 + 0.07 * Math.sin(Math.PI * i / (dorsalN - 1))) * (1 + 0.06 * Math.sin(time * 0.75 + i * 0.6));
        place(fins, i, u, time, size);
      }
      TAIL_FAN.forEach((roll, k) => place(fins, dorsalN + k, 0.012, time, 0.2 - Math.abs(roll) * 0.05, roll + 0.08 * Math.sin(time * 0.6 + k), 1, 0));
      LEGS.forEach(([u, s], i) => {
        // Chân vươn xuống phía bụng và chĩa ra sườn: lật khung để −Y chân trùng hướng bụng.
        spineFrame(u, time, fr);
        side.copy(fr.b).multiplyScalar(s);
        m.makeBasis(side, fr.n, fr.t).scale(new THREE.Vector3(1.15, 1.15, 1.15));
        up.copy(fr.b).multiplyScalar(s * bodyRadius(u) * 0.7).addScaledVector(fr.n, -bodyRadius(u) * 0.3);
        m.setPosition(fr.p.x + up.x, fr.p.y + up.y, fr.p.z + up.z);
        legs.setMatrixAt(i, m);
      });
      fins.instanceMatrix.needsUpdate = true; legs.instanceMatrix.needsUpdate = true;
      tickAll(ticks, time, rhythm, f);
    },
    dispose() { finMeshes.forEach(x => x.dispose()); legs.dispose(); owned.forEach(o => o.dispose()); },
  };
}
