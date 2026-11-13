import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { sstep } from './aura-rhythm.js';

// Lưu tinh của Tinh Hà: sao băng lướt chéo hai bên và sau lưng (không bao giờ cắt ngang mặt),
// đầu sao trắng bạc, đuôi dài ngả vàng nhạt rồi tan. Tốc độ CỐ ĐỊNH và chậm (lả lướt như đèn trời
// trôi), không phụ thuộc nhịp thở; mỗi sao hiện dần ở đầu hành trình và tan dần ở cuối.
// Đuôi gồm hai dải bắt chéo nhau để nhìn từ góc nào cũng thấy bề ngang.
export const METEOR_SPEED = 0.3; // đơn vị/giây
const PATHS = [
  { from: [-2.0, 3.2, -0.9], to: [-0.8, 0.5, -1.5], offset: 0 },
  { from: [1.1, 3.4, -1.3], to: [2.1, 0.8, -0.3], offset: 0.27 },
  { from: [-2.3, 2.5, 0.4], to: [-1.25, 0.2, 0.7], offset: 0.55 },
  { from: [0.3, 3.5, -1.7], to: [1.55, 1.3, -1.2], offset: 0.8 },
];
const TAIL = 1.0, SEG = 16;

export function createMeteors(parent, colors, lowQuality) {
  const paths = PATHS.slice(0, lowQuality ? 2 : PATHS.length).map(m => {
    const from = new THREE.Vector3(...m.from), to = new THREE.Vector3(...m.to);
    const dir = to.clone().sub(from), length = dir.length(); dir.normalize();
    const flat = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1)).normalize();
    const cross = new THREE.Vector3().crossVectors(dir, flat).normalize();
    return { from, dir, length, offset: m.offset, sides: [flat, cross] };
  });
  const strips = createRibbonStrips(paths.length * 2, SEG);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.gold },
      time: { value: 0 }, opacity: { value: 0.8 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(strips.geometry, material);
  mesh.name = 'tinh-ha-meteors'; mesh.frustumCulled = false; mesh.renderOrder = 7; parent.add(mesh);
  const heads = billboardLayer(parent, 'tinh-ha-meteor-heads', kiemVuStar(), paths.length, colors.core, THREE.AdditiveBlending);
  const head = new THREE.Vector3(), p = new THREE.Vector3();
  const progress = (m, time) => ((time * METEOR_SPEED / m.length + m.offset) % 1 + 1) % 1;
  /** Vị trí đầu sao băng thứ i tại thời điểm time (để test kiểm tốc độ). */
  const headAt = (i, time, out = new THREE.Vector3()) => out.copy(paths[i].from).addScaledVector(paths[i].dir, progress(paths[i], time) * paths[i].length);

  return {
    headAt,
    update(time, rhythm, f) {
      paths.forEach((m, i) => {
        const u = progress(m, time);
        const life = sstep(0, 0.18, u) * (1 - sstep(0.75, 1, u));
        headAt(i, time, head);
        m.sides.forEach((side, s) => {
          for (let j = 0; j <= SEG; j++) {
            const v = j / SEG;
            p.copy(head).addScaledVector(m.dir, -v * TAIL * (0.4 + 0.6 * life));
            strips.write(i * 2 + s, j, p, side, 0.055 * life * (1 - 0.5 * v));
          }
        });
        const tw = 0.85 + 0.15 * Math.sin(time * 2 + i * 2.3);
        heads.set(i, head.x, head.y, head.z, 0.22 * tw, 0.22 * tw, life, 0.1 * i);
      });
      strips.commit(); heads.commit();
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = (0.75 + 0.15 * rhythm.release) * f;
      heads.material.uniforms.opacity.value = 0.9 * f;
    },
    dispose() { strips.geometry.dispose(); material.dispose(); heads.dispose(); },
  };
}
