import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stamenMaterial, tickAll } from './sen-kim-materials.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { STAMEN } from './sen-kim-layout.js';

// Bồ nhụy sau lưng: một túi nhụy sáng nhỏ y ngực đặt sau người, năm sợi chỉ vàng vươn lên
// lệch nhau, đầu sợi đọng hạt sáng. Nhịp thở làm cả cụm nở sáng nhẹ — không dựng khung,
// không vòm, chỉ là tâm sen hé lộ sau lưng.
export function createStamens(parent, colors, lowQuality) {
  const owned = [], ticks = [];
  const coreMat = new THREE.MeshBasicMaterial({ color: colors.core, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  owned.push(coreMat);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), coreMat);
  owned.push(core.geometry);
  core.name = 'sen-kim-stamen-core'; core.renderOrder = 8;
  core.position.set(0, STAMEN.y, STAMEN.z); parent.add(core);

  const n = lowQuality ? 3 : STAMEN.filaments;
  const tubes = [];
  for (let i = 0; i < n; i++) {
    const side = i / Math.max(1, n - 1) * 2 - 1; // −1..1 trải quanh lưng
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.13, 0.5, STAMEN.z + 0.14),
      new THREE.Vector3(side * 0.2, 0.63, STAMEN.z + 0.04),
      new THREE.Vector3(side * 0.26, STAMEN.y + 0.1, STAMEN.z - 0.02),
    ]);
    const tube = new THREE.TubeGeometry(curve, 16, 0.008 + (i % 2) * 0.003, 5, false);
    tubes.push(tube);
  }
  const mat = stamenMaterial(colors); owned.push(mat);
  ticks.push({ m: mat, base: 0.7, breathe: 0.2 });
  const filaments = new THREE.Mesh(mergeGeometries(tubes), mat);
  owned.push(filaments.geometry);
  tubes.forEach(t => t.dispose());
  filaments.name = 'sen-kim-stamens'; filaments.renderOrder = 8; parent.add(filaments);

  const tips = lowQuality ? null
    : billboardLayer(parent, 'sen-kim-stamen-tips', softDot(), n, colors.gold, THREE.AdditiveBlending);

  const tip = new THREE.Vector3();
  return {
    update(time, rhythm, f) {
      coreMat.opacity = (0.45 + 0.25 * rhythm.pulse) * f;
      tickAll(ticks, time, rhythm, f);
      if (tips) {
        for (let i = 0; i < n; i++) {
          const side = i / (n - 1) * 2 - 1;
          tip.set(side * 0.26, STAMEN.y + 0.1, STAMEN.z - 0.02);
          const tw = 0.5 + 0.5 * Math.sin(time * 1.1 + i * 2.3);
          tips.set(i, tip.x, tip.y, tip.z, 0.05, 0.05, (0.35 + 0.4 * tw) * f);
        }
        tips.commit();
      }
    },
    dispose() { tips?.dispose(); owned.forEach(o => o.dispose()); },
  };
}
