import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { hash } from './aura-billboard-layer.js';
import { sstep } from './aura-rhythm.js';
import { CROWN, FAN, ORBIT_SPEED } from './than-bai-cards.js';

// Kim lôi của Thần bài: lúc "tất tay" vài tia sét vàng giật từ ấn triện 賭神 trên đỉnh quạt xuống vương miện bài.
// Mỗi tia là đường gấp khúc ngẫu nhiên đổi hình 8 lần mỗi giây (tất định theo thời gian, không cần trạng thái),
// dựng bằng hai dải bắt chéo để nhìn từ góc nào cũng thấy; lõi trắng, viền vàng, đuôi ngả đỏ son.
const BOLT_SEG = 12, FLICKER_HZ = 8;

/** Độ mạnh của sét theo nhịp: chỉ trong khoảng ấn triện vừa đóng xuống tới khi trận bài xoè bung. */
export const thunder = rhythm => sstep(0.45, 0.48, rhythm.phase) * (1 - sstep(0.6, 0.68, rhythm.phase));

export function createThanBaiLightning(parent, colors, lowQuality) {
  const bolts = lowQuality ? 2 : 4;
  const strips = createRibbonStrips(bolts * 2, BOLT_SEG);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.arcTail }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(strips.geometry, material); mesh.name = 'than-bai-lightning'; mesh.frustumCulled = false; mesh.renderOrder = 9;
  parent.add(mesh);
  const from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3(), p = new THREE.Vector3();
  const sideA = new THREE.Vector3(), sideB = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);

  return {
    update(time, rhythm, f) {
      const k = thunder(rhythm), tick = Math.floor(time * FLICKER_HZ);
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = k * f * 1.2;
      if (k < 0.001) {
        for (let b = 0; b < bolts * 2; b++) strips.collapse(b);
        strips.commit();
        return;
      }
      from.set(0, FAN.y + FAN.radius + 0.62, FAN.z + 0.05);
      for (let b = 0; b < bolts; b++) {
        const seed = tick * 7.13 + b * 31.7;
        const phi = (b + hash(seed)) / bolts * Math.PI * 2 + time * ORBIT_SPEED;
        to.set(Math.sin(phi) * CROWN.radius, CROWN.y, Math.cos(phi) * CROWN.radius);
        dir.subVectors(to, from).normalize();
        sideA.crossVectors(dir, X).normalize(); sideB.crossVectors(dir, Z).normalize();
        const live = hash(seed + 3) > 0.25 ? 1 : 0; // vài tia tắt ngẫu nhiên cho ra nhịp giật
        for (let j = 0; j <= BOLT_SEG; j++) {
          const t = j / BOLT_SEG, jag = j === 0 || j === BOLT_SEG ? 0 : 0.16 * Math.sin(Math.PI * t);
          p.lerpVectors(from, to, t)
            .addScaledVector(sideA, (hash(seed + j * 1.7) - 0.5) * jag * 2)
            .addScaledVector(sideB, (hash(seed + j * 2.9 + 5) - 0.5) * jag * 2);
          const w = 0.022 * (1 - 0.6 * t) * live;
          strips.write(b * 2, j, p, sideA, w);
          strips.write(b * 2 + 1, j, p, sideB, w);
        }
      }
      strips.commit();
    },
    dispose() { strips.geometry.dispose(); material.dispose(); },
  };
}
