import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { firePuff } from './xich-diem-textures.js';
import { DRIFT, spread } from './xich-diem-layout.js';
import { softDot } from './aura-rhythm.js';

// Lớp mềm của đài mây: cụm mây lửa (billboard) chèn giữa các cuộn tường vân cho đài dày đặc,
// bản thân đỏ son (normal blend) + bản lõi vàng cam (cộng màu); tàn lửa trôi ngang quanh đài, chỉ
// bốc lên rất chậm rồi tắt ngang eo. Cụm mây trôi vòng theo đài, mỗi tầng lệch tốc độ chút ít
// (tốc độ vẫn cố định) để có chiều sâu.
export const EMBER_LIFE = 9;
export const EMBER_TOP = 0.6;

export function createPuffs(parent, colors, lowQuality) {
  const n = lowQuality ? 14 : 28, emberN = lowQuality ? 16 : 36;
  const tint = colors.body.clone().lerp(colors.ember, 0.25);
  const body = billboardLayer(parent, 'xich-diem-puffs', firePuff(), n, tint, THREE.NormalBlending);
  const glow = billboardLayer(parent, 'xich-diem-puffs-glow', firePuff(), n, colors.gold, THREE.AdditiveBlending);
  const embers = billboardLayer(parent, 'xich-diem-embers', softDot(), emberN, colors.gold, THREE.AdditiveBlending);
  // Một phần ba số cụm nằm sát chân (r < 0.5) để người như đứng lún trong mây; còn lại rải khắp đài.
  const puffs = Array.from({ length: n }, (_, i) => ({
    a: i * 2.39996, r: i % 3 ? 0.6 + 0.9 * hash(i + 3) : 0.2 + 0.3 * hash(i + 3), y: 0.06 + 0.22 * hash(i + 5),
    w: 0.7 + 0.45 * hash(i + 7), speed: 1 + 0.15 * ((i % 3) - 1), spin: (hash(i + 9) - 0.5) * 0.04,
  }));

  return {
    update(time, rhythm, f) {
      const k = spread(rhythm);
      puffs.forEach((p, i) => {
        const a = p.a + time * DRIFT * p.speed, r = p.r * k, x = Math.sin(a) * r, z = Math.cos(a) * r;
        const y = p.y + 0.012 * Math.sin(time * 0.6 + i), w = p.w * (1 + 0.08 * rhythm.release);
        body.set(i, x, y, z, w, w * 0.62, 0.8 * f, p.spin);
        glow.set(i, x, y + 0.02, z, w * 0.7, w * 0.4, (0.32 + 0.15 * rhythm.gather) * f, p.spin);
      });
      body.commit(); glow.commit();
      for (let i = 0; i < emberN; i++) {
        const u = ((time / EMBER_LIFE + hash(i + 20)) % 1 + 1) % 1;
        const a = hash(i + 21) * Math.PI * 2 + time * 0.09, r = 0.55 + 1.05 * hash(i + 22);
        const y = 0.08 + (EMBER_TOP - 0.08) * u;
        const s = 0.035 + 0.03 * hash(i + 23);
        embers.set(i, Math.sin(a) * r, y, Math.cos(a) * r, s, s, Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(time * 1.7 + i)) * f);
      }
      embers.commit();
    },
    dispose() { body.dispose(); glow.dispose(); embers.dispose(); },
  };
}
