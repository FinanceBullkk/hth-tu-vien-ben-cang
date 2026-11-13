import * as THREE from 'three';
import { featherVertex, featherFragment } from './hong-lien-shaders.js';

// Bảng màu Hồng Liên Hỏa Vũ: steel đỏ son (lớp mực), edge hồng cam (nét chính),
// core trắng ngà ấm (lõi sáng), gold vàng kim (đầu lông, vành ngoài).
export const HONG_LIEN_COLORS = {
  steel: new THREE.Color('#a8182e'), edge: new THREE.Color('#ff7a5c'),
  core: new THREE.Color('#fff1df'), gold: new THREE.Color('#ffc864'),
};

// Bản mẫu dùng chung mọi nhân vật (không dispose): dựng từ lưới phẳng, uv.x ngang, uv.y dọc.
function shaped(segX, segY, place) {
  const geo = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, ...place(uv.getX(i) * 2 - 1, uv.getY(i)));
  geo.computeVertexNormals();
  return geo;
}

let feather = null, petal = null;
/** Lông vũ dài 1: cuống mảnh, phiến rộng nhất ở 0.55, ngọn nhọn; uốn nhẹ ra sau và quét sang bên. */
export function featherGeometry() {
  return feather ??= shaped(4, 16, (s, t) => {
    const w = 0.12 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.25)), 0.7) * (0.35 + 0.65 * Math.min(1, t * 4));
    return [s * w + 0.07 * t * t, t, -0.14 * t * t + 0.25 * s * s * w];
  });
}

/** Cánh sen lửa dài 1: thon hai đầu, lòng khum, ngọn nghiêng như ngọn lửa lụa. */
export function petalGeometry() {
  return petal ??= shaped(6, 14, (s, t) => {
    const w = 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.8) * (1 - 0.35 * t);
    return [s * w + 0.07 * Math.sin(t * Math.PI) * t, t, 0.16 * Math.sin(Math.PI * t) - 0.1 * t * t * t + 0.5 * s * s * w];
  });
}

/** kind 0 lông vũ, 1 cánh sen; ink 1 lớp mực normal blend. */
export function featherMaterial(colors, ink, kind) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink },
      kind: { value: kind }, pulse: { value: 0 } },
    vertexShader: featherVertex, fragmentShader: featherFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Cặp InstancedMesh sáng + mực chung ma trận instance (mực bỏ ở chất lượng thấp). */
export function featherSet(parent, geometry, count, glowMat, inkMat, lowQuality, name) {
  const glow = new THREE.InstancedMesh(geometry, glowMat, count);
  glow.name = name; glow.renderOrder = 8; glow.frustumCulled = false; parent.add(glow);
  const meshes = [glow];
  if (!lowQuality) {
    const ink = new THREE.InstancedMesh(geometry, inkMat, count);
    ink.instanceMatrix = glow.instanceMatrix; ink.renderOrder = 7; ink.frustumCulled = false; parent.add(ink);
    meshes.push(ink);
  }
  return { glow, meshes, dispose() { meshes.forEach(m => m.dispose()); } };
}
