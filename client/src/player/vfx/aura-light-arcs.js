import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';

// Lưu quang (dùng chung các aura pháp tướng; mặc định cấu hình của Kiếm Vũ): thay các vòng tròn cứng bằng những cung lụa ánh sáng hở đầu, lượn quanh thân
// trên các mặt phẳng nghiêng khác nhau. Đầu sáng trắng ngọc, đuôi ngả vàng rồi tan; bán kính
// thở, mặt phẳng trôi chậm, cung nhấp nhô — không có hai vòng nào giống nhau hay đứng yên.
// Mỗi cung có ba sợi tơ mảnh chạy kèm lệch pha (bỏ ở chất lượng thấp). Tốc độ cố định và chậm:
// nhịp thở chỉ làm cung nở ra và sáng lên, không bao giờ làm cung bay nhanh.
export const DEFAULT_ARCS = [
  { r: 1.3, y: 1.35, tilt: 1.05, yaw: 0.3, speed: 0.3, len: 3.8, w: 0.2 },
  { r: 1.5, y: 1.0, tilt: -0.8, yaw: 2.2, speed: -0.24, len: 3.2, w: 0.17 },
  { r: 1.12, y: 1.75, tilt: 0.55, yaw: 4.0, speed: 0.36, len: 2.8, w: 0.14 },
  { r: 1.6, y: 0.4, tilt: 1.42, yaw: 1.2, speed: 0.18, len: 4.4, w: 0.22 },
  { r: 1.85, y: 1.5, tilt: 1.25, yaw: 5.1, speed: -0.15, len: 2.4, w: 0.12 },
];
const FILAMENTS = [{ dr: 0.09, dy: 0.05, lag: 0.12, w: 0.022, len: 0.85 }, { dr: -0.08, dy: -0.045, lag: 0.22, w: 0.016, len: 0.7 },
  { dr: 0.17, dy: -0.02, lag: 0.35, w: 0.011, len: 0.55 }];

/** arcs: danh sách cung { r, y, tilt, yaw, speed, len, w }; name: tên mesh để test tìm. */
export function createLightArcs(parent, colors, lowQuality, { arcs = DEFAULT_ARCS, name = 'kiem-vu-light-arcs' } = {}) {
  const seg = lowQuality ? 22 : 44, perArc = lowQuality ? 1 : 1 + FILAMENTS.length;
  const strips = createRibbonStrips(arcs.length * perArc, seg);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.gold },
      time: { value: 0 }, opacity: { value: 0.8 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(strips.geometry, material);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = 7; parent.add(mesh);

  const euler = new THREE.Euler(), p = new THREE.Vector3(), q = new THREE.Vector3();
  const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), radial = new THREE.Vector3(), side = new THREE.Vector3();
  const point = (a, i, theta, r, dy, time, out) => {
    const wobble = 0.08 * Math.sin(theta * 2 + time * 0.5 + i);
    return out.set(Math.cos(theta) * r, wobble, Math.sin(theta) * r).applyEuler(euler).setY(out.y + a.y + dy);
  };

  return {
    update(time, rhythm, f) {
      arcs.forEach((a, i) => {
        euler.set(a.tilt + 0.12 * Math.sin(time * 0.17 + i), a.yaw + time * 0.025, 0, 'YXZ');
        normal.set(0, 1, 0).applyEuler(euler);
        const dir = Math.sign(a.speed), r0 = a.r * (1 + 0.04 * Math.sin(time * 0.4 + i) - 0.05 * rhythm.gather + 0.07 * rhythm.release);
        const head = time * a.speed + a.yaw * 3;
        for (let s = 0; s < perArc; s++) {
          const fil = s ? FILAMENTS[s - 1] : null, k = i * perArc + s;
          const len = a.len * (fil ? fil.len : 1), r = r0 + (fil ? fil.dr : 0), dy = fil ? fil.dy : 0;
          const start = head - dir * (fil ? fil.lag : 0);
          for (let j = 0; j <= seg; j++) {
            const u = j / seg, theta = start - dir * u * len;
            point(a, i, theta, r, dy, time, p); point(a, i, theta + dir * 0.01, r, dy, time, q);
            tangent.subVectors(q, p).normalize();
            radial.crossVectors(tangent, normal).normalize();
            const twist = 0.6 * Math.sin(u * 3 + time * 0.4 + i);
            side.copy(normal).multiplyScalar(Math.cos(twist)).addScaledVector(radial, Math.sin(twist));
            const w = (fil ? fil.w : a.w * 0.8) * Math.pow(1 - u, 0.8) * Math.min(1, u * 14 + 0.25);
            strips.write(k, j, p, side, w);
          }
        }
      });
      strips.commit();
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = (0.68 + 0.22 * rhythm.release) * f;
    },
    dispose() { strips.geometry.dispose(); material.dispose(); },
  };
}
