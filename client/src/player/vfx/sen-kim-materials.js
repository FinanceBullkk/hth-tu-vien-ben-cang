import * as THREE from 'three';
import { petalVertex, petalFragment, dishFragment, stamenFragment } from './sen-kim-shaders.js';

// Bảng màu Sen kim: vàng sen chủ đạo (kim liên), lòng cánh kem ngà, viền/gân vàng kim,
// lõi trắng vàng; lớp bóng nâu vàng thẫm. Khác Bích Ngọc (ngọc bích xanh) và Đào Hoa (hồng)
// bằng tông vàng ấm thuần và lớp kem ở lòng cánh.
export const SEN_KIM_COLORS = {
  deep: new THREE.Color('#3a2405'), body: new THREE.Color('#d3981a'), ivory: new THREE.Color('#ffe9b8'),
  gold: new THREE.Color('#ffc84d'), core: new THREE.Color('#fff6d8'),
};

const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide };
const palette = colors => Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, { value: v }]));

/** Cánh sen: mode 0 thân đặc (normal blend, ghi depth để các cánh che nhau đúng thứ tự),
    1 viền phát quang chọn lọc, 2 gân nổi (cộng màu). */
export function petalMaterial(colors, mode) {
  return new THREE.ShaderMaterial({ ...common, depthWrite: mode === 0,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, mode: { value: mode }, pulse: { value: 0 } },
    vertexShader: petalVertex, fragmentShader: petalFragment,
    blending: mode === 0 ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Đế đài sen vàng ấm: vành sáng hơn, vệt ánh quét chậm quanh âu. */
export function dishMaterial(colors) {
  return new THREE.ShaderMaterial({ ...common, depthWrite: true,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: dishFragment, blending: THREE.NormalBlending });
}

/** Sợi chỉ bồ nhụy: gốc đậm, ngọn tan, sáng theo nhịp. */
export function stamenMaterial(colors) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: stamenFragment, blending: THREE.AdditiveBlending });
}

/** Cập nhật thời gian + opacity cho danh sách { m, base, breathe } theo nhịp. */
export function tickAll(list, time, rhythm, f) {
  for (const { m, base, breathe = 0 } of list) {
    m.uniforms.time.value = time;
    if (m.uniforms.pulse) m.uniforms.pulse.value = rhythm.pulse;
    m.uniforms.opacity.value = base * (1 + breathe * (rhythm.gather - 0.4 * rhythm.release)) * f;
  }
}
