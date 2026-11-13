import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { hongLienWisp, hongLienSpark } from './hong-lien-billboard-textures.js';

// Các lớp hạt billboard của Hồng Liên — mỗi lớp MỘT InstancedMesh (một lần vẽ):
//  sợi lửa lụa bốc lên từ mũi các cánh sen dưới chân (thấp, mảnh, uốn chữ S);
//  hỏa tinh lấp lánh rải dọc sải cánh hai bên (không vây tròn quanh đầu).
// Mọi tốc độ cố định và chậm; nhịp thở chỉ đổi độ đậm, không đổi tốc độ.
export function createBillboards(parent, colors, lowQuality) {
  const wispN = lowQuality ? 8 : 16, sparkN = lowQuality ? 8 : 20;
  const wisps = layer(parent, 'hong-lien-wisps', hongLienWisp(), wispN, colors.edge, THREE.AdditiveBlending);
  const sparks = layer(parent, 'hong-lien-sparks', hongLienSpark(), sparkN, colors.core.clone().lerp(colors.gold, 0.3), THREE.AdditiveBlending);

  return {
    update(time, rhythm, f) {
      // Sợi lửa: mọc ở mũi cánh sen (16 hướng), bay lên ~1.1 m rồi tan.
      for (let i = 0; i < wispN; i++) {
        const u = ((hash(i + 20) + time * (0.06 + hash(i) * 0.03)) % 1 + 1) % 1;
        const a = Math.round(hash(i + 40) * 16) / 16 * Math.PI * 2 + time * 0.012, r = 1.3 - 0.25 * u;
        wisps.set(i, Math.sin(a) * r, 0.05 + u * 1.1, Math.cos(a) * r, 0.07, 0.3 + 0.15 * hash(i + 80),
          Math.sin(u * Math.PI) * (0.55 + 0.35 * rhythm.release), 0.03 * Math.sin(time * 0.5 + i));
      }
      wisps.commit();
      // Hỏa tinh dọc sải cánh: x lệch ra hai bên vai, trải theo chữ V.
      for (let i = 0; i < sparkN; i++) {
        const side = i % 2 ? 1 : -1, h = hash(i + 400);
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 403) * 0.8) + i * 2.1), 6);
        const s = 0.08 + 0.1 * tw + 0.05 * rhythm.pulse;
        sparks.set(i, side * (0.5 + h * 1.9), 1.35 + h * 0.8 + (hash(i + 409) - 0.5) * 0.9, -0.45 - h * 0.4,
          s, s, tw * 0.85 + 0.1, time * 0.08 + hash(i));
      }
      sparks.commit();
      wisps.material.uniforms.opacity.value = 0.8 * f; sparks.material.uniforms.opacity.value = f;
    },
    dispose() { wisps.dispose(); sparks.dispose(); },
  };
}
