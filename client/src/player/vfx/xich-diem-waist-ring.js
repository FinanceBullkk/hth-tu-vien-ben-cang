import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { fireStripMaterial } from './xich-diem-materials.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { RING, ringPoint } from './xich-diem-layout.js';
import { softDot } from './aura-rhythm.js';

// Vòng lửa NẰM NGANG quanh eo (như vành sao Thổ bằng lửa): dải lửa dẹt nằm ngang, sóng lượn chạy
// quanh vòng với tốc độ cố định, mào lửa nhỏ dọc mép trên, vòng hạt hỏa tinh bên trong trôi ngược
// chiều. Ba khóa mây cưỡi trên vòng nằm ở cloud-platform (chung hình cuộn tường vân).
const SEG = 128, BAND = 0.075, CREST = 0.085, UP = new THREE.Vector3(0, 1, 0);

export function createWaistRing(parent, colors, lowQuality) {
  const band = createRibbonStrips(1, SEG), crest = createRibbonStrips(1, SEG);
  const mats = [];
  const mesh = (geo, mat, name, order) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = order; m.frustumCulled = false;
    parent.add(m); mats.push(mat); return m;
  };
  mesh(band.geometry, fireStripMaterial(colors, 1), 'xich-diem-waist-ring', 9);
  if (!lowQuality) mesh(band.geometry, fireStripMaterial(colors, 1, 1), 'xich-diem-waist-ring-ink', 5);
  mesh(crest.geometry, fireStripMaterial(colors, 3), 'xich-diem-waist-crest', 9);
  const sparkN = lowQuality ? 14 : 30;
  const sparks = billboardLayer(parent, 'xich-diem-ring-sparks', softDot(), sparkN, colors.gold, THREE.AdditiveBlending);

  const c = new THREE.Vector3(), radial = new THREE.Vector3(), lift = new THREE.Vector3(), q = new THREE.Vector3();
  return {
    update(time, rhythm, f) {
      for (let j = 0; j <= SEG; j++) {
        const th = j / SEG * Math.PI * 2;
        ringPoint(th, time, c);
        radial.set(Math.sin(th), 0, Math.cos(th));
        band.write(0, j, c, radial, BAND);
        // Mào lửa: chân ở mép ngoài dải, dựng thẳng lên.
        q.copy(c).addScaledVector(radial, BAND * 0.6);
        const h = CREST * (0.75 + 0.25 * rhythm.gather);
        lift.copy(q).addScaledVector(UP, h / 2);
        crest.write(0, j, lift, UP, h / 2);
      }
      band.commit(); crest.commit();
      for (const m of mats) m.uniforms.time.value = time;
      mats.forEach((m, i) => {
        const base = m.uniforms.ink.value ? 0.6 : i === mats.length - 1 ? 0.8 : 0.95;
        m.uniforms.opacity.value = base * (1 + 0.15 * rhythm.gather) * f;
      });
      for (let i = 0; i < sparkN; i++) {
        const th = i * Math.PI * 2 / sparkN - time * 0.16;
        ringPoint(th, time, c, RING.r - 0.1 - 0.05 * hash(i + 7));
        const tw = 0.55 + 0.45 * Math.sin(time * 1.3 + i * 2.1);
        sparks.set(i, c.x, c.y + 0.02 * Math.sin(time * 0.8 + i), c.z, 0.06, 0.06, tw * 0.9 * f);
      }
      sparks.commit();
    },
    dispose() { sparks.dispose(); band.geometry.dispose(); crest.geometry.dispose(); mats.forEach(m => m.dispose()); },
  };
}
