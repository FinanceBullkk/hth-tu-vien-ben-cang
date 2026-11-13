import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { kiemVuCloud, kiemVuStar, kiemVuPetal } from './kiem-vu-textures.js';
import { daoHoaPetalSprite, daoHoaBlossomSprite } from './dao-hoa-textures.js';

// Các lớp hạt billboard của Đào Hoa — mỗi lớp MỘT InstancedMesh. Thay cho dải lưu quang/phiêu đái
// của các aura khác, chuyển động quanh thân ở đây hoàn toàn bằng cánh hoa:
//  LỐC CÁNH ĐÀO: ba dòng cánh nối đuôi nhau xoắn ốc quanh người, dâng chậm từ chân lên quá vai;
//  CÁNH RƠI LẢ TẢ: mỗi cánh một đường xoắn rơi rất chậm, lắc ngang, lật nhẹ; kèm bông đào, lá non;
//  sương hồng ôm gốc hai cành đào và quanh chân (normal blending, đọc được trên nền sáng); phấn hoa lấp lánh.
// Tốc độ mọi lớp cố định; nhịp thở chỉ làm vòng xoắn nở rộng một chút như có làn gió nhẹ.
const ROOT_MIST = [[-1.45, 0.5, -0.36, 1.0, 0.55, 0], [1.5, 0.62, -0.38, 0.95, 0.5, 1.7]];
const STREAMS = 3;

export function createBillboards(parent, colors, lowQuality) {
  const footN = lowQuality ? 3 : 5, starN = lowQuality ? 6 : 14, perStream = lowQuality ? 9 : 18;
  const petalN = lowQuality ? 14 : 34, bloomN = lowQuality ? 2 : 5, leafN = lowQuality ? 0 : 6;
  const petalTint = colors.edge.clone().lerp(colors.core, 0.2);
  const mist = layer(parent, 'dao-hoa-clouds', kiemVuCloud(), footN + ROOT_MIST.length, colors.core.clone().lerp(colors.edge, 0.3), THREE.NormalBlending);
  const stars = layer(parent, 'dao-hoa-stars', kiemVuStar(), starN, colors.core.clone().lerp(colors.gold, 0.3), THREE.AdditiveBlending);
  const stream = layer(parent, 'dao-hoa-petal-stream', daoHoaPetalSprite(), STREAMS * perStream, colors.edge.clone().lerp(colors.core, 0.35), THREE.AdditiveBlending);
  const petals = layer(parent, 'dao-hoa-petals', daoHoaPetalSprite(), petalN, petalTint, THREE.AdditiveBlending);
  const blooms = layer(parent, 'dao-hoa-falling-blossoms', daoHoaBlossomSprite(), bloomN, colors.edge.clone().lerp(colors.core, 0.35), THREE.AdditiveBlending);
  const leaves = leafN ? layer(parent, 'dao-hoa-falling-leaves', kiemVuPetal(), leafN, colors.leaf, THREE.AdditiveBlending) : null;
  const all = [mist, stars, stream, petals, blooms, leaves].filter(Boolean);

  /** Vật rơi xoắn: chỉ số i, hạt giống k, tốc độ v (vòng đời/giây), bán kính r0. */
  const spiral = (i, k, v, r0, time, widen) => {
    const u = ((hash(i + k) + time * v) % 1 + 1) % 1;
    const a = hash(i + k + 7) * Math.PI * 2 + u * Math.PI * 2.4 + time * 0.03;
    const r = r0 * (1 - 0.25 * u) + widen;
    const flutter = Math.sin(time * (0.6 + hash(i + k + 3) * 0.5) + i * 1.7);
    const flip = 0.5 + 0.5 * Math.cos(time * (0.45 + hash(i + k + 5) * 0.5) + i * 2.3);
    return { x: Math.sin(a) * r + flutter * 0.1, y: 3.0 - u * 2.95, z: Math.cos(a) * r - 0.15, flutter, flip,
      fade: Math.min(1, u * 6, (1 - u) * 5) };
  };

  return {
    update(time, rhythm, f) {
      const widen = 0.12 * rhythm.release;
      for (let i = 0; i < footN; i++) {
        const a = i / footN * Math.PI * 2 + time * 0.035, r = 0.95 + 0.1 * Math.sin(time * 0.3 + i * 2) + 0.08 * rhythm.release;
        const b = 1 + 0.08 * Math.sin(time * 0.7 + i);
        mist.set(i, Math.sin(a) * r, 0.14 + 0.04 * Math.sin(time * 0.55 + i), Math.cos(a) * r,
          0.85 * b, 0.42 * b, 0.42 + 0.12 * Math.sin(time * 0.6 + i * 1.3), 0.02 * Math.sin(time * 0.4 + i));
      }
      ROOT_MIST.forEach(([x, y, z, w, h, ph], k) => {
        mist.set(footN + k, x + 0.05 * Math.sin(time * 0.3 + ph), y + 0.04 * Math.sin(time * 0.45 + ph), z,
          w, h, 0.55 + 0.1 * Math.sin(time * 0.55 + ph), 0.015 * Math.sin(time * 0.3 + ph));
      });
      mist.commit(); mist.material.uniforms.opacity.value = 0.95 * f;
      // Phấn hoa lấp lánh quanh nguyệt môn, mỗi hạt một nhịp riêng.
      for (let i = 0; i < starN; i++) {
        const a = hash(i) * Math.PI * 2, r = 0.9 + hash(i + 9) * 0.75;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 3) * 0.8) + i * 2.1), 6);
        const s = 0.07 + 0.09 * tw + 0.05 * rhythm.pulse;
        stars.set(i, Math.sin(a) * r, 1.32 + Math.cos(a) * r, -0.3 + hash(i + 5) * 0.2, s, s, tw * 0.85 + 0.1, time * 0.08 + hash(i));
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
      // Lốc cánh đào: cánh trong cùng một dòng cách đều nhau nên nối thành dải hoa xoắn.
      for (let s = 0; s < STREAMS; s++) for (let k = 0; k < perStream; k++) {
        const i = s * perStream + k, u = ((k / perStream + time * 0.03) % 1 + 1) % 1;
        const a = s * Math.PI * 2 / STREAMS + u * Math.PI * 2.5 + time * 0.05;
        const r = 0.8 + 0.14 * Math.sin(u * Math.PI * 2 + s * 2) + widen * 0.5;
        const flip = 0.5 + 0.5 * Math.cos(time * 0.5 + i * 1.3);
        stream.set(i, Math.sin(a) * r, 0.12 + u * 2.2, Math.cos(a) * r, 0.07 * (0.3 + 0.7 * flip), 0.08,
          Math.pow(Math.sin(u * Math.PI), 0.8) * 0.85, a * 0.16 + hash(i + 700));
      }
      stream.commit(); stream.material.uniforms.opacity.value = f;
      for (let i = 0; i < petalN; i++) {
        const p = spiral(i, 100, 0.022 + hash(i + 110) * 0.016, 0.45 + hash(i + 130) * 1.15, time, widen);
        petals.set(i, p.x, p.y, p.z, 0.075 * (0.25 + 0.75 * p.flip), 0.085, p.fade * 0.9, 0.12 * p.flutter + hash(i + 160) + time * 0.02);
      }
      petals.commit(); petals.material.uniforms.opacity.value = f;
      for (let i = 0; i < bloomN; i++) {
        const p = spiral(i, 300, 0.018 + hash(i + 310) * 0.01, 0.6 + hash(i + 330) * 0.9, time, widen);
        const sz = 0.13 * (0.6 + 0.4 * p.flip);
        blooms.set(i, p.x, p.y, p.z, sz, sz, p.fade * 0.85, 0.1 * p.flutter + hash(i + 360));
      }
      blooms.commit(); blooms.material.uniforms.opacity.value = f;
      if (leaves) {
        for (let i = 0; i < leafN; i++) {
          const p = spiral(i, 500, 0.02 + hash(i + 510) * 0.012, 0.7 + hash(i + 530) * 0.8, time, widen);
          leaves.set(i, p.x, p.y, p.z, 0.05 * (0.3 + 0.7 * p.flip), 0.16, p.fade * 0.75, 0.15 * p.flutter + hash(i + 560));
        }
        leaves.commit(); leaves.material.uniforms.opacity.value = 0.8 * f;
      }
    },
    dispose() { all.forEach(l => l.dispose()); },
  };
}
