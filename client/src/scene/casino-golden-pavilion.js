// Kim Ngân Lâu: lầu hai tầng sát tường bắc Kim Ngân Phường, làm phông nền cho lối giữa sòng.
// Tầng dưới hiên cột son cửa bức bàn, ban công lan can vàng, tầng trên treo biển và hai đồng tiền vàng,
// mái lưu ly vàng nóc son, hồ lô vàng trên nóc. Không vào được: hộp va chạm CASINO_HALL trong shared/layout.js.
import * as THREE from 'three';
import { CASINO_HALL } from '../../../shared/layout.js';
import { PALACE, bracketBand, latticeDoor, palacePlaque, palaceRoof, redColumn } from './palace-kit.js';

const GROUND_H = 3.4;
const BASE_H = 0.4;

/** Đồng tiền vàng lỗ vuông dựng đứng, mặt quay về +z. */
function coinEmblem(b, x, y, z, r = 0.32) {
  b.cyl(r, r, 0.08, PALACE.gold, x, y, z, { seg: 16, rx: Math.PI / 2 });
  b.cyl(r * 0.76, r * 0.76, 0.1, PALACE.goldTileDark, x, y, z, { seg: 16, rx: Math.PI / 2 });
  b.box(r * 0.48, r * 0.48, 0.12, PALACE.redDark, x, y, z);
}

/**
 * Dựng lầu vào batch b; tấm sáng sau song cửa vào batch glow (sáng lên ban đêm).
 * Trả về vị trí đèn lồng treo dưới hiên để gộp chung với dây đèn của sòng.
 */
export function buildGoldenPavilion(group, b, glow) {
  const { x, z, halfW: hw, halfD: hd } = CASINO_HALL;
  const front = z + hd;
  b.box(hw * 2 + 0.6, BASE_H, hd * 2 + 0.6, PALACE.marbleShade, x, BASE_H / 2, z);

  // Tầng dưới: tường son ba mặt, mặt trước cửa bức bàn giữa hàng cột son.
  b.box(hw * 2 - 0.4, GROUND_H, 0.4, PALACE.wallRed, x, BASE_H + GROUND_H / 2, z - hd + 0.4);
  for (const s of [-1, 1]) b.box(0.4, GROUND_H, hd * 2 - 0.8, PALACE.wallRed, x + s * (hw - 0.2), BASE_H + GROUND_H / 2, z);
  const cols = [-hw, -hw * 0.6, -hw * 0.2, hw * 0.2, hw * 0.6, hw];
  for (const dx of cols) redColumn(b, x + dx, front - 0.3, GROUND_H, BASE_H, 0.24);
  for (let i = 0; i < cols.length - 1; i++) {
    const w = cols[i + 1] - cols[i];
    const cx = x + (cols[i] + cols[i + 1]) / 2;
    const doors = 2;
    for (let k = 0; k < doors; k++) {
      latticeDoor(b, w / doors - 0.08, GROUND_H - 0.7, cx - w / 2 + (k + 0.5) * (w / doors), BASE_H, front - 0.85);
    }
    // Tấm sáng nằm giữa mặt cửa và song vàng (song nổi 0.09 trước tâm cửa).
    glow.box(w - 0.3, (GROUND_H - 0.7) * 0.42, 0.02, '#ffc76f', cx, BASE_H + (GROUND_H - 0.7) * 0.79 - 0.12, front - 0.785);
  }
  b.box(hw * 2 + 0.4, 0.3, 0.3, PALACE.redDark, x, BASE_H + GROUND_H - 0.05, front - 0.3);
  bracketBand(b, hw * 2 + 0.6, x, BASE_H + GROUND_H + 0.28, front - 0.3);
  palaceRoof(b, hw * 2 + 1.8, hd * 2 + 1.6, 1.2, x, BASE_H + GROUND_H + 0.45, z + 0.2, { gold: true, lift: 0.7 });

  // Ban công và tầng trên lùi vào.
  const upperY = BASE_H + GROUND_H + 1.0;
  const upperD = hd * 2 - 2.2;
  const upperFront = z - 0.2 + upperD / 2; // Mặt trước thân tầng trên.
  const railZ = z + hd - 0.4;
  b.box(hw * 2 - 1.2, 0.18, hd * 2 - 0.6, PALACE.redDark, x, upperY, z);
  for (let i = 0; i <= 12; i++) {
    b.box(0.08, 0.6, 0.08, PALACE.gold, x - hw + 0.8 + i * ((hw * 2 - 1.6) / 12), upperY + 0.38, railZ);
  }
  b.box(hw * 2 - 1.4, 0.08, 0.1, PALACE.gold, x, upperY + 0.7, railZ);
  const upperH = 2.6;
  const upperW = hw * 2 - 3;
  b.box(upperW, upperH, upperD, PALACE.wallRed, x, upperY + upperH / 2, z - 0.2);
  for (let i = 0; i < 6; i++) {
    const px = x - upperW / 2 + (i + 0.5) * (upperW / 6);
    if (Math.abs(px - x) < upperW / 6) continue; // Chừa gian giữa treo biển và hai đồng tiền.
    latticeDoor(b, upperW / 6 - 0.08, upperH - 0.5, px, upperY, upperFront + 0.05);
  }
  palacePlaque(group, 'Kim Ngân Lâu', 3.0, 0.85, x, upperY + 1.55, upperFront + 0.03);
  for (const s of [-1, 1]) coinEmblem(b, x + s * 1.85, upperY + 1.55, upperFront + 0.06);
  bracketBand(b, upperW + 0.4, x, upperY + upperH + 0.15, upperFront);
  const roofY = upperY + upperH + 0.3;
  palaceRoof(b, hw * 2 + 0.4, hd * 2 + 0.6, 2.1, x, roofY, z - 0.2, { gold: true });
  // Hồ lô vàng giữa nóc.
  b.add(new THREE.IcosahedronGeometry(0.32, 1), PALACE.gold, { x, y: roofY + 2.5, z: z - 0.2 });
  b.add(new THREE.IcosahedronGeometry(0.22, 1), PALACE.gold, { x, y: roofY + 2.92, z: z - 0.2 });
  b.cyl(0.03, 0.05, 0.3, PALACE.gold, x, roofY + 3.18, z - 0.2, { seg: 5 });

  const lanterns = [];
  for (const dx of [-6, -2.4, 2.4, 6]) lanterns.push([x + dx, BASE_H + GROUND_H - 0.55, front + 0.35]);
  for (const dx of [-3.6, 3.6]) lanterns.push([x + dx, upperY + upperH - 0.4, upperFront + 0.9]);
  return lanterns;
}
