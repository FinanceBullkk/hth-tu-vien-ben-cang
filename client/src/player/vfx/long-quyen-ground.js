import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { crackMaterial, rockMaterial, tickMaterials } from './long-quyen-materials.js';
import { crackRim, crackCore } from './long-quyen-textures.js';

// Nền đất Long Quyền: VẾT NỨT CHẤN ĐỊA toả từ chân. Không vòng chữ, không bát quái, không trận tròn.
//  Hố cháy sẫm dưới chân (mực) · quầng lửa ấm · mép khe nứt đá đen (mực) · dung nham trong khe, ánh
//  lửa trôi từ tâm ra ngoài · đá vỡ bazan nhô nghiêng quanh tâm, chân đá hắt lửa · tàn lửa bốc lên từ khe.
// Hít vào thì lửa dồn về tâm (gather); tốc độ trôi cố định.
export const CRACK_SIZE = 3.4, CRACK_EMBER_LIFE = 4.2;
const ROCKS = 8;

export function createCrackGround(parent, colors, lowQuality) {
  const owned = [], mats = [];
  const flat = (size, material, name, order, base, y, breathe = 0) => {
    const geo = new THREE.PlaneGeometry(size, size); owned.push(geo, material);
    const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.renderOrder = order;
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; parent.add(mesh);
    if (material.uniforms) mats.push({ m: material, base, breathe });
    return mesh;
  };
  const dot = (color, blending, opacity) => new THREE.MeshBasicMaterial({ map: softDot(), color, transparent: true,
    depthWrite: false, blending, opacity });
  const scorch = flat(2.0, dot(colors.deep, THREE.NormalBlending, 0.6), 'long-quyen-ground-scorch', 1, 0, 0.011);
  const warm = flat(1.5, dot(colors.edge, THREE.AdditiveBlending, 0.3), 'long-quyen-ground-glow', 2, 0, 0.013);
  if (!lowQuality) flat(CRACK_SIZE, crackMaterial(colors, crackRim(), 1), 'long-quyen-cracks-ink', 3, 0.85, 0.015);
  flat(CRACK_SIZE, crackMaterial(colors, crackCore(), 0), 'long-quyen-cracks', 4, 0.95, 0.018, 0.2);

  // Đá vỡ: tám khối nhô nghiêng, lún nửa trong đất, nằm lệch giữa các khe (bỏ ở chất lượng thấp).
  let rocks = null;
  const rockSeeds = [];
  if (!lowQuality) {
    const geo = new THREE.IcosahedronGeometry(1, 0), mat = rockMaterial(colors); owned.push(geo, mat);
    rocks = new THREE.InstancedMesh(geo, mat, ROCKS); rocks.name = 'long-quyen-rubble'; rocks.renderOrder = 5; parent.add(rocks);
    mats.push({ m: mat, base: 1 });
    for (let i = 0; i < ROCKS; i++) {
      const a = (i + 0.5) / ROCKS * Math.PI * 2 + (hash(i + 1) - 0.5) * 0.5, r = 0.62 + 0.45 * hash(i + 2);
      rockSeeds.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, s: 0.05 + 0.05 * hash(i + 3),
        rot: new THREE.Euler(hash(i + 4) * 1.2, a, hash(i + 5) * 0.9), stretch: 1.2 + 0.8 * hash(i + 6) });
    }
  }
  const emberN = lowQuality ? 0 : 18;
  const embers = emberN ? billboardLayer(parent, 'long-quyen-crack-embers', softDot(), emberN, colors.core, THREE.AdditiveBlending) : null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      tickMaterials(mats, time, rhythm, f);
      scorch.material.opacity = 0.6 * f;
      warm.material.opacity = (0.26 + 0.14 * rhythm.gather) * f;
      warm.scale.setScalar(1 - 0.08 * rhythm.gather);
      if (rocks) {
        rockSeeds.forEach((k, i) => {
          v.set(k.x, k.s * 0.35 + 0.012 * Math.sin(time * 0.5 + i * 1.7), k.z);
          rocks.setMatrixAt(i, m4.compose(v, q.setFromEuler(k.rot), sc.set(k.s, k.s * k.stretch, k.s)));
        });
        rocks.instanceMatrix.needsUpdate = true;
      }
      if (!embers) return;
      // Tàn lửa: bốc lên chậm từ các điểm dọc chín khe nứt chính.
      for (let i = 0; i < emberN; i++) {
        const u = ((time / CRACK_EMBER_LIFE + hash(i + 70)) % 1 + 1) % 1;
        const a = Math.floor(hash(i + 71) * 9) / 9 * Math.PI * 2 + 0.1, r = 0.3 + 0.9 * hash(i + 72);
        const size = 0.03 + 0.02 * hash(i + 73);
        // Góc canvas a (0 = lên trên ảnh) nằm trên đất ở (sin a, −cos a) sau khi xoay mặt phẳng.
        embers.set(i, Math.sin(a) * r, 0.03 + 0.45 * u, -Math.cos(a) * r, size, size, Math.sin(u * Math.PI) ** 2 * 0.8);
      }
      embers.commit(); embers.material.uniforms.opacity.value = f;
    },
    dispose() { owned.forEach(o => o.dispose()); embers?.dispose(); rocks?.dispose(); },
  };
}
