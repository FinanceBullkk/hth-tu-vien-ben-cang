import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { hongLienFlameTongue } from './hong-lien-billboard-textures.js';
import { dragonMaterial, tickMaterials } from './long-quyen-materials.js';
import { dragonHeadGeometry, MOUTH } from './long-quyen-head-geometry.js';
import { spineFrame } from './long-quyen-spine.js';

// Đầu hỏa long đặt ở gáy (s = 1), mõm theo tiếp tuyến sống lưng = hướng tung quyền. Lớp: sọ mực +
// sọ lửa, sừng và râu vàng kim, mắt trắng ngà, bờm lửa xoè sau gáy (billboard). Đầu chỉ nhấp nhô
// rất nhẹ theo nhịp, không quay. Bờm lửa luân phiên mọc ở gáy rồi trôi ra sau, tốc độ cố định.
export const HEAD_SCALE = 1.75;
const MANE_LIFE = 3.2;

export function createDragonHead(parent, colors, lowQuality) {
  const geo = dragonHeadGeometry(), mats = [];
  const head = new THREE.Group(); head.name = 'long-quyen-head'; parent.add(head);
  const mesh = (g, m, name, order, base, breathe = 0) => {
    const o = new THREE.Mesh(g, m); o.name = name; o.renderOrder = order; head.add(o);
    mats.push({ m, base, breathe });
    return o;
  };
  if (!lowQuality) mesh(geo.skull, dragonMaterial(colors, { ink: 1, scales: 0 }), 'long-quyen-head-ink', 5, 0.85);
  mesh(geo.skull, dragonMaterial(colors, { scales: 0 }), 'long-quyen-head-glow', 7, 0.95, 0.15);
  mesh(geo.horns, dragonMaterial(colors, { scales: 0, edge: colors.core, core: colors.hot }), 'long-quyen-horns', 7, 0.9);
  const eyeMat = new THREE.MeshBasicMaterial({ color: colors.hot, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 1 });
  const eyes = new THREE.Mesh(geo.eyes, eyeMat); eyes.name = 'long-quyen-eyes'; eyes.renderOrder = 8; head.add(eyes);

  const frame = spineFrame(1), rest = frame.p.clone(), m4 = new THREE.Matrix4();
  m4.lookAt(frame.t, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  head.quaternion.setFromRotationMatrix(m4); head.scale.setScalar(HEAD_SCALE); head.position.copy(rest);

  const maneN = lowQuality ? 7 : 14;
  const mane = billboardLayer(parent, 'long-quyen-mane', hongLienFlameTongue(), maneN, colors.edge.clone().lerp(colors.core, 0.3),
    THREE.AdditiveBlending);
  const v = new THREE.Vector3(), mouth = new THREE.Vector3();

  return {
    head,
    /** Miệng rồng trong toạ độ aura (sau update). */
    mouth: () => mouth.copy(MOUTH).applyMatrix4(head.matrix),
    update(time, rhythm, f) {
      head.position.set(rest.x, rest.y + 0.012 * Math.sin(time * 0.57), rest.z);
      head.updateMatrix();
      tickMaterials(mats, time, rhythm, f);
      eyeMat.opacity = (0.75 + 0.2 * rhythm.strike) * f;
      // Bờm: mọc ở gáy và sau sọ, xoè lên–ra sau và lệch ra phía ngoài (xa mặt người) rồi tan.
      for (let i = 0; i < maneN; i++) {
        const u = ((time / MANE_LIFE + hash(i + 31)) % 1 + 1) % 1, side = hash(i + 5) - 0.3;
        v.set(side * 0.14 + 0.05 * u, 0.08 + 0.12 * u, -0.02 - 0.2 * u).applyMatrix4(head.matrix);
        const h = 0.15 + 0.07 * hash(i + 9);
        mane.set(i, v.x, v.y, v.z, h * 0.6, h, Math.sin(u * Math.PI) ** 2 * 0.85, -side * 0.06);
      }
      mane.commit(); mane.material.uniforms.opacity.value = f;
    },
    dispose() { mats.forEach(({ m }) => m.dispose()); eyeMat.dispose(); mane.dispose(); },
  };
}
