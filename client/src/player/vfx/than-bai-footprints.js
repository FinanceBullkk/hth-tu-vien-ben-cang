import * as THREE from 'three';
import { hash } from './aura-billboard-layer.js';
import { cardFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas } from './than-bai-textures.js';
import { createFootprintTrail } from './vip-aura-footprints.js';

// Dấu chân Thần bài: mỗi bước một lá bài 3D xoay tròn rơi xuống, nằm ngửa trên đất (mặt bài ngẫu nhiên,
// ánh kim tuyến), rồi mờ dần — đi tới đâu rải bài tới đó.
const PRINTS = 12, LIFE = 3.2;
const box = new THREE.BoxGeometry(1, 1, 1); // dùng chung, không dispose
const SIZE = new THREE.Vector3(0.17, 0.24, 0.005);

export function createThanBaiFootprints(parent, colors) {
  const trail = createFootprintTrail(parent, PRINTS, { every: 0.3, life: LIFE });
  const cards = instancedLayer(parent, 'than-bai-footprint-cards', box, litMaterial(cardFragment, {
    map: { value: cardAtlas() }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0 },
  }), PRINTS, 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();

  return {
    update(time, rhythm, f, walk = 0) {
      trail.update(time, walk, (i, local, age, seed) => {
        if (!local) { cards.set(i, m.makeScale(0, 0, 0), 0); return; }
        const land = Math.min(1, age / 0.1), drop = 1 - land;
        p.copy(local); p.y += 0.4 * drop * drop;
        // Rơi xoay rồi nằm ngửa (mặt trước hướng lên trời), góc nằm ngẫu nhiên theo seed.
        q.setFromEuler(e.set(-Math.PI / 2 + drop * 2.5, hash(seed) * 6.28 + drop * 4, 0, 'YXZ'));
        const alpha = Math.min(1, (1 - age) / 0.4);
        cards.set(i, m.compose(p, q, SIZE), alpha * f, Math.floor(hash(seed + 7) * 11), CARD_CELLS.back);
      });
      cards.commit();
      cards.material.uniforms.time.value = time;
    },
    dispose() { cards.dispose(); },
  };
}
