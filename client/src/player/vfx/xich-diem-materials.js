import * as THREE from 'three';
import { ribbonVertex } from './aura-flow-shaders.js';
import { cloudVertex, cloudFragment, fireStripFragment, seaVertex, seaFragment } from './xich-diem-shaders.js';

// Bảng màu Xích Diễm: đỏ son chủ đạo (mây ráng chiều), vàng kim viền và gờ, cam lửa ở lõi; lớp mực
// đỏ thẫm. Khác Hồng Liên (hồng phượng) và Long Quyền (cam lửa rồng) ở sắc son đậm và khối mây đặc.
export const XICH_DIEM_COLORS = {
  deep: new THREE.Color('#3a0807'), body: new THREE.Color('#c8261a'), ember: new THREE.Color('#ff6a1f'),
  gold: new THREE.Color('#ffc04a'), core: new THREE.Color('#fff1c4'),
};

const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide };
const palette = colors => Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, { value: v }]));

/** Cuộn tường vân: mode 0 thân đặc (normal blend, ghi depth để các cuộn trong một lần vẽ che nhau
    đúng thứ tự), 1 quầng viền, 2 gờ xoắn ốc (cộng màu). */
export function cloudMaterial(colors, mode) {
  return new THREE.ShaderMaterial({ ...common, depthWrite: mode === 0,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, mode: { value: mode }, pulse: { value: 0 } },
    vertexShader: cloudVertex, fragmentShader: cloudFragment,
    blending: mode === 0 ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Dải lửa (lưỡi lửa, vành eo, lưu vân, mào lửa). ink 1 = bản mực normal blend. */
export function fireStripMaterial(colors, mode, ink = 0) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, mode: { value: mode }, ink: { value: ink } },
    vertexShader: ribbonVertex, fragmentShader: fireStripFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Biển mây dưới chân. drift = vòng/giây (khớp đài mây), arms = số lần lặp hoa văn quanh vòng. */
export function seaMaterial(colors, map, { drift, arms = 6, lobes = 9, inner = 0.12, ink = 0 }) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), map: { value: map }, time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 },
      drift: { value: drift }, arms: { value: arms }, lobes: { value: lobes }, inner: { value: inner }, ink: { value: ink } },
    vertexShader: seaVertex, fragmentShader: seaFragment, blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Cập nhật thời gian + opacity cho danh sách { m, base, breathe } theo nhịp. */
export function tickAll(list, time, rhythm, f) {
  for (const { m, base, breathe = 0 } of list) {
    m.uniforms.time.value = time;
    if (m.uniforms.pulse) m.uniforms.pulse.value = rhythm.pulse;
    m.uniforms.opacity.value = base * (1 + breathe * (rhythm.gather - 0.4 * rhythm.release)) * f;
  }
}
