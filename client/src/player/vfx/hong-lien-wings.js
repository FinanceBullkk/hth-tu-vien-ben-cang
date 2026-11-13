import * as THREE from 'three';
import { featherGeometry, featherMaterial, featherSet } from './hong-lien-materials.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { plumeFragment } from './hong-lien-shaders.js';

// Đôi cánh chu tước và phượng vĩ của Hồng Liên — factory trả { update(time, rhythm, f), dispose }.
// Cánh mọc từ sau vai, ba tầng lông: lông bay dài chĩa lên-ra ở đầu cánh, lông giữa chĩa ra-xuống
// dọc cánh tay, lông phủ ngắn nằm trên. Cả cánh ngả về sau (yaw) để chừa trống quanh đầu.
// Nhịp thở chỉ làm cánh xoè/khép vài độ — không vỗ, không tăng tốc.
// Mỗi lông: [vị trí dọc cánh tay s, góc so với phương đứng (rad), dài, lệch z].
const PRIMARIES = Array.from({ length: 7 }, (_, i) => [0.6 + i * 0.07, 0.12 + i * 0.2, 1.45 - i * 0.07, 0]);
const SECONDARIES = Array.from({ length: 7 }, (_, i) => [0.06 + i * 0.085, 2.1 - i * 0.12, 1.0 - i * 0.02, -0.02]);
const COVERTS = Array.from({ length: 6 }, (_, i) => [0.1 + i * 0.12, 1.55 - i * 0.17, 0.44, 0.035]);
const ARM = 0.9;

/** Phượng vĩ: 5 lông đuôi dài rủ sau lưng, uốn chữ S, mắt lông ở ngọn. */
function createPlumes(parent, colors, lowQuality) {
  const n = lowQuality ? 3 : 5, seg = lowQuality ? 16 : 28;
  const strips = createRibbonStrips(n, seg);
  const make = ink => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
    vertexShader: ribbonVertex, fragmentShader: plumeFragment, blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
  const mats = lowQuality ? [make(0)] : [make(0), make(1)];
  mats.forEach((m, i) => {
    const mesh = new THREE.Mesh(strips.geometry, m); mesh.name = i ? 'hong-lien-plumes-ink' : 'hong-lien-plumes';
    mesh.frustumCulled = false; mesh.renderOrder = 6 - i; parent.add(mesh);
  });
  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const path = (k, u, time, lift, out) => {
    const sk = n === 1 ? 0 : (k / (n - 1)) * 2 - 1, mid = 1 - Math.abs(sk);
    return out.set(sk * (0.15 * u + 0.8 * u * u) + 0.06 * Math.sin(u * 5 - time * 0.5 + k) * u,
      0.95 + (0.3 + lift) * Math.sin(u * Math.PI) - 0.78 * u * u,
      -0.36 - (0.6 + 0.25 * mid) * u + 0.08 * Math.sin(u * 4 - time * 0.45 + k * 1.3) * u);
  };
  return {
    update(time, rhythm, f) {
      const lift = 0.08 * rhythm.release - 0.03 * rhythm.gather;
      for (let k = 0; k < n; k++) for (let j = 0; j <= seg; j++) {
        const u = j / seg;
        path(k, u, time, lift, p); path(k, u + 0.01, time, lift, q);
        tangent.subVectors(q, p).normalize();
        side.crossVectors(tangent, up).normalize();
        strips.write(k, j, p, side, 0.028 + 0.09 * Math.exp(-(((u - 0.84) / 0.11) ** 2)));
      }
      strips.commit();
      mats.forEach(m => { m.uniforms.time.value = time; m.uniforms.opacity.value = (m.uniforms.ink.value ? 0.5 : 0.75) * f; });
    },
    dispose() { strips.geometry.dispose(); mats.forEach(m => m.dispose()); },
  };
}

export function createWings(parent, colors, lowQuality) {
  const feathers = lowQuality ? [...PRIMARIES.filter((_, i) => i % 2 === 0), ...SECONDARIES.filter((_, i) => i % 2 === 0)]
    : [...PRIMARIES, ...SECONDARIES, ...COVERTS];
  const glowMat = featherMaterial(colors, 0, 0), inkMat = featherMaterial(colors, 1, 0);
  const set = featherSet(parent, featherGeometry(), feathers.length * 2, glowMat, inkMat, lowQuality, 'hong-lien-wings');
  const plumes = createPlumes(parent, colors, lowQuality);
  const dummy = new THREE.Object3D(), wing = new THREE.Matrix4(), m = new THREE.Matrix4();
  const euler = new THREE.Euler(), quat = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const root = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const spread = 1 + 0.07 * rhythm.release - 0.04 * rhythm.gather;
      const armA = 0.95 + 0.04 * Math.sin(time * 0.45) + 0.06 * rhythm.release - 0.03 * rhythm.gather;
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        // Khung cánh: gốc sau vai, ngả về sau theo trục đứng.
        euler.set(0, side * 0.42, 0); quat.setFromEuler(euler);
        wing.compose(root.set(side * 0.2, 1.3, -0.32), quat, one);
        feathers.forEach(([s, ang, len, dz], i) => {
          const sway = 0.025 * Math.sin(time * 0.6 + i * 1.3 + k);
          const a = ang * spread + sway, d = s * ARM;
          dummy.position.set(side * Math.sin(armA) * d, Math.cos(armA) * d, dz - 0.02 * s);
          dummy.rotation.set(0.12 * Math.sin(time * 0.3 + i), 0, -side * a);
          dummy.scale.set(side * len, len, len); dummy.updateMatrix();
          m.multiplyMatrices(wing, dummy.matrix);
          set.glow.setMatrixAt(k * feathers.length + i, m);
        });
      }
      set.glow.instanceMatrix.needsUpdate = true;
      for (const mat of [glowMat, inkMat]) { mat.uniforms.time.value = time; mat.uniforms.pulse.value = rhythm.pulse; }
      glowMat.uniforms.opacity.value = (0.85 + 0.15 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.6 * f;
      plumes.update(time, rhythm, f);
    },
    dispose() { set.dispose(); glowMat.dispose(); inkMat.dispose(); plumes.dispose(); },
  };
}
