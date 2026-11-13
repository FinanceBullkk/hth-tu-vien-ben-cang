import * as THREE from 'three';
import { breathRhythm, bell, sstep } from './aura-rhythm.js';
import {
  dragonVertex, dragonFragment, finVertex, finFragment, flatVertex, crackFragment,
  instancedFlatVertex, instancedFlatFragment, rockVertex, rockFragment,
} from './long-quyen-shaders.js';
import { scaleTile } from './long-quyen-textures.js';

// Bảng màu hỏa long: deep đỏ sẫm nâu (lớp mực), edge đỏ cam lửa, core vàng kim lõi sáng, belly vàng
// cam nhạt cho bụng, hot trắng ngà cho mắt và ấn quyền. Không vàng ròng chủ đạo (của Kim Long).
export const LONG_QUYEN_COLORS = {
  deep: new THREE.Color('#2a0603'), edge: new THREE.Color('#ff4a12'), core: new THREE.Color('#ffc65a'),
  belly: new THREE.Color('#ffa64a'), hot: new THREE.Color('#fff0cc'),
};

/** Chu kỳ nhịp (giây). */
export const LONG_QUYEN_CYCLE = 11;
/** Nhịp chung + hai pha riêng: surge = dải sáng chạy dọc thân từ đuôi lên đầu (vị trí tăng tuyến tính,
    tốc độ không đổi) trong lúc thở ra; strike = ấn quyền sáng dịu khi dải sáng tới đầu rồng. */
export function longQuyenRhythm(time) {
  const r = breathRhythm(time, LONG_QUYEN_CYCLE), p = r.phase;
  r.surgePos = (p - 0.18) / 0.48;
  r.surgeOn = sstep(0.18, 0.26, p) * (1 - sstep(0.6, 0.68, p));
  r.strike = bell(0.7, 0.12, p);
  return r;
}

const common = { transparent: true, depthWrite: false };
const blend = ink => (ink ? THREE.NormalBlending : THREE.AdditiveBlending);
const palette = colors => ({ deep: { value: colors.deep }, edge: { value: colors.edge }, core: { value: colors.core } });

/** Thân (scales = 1, có sóng cơ) hoặc đầu, sừng (scales = 0, không sóng). */
export function dragonMaterial(colors, { ink = 0, scales = 1, edge = colors.edge, core = colors.core } = {}) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.FrontSide, defines: scales ? { WAVE: '' } : {},
    uniforms: { ...palette(colors), edge: { value: edge }, core: { value: core }, belly: { value: colors.belly },
      map: { value: scaleTile() }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink }, scales: { value: scales },
      surgePos: { value: 0 }, surgeOn: { value: 0 } },
    vertexShader: dragonVertex, fragmentShader: dragonFragment, blending: blend(ink) });
}

export function finMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
    vertexShader: finVertex, fragmentShader: finFragment, blending: blend(ink) });
}

export function crackMaterial(colors, map, ink) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide,
    uniforms: { ...palette(colors), map: { value: map }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink }, gather: { value: 0 } },
    vertexShader: flatVertex, fragmentShader: crackFragment, blending: blend(ink) });
}

export function instancedFlatMaterial(map, tint) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide,
    uniforms: { map: { value: map }, tint: { value: tint }, opacity: { value: 1 } },
    vertexShader: instancedFlatVertex, fragmentShader: instancedFlatFragment, blending: THREE.AdditiveBlending });
}

export function rockMaterial(colors) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.FrontSide,
    uniforms: { deep: { value: colors.deep }, edge: { value: colors.edge }, opacity: { value: 1 }, gather: { value: 0 } },
    vertexShader: rockVertex, fragmentShader: rockFragment, blending: THREE.NormalBlending });
}

/** Cập nhật time/opacity cho danh sách { m, base, breathe? }; breathe đẩy độ đậm theo pha thở ra. */
export function tickMaterials(list, time, rhythm, f) {
  for (const { m, base, breathe = 0 } of list) {
    const u = m.uniforms;
    if (u.time) u.time.value = time;
    if (u.surgePos) { u.surgePos.value = rhythm.surgePos; u.surgeOn.value = rhythm.surgeOn; }
    if (u.gather) u.gather.value = rhythm.gather;
    u.opacity.value = base * (1 + breathe * rhythm.release) * f;
  }
}
