import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';

// Kim Lý vượt sóng — bóng dáng chính của Vua câu cá: cá chép vàng khổng lồ bơi vòng tròn đứng sau lưng,
// vọt khỏi mặt biển bên phải, vồng qua sau đầu rồi lặn xuống bên trái (nửa dưới vòng nằm dưới mặt nước,
// bị cắt bởi shader). Đuôi kéo dải kim quang, nước nhỏ thành vệt cung, hai chỗ xuyên mặt nước toé bọt.
export const LOOP = { x: 0, y: 0.5, z: -0.8, radius: 1.12, period: 7.2 };
export const CARP = { length: 1.35, height: 0.34, width: 0.19 };
const SPAN = CARP.length / LOOP.radius, TRAIL_SPAN = 1.25, DRIPS = 16, SPRAY = 14;

/** Góc đầu cá trên vòng ở thời điểm time (tăng dần: lên bên phải, qua đỉnh, xuống bên trái). */
export const carpHeadAngle = time => time / LOOP.period * Math.PI * 2 - 0.6;
/** Điểm trên vòng ở góc a (mặt phẳng đứng sau lưng, lắc nhẹ trước sau). */
export function loopPoint(a, time, out) {
  return out.set(LOOP.x + Math.cos(a) * LOOP.radius, LOOP.y + Math.sin(a) * LOOP.radius, LOOP.z + 0.1 * Math.sin(a * 2 + time * 0.4));
}
// Hai góc vòng cắt mặt nước (y = 0): vọt lên bên phải, lặn bên trái.
const CROSS = Math.asin(-LOOP.y / LOOP.radius);
export const EMERGE_ANGLE = CROSS, DIVE_ANGLE = Math.PI - CROSS;

export function createGiantCarp(parent, bodies, index, colors, lowQuality) {
  const up = new THREE.Vector3(), p = new THREE.Vector3(), tail = new THREE.Vector3(), side = new THREE.Vector3(0, 0, 1);
  const seg = lowQuality ? 16 : 32, strips = createRibbonStrips(1, seg);
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.aqua }, core: { value: colors.light }, gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const trail = new THREE.Mesh(strips.geometry, trailMat); trail.name = 'vua-cau-ca-carp-trail'; trail.frustumCulled = false; trail.renderOrder = 7;
  parent.add(trail);
  const water = billboardLayer(parent, 'vua-cau-ca-carp-water', softDot(), DRIPS + SPRAY * 2, colors.foam.clone(), THREE.AdditiveBlending);
  const crossings = [EMERGE_ANGLE, DIVE_ANGLE].map(a => loopPoint(a, 0, new THREE.Vector3()).setY(0.02));

  // Thân cá có đang xuyên qua góc a không (0..1, mềm ở hai đầu).
  const through = (head, a) => {
    const d = ((head - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return d < SPAN + 0.15 ? Math.min(1, d / 0.12, (SPAN + 0.15 - d) / 0.2) : 0;
  };

  return {
    update(time, rhythm, f) {
      const head = carpHeadAngle(time);
      up.set(Math.cos(head), Math.sin(head), 0);
      bodies.pose(index, (u, out) => loopPoint(head - u * SPAN, time, out), up, time, 0);

      // Dải kim quang bám đuôi, tan dần.
      for (let j = 0; j <= seg; j++) {
        const t = j / seg, a = head - SPAN - t * TRAIL_SPAN;
        loopPoint(a, time, p);
        p.z += 0.06 * Math.sin(t * 9 - time * 3);
        strips.write(0, j, p, side, 0.09 * Math.pow(1 - t, 1.2) * Math.min(1, t * 8 + 0.3) * (p.y > 0.05 ? 1 : 0));
      }
      strips.commit();
      trailMat.uniforms.time.value = time; trailMat.uniforms.opacity.value = (0.75 + 0.25 * rhythm.pulse) * f;

      // Nước nhỏ từ đuôi: vị trí đuôi ở các khoảnh khắc trước, rơi tự do theo thời gian đã trôi.
      for (let k = 0; k < DRIPS; k++) {
        const dt = (k + 1) * 0.07, a = carpHeadAngle(time - dt) - SPAN;
        loopPoint(a, time - dt, tail);
        const y = tail.y - 4.9 * dt * dt, seen = tail.y > 0.05 && y > 0.02;
        const size = 0.045 * (1 - k / DRIPS) + 0.015;
        water.set(k, tail.x + (hash(k) - 0.5) * 0.08, Math.max(0.02, y), tail.z + (hash(k + 9) - 0.5) * 0.08, size, size * 1.4, seen ? (1 - k / DRIPS) * 0.9 * f : 0);
      }
      // Bọt toé ở chỗ thân cá xuyên mặt nước.
      crossings.forEach((at, e) => {
        const on = through(head, e ? DIVE_ANGLE : EMERGE_ANGLE);
        for (let k = 0; k < SPRAY; k++) {
          const u = ((time / 0.8 + k / SPRAY) % 1 + 1) % 1, th = k * 2.4 + e;
          const r = 0.06 + 0.35 * u, size = 0.07 * (1 - u) + 0.02;
          water.set(DRIPS + e * SPRAY + k, at.x + Math.cos(th) * r * 0.6, 0.03 + (1.4 + hash(k + e * 31)) * u - 2.2 * u * u, at.z + Math.sin(th) * r,
            size, size, on * (1 - u) * f);
        }
      });
      water.commit();
    },
    dispose() { strips.geometry.dispose(); trailMat.dispose(); water.dispose(); },
  };
}
