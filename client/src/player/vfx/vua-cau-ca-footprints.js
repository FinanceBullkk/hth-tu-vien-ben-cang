import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { rippleTexture } from './vua-cau-ca-textures.js';
import { createFootprintTrail } from './vip-aura-footprints.js';

// Dấu chân Vua câu cá: mỗi bước đạp xuống như đạp lên mặt nước — một vũng gợn loang rộng dần rồi tan,
// kèm vài giọt nước toé lên lúc vừa đặt chân.
const PRINTS = 12, LIFE = 2.2, DROPS = 3;

export function createVuaCauCaFootprints(parent, colors) {
  const trail = createFootprintTrail(parent, PRINTS, { every: 0.3, life: LIFE });
  const rings = atlasPlaneLayer(parent, 'vua-cau-ca-footprint-ripples', rippleTexture(), PRINTS * 2,
    { tint: colors.aqua.clone(), blending: THREE.AdditiveBlending, renderOrder: 3 });
  const drops = billboardLayer(parent, 'vua-cau-ca-footprint-splash', softDot(), PRINTS * DROPS, colors.foam.clone(), THREE.AdditiveBlending);
  const m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  return {
    update(time, rhythm, f, walk = 0) {
      trail.update(time, walk, (i, local, age, seed) => {
        for (let k = 0; k < 2; k++) {
          // Hai vòng gợn lệch nhịp: vòng trong nhỏ đậm, vòng ngoài loang rộng nhạt.
          const a = Math.max(0, age - k * 0.15) / (1 - k * 0.15), size = 0.12 + (0.55 + 0.25 * k) * Math.sqrt(a);
          if (!local || age < k * 0.15) rings.set(i * 2 + k, m.makeScale(0, 0, 0), 0);
          else rings.set(i * 2 + k, m.compose(p.copy(local).setY(0.018 + k * 0.002), flat, s.set(size, size, 1)), Math.pow(1 - a, 1.5) * 0.85 * f);
        }
        for (let d = 0; d < DROPS; d++) {
          const j = i * DROPS + d, dt = age * LIFE;
          if (!local || dt > 0.45) { drops.set(j, 0, -1, 0, 0, 0, 0); continue; }
          const th = d / DROPS * Math.PI * 2 + hash(seed) * 6, v = 0.3 + 0.2 * hash(seed + d);
          drops.set(j, local.x + Math.cos(th) * v * dt, 0.03 + 0.9 * dt - 4.9 * dt * dt + 0.02, local.z + Math.sin(th) * v * dt,
            0.04, 0.04, (1 - dt / 0.45) * f);
        }
      });
      rings.commit(); drops.commit();
    },
    dispose() { rings.dispose(); drops.dispose(); },
  };
}
