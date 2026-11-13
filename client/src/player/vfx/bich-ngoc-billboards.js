import * as THREE from 'three';
import { billboardLayer as layer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { bichNgocWindStreak } from './bich-ngoc-textures.js';
import { bichNgocMist } from './bich-ngoc-calligraphy-textures.js';
import { WIND_SPIN } from './bich-ngoc-wind.js';

// Lớp bay bổng của Bích Ngọc:
//  vệt gió cuộn lượn vòng trên cao, nối các ngọn trúc (cao hơn đầu, cùng chiều gió xoáy);
//  bụi ngọc lục bay lên chậm giữa các thân trúc (bán kính ≥ 0.7 m, không đi ngang mặt);
//  sương thủy mặc xám lục trôi sát đất quanh gốc trúc theo chiều gió (bỏ ở chất lượng thấp).
// Tốc độ cố định; nhịp thở chỉ đổi độ đậm.
export const STREAK_MIN_Y = 1.62;

export function createBillboards(parent, colors, lowQuality) {
  const streakN = lowQuality ? 6 : 14, moteN = lowQuality ? 10 : 26;
  const streaks = layer(parent, 'bich-ngoc-wind-streaks', bichNgocWindStreak(), streakN, colors.edge.clone().lerp(colors.core, 0.45), THREE.AdditiveBlending);
  const mistN = lowQuality ? 0 : 12;
  const mist = mistN ? layer(parent, 'bich-ngoc-ink-mist', bichNgocMist(), mistN, colors.stone.clone().lerp(colors.core, 0.35), THREE.NormalBlending) : null;
  const motePos = new Float32Array(moteN * 3), moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge.clone().lerp(colors.gold, 0.35), size: 0.06, map: softDot(),
    transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = new THREE.Points(moteGeo, moteMat); motes.name = 'bich-ngoc-jade-motes'; motes.renderOrder = 9; parent.add(motes);

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < streakN; i++) {
        // Mỗi vệt sống một vòng đời: hiện, lượn một cung, tan; góc đi đều theo chiều gió.
        const v = 0.05 + 0.03 * hash(i + 20), u = ((hash(i + 1) + time * v) % 1 + 1) % 1;
        const a = hash(i + 2) * Math.PI * 2 + WIND_SPIN * 1.6 * time + u * 1.4, r = 0.95 + 0.55 * hash(i + 3);
        const x = Math.cos(a) * r, z = Math.sin(a) * r, y = STREAK_MIN_Y + 0.9 * hash(i + 4) + 0.08 * Math.sin(u * Math.PI * 2);
        const life = Math.sin(u * Math.PI), len = 0.32 + 0.22 * hash(i + 5);
        // Góc nghiêng cố định từng vệt (không lật giữa chừng để khỏi giật hình).
        streaks.set(i, x, y, z, len, len * 0.5, life * (0.55 + 0.25 * rhythm.release), (hash(i + 6) - 0.5) * 0.04);
      }
      streaks.commit(); streaks.material.uniforms.opacity.value = 0.85 * f;
      for (let i = 0; i < moteN; i++) {
        const u = ((i / moteN + time * 0.035) % 1 + 1) % 1, a = i * 2.39996 + time * WIND_SPIN * 0.6;
        const r = 0.75 + 0.45 * hash(i + 40);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.3, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      if (mist) {
        for (let i = 0; i < mistN; i++) {
          const u = ((hash(i + 60) + time * 0.03) % 1 + 1) % 1, a = hash(i + 61) * Math.PI * 2 + WIND_SPIN * 0.8 * time;
          const r = 1.05 + 0.7 * hash(i + 62), s = 0.8 + 0.5 * hash(i + 63);
          mist.set(i, Math.cos(a) * r, 0.14 + 0.16 * hash(i + 64), Math.sin(a) * r, s, s * 0.42, Math.sin(u * Math.PI) * 0.4);
        }
        mist.commit(); mist.material.uniforms.opacity.value = f;
      }
      moteMat.opacity = (0.45 + 0.3 * rhythm.release) * f;
    },
    dispose() { streaks.dispose(); mist?.dispose(); moteGeo.dispose(); moteMat.dispose(); },
  };
}
