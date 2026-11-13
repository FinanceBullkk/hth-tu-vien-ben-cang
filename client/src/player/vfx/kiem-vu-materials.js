import * as THREE from 'three';
import { swordVertex, swordFragment, emblemVertex, emblemFragment, sealVertex, sealFragment } from './kiem-vu-shaders.js';

// Bảng màu Thanh Phong Kiếm Vũ: lưỡi ngọc bích, viền ngọc sáng, lõi trắng ngọc, đồ đồng vàng kim.
export const KIEM_VU_COLORS = {
  steel: new THREE.Color('#1f7f74'), edge: new THREE.Color('#8ff2e2'),
  core: new THREE.Color('#effffb'), gold: new THREE.Color('#ffd27a'),
};
const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide };

/** Vật liệu kiếm: ink=0 lớp sáng cộng màu, ink=1 lớp mực giữ hình trên nền sáng. */
export function swordMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, sweep: { value: 0 },
      sweepOn: { value: 0 }, ink: { value: ink } },
    vertexShader: swordVertex, fragmentShader: swordFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Vật liệu hoa văn vẽ sẵn (mandala, vành phù văn, trận đồ). chase = số luồng khí chạy quanh vòng. */
export function emblemMaterial(colors, map, { ink = 0, goldMix = 0, chase = 3 } = {}) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { map: { value: map }, steel: { value: colors.steel }, edge: { value: colors.edge },
      core: { value: colors.core }, gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 },
      sweep: { value: 0 }, sweepOn: { value: 0 }, ink: { value: ink }, goldMix: { value: goldMix }, chase: { value: chase } },
    vertexShader: emblemVertex, fragmentShader: emblemFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Lớp ánh sáng thủ tục: mode 0 xung trận đồ, mode 2 quầng pháp quang. */
export function sealMaterial(colors, mode) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, time: { value: 0 },
      opacity: { value: 1 }, pulse: { value: 0 }, mode: { value: mode } },
    vertexShader: sealVertex, fragmentShader: sealFragment, blending: THREE.AdditiveBlending });
}
