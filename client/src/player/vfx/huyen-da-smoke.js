import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { smokeMaterial } from './huyen-da-materials.js';
import { pathSeed, inwardPoint, clearFace } from './huyen-da-inward-path.js';
import { sstep } from './aura-rhythm.js';

// Khói mực: vài sợi khói đen dày cuộn xoắn ốc từ quanh hông lên, rồi bị hút vào nhật thực sau đầu.
// Hình sợi cố định theo đường hút, cả chùm chỉ xoay rất chậm; dòng chảy vào tâm nằm trong shader
// (vân khói trôi về đầu u = 1 với tốc độ cố định). Thân khói đen normal blend là lớp chính; mép tím
// cộng màu chỉ có ở chất lượng đủ. Không phải phiêu đái hay lưu quang: dải mờ, mép xơ, đen.
// Sợi khói dừng ở mép đĩa (END): phần chìm vào lòng đĩa đen không vẽ.
const SEG = 40, END = 0.64, UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

export function createInkSmoke(parent, colors, lowQuality) {
  const count = lowQuality ? 2 : 4;
  const strips = createRibbonStrips(count, SEG);
  const inkMat = smokeMaterial(colors, 1), mats = [inkMat];
  const body = new THREE.Mesh(strips.geometry, inkMat);
  body.name = 'huyen-da-ink-smoke'; body.renderOrder = 6; body.frustumCulled = false; parent.add(body);
  if (!lowQuality) {
    const lipMat = smokeMaterial(colors, 0); mats.push(lipMat);
    const lip = new THREE.Mesh(strips.geometry, lipMat);
    lip.name = 'huyen-da-ink-smoke-glow'; lip.renderOrder = 9; lip.frustumCulled = false; parent.add(lip);
  }
  // Mỗi sợi bắt đầu ở một đoạn khác nhau của đường hút để chùm khói không đều như nan quạt.
  const seeds = Array.from({ length: count }, (_, k) => ({ ...pathSeed(k, 80), a0: k * Math.PI * 2 / count + 0.4, from: 0.08 * k }));
  const pts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
  const t = new THREE.Vector3(), n = new THREE.Vector3(), s = new THREE.Vector3();
  const lo = new THREE.Vector3(), hi = new THREE.Vector3(), mid = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const spin = -time * 0.04;
      seeds.forEach((p, k) => {
        for (let j = 0; j <= SEG; j++) {
          const u = p.from + (END - p.from) * j / SEG;
          inwardPoint(p, u, spin + 0.12 * Math.sin(time * 0.3 + k * 2 + u * 4), pts[j]);
        }
        for (let j = 0; j <= SEG; j++) {
          const u = p.from + (END - p.from) * j / SEG;
          t.subVectors(pts[Math.min(SEG, j + 1)], pts[Math.max(0, j - 1)]).normalize();
          n.copy(UP).lerp(FWD, sstep(0.35, 0.85, u)).normalize();
          s.crossVectors(t, n); if (s.lengthSq() < 1e-8) s.set(1, 0, 0); s.normalize();
          const w = (0.16 * Math.pow(1 - u, 0.7) + 0.02) * (1 + 0.12 * rhythm.release);
          // Hai mép dải cũng phải né mặt: đẩy từng mép rồi dựng lại tâm, hướng ngang, nửa bề rộng.
          clearFace(lo.copy(pts[j]).addScaledVector(s, -w)); clearFace(hi.copy(pts[j]).addScaledVector(s, w));
          mid.addVectors(lo, hi).multiplyScalar(0.5); s.subVectors(hi, lo);
          const half = s.length() / 2; if (half > 1e-6) s.multiplyScalar(0.5 / half);
          strips.write(k, j, mid, s, half);
        }
      });
      strips.commit();
      for (const m of mats) m.uniforms.time.value = time;
      inkMat.uniforms.opacity.value = (0.8 + 0.12 * rhythm.gather) * f;
      if (mats[1]) mats[1].uniforms.opacity.value = 0.55 * f;
    },
    dispose() { strips.geometry.dispose(); mats.forEach(m => m.dispose()); },
  };
}
