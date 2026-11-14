import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { cardFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas, sunburstTexture } from './than-bai-textures.js';
import { starFlareTexture } from './than-bai-deco-textures.js';
import { ACE } from './than-bai-climax.js';

// ÁT CHỦ BÀI — khoảnh khắc ra tay của Thần bài: lá Át bích khổng lồ bật ra (từ nhỏ phóng to hơi vượt cỡ rồi về),
// xoay lật hiện ra ngay sau đầu, sao lóe bốn cánh và tia vàng xoay chậm sau lá; lơ lửng nghiêng nhẹ một
// nhịp; rồi vỡ thành mảnh bài vàng văng ra có lực cản không khí (chậm dần), vừa rơi vừa lật lả tả và tan.
const ACE_SIZE = new THREE.Vector3(0.62, 0.868, 0.016), SHARD = new THREE.Vector3(0.085, 0.119, 0.004);
const DRAG = 2.2, GRAVITY = 1.6;
const backOut = t => { const s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };

export function createAceOfSpades(parent, colors, lowQuality) {
  const shardCount = lowQuality ? 12 : 26, atlas = cardAtlas();
  const cardMat = () => litMaterial(cardFragment, {
    map: { value: atlas }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0 },
  });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const ace = instancedLayer(parent, 'than-bai-ace-of-spades', box, cardMat(), 1, 8);
  const shards = instancedLayer(parent, 'than-bai-ace-shards', box, cardMat(), shardCount, 8);
  const rays = billboardLayer(parent, 'than-bai-ace-rays', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  rays.mesh.renderOrder = 4;
  const flare = billboardLayer(parent, 'than-bai-ace-flare', starFlareTexture(), 2, colors.light.clone(), THREE.AdditiveBlending);
  flare.mesh.renderOrder = 9;
  const seeds = Array.from({ length: shardCount }, (_, i) => ({
    ox: (hash(i + 1) - 0.5) * ACE_SIZE.x, oy: (hash(i + 2) - 0.5) * ACE_SIZE.y,
    vx: (hash(i + 3) - 0.5) * 3.2, vy: 0.6 + hash(i + 4) * 1.6, vz: 0.4 + hash(i + 5) * 1.4,
    rx: (hash(i + 6) - 0.5) * 9, ry: (hash(i + 7) - 0.5) * 7, cell: Math.floor(hash(i + 8) * 12),
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

  return {
    /** t: một mục của aceTimeline (present, reveal, burst, flash, shatter). */
    update(time, rhythm, f, t) {
      const pop = t.reveal > 0 ? backOut(Math.min(1, t.reveal * 1.25)) : 0;
      const scale = Math.max(0.001, 0.25 + 0.75 * pop);
      p.set(ACE.x, ACE.y + 0.03 * Math.sin(time * 1.2), ACE.z);
      // Xoay lật nửa vòng khi bật ra rồi lơ lửng nghiêng nhẹ; hai mặt đều là Át bích để nhìn từ sau lưng hay
      // từ trước mặt đều thấy (người chơi thường nhìn nhân vật mình từ sau lưng).
      q.setFromEuler(e.set(-0.06, Math.PI * (1 - t.reveal) + 0.2 * Math.sin(time * 0.7) * t.reveal, 0.05 * Math.sin(time * 0.9)));
      ace.set(0, m.compose(p, q, s.copy(ACE_SIZE).multiplyScalar(scale)), t.present * f, CARD_CELLS.aceSpade, CARD_CELLS.aceSpade);
      ace.commit();
      ace.material.uniforms.time.value = time;
      ace.material.uniforms.flash.value = 0.15 + 0.9 * t.flash + 0.15 * Math.sin(time * 2) * t.present;

      rays.set(0, ACE.x, ACE.y, ACE.z - 0.08, 3.0 * t.burst, 3.0 * t.burst, 0.55 * t.burst * f, (time * 0.01) % 1);
      rays.commit();
      flare.set(0, ACE.x, ACE.y, ACE.z + 0.06, 2.4 * t.flash + 0.001, 2.4 * t.flash + 0.001, t.flash * f, 0);
      // Sao nhỏ lóe trên góc lá Át trong lúc giữ.
      const tw = Math.pow(Math.max(0, Math.sin(time * 1.6)), 4) * t.present;
      flare.set(1, ACE.x + ACE_SIZE.x * 0.42, ACE.y + ACE_SIZE.y * 0.44, ACE.z + 0.03, 0.35 * tw + 0.001, 0.35 * tw + 0.001, tw * f, 0.125);
      flare.commit();

      // Mảnh vỡ: văng ra có lực cản (vận tốc giảm theo hàm mũ), trọng lực kéo xuống, lật theo lực cản.
      const age = t.shatter * 2.6;
      for (let i = 0; i < shardCount; i++) {
        const sd = seeds[i];
        if (!(t.shatter > 0 && t.shatter < 1)) { shards.set(i, m.makeScale(0, 0, 0), 0); continue; }
        const k = (1 - Math.exp(-DRAG * age)) / DRAG;
        p.set(ACE.x + sd.ox + sd.vx * k, ACE.y + sd.oy + sd.vy * k - GRAVITY * age * age * 0.5, ACE.z + sd.vz * k);
        q.setFromEuler(e.set(sd.rx * k, sd.ry * k + time * 0.5, sd.rx * 0.3 * k));
        shards.set(i, m.compose(p, q, SHARD), Math.min(1, (1 - t.shatter) * 2.5) * f, sd.cell, CARD_CELLS.back);
      }
      shards.commit();
      shards.material.uniforms.time.value = time; shards.material.uniforms.flash.value = 0.35 * (1 - Math.max(0, t.shatter));
    },
    dispose() { ace.dispose(); shards.dispose(); box.dispose(); rays.dispose(); flare.dispose(); },
  };
}
