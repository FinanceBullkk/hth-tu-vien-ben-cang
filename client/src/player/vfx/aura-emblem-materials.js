import * as THREE from 'three';
import { emblemVertex, emblemFragment, sealVertex, sealFragment } from './aura-emblem-shaders.js';

// Vật liệu hoa văn dùng chung cho các aura pháp tướng. colors = { steel, edge, core, gold }:
// steel tông đậm cho lớp mực, edge màu nét chính, core lõi sáng, gold màu nhấn vành ngoài.
const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide };

/** Hoa văn vẽ sẵn (mandala, vành phù văn, trận đồ). chase = số luồng khí chạy quanh vòng. */
export function emblemMaterial(colors, map, { ink = 0, goldMix = 0, chase = 3 } = {}) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { map: { value: map }, steel: { value: colors.steel }, edge: { value: colors.edge },
      core: { value: colors.core }, gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 },
      sweep: { value: 0 }, sweepOn: { value: 0 }, ink: { value: ink }, goldMix: { value: goldMix }, chase: { value: chase } },
    vertexShader: emblemVertex, fragmentShader: emblemFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Lớp ánh sáng thủ tục: mode 0 xung trận đồ, 1 gợn nước loang, 2 quầng pháp quang. */
export function sealMaterial(colors, mode) {
  return new THREE.ShaderMaterial({ ...common,
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, time: { value: 0 },
      opacity: { value: 1 }, pulse: { value: 0 }, mode: { value: mode } },
    vertexShader: sealVertex, fragmentShader: sealFragment, blending: THREE.AdditiveBlending });
}

/** Bộ dựng lớp nét: mỗi lớp gồm bản sáng (cộng màu) + bản mực (normal blend, đọc được trên nền
    sáng; bỏ ở chất lượng thấp), chung một nhóm để quay cùng nhau. Mọi geometry/material tạo ra
    được ghi vào owned để dispose; chasers giữ opacity gốc cho update(). */
export function createEmblemKit(colors, lowQuality) {
  const geometries = [], materials = [], chasers = [];
  return {
    geometries, materials, chasers,
    plane(size) { const g = new THREE.PlaneGeometry(size, size); geometries.push(g); return g; },
    own(m) { materials.push(m); return m; },
    lines(parent, geo, map, z, order, opts) {
      const holder = new THREE.Group(); holder.position.z = z; parent.add(holder);
      const glow = emblemMaterial(colors, map, opts); materials.push(glow); chasers.push({ m: glow, base: opts.opacity });
      const mesh = new THREE.Mesh(geo, glow); mesh.renderOrder = order; holder.add(mesh);
      if (!lowQuality) {
        const ink = emblemMaterial(colors, map, { ...opts, ink: 1 }); materials.push(ink);
        chasers.push({ m: ink, base: opts.opacity * (opts.inkScale ?? 0.8) });
        const shade = new THREE.Mesh(geo, ink); shade.position.z = -0.004; shade.renderOrder = order - 1; holder.add(shade);
      }
      return holder;
    },
    /** Cập nhật thời gian, sóng quét và opacity của mọi lớp nét theo nhịp. */
    tick(time, rhythm, f) {
      for (const { m, base } of chasers) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = rhythm.sweep; m.uniforms.sweepOn.value = rhythm.sweepOn;
        m.uniforms.opacity.value = base * (0.85 + 0.25 * rhythm.pulse) * f;
      }
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
