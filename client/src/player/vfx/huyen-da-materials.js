import * as THREE from 'three';
import { ribbonVertex } from './aura-flow-shaders.js';
import {
  vortexVertex, vortexFragment, obsidianVertex, obsidianFragment,
  crowFeatherVertex, crowFeatherFragment, smokeFragment,
} from './huyen-da-shaders.js';

// Bảng màu Huyền Dạ: deep đen tím (lớp mực chủ đạo), edge tím corona, core bạc ánh lam (lõi sáng),
// sheen lam lục ánh lông quạ. Không vàng kim, không lam sáng — khác Kiếm Vũ và Lưu Ly.
export const HUYEN_DA_COLORS = {
  deep: new THREE.Color('#0b0414'), edge: new THREE.Color('#a45cff'),
  core: new THREE.Color('#e9e0ff'), sheen: new THREE.Color('#4f8cff'),
};

const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide };
const blend = ink => (ink ? THREE.NormalBlending : THREE.AdditiveBlending);
const palette = colors => ({ deep: { value: colors.deep }, edge: { value: colors.edge }, core: { value: colors.core } });

/** Xoáy hút toạ độ cực (xem vortexFragment). opts: arms, twist, flow, inner, outer, falloff,
    edgeGlow, rim, ink. */
export function vortexMaterial(colors, map, { arms = 3, twist = 1.2, flow = 0.05, inner = 0, outer = 1,
  falloff = 0, edgeGlow = 0, rim = 0, ink = 0 } = {}) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), map: { value: map }, time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 },
      arms: { value: arms }, twist: { value: twist }, flow: { value: flow }, inner: { value: inner }, outer: { value: outer },
      falloff: { value: falloff }, edgeGlow: { value: edgeGlow }, rim: { value: rim }, ink: { value: ink } },
    vertexShader: vortexVertex, fragmentShader: vortexFragment, blending: blend(ink) });
}

/** Hắc diệu thạch: ink 1 thân đen đặc, ink 0 viền fresnel (+ đường chạm nếu carve > 0). */
export function obsidianMaterial(colors, ink, carve = 0) {
  return new THREE.ShaderMaterial({ ...common, side: THREE.FrontSide,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink },
      carve: { value: carve }, pulse: { value: 0 } },
    vertexShader: obsidianVertex, fragmentShader: obsidianFragment, blending: blend(ink) });
}

/** Lông quạ instanced: ink 1 phiến đen, ink 0 viền ánh tím lam. */
export function crowFeatherMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), sheen: { value: colors.sheen }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
    vertexShader: crowFeatherVertex, fragmentShader: crowFeatherFragment, blending: blend(ink) });
}

/** Khói mực trên dải động: ink 1 thân khói đen, ink 0 mép tím. */
export function smokeMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { ...palette(colors), time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
    vertexShader: ribbonVertex, fragmentShader: smokeFragment, blending: blend(ink) });
}

/** Mặt phẳng xoáy: tạo geometry + mesh, ghi vào owned để dispose. */
export function vortexPlane(parent, owned, size, material, name, order) {
  const geo = new THREE.PlaneGeometry(size, size); owned.push(geo, material);
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}

/** Cập nhật thời gian + opacity cho danh sách { m, base } theo nhịp. */
export function tickAll(list, time, rhythm, f) {
  for (const { m, base, breathe = 0 } of list) {
    m.uniforms.time.value = time;
    if (m.uniforms.pulse) m.uniforms.pulse.value = rhythm.pulse;
    m.uniforms.opacity.value = base * (1 + breathe * (rhythm.gather - 0.5 * rhythm.release)) * f;
  }
}
