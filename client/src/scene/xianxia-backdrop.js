// Ghép cảnh tiên hiệp quanh tu viện: núi đá dựng, biển mây, đảo bay có thác, đàn hạc, trận pháp và linh khí.
// World gọi update mỗi khung với night 0..1 từ bầu trời.
import { createCloudSea } from './cloud-sea.js';
import { Cranes } from './cranes.js';
import { createFloatingIslands } from './floating-islands.js';
import { createKarstPeaks } from './karst-peaks.js';
import { SpiritFormation } from './spirit-formation.js';

export function createXianxiaBackdrop(scene, lowQuality) {
  scene.add(createKarstPeaks(lowQuality));
  const clouds = createCloudSea(lowQuality);
  scene.add(clouds.group);
  const islands = createFloatingIslands(lowQuality);
  scene.add(islands.group);
  const cranes = new Cranes(scene, lowQuality);
  const formation = new SpiritFormation(scene, lowQuality);
  return {
    update(dt, night) {
      clouds.update(dt, night);
      islands.update(dt);
      cranes.update(dt);
      formation.update(dt, night);
    },
  };
}
