import * as THREE from 'three';
import { swordVertex, swordFragment } from './kiem-vu-shaders.js';

// Bảng màu Thanh Phong Kiếm Vũ: lưỡi ngọc bích, viền ngọc sáng, lõi trắng ngọc, đồ đồng vàng kim.
export const KIEM_VU_COLORS = {
  steel: new THREE.Color('#1f7f74'), edge: new THREE.Color('#8ff2e2'),
  core: new THREE.Color('#effffb'), gold: new THREE.Color('#ffd27a'),
};

/** Vật liệu kiếm: ink=0 lớp sáng cộng màu, ink=1 lớp mực giữ hình trên nền sáng. */
export function swordMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, sweep: { value: 0 },
      sweepOn: { value: 0 }, ink: { value: ink } },
    vertexShader: swordVertex, fragmentShader: swordFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}
