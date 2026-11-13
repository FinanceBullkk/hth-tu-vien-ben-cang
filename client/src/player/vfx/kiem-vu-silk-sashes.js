import * as THREE from 'three';
import { createRibbonStrips } from './kiem-vu-ribbon-strips.js';
import { ribbonVertex, silkFragment } from './kiem-vu-flow-shaders.js';

// Phiêu đái: hai dải lụa tiên mọc từ sau vai, vươn ra hai bên, uốn chữ S rồi rủ về sau,
// sóng gió chạy dọc từ gốc ra ngọn (biên độ tăng dần theo chiều dài) và lụa xoắn nhẹ.
const SEG = 40;

export function createSilkSashes(parent, colors, lowQuality) {
  const seg = lowQuality ? 24 : SEG;
  const strips = createRibbonStrips(2, seg);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.gold },
      time: { value: 0 }, opacity: { value: 0.9 } },
    vertexShader: ribbonVertex, fragmentShader: silkFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(strips.geometry, material);
  mesh.name = 'kiem-vu-silk'; mesh.frustumCulled = false; mesh.renderOrder = 6; parent.add(mesh);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  const back = new THREE.Vector3();

  // Đường giữa dải lụa theo u (0 gốc sau vai → 1 ngọn), side = -1 trái, +1 phải.
  const path = (sideSign, u, time, lift, out) => {
    const wave = Math.sin(u * 5.5 - time * 1.0 + sideSign) * u, sway = Math.sin(u * 3.2 - time * 0.65) * u;
    // Vươn ra ngoài viền kiếm luân (x tới ~1.9) và hơi về trước để nổi trên nền trời.
    return out.set(
      sideSign * (0.26 + u * 1.65 + 0.1 * sway),
      1.3 + (0.75 + lift) * Math.sin(u * Math.PI * 0.8) - 1.05 * u * u + 0.16 * wave,
      -0.12 - 0.2 * u + 0.18 * Math.sin(u * 4.5 - time * 0.8 + sideSign * 2) * u);
  };

  return {
    update(time, rhythm, f) {
      const lift = 0.15 * rhythm.release - 0.05 * rhythm.gather;
      for (let k = 0; k < 2; k++) {
        const s = k ? 1 : -1;
        for (let j = 0; j <= seg; j++) {
          const u = j / seg;
          path(s, u, time, lift, p); path(s, u + 0.01, time, lift, q);
          tangent.subVectors(q, p).normalize();
          // Bề ngang lụa xoay quanh trục dải: gốc dựng đứng ôm vai, ngọn lật theo gió.
          const twist = 0.25 + 0.9 * u * Math.sin(u * 4 - time * 0.7 + k * 1.3);
          back.set(0, Math.cos(twist), Math.sin(twist));
          side.copy(back).addScaledVector(tangent, -back.dot(tangent)).normalize();
          const w = 0.17 * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (1 - 0.3 * u);
          strips.write(k, j, p, side, w);
        }
      }
      strips.commit();
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = (1.0 + 0.15 * rhythm.release) * f;
    },
    dispose() { strips.geometry.dispose(); material.dispose(); },
  };
}
