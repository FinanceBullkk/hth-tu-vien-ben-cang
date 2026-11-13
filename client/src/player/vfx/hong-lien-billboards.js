import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { hongLienFeather, hongLienWisp, hongLienSpark } from './hong-lien-billboard-textures.js';

// Các lớp hạt billboard của Hồng Liên — mỗi lớp MỘT InstancedMesh (một lần vẽ):
//  lông vũ lửa rơi lả tả, lật và đung đưa (cộng sáng); sợi lửa lụa bay lên chậm quanh thân;
//  hỏa tinh lấp lánh quanh quạt đuôi phượng.
// Mọi tốc độ cố định và chậm; nhịp thở chỉ đổi độ đậm, không đổi tốc độ.
export function createBillboards(parent, colors, lowQuality) {
  const featherN = lowQuality ? 8 : 20, wispN = lowQuality ? 6 : 16, sparkN = lowQuality ? 6 : 18;
  const feathers = layer(parent, 'hong-lien-feathers', hongLienFeather(), featherN, colors.edge.clone().lerp(colors.gold, 0.35), THREE.AdditiveBlending);
  const wisps = layer(parent, 'hong-lien-wisps', hongLienWisp(), wispN, colors.edge, THREE.AdditiveBlending);
  const sparks = layer(parent, 'hong-lien-sparks', hongLienSpark(), sparkN, colors.core.clone().lerp(colors.gold, 0.3), THREE.AdditiveBlending);
  const layers = [feathers, wisps, sparks];

  // Vật rơi: trôi vòng quanh thân, lắc ngang, lật nhẹ; hiện dần ở đầu và tan ở cuối hành trình.
  const fall = (l, n, seed, size, time, release, top) => {
    for (let i = 0; i < n; i++) {
      const u = ((hash(i + seed) + 0.02 * time * (1 + hash(i + seed + 10))) % 1 + 1) % 1;
      const a = hash(i + seed + 20) * Math.PI * 2 + time * 0.04 + u * 1.1, r = 0.55 + hash(i + seed + 30) * 1.25;
      const flutter = Math.sin(time * (0.6 + hash(i + seed + 40) * 0.4) + i);
      const flip = 0.55 + 0.45 * Math.cos(time * (0.45 + hash(i + seed + 50) * 0.5) + i * 2);
      l.set(i, Math.sin(a) * r + flutter * 0.14, top - u * (top - 0.1), Math.cos(a) * r - 0.15,
        size * (0.35 + 0.65 * flip), size * 2.4, Math.sin(u * Math.PI) * (0.75 + 0.2 * release), 0.12 * flutter + hash(i + seed + 60));
    }
    l.commit();
  };

  return {
    update(time, rhythm, f) {
      fall(feathers, featherN, 200, 0.075, time, rhythm.release, 3.0);
      // Sợi lửa lụa: bay lên xoắn nhẹ, tan ở hai đầu.
      for (let i = 0; i < wispN; i++) {
        const u = ((hash(i + 20) + time * (0.045 + hash(i) * 0.03)) % 1 + 1) % 1, a = hash(i + 40) * Math.PI * 2 + u * 1.4;
        const r = 0.55 + hash(i + 60) * 0.55;
        wisps.set(i, Math.sin(a) * r, 0.1 + u * 2.3, Math.cos(a) * r - 0.1, 0.07, 0.34 + 0.2 * hash(i + 80),
          Math.sin(u * Math.PI) * (0.6 + 0.35 * rhythm.release), 0.03 * Math.sin(time * 0.5 + i));
      }
      wisps.commit();
      // Hỏa tinh rải quanh pháp tướng, mỗi hạt lấp lánh theo nhịp riêng.
      for (let i = 0; i < sparkN; i++) {
        const a = hash(i + 400) * Math.PI * 2, r = 0.75 + hash(i + 409) * 0.95;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 403) * 0.8) + i * 2.1), 6);
        const s = 0.09 + 0.1 * tw + 0.06 * rhythm.pulse;
        sparks.set(i, Math.sin(a) * r, 1.5 + Math.cos(a) * r * 0.85, -0.35 + hash(i + 405) * 0.2, s, s, tw * 0.85 + 0.1, time * 0.08 + hash(i));
      }
      sparks.commit();
      feathers.material.uniforms.opacity.value = 0.9 * f; wisps.material.uniforms.opacity.value = 0.8 * f;
      sparks.material.uniforms.opacity.value = f;
    },
    dispose() { layers.forEach(l => l.dispose()); },
  };
}
