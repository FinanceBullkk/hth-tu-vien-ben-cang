import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { fireStripMaterial } from './xich-diem-materials.js';
import { CLOUDS, DRIFT, spread } from './xich-diem-layout.js';

// Hai lớp dải lửa NẰM NGANG của Xích Diễm (không có ngọn lửa dựng đứng):
//  · lưỡi lửa liếm ngang khỏi đỉnh mỗi cuộn mây, ngả về phía sau theo chiều trôi của đài mây;
//  · lưu vân — vệt mây lửa dài trôi vòng sát mặt mây, nhanh hơn đài một chút (tốc độ cố định).
// Mỗi lớp có bản sáng cộng màu và bản mực đỏ thẫm (bỏ ở chất lượng thấp).
const TONGUE_SEG = 16, STREAM_SEG = 40, TONGUE_LEN = 0.7, UP = new THREE.Vector3(0, 1, 0);

function stripPair(parent, colors, strips, mode, name, lowQuality, mats) {
  const add = (ink, order) => {
    const m = fireStripMaterial(colors, mode, ink); mats.push(m);
    const mesh = new THREE.Mesh(strips.geometry, m);
    mesh.name = ink ? `${name}-ink` : name; mesh.renderOrder = order; mesh.frustumCulled = false; parent.add(mesh);
  };
  add(0, 8);
  if (!lowQuality) add(1, 5);
}

export function createFireStrips(parent, colors, lowQuality) {
  const tongueN = CLOUDS.length, streamN = lowQuality ? 2 : 4, mats = [];
  const tongues = createRibbonStrips(tongueN, TONGUE_SEG), streams = createRibbonStrips(streamN, STREAM_SEG);
  stripPair(parent, colors, tongues, 0, 'xich-diem-flame-tongues', lowQuality, mats);
  stripPair(parent, colors, streams, 2, 'xich-diem-streamers', lowQuality, mats);
  const c = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const drift = time * DRIFT, k = spread(rhythm);
      CLOUDS.forEach((cl, i) => {
        // Gốc ở đỉnh cuộn (đầu cuộn nhỏ trên cùng ≈ 0.55 chiều cao), lưỡi kéo ngược chiều trôi.
        const a0 = cl.a + drift + 0.04 * cl.flip, r0 = cl.r * k + 0.02, y0 = cl.lift + 0.5 * cl.s;
        for (let j = 0; j <= TONGUE_SEG; j++) {
          const u = j / TONGUE_SEG, r = r0 + 0.05 * u;
          const a = a0 - u * TONGUE_LEN * cl.s / r;
          const y = y0 + 0.09 * u + 0.025 * u * Math.sin(time * 1.1 + u * 4 + i * 1.3);
          c.set(Math.sin(a) * r, y, Math.cos(a) * r);
          tongues.write(i, j, c, UP, 0.1 * cl.s * Math.pow(1 - u, 0.6) + 0.004);
        }
      });
      for (let s = 0; s < streamN; s++) {
        const head = s * Math.PI * 2 / streamN + drift * 1.6 + 0.5, R = 1.32 + 0.12 * (s % 2);
        for (let j = 0; j <= STREAM_SEG; j++) {
          const u = j / STREAM_SEG, a = head - u * 1.5;
          const r = R + 0.06 * Math.sin(u * 3 + s), y = 0.13 + 0.07 * (s % 2) + 0.035 * Math.sin(u * 5 - time * 0.4 + s * 2);
          c.set(Math.sin(a) * r, y, Math.cos(a) * r);
          streams.write(s, j, c, UP, 0.075 * Math.pow(Math.sin(Math.PI * u), 0.6) * (1 + 0.1 * rhythm.release) + 0.003);
        }
      }
      tongues.commit(); streams.commit();
      for (const m of mats) {
        m.uniforms.time.value = time;
        const base = m.uniforms.ink.value ? 0.55 : m.uniforms.mode.value === 0 ? 0.9 : 0.75;
        m.uniforms.opacity.value = base * (1 + 0.12 * rhythm.gather) * f;
      }
    },
    dispose() { tongues.geometry.dispose(); streams.geometry.dispose(); mats.forEach(m => m.dispose()); },
  };
}
