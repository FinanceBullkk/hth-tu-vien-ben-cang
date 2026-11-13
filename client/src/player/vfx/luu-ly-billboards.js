import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { luuLyCloud, luuLyDrop, luuLyBubble, luuLySparkle, luuLyShard } from './luu-ly-textures.js';

// Lớp hạt bay bổng của Lưu Ly — mỗi lớp một InstancedMesh (một lần vẽ):
//  vân thủy (sương + sóng cuộn) bồng bềnh dưới chân và đỡ hai bên pháp luân (normal blend);
//  lấp lánh sáu tia quanh pháp luân; giọt nước bay ngược lên chậm như bị hút về trời;
//  bọt nước li ti dâng từ mặt trận; mảnh lưu ly trôi xuống lả tả như lá rơi, lật nhẹ.
const WHEEL_CLOUDS = [[-1.05, 0.8, -0.5, 1.0, 0.55, 0], [1.08, 0.88, -0.55, 0.95, 0.5, 1.7],
  [-1.5, 1.4, -0.6, 0.75, 0.42, 3.1], [1.52, 1.5, -0.62, 0.8, 0.45, 4.4]];
const wrap = x => ((x % 1) + 1) % 1;

export function createLuuLyBillboards(parent, colors, lowQuality) {
  const footN = lowQuality ? 4 : 7, sparkN = lowQuality ? 6 : 16, dropN = lowQuality ? 8 : 20;
  const bubbleN = lowQuality ? 6 : 18, shardN = lowQuality ? 6 : 18;
  const cloudTint = colors.core.clone().lerp(colors.edge, 0.2).multiplyScalar(1.05);
  const clouds = layer(parent, 'luu-ly-clouds', luuLyCloud(), footN + WHEEL_CLOUDS.length, cloudTint, THREE.NormalBlending);
  const sparks = layer(parent, 'luu-ly-sparkles', luuLySparkle(), sparkN, colors.core, THREE.AdditiveBlending);
  const drops = layer(parent, 'luu-ly-drops', luuLyDrop(), dropN, colors.edge.clone().lerp(colors.core, 0.35), THREE.AdditiveBlending);
  const bubbles = layer(parent, 'luu-ly-bubbles', luuLyBubble(), bubbleN, colors.edge, THREE.AdditiveBlending);
  const shards = layer(parent, 'luu-ly-shards', luuLyShard(), shardN, colors.gold.clone().lerp(colors.edge, 0.4), THREE.AdditiveBlending);
  const all = [clouds, sparks, drops, bubbles, shards];

  return {
    update(time, rhythm, f) {
      // Vân thủy dưới chân trôi vòng chậm, phồng xẹp như thở, dạt nhẹ ra khi thở ra.
      for (let i = 0; i < footN; i++) {
        const a = i / footN * Math.PI * 2 + time * 0.035, r = 0.95 + 0.12 * Math.sin(time * 0.3 + i * 2) + 0.08 * rhythm.release;
        const b = 1 + 0.1 * Math.sin(time * 0.8 + i);
        clouds.set(i, Math.sin(a) * r, 0.15 + 0.05 * Math.sin(time * 0.6 + i), Math.cos(a) * r,
          0.95 * b, 0.5 * b, 0.5 + 0.15 * Math.sin(time * 0.7 + i * 1.3), 0.02 * Math.sin(time * 0.4 + i));
      }
      WHEEL_CLOUDS.forEach(([x, y, z, w, h, ph], k) => {
        clouds.set(footN + k, x + 0.06 * Math.sin(time * 0.35 + ph), y + 0.05 * Math.sin(time * 0.5 + ph), z,
          w, h, 0.48 + 0.12 * Math.sin(time * 0.6 + ph), 0.015 * Math.sin(time * 0.3 + ph));
      });
      clouds.commit(); clouds.material.uniforms.opacity.value = f;
      // Lấp lánh rải quanh pháp luân, mỗi hạt một nhịp riêng.
      for (let i = 0; i < sparkN; i++) {
        const a = hash(i) * Math.PI * 2, r = 0.75 + hash(i + 9) * 0.9;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 3) * 0.8) + i * 2.1), 6);
        const s = 0.09 + 0.11 * tw + 0.06 * rhythm.pulse;
        sparks.set(i, Math.sin(a) * r, 1.42 + Math.cos(a) * r * 0.85, -0.3 + hash(i + 5) * 0.2, s, s, tw * 0.9 + 0.1, time * 0.05 + hash(i));
      }
      sparks.commit(); sparks.material.uniforms.opacity.value = f;
      // Giọt nước bay ngược: dâng chậm, lượn xoắn quanh thân, tan ở hai đầu; đầu nhọn chĩa xuống (spin 0.5).
      for (let i = 0; i < dropN; i++) {
        const u = wrap(hash(i + 20) + time * (0.035 + hash(i) * 0.025)), a = hash(i + 40) * Math.PI * 2 + u * 1.3 + time * 0.04;
        const r = 0.55 + hash(i + 60) * 0.75 - 0.15 * u, s = 0.05 + 0.04 * hash(i + 70);
        drops.set(i, Math.sin(a) * r, 0.15 + u * 2.7, Math.cos(a) * r - 0.1, s * 0.75, s * 1.15,
          Math.sin(u * Math.PI) * (0.7 + 0.35 * rhythm.release), 0.5);
      }
      drops.commit(); drops.material.uniforms.opacity.value = f;
      // Bọt li ti dâng từ mặt trận, lắc ngang, vỡ tan khi lên cao.
      for (let i = 0; i < bubbleN; i++) {
        const u = wrap(hash(i + 200) + time * (0.06 + hash(i + 210) * 0.04)), a = hash(i + 220) * Math.PI * 2;
        const r = 0.4 + hash(i + 230) * 1.0, s = 0.03 + 0.035 * hash(i + 240) * (0.6 + 0.4 * u);
        const wob = 0.05 * Math.sin(time * 1.1 + i * 2.3);
        bubbles.set(i, Math.sin(a) * r + wob, 0.08 + u * 1.2, Math.cos(a) * r, s, s, Math.sin(u * Math.PI) * 0.8);
      }
      bubbles.commit(); bubbles.material.uniforms.opacity.value = f;
      // Mảnh lưu ly rơi rất chậm: trôi vòng, lắc ngang và lật (bề ngang co giãn) như lá trong gió.
      for (let i = 0; i < shardN; i++) {
        const u = wrap(hash(i + 100) + time * (0.022 + hash(i + 110) * 0.018));
        const a = hash(i + 120) * Math.PI * 2 + time * 0.045 + u * 1.2, r = 0.55 + hash(i + 130) * 1.25;
        const flutter = Math.sin(time * (0.6 + hash(i + 140) * 0.5) + i);
        const flip = 0.55 + 0.45 * Math.cos(time * (0.45 + hash(i + 150) * 0.5) + i * 2);
        shards.set(i, Math.sin(a) * r + flutter * 0.12, 3.0 - u * 2.85, Math.cos(a) * r - 0.2,
          0.07 * flip + 0.012, 0.16, Math.sin(u * Math.PI) * 0.8, 0.12 * flutter + hash(i + 160));
      }
      shards.commit(); shards.material.uniforms.opacity.value = 0.9 * f;
    },
    dispose() { all.forEach(l => l.dispose()); },
  };
}
