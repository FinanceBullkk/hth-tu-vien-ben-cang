import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { kiemVuStar, kiemVuStreak } from './kiem-vu-textures.js';
import { tinhHaNebula, tinhHaSpark } from './tinh-ha-sprite-textures.js';

// Các lớp hạt billboard của Tinh Hà — mỗi lớp là MỘT InstancedMesh (một lần vẽ):
//  tinh vân chàm bồng bềnh dưới chân và ôm hai bên thiên cầu (normal blending, đọc được trên nền
//  sáng); sao bốn cánh lấp lánh rải khắp bầu trời sau lưng; bụi sao mảnh bay lên quanh thân;
//  tinh sa (sao năm cánh nhỏ) rơi lả tả, đung đưa và xoay nhẹ như trong gió.

// Tinh vân cố định ôm hai bên và sau thiên cầu: [x, y, z, rộng, cao, lệch pha].
const SHELL_NEBULAE = [[-1.55, 0.9, -0.6, 1.2, 0.6, 0], [1.6, 1.1, -0.65, 1.1, 0.55, 1.7],
  [-0.9, 2.45, -1.2, 1.0, 0.45, 3.1], [1.0, 2.3, -1.25, 1.0, 0.5, 4.4]];

export function createBillboards(parent, colors, lowQuality) {
  const footN = lowQuality ? 4 : 7, starN = lowQuality ? 8 : 22, dustN = lowQuality ? 8 : 18, sandN = lowQuality ? 8 : 24;
  const nebulaTint = colors.edge.clone().lerp(colors.steel, 0.35);
  const nebulae = layer(parent, 'tinh-ha-nebulae', tinhHaNebula(), footN + SHELL_NEBULAE.length, nebulaTint, THREE.NormalBlending);
  const stars = layer(parent, 'tinh-ha-stars', kiemVuStar(), starN, colors.core, THREE.AdditiveBlending);
  const dust = layer(parent, 'tinh-ha-stardust', kiemVuStreak(), dustN, colors.edge, THREE.AdditiveBlending);
  const sand = layer(parent, 'tinh-ha-star-sand', tinhHaSpark(), sandN, colors.core.clone().lerp(colors.gold, 0.45), THREE.AdditiveBlending);

  return {
    update(time, rhythm, f) {
      // Tinh vân dưới chân trôi vòng chậm, phồng xẹp như thở; dạt nhẹ ra khi tinh đồ nở.
      for (let i = 0; i < footN; i++) {
        const a = i / footN * Math.PI * 2 + time * 0.03, r = 0.95 + 0.12 * Math.sin(time * 0.25 + i * 2) + 0.1 * rhythm.release;
        const b = 1 + 0.12 * Math.sin(time * 0.7 + i);
        nebulae.set(i, Math.sin(a) * r, 0.14 + 0.05 * Math.sin(time * 0.5 + i), Math.cos(a) * r,
          1.05 * b, 0.48 * b, 0.45 + 0.15 * Math.sin(time * 0.6 + i * 1.3), 0.02 * Math.sin(time * 0.35 + i));
      }
      SHELL_NEBULAE.forEach(([x, y, z, w, h, ph], k) => {
        nebulae.set(footN + k, x + 0.06 * Math.sin(time * 0.3 + ph), y + 0.05 * Math.sin(time * 0.45 + ph), z,
          w, h, 0.42 + 0.12 * Math.sin(time * 0.55 + ph), 0.015 * Math.sin(time * 0.25 + ph));
      });
      nebulae.commit(); nebulae.material.uniforms.opacity.value = 0.9 * f;
      // Sao rải ngoài vỏ thiên cầu ở nửa sau (không bao giờ trước mặt), lấp lánh theo nhịp riêng.
      for (let i = 0; i < starN; i++) {
        const a = (hash(i) - 0.5) * Math.PI * 0.9, el = (hash(i + 9) - 0.35) * 1.6, r = 1.6 + hash(i + 11) * 0.7;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 3) * 0.8) + i * 2.1), 6);
        const s = 0.07 + 0.11 * tw * (0.6 + hash(i + 7) * 0.6) + 0.06 * rhythm.pulse;
        stars.set(i, Math.sin(a) * Math.cos(el) * r, 1.25 + Math.sin(el) * r, -Math.cos(a) * Math.cos(el) * r, s, s, tw * 0.85 + 0.15,
          time * 0.08 + hash(i));
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
      // Bụi sao bay lên xoắn nhẹ quanh thân, tan ở hai đầu hành trình.
      for (let i = 0; i < dustN; i++) {
        const u = ((hash(i + 20) + time * (0.045 + hash(i) * 0.035)) % 1 + 1) % 1, a = hash(i + 40) * Math.PI * 2 + u * 1.8;
        const r = 0.6 + hash(i + 60) * 0.55;
        dust.set(i, Math.sin(a) * r, 0.1 + u * 2.5, Math.cos(a) * r - 0.1, 0.03, 0.22 + 0.18 * hash(i + 80),
          Math.sin(u * Math.PI) * (0.6 + 0.4 * rhythm.release));
      }
      dust.commit(); dust.material.uniforms.opacity.value = 0.85 * f;
      // Tinh sa rơi: mỗi hạt một tốc độ rất chậm, trôi vòng quanh thân, lắc ngang và xoay nhẹ.
      for (let i = 0; i < sandN; i++) {
        const u = ((hash(i + 100) + time * (0.022 + hash(i + 110) * 0.018)) % 1 + 1) % 1;
        const a = hash(i + 120) * Math.PI * 2 + time * 0.04 + u * 1.1, r = 0.5 + hash(i + 130) * 1.3;
        const flutter = Math.sin(time * (0.6 + hash(i + 140) * 0.5) + i);
        const s = 0.07 + 0.05 * hash(i + 150);
        sand.set(i, Math.sin(a) * r + flutter * 0.1, 3.0 - u * 2.9, Math.cos(a) * r - 0.2,
          s, s, Math.sin(u * Math.PI) * (0.6 + 0.3 * Math.sin(time * 1.1 + i)), 0.08 * flutter + time * 0.03 + hash(i + 160));
      }
      sand.commit(); sand.material.uniforms.opacity.value = f;
    },
    dispose() { for (const l of [nebulae, stars, dust, sand]) l.dispose(); },
  };
}
