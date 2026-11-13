import * as THREE from 'three';
import { ribbonVertex } from './aura-flow-shaders.js';
import {
  litVertex, bodyFragment, goldFragment, finFragment, strandFragment, mistFragment, pearlFragment,
} from './kim-long-shaders.js';
import { planeVertex, moonFragment, cloudSeaFragment } from './kim-long-backdrop-shaders.js';
import { WAVE } from './kim-long-spine.js';

// Bảng màu Kim Long: vàng kim đậm (deep) → vàng (gold) → vàng sáng (light), ngà bụng/sừng (ivory),
// mực nâu viền vảy (ink) để đọc được trên nền sáng, cam đỏ ngọn vây (flame), ngà trăng (moon).
export const KIM_LONG_COLORS = {
  deep: new THREE.Color('#7a3f06'), gold: new THREE.Color('#e9a92c'), light: new THREE.Color('#fff0b0'),
  ivory: new THREE.Color('#fbeccb'), ink: new THREE.Color('#3f1d04'), flame: new THREE.Color('#d9561b'),
  moon: new THREE.Color('#fff4d6'), moonShade: new THREE.Color('#d9c08a'),
};

const common = { transparent: true, depthWrite: false };
const pal = c => ({ deep: { value: c.deep }, gold: { value: c.gold }, light: { value: c.light },
  ivory: { value: c.ivory }, ink: { value: c.ink }, flame: { value: c.flame } });
const blend = glow => (glow ? THREE.AdditiveBlending : THREE.NormalBlending);
const base = (c, glow) => ({ ...pal(c), time: { value: 0 }, opacity: { value: 1 }, glow: { value: glow }, pulse: { value: 0 } });

/** Thân vảy rồng. rows = số hàng vảy dọc thân. */
export function bodyMaterial(c, glow, rows) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.FrontSide, blending: blend(glow),
    uniforms: { ...base(c, glow), rows: { value: rows }, waveK: { value: WAVE.K }, omega: { value: WAVE.OMEGA } },
    vertexShader: litVertex, fragmentShader: bodyFragment });
}

/** Khối vàng chạm có thuộc tính tone (đầu, sừng, chân, móng). */
export function goldMaterial(c, glow) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: blend(glow),
    uniforms: base(c, glow), vertexShader: litVertex, fragmentShader: goldFragment });
}

export function finMaterial(c, glow) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: blend(glow),
    uniforms: base(c, glow), vertexShader: litVertex, fragmentShader: finFragment });
}

export function strandMaterial(c, glow) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: blend(glow),
    uniforms: base(c, glow), vertexShader: ribbonVertex, fragmentShader: strandFragment });
}

export function mistMaterial(c) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: base(c, 1), vertexShader: ribbonVertex, fragmentShader: mistFragment });
}

export function pearlMaterial(c) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.FrontSide,
    uniforms: base(c, 0), vertexShader: litVertex, fragmentShader: pearlFragment });
}

export function moonMaterial(c, glow) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: blend(glow),
    uniforms: { ivory: { value: c.moon }, shade: { value: c.moonShade }, gold: { value: c.gold },
      time: { value: 0 }, opacity: { value: 1 }, glow: { value: glow } },
    vertexShader: planeVertex, fragmentShader: moonFragment });
}

export function cloudSeaMaterial(map, tint, glow) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, blending: blend(glow),
    uniforms: { map: { value: map }, tint: { value: tint }, time: { value: 0 }, opacity: { value: 1 }, glow: { value: glow } },
    vertexShader: planeVertex, fragmentShader: cloudSeaFragment });
}

/** Cập nhật time/pulse/opacity cho danh sách { m, base, breathe } theo nhịp; f = hệ số mờ dần. */
export function tickAll(list, time, rhythm, f) {
  for (const { m, base: b, breathe = 0 } of list) {
    m.uniforms.time.value = time;
    if (m.uniforms.pulse) m.uniforms.pulse.value = rhythm.pulse;
    m.uniforms.opacity.value = b * (1 + breathe * (rhythm.pulse - 0.5)) * f;
  }
}
