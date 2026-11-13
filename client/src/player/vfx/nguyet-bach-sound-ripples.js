import * as THREE from 'three';
import { localVertex, rippleFragment, RIPPLE_COUNT } from './nguyet-bach-shaders.js';
import { humAt, waveAge } from './nguyet-bach-rhythm.js';
import { GUQIN } from './nguyet-bach-guqin.js';

// Sóng âm — động từ "rung": từ bảy dây cổ cầm, gợn hình viên thuốc (đồng khoảng cách tới dây) nở
// ra ĐỀU rồi tan; mỗi gợn đậm theo độ ngân của dây lúc nó phát ra, nên sau tiếng gảy là một
// chuỗi gợn rõ dần rồi nhạt dần. Tốc độ nở không đổi. Chừa trống mặt nhân vật.
export const RIPPLE_LIFE = 5.5, RIPPLE_REACH = 1.15;
export const HEAD = { x: 0, y: 1.07 };

export function createSoundRipples(parent, colors) {
  const cx = GUQIN.x + 0.05, cy = GUQIN.y + GUQIN.len * 0.47, size = 2 * (RIPPLE_REACH + 1.2);
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, vertexShader: localVertex, fragmentShader: rippleFragment,
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, head: { value: new THREE.Vector2(HEAD.x - cx, HEAD.y - cy) },
      opacity: { value: 1 }, halfLen: { value: GUQIN.len * 0.42 }, time: { value: 0 }, reach: { value: RIPPLE_REACH },
      age: { value: new Array(RIPPLE_COUNT).fill(0) }, strength: { value: new Array(RIPPLE_COUNT).fill(0) } } });
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'nguyet-bach-sound-ripples'; mesh.renderOrder = 8;
  mesh.position.set(cx, cy, GUQIN.z + 0.06); parent.add(mesh);
  const { age, strength } = material.uniforms;
  return {
    mesh,
    update(time, rhythm, f) {
      for (let k = 0; k < RIPPLE_COUNT; k++) {
        const a = waveAge(time, k, RIPPLE_COUNT, RIPPLE_LIFE);
        age.value[k] = a; strength.value[k] = humAt(time - a * RIPPLE_LIFE);
      }
      material.uniforms.time.value = time; material.uniforms.opacity.value = 0.85 * f;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
