import * as THREE from 'three';
import { billboardLayer } from './aura-billboard-layer.js';
import { bell, sstep } from './aura-rhythm.js';
import { cardFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas, sealStampTexture, sunburstTexture } from './than-bai-textures.js';

// Bài của Thần bài — lá bài là hộp 3D mỏng (mặt trước, mặt lưng, cạnh viền vàng), phủ ánh kim tuyến.
// Nguyên tắc chuyển động: ÍT, TO, CHẬM — như thần bài ung dung, không có gì bay vèo hay lộn nhào loạn.
//  Quạt Thùng Phá Sảnh — bóng dáng riêng: năm lá 10 J Q K A bích xoè quạt lớn sau đầu như đuôi công,
//    hai mặt đều là mặt bài; nhịp thở xoè rộng thêm. Lúc "tất tay" quạt lật sóng chậm từng lá một vòng,
//    lóe sáng, ấn triện 賭神 đóng xuống trên đỉnh quạt rồi tan.
//  Hào quang tia vàng xoay rất chậm sau quạt.
//  THIÊN BÀI HOÀN — mười hai lá bài lớn trôi thành một vành nghiêng quanh ngực, mặt bài hướng ra, 24 giây
//    mới quay hết một vòng; từng lá lần lượt lật chậm một vòng (lộ lưng sơn mài rồi về mặt bài) như gợn sóng.
//    Lúc tất tay vành bài nâng lên thành VƯƠNG MIỆN quanh đầu (phẳng lại, lá ngả ra như cánh hoa), mặt bài
//    lóe sáng, rồi hạ xuống êm.
// Không có: rồng, mây, trăng, kiếm, sen, cánh.
export const FAN = { x: 0, y: 0.98, z: -0.58, radius: 0.62, spread: 0.42 };
export const ORBIT = { radius: 0.98, y: 0.82, tilt: 0.22, period: 24, flipEvery: 2.2, flipTime: 1.6 };
export const CROWN = { radius: 1.2, y: 1.55 };
export const ORBIT_SPEED = Math.PI * 2 / ORBIT.period;
const FAN_CELLS = [CARD_CELLS.tenSpade, CARD_CELLS.jackSpade, CARD_CELLS.queenSpade, CARD_CELLS.kingSpade, CARD_CELLS.aceSpade];
const FAN_SIZE = new THREE.Vector3(0.46, 0.644, 0.012), HALO_SIZE = new THREE.Vector3(0.22, 0.308, 0.008);
const HALO_CELLS = [CARD_CELLS.aceSpade, CARD_CELLS.kingHeart, CARD_CELLS.aceDiamond, CARD_CELLS.queenDiamond, CARD_CELLS.aceClub, CARD_CELLS.jackClub,
  CARD_CELLS.aceHeart, CARD_CELLS.kingSpade, CARD_CELLS.queenSpade, CARD_CELLS.jackSpade, CARD_CELLS.tenSpade, CARD_CELLS.aceSpade];
const box = new THREE.BoxGeometry(1, 1, 1); // dùng chung, không dispose
const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);

/** Độ "tất tay" của nhịp: 0 ngoài cao trào, lên 1 quanh đỉnh nhịp (phase ≈ 0.45), giữ một lúc rồi hạ êm. */
export const allIn = rhythm => sstep(0.34, 0.46, rhythm.phase) * (1 - sstep(0.64, 0.8, rhythm.phase));

/** Góc lật của lá thứ i trong vành (0 = mặt bài hướng ra; lật đủ một vòng trong ORBIT.flipTime giây). */
export function haloFlip(i, count, time) {
  const cycle = count * ORBIT.flipEvery, t = ((time - i * ORBIT.flipEvery) % cycle + cycle) % cycle;
  return t < ORBIT.flipTime ? Math.PI * 2 * smoother(t / ORBIT.flipTime) : 0;
}

export function createThanBaiCards(parent, colors, lowQuality) {
  const atlas = cardAtlas(), haloCount = lowQuality ? 8 : 12;
  const cardMat = () => litMaterial(cardFragment, {
    map: { value: atlas }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0 },
  }, { side: THREE.FrontSide });
  const burst = billboardLayer(parent, 'than-bai-sunburst', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  burst.mesh.renderOrder = 3;
  const stamp = billboardLayer(parent, 'than-bai-seal-stamp', sealStampTexture(), 1, new THREE.Color(1, 1, 1), THREE.NormalBlending);
  stamp.mesh.renderOrder = 9;
  const fan = instancedLayer(parent, 'than-bai-royal-fan', box, cardMat(), FAN_CELLS.length, 6);
  const halo = instancedLayer(parent, 'than-bai-card-halo', box, cardMat(), haloCount, 7);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const hit = allIn(rhythm), k = smoother(hit), flash = bell(0.46, 0.045, rhythm.phase);
      burst.set(0, FAN.x, FAN.y + 0.5, FAN.z - 0.08, 2.6 + 0.4 * k, 2.6 + 0.4 * k, (0.26 + 0.22 * rhythm.pulse + 0.35 * flash) * f, (time * 0.008) % 1);
      burst.commit();

      // Ấn triện: rơi từ to xuống đúng cỡ (đóng dấu) ngay đỉnh nhịp, giữ một lúc rồi tan.
      const stampIn = sstep(0.43, 0.48, rhythm.phase), stampOut = 1 - sstep(0.64, 0.78, rhythm.phase);
      const stampScale = 0.5 * (1 + 1.2 * (1 - smoother(stampIn)));
      stamp.set(0, 0, FAN.y + FAN.radius + 0.62, FAN.z + 0.05, stampScale, stampScale, stampIn * stampOut * f, 0.985);
      stamp.commit();

      // Quạt Thùng Phá Sảnh: xoè theo nhịp, lật sóng chậm một vòng lúc tất tay.
      const spread = FAN.spread * (1 + 0.15 * rhythm.release + 0.1 * k);
      FAN_CELLS.forEach((cell, i) => {
        const j = i - (FAN_CELLS.length - 1) / 2, a = j * spread + 0.01 * Math.sin(time * 0.6 + i);
        const flip = Math.PI * 2 * smoother(sstep(0.4 + i * 0.04, 0.54 + i * 0.04, rhythm.phase));
        p.set(FAN.x + Math.sin(a) * FAN.radius, FAN.y + Math.cos(a) * FAN.radius + 0.02 * Math.sin(time * 0.5 + i * 0.6), FAN.z - Math.abs(j) * 0.025);
        q.setFromEuler(e.set(-0.08, flip, -a, 'ZYX'));
        fan.set(i, m.compose(p, q, FAN_SIZE), f, cell, cell);
      });
      fan.commit();
      fan.material.uniforms.flash.value = 0.5 * flash + 0.1 * k;

      // Thiên Bài Hoàn: vành nghiêng trôi chậm; tất tay thì nâng thành vương miện quanh đầu.
      const R = ORBIT.radius + (CROWN.radius - ORBIT.radius) * k, Y = ORBIT.y + (CROWN.y - ORBIT.y) * k;
      const tilt = ORBIT.tilt * (1 - k), lean = 0.12 - 0.55 * k;
      for (let i = 0; i < haloCount; i++) {
        const phi = i / haloCount * Math.PI * 2 + time * ORBIT_SPEED;
        const x = Math.sin(phi) * R, z = Math.cos(phi) * R;
        p.set(x, Y + z * Math.sin(tilt) + 0.035 * Math.sin(time * 0.7 + i * 0.9), z * Math.cos(tilt));
        q.setFromEuler(e.set(lean, phi + haloFlip(i, haloCount, time) * (1 - k), 0, 'YXZ'));
        halo.set(i, m.compose(p, q, HALO_SIZE), f, HALO_CELLS[i % HALO_CELLS.length], CARD_CELLS.back);
      }
      halo.commit();
      for (const layer of [fan, halo]) layer.material.uniforms.time.value = time;
      halo.material.uniforms.flash.value = 0.35 * flash + 0.15 * k;
    },
    dispose() { burst.dispose(); stamp.dispose(); fan.dispose(); halo.dispose(); },
  };
}
