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
//  "VẠN BÀI QUY TÔNG" — chỉ lúc tất tay: mười hai lá bài hiện ra ngay ngắn (phóng từ nhỏ ra) thành một vòng trận
//    bài đứng quanh người, mặt bài hướng ra, mép trên nhấp nhô nhẹ như vương miện, xoay chậm, nở rộng rồi tan.
//    Lúc thường KHÔNG có lá bài nào bay quanh người (bản lốc bài lộn nhào bị chê rối như rác).
// Không có: rồng, mây, trăng, kiếm, sen, cánh.
export const FAN = { x: 0, y: 0.98, z: -0.58, radius: 0.62, spread: 0.42 };
export const FORMATION = { radius: 1.02, y: 0.95, spin: 0.55 };
const FAN_CELLS = [CARD_CELLS.tenSpade, CARD_CELLS.jackSpade, CARD_CELLS.queenSpade, CARD_CELLS.kingSpade, CARD_CELLS.aceSpade];
const FAN_SIZE = new THREE.Vector3(0.46, 0.644, 0.012), RING_SIZE = new THREE.Vector3(0.22, 0.308, 0.008);
const RING_CELLS = [4, 8, 9, 10, 5, 6, 7, 0, 1, 2, 3, 4]; // Át bích, K♥ Q♦ J♣, ba Át còn lại, 10 J Q K bích
const box = new THREE.BoxGeometry(1, 1, 1); // dùng chung, không dispose

/** Độ "tất tay" của nhịp: 0 ngoài cao trào, lên 1 quanh đỉnh nhịp (phase ≈ 0.45). */
export const allIn = rhythm => sstep(0.36, 0.44, rhythm.phase) * (1 - sstep(0.56, 0.7, rhythm.phase));

export function createThanBaiCards(parent, colors, lowQuality) {
  const atlas = cardAtlas(), ringCount = lowQuality ? 8 : 12;
  const cardMat = () => litMaterial(cardFragment, {
    map: { value: atlas }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0 },
  }, { side: THREE.FrontSide });
  const burst = billboardLayer(parent, 'than-bai-sunburst', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  burst.mesh.renderOrder = 3;
  const stamp = billboardLayer(parent, 'than-bai-seal-stamp', sealStampTexture(), 1, new THREE.Color(1, 1, 1), THREE.NormalBlending);
  stamp.mesh.renderOrder = 9;
  const fan = instancedLayer(parent, 'than-bai-royal-fan', box, cardMat(), FAN_CELLS.length, 6);
  const ring = instancedLayer(parent, 'than-bai-card-formation', box, cardMat(), ringCount, 7);
  // Quầng vàng mềm sau từng lá quạt cho lá bài như toả sáng; sao lóe lần lượt trên góc lá quạt.
  const fanGlow = billboardLayer(parent, 'than-bai-fan-glow', softDot(), FAN_CELLS.length, colors.gold.clone(), THREE.AdditiveBlending);
  fanGlow.mesh.renderOrder = 4;
  const glints = billboardLayer(parent, 'than-bai-fan-glints', starFlareTexture(), 3, colors.light.clone(), THREE.AdditiveBlending);
  glints.mesh.renderOrder = 9;
  const corner = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

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

      // Vạn Bài Quy Tông: lá hiện lần lượt quanh vòng (phóng từ nhỏ ra), xoay chậm, nửa sau nở rộng rồi tan.
      const ringOpen = sstep(0.5, 0.62, rhythm.phase);
      for (let i = 0; i < ringCount; i++) {
        const pop = sstep(0.36 + i * 0.006, 0.42 + i * 0.006, rhythm.phase) * (1 - sstep(0.58, 0.7, rhythm.phase));
        const phi = i / ringCount * Math.PI * 2 + time * FORMATION.spin, rf = FORMATION.radius + 0.5 * ringOpen;
        p.set(Math.sin(phi) * rf, FORMATION.y + 0.08 * Math.sin(phi * 3 + time) + 0.2 * ringOpen, Math.cos(phi) * rf);
        q.setFromEuler(e.set(-0.15 - 0.25 * ringOpen, phi, 0, 'YXZ'));
        ring.set(i, m.compose(p, q, s.copy(RING_SIZE).multiplyScalar(Math.max(0.001, pop))), pop * f, RING_CELLS[i % RING_CELLS.length], CARD_CELLS.back);
      }
      ring.commit();
      for (const layer of [fan, ring]) layer.material.uniforms.time.value = time;
      ring.material.uniforms.flash.value = 0.25 * flash + 0.1;
    },
    dispose() { burst.dispose(); stamp.dispose(); fan.dispose(); ring.dispose(); fanGlow.dispose(); glints.dispose(); },
  };
}
