import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { kiemVuStar, kiemVuPetal } from './kiem-vu-textures.js';
import { daoHoaPetalSprite, daoHoaBlossomSprite } from './dao-hoa-textures.js';

// Lớp "rơi" của Đào Hoa — động từ duy nhất của aura này. Mỗi lớp MỘT InstancedMesh:
//  cánh đào rụng từ tán cành, mỗi cánh rơi rất chậm theo một vòng xoắn nhỏ quanh cột rơi riêng,
//  lắc ngang, lật nhẹ; kèm vài bông đào nguyên bông và lá non; phấn hoa lấp lánh quanh cổng.
// Tốc độ rơi cố định. Nhịp thở chỉ đổi MẬT ĐỘ: khi thở ra, nhóm "cánh theo gió" hiện dần lên nên
// trông như một đợt rụng dày hơn — không cánh nào rơi nhanh hơn.
const TOP = 2.75, GUST_SHARE = 0.4;

/** Cột rơi của hạt i (hạt giống k) dưới tán cành; né khoảng trước mặt nhân vật. */
function column(i, k) {
  let x = -1.4 + 3.0 * hash(i + k + 11);
  const z = -0.95 + 1.3 * hash(i + k + 13);
  if (Math.abs(x) < 0.4 && z > -0.35) x = Math.sign(x || 1) * (0.4 + Math.abs(x));
  return [x, z];
}

export function createBillboards(parent, colors, lowQuality) {
  const starN = lowQuality ? 6 : 14, petalN = lowQuality ? 18 : 48, bloomN = lowQuality ? 2 : 6, leafN = lowQuality ? 0 : 7;
  const stars = layer(parent, 'dao-hoa-stars', kiemVuStar(), starN, colors.core.clone().lerp(colors.gold, 0.3), THREE.AdditiveBlending);
  const petals = layer(parent, 'dao-hoa-petals', daoHoaPetalSprite(), petalN, colors.edge.clone().lerp(colors.core, 0.2), THREE.AdditiveBlending);
  const blooms = layer(parent, 'dao-hoa-falling-blossoms', daoHoaBlossomSprite(), bloomN, colors.edge.clone().lerp(colors.core, 0.35), THREE.AdditiveBlending);
  const leaves = leafN ? layer(parent, 'dao-hoa-falling-leaves', kiemVuPetal(), leafN, colors.leaf, THREE.AdditiveBlending) : null;
  const all = [stars, petals, blooms, leaves].filter(Boolean);

  /** Vật rơi: hạt i, hạt giống k, tốc độ v (vòng đời/giây). Trả vị trí, độ lắc, độ lật, độ hiện. */
  const fall = (i, k, v, time) => {
    const u = ((hash(i + k) + time * v) % 1 + 1) % 1, [cx, cz] = column(i, k);
    const a = hash(i + k + 7) * Math.PI * 2 + u * Math.PI * 3, r = 0.12 + 0.2 * hash(i + k + 9);
    const flutter = Math.sin(time * (0.6 + hash(i + k + 3) * 0.5) + i * 1.7);
    const flip = 0.5 + 0.5 * Math.cos(time * (0.45 + hash(i + k + 5) * 0.5) + i * 2.3);
    return { x: cx + Math.sin(a) * r + flutter * 0.08, y: TOP - u * (TOP - 0.04), z: cz + Math.cos(a) * r, flutter, flip,
      fade: Math.min(1, u * 6, (1 - u) * 8) };
  };
  const gust = (i, rhythm) => (hash(i + 900) < GUST_SHARE ? 0.15 + 0.85 * rhythm.release : 1);

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < starN; i++) {
        const a = hash(i) * Math.PI * 2, r = 1.0 + hash(i + 9) * 0.6;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 3) * 0.8) + i * 2.1), 6);
        const s = 0.07 + 0.08 * tw + 0.04 * rhythm.pulse;
        stars.set(i, Math.sin(a) * r, 1.27 + Math.cos(a) * r, -0.45 + hash(i + 5) * 0.2, s, s, tw * 0.85 + 0.1, time * 0.08 + hash(i));
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
      for (let i = 0; i < petalN; i++) {
        const p = fall(i, 100, 0.024 + hash(i + 110) * 0.014, time);
        petals.set(i, p.x, p.y, p.z, 0.075 * (0.25 + 0.75 * p.flip), 0.085, p.fade * 0.9 * gust(i, rhythm),
          0.12 * p.flutter + hash(i + 160) + time * 0.02);
      }
      petals.commit(); petals.material.uniforms.opacity.value = f;
      for (let i = 0; i < bloomN; i++) {
        const p = fall(i, 300, 0.018 + hash(i + 310) * 0.01, time), sz = 0.13 * (0.6 + 0.4 * p.flip);
        blooms.set(i, p.x, p.y, p.z, sz, sz, p.fade * 0.85, 0.1 * p.flutter + hash(i + 360));
      }
      blooms.commit(); blooms.material.uniforms.opacity.value = f;
      if (leaves) {
        for (let i = 0; i < leafN; i++) {
          const p = fall(i, 500, 0.02 + hash(i + 510) * 0.012, time);
          leaves.set(i, p.x, p.y, p.z, 0.05 * (0.3 + 0.7 * p.flip), 0.16, p.fade * 0.75, 0.15 * p.flutter + hash(i + 560));
        }
        leaves.commit(); leaves.material.uniforms.opacity.value = 0.8 * f;
      }
    },
    dispose() { all.forEach(l => l.dispose()); },
  };
}
