import * as THREE from 'three';
import { billboardLayer } from './aura-billboard-layer.js';
import { bell, softDot, sstep } from './aura-rhythm.js';
import { cardFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas, sealStampTexture, starFlareTexture, sunburstTexture } from './than-bai-textures.js';

// Bài của Thần bài — lá bài là hộp 3D mỏng (mặt trước, mặt lưng, cạnh viền vàng), phủ ánh kim tuyến:
//  Quạt Thùng Phá Sảnh — bóng dáng riêng: năm lá 10 J Q K A bích xoè quạt lớn sau đầu như đuôi công,
//    hai mặt đều là mặt bài; nhịp thở xoè rộng thêm. Lúc "tất tay" (cao trào của nhịp) cả quạt lật sóng
//    từng lá một vòng, lóe sáng, ấn triện 賭神 đóng xuống trên đỉnh quạt rồi tan.
//  Hào quang tia vàng xoay chậm sau quạt.
//  Lốc bài — hai dải bài xoắn ốc ngược pha cuộn từ chân lên quá đầu, lá lộn nhào để lộ lưng sơn mài.
//    "VẠN BÀI QUY TÔNG" lúc tất tay: mọi lá trong lốc bay về xếp thành một vòng trận bài đứng quanh người
//    (mặt bài hướng ra, mép trên nhấp nhô như vương miện), xoay vòng, xoè bung rộng ra rồi tung trở lại lốc.
// Không có: rồng, mây, trăng, kiếm, sen, cánh.
export const FAN = { x: 0, y: 0.98, z: -0.58, radius: 0.62, spread: 0.42 };
export const STORM = { life: 8, height: 2.1, turns: 1.1 };
export const FORMATION = { radius: 1.02, y: 0.95, spin: 0.55 };
const FAN_CELLS = [CARD_CELLS.tenSpade, CARD_CELLS.jackSpade, CARD_CELLS.queenSpade, CARD_CELLS.kingSpade, CARD_CELLS.aceSpade];
const FAN_SIZE = new THREE.Vector3(0.46, 0.644, 0.012), STORM_SIZE = new THREE.Vector3(0.2, 0.28, 0.006);
const box = new THREE.BoxGeometry(1, 1, 1); // dùng chung, không dispose

/** Độ "tất tay" của nhịp: 0 ngoài cao trào, lên 1 quanh đỉnh nhịp (phase ≈ 0.45). */
export const allIn = rhythm => sstep(0.36, 0.44, rhythm.phase) * (1 - sstep(0.56, 0.7, rhythm.phase));

export function createThanBaiCards(parent, colors, lowQuality) {
  const atlas = cardAtlas(), stormCount = lowQuality ? 14 : 30;
  const cardMat = () => litMaterial(cardFragment, {
    map: { value: atlas }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0 },
  }, { side: THREE.FrontSide });
  const burst = billboardLayer(parent, 'than-bai-sunburst', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  burst.mesh.renderOrder = 3;
  const stamp = billboardLayer(parent, 'than-bai-seal-stamp', sealStampTexture(), 1, new THREE.Color(1, 1, 1), THREE.NormalBlending);
  stamp.mesh.renderOrder = 9;
  const fan = instancedLayer(parent, 'than-bai-royal-fan', box, cardMat(), FAN_CELLS.length, 6);
  const storm = instancedLayer(parent, 'than-bai-card-storm', box, cardMat(), stormCount, 7);
  // Quầng vàng mềm sau từng lá (quạt và lốc) cho lá bài như toả sáng; sao lóe lần lượt trên góc lá quạt.
  const fanGlow = billboardLayer(parent, 'than-bai-fan-glow', softDot(), FAN_CELLS.length, colors.gold.clone(), THREE.AdditiveBlending);
  fanGlow.mesh.renderOrder = 4;
  const stormGlow = billboardLayer(parent, 'than-bai-storm-glow', softDot(), lowQuality ? 0 : stormCount, colors.gold.clone(), THREE.AdditiveBlending);
  const glints = billboardLayer(parent, 'than-bai-fan-glints', starFlareTexture(), 3, colors.light.clone(), THREE.AdditiveBlending);
  glints.mesh.renderOrder = 9;
  const corner = new THREE.Vector3();
  const seeds = Array.from({ length: stormCount }, (_, i) => ({
    off: i / stormCount, strand: i % 2, cell: i % 11, tumble: 0.6 + (i * 37 % 10) / 10 * 0.8, tilt: ((i * 53) % 10) / 10 - 0.5,
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();
  const q2 = new THREE.Quaternion(), p2 = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const hit = allIn(rhythm), flash = bell(0.45, 0.035, rhythm.phase);
      burst.set(0, FAN.x, FAN.y + 0.5, FAN.z - 0.08, 2.6 + 0.5 * hit, 2.6 + 0.5 * hit, (0.24 + 0.18 * rhythm.pulse + 0.25 * flash) * f, (time * 0.012) % 1);
      burst.commit();

      // Ấn triện: rơi từ to xuống đúng cỡ (đóng dấu) ngay đỉnh nhịp, giữ một lúc rồi tan.
      const stampIn = sstep(0.43, 0.47, rhythm.phase), stampOut = 1 - sstep(0.6, 0.72, rhythm.phase);
      const stampScale = 0.5 * (1 + 1.4 * (1 - stampIn));
      stamp.set(0, 0, FAN.y + FAN.radius + 0.62, FAN.z + 0.05, stampScale, stampScale, stampIn * stampOut * f, 0.985);
      stamp.commit();

      // Quạt Thùng Phá Sảnh: xoè theo nhịp, lật sóng một vòng lúc tất tay.
      const spread = FAN.spread * (1 + 0.18 * rhythm.release + 0.12 * hit);
      FAN_CELLS.forEach((cell, i) => {
        const k = i - (FAN_CELLS.length - 1) / 2, a = k * spread + 0.015 * Math.sin(time * 1.3 + i);
        const flip = Math.PI * 2 * sstep(0.4 + i * 0.03, 0.53 + i * 0.03, rhythm.phase);
        p.set(FAN.x + Math.sin(a) * FAN.radius, FAN.y + Math.cos(a) * FAN.radius + 0.025 * Math.sin(time * 0.8 + i * 0.6), FAN.z - Math.abs(k) * 0.025);
        q.setFromEuler(e.set(-0.08, flip, -a, 'ZYX'));
        fan.set(i, m.compose(p, q, FAN_SIZE), f, cell, cell);
        fanGlow.set(i, p.x, p.y, p.z - 0.04, 0.95, 1.15, (0.28 + 0.12 * rhythm.pulse + 0.25 * flash) * f);
      });
      fan.commit(); fanGlow.commit();
      // Sao lóe: mỗi sao chạy qua đỉnh từng lá quạt, lóe mạnh ở giữa đường rồi tắt.
      for (let g = 0; g < 3; g++) {
        const u = ((time / 6 + g / 3) % 1 + 1) % 1, slot = Math.min(FAN_CELLS.length - 1, Math.floor(u * FAN_CELLS.length));
        const kk = slot - (FAN_CELLS.length - 1) / 2, a = kk * spread, tw = Math.pow(Math.sin(Math.PI * ((u * FAN_CELLS.length) % 1)), 4);
        corner.set(FAN.x + Math.sin(a) * (FAN.radius + FAN_SIZE.y * 0.42), FAN.y + Math.cos(a) * (FAN.radius + FAN_SIZE.y * 0.42), FAN.z + 0.03);
        glints.set(g, corner.x, corner.y, corner.z, 0.3 * tw + 0.001, 0.3 * tw + 0.001, tw * f, 0);
      }
      glints.commit();
      fan.material.uniforms.flash.value = 0.55 * flash + 0.12 * hit;

      // Lốc bài: hai dải xoắn ốc ngược pha, lá lộn nhào quanh trục tiếp tuyến. Lúc tất tay (hit) mỗi lá
      // trượt về chỗ của mình trong vòng trận bài; nửa sau cao trào vòng xoè rộng (spread) rồi trả lá về lốc.
      const ringOpen = sstep(0.5, 0.62, rhythm.phase);
      seeds.forEach(({ off, strand, cell, tumble, tilt }, i) => {
        const u = ((time / STORM.life + off) % 1 + 1) % 1;
        const th = strand * Math.PI + u * Math.PI * 2 * STORM.turns + off * 9;
        const r = 0.55 + 0.42 * Math.pow(Math.sin(Math.PI * u), 0.7) + 0.08 * hit;
        p.set(Math.sin(th) * r, 0.08 + STORM.height * u, Math.cos(th) * r);
        q.setFromEuler(e.set(u * Math.PI * 2 * tumble + tilt, th + Math.PI / 2, 0.5 * tilt + 0.3 * Math.sin(time * 0.6 + i), 'YXZ'));
        let alpha = Math.min(1, u * 10) * Math.min(1, (1 - u) * 6);
        if (hit > 0.001) {
          const phi = i / stormCount * Math.PI * 2 + time * FORMATION.spin, rf = FORMATION.radius + 0.7 * ringOpen;
          p2.set(Math.sin(phi) * rf, FORMATION.y + 0.1 * Math.sin(phi * 3 + time * 2) + 0.25 * ringOpen, Math.cos(phi) * rf);
          q2.setFromEuler(e.set(-0.18 - 0.3 * ringOpen, phi, 0, 'YXZ'));
          const k = hit * hit * (3 - 2 * hit);
          p.lerp(p2, k); q.slerp(q2, k);
          alpha += (1 - alpha) * k;
        }
        storm.set(i, m.compose(p, q, STORM_SIZE), alpha * f, cell, CARD_CELLS.back);
        if (i < stormGlow.mesh.count) stormGlow.set(i, p.x, p.y, p.z, 0.36, 0.36, alpha * (0.2 + 0.06 * hit) * f);
      });
      storm.commit(); stormGlow.commit();
      for (const layer of [fan, storm]) layer.material.uniforms.time.value = time;
      storm.material.uniforms.flash.value = 0.3 * flash;
    },
    dispose() { burst.dispose(); stamp.dispose(); fan.dispose(); storm.dispose(); fanGlow.dispose(); stormGlow.dispose(); glints.dispose(); },
  };
}
