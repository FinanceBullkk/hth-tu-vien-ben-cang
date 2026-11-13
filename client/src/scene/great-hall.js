// Đại điện tu tiên: đài cẩm thạch có bậc và lan can, điện tường son, cửa bức bàn, hiên cột son,
// mái chồng hai tầng lưu ly xanh ngọc, biển "Tĩnh Tâm Điện". Trong điện vẫn là vòng chiếu thiền và nến.
// Kích thước va chạm (tường, cột hiên, lan can) nằm ở shared/layout.js: HALL, TERRACE.
import * as THREE from 'three';
import { HALL, MATS, TERRACE } from '../../../shared/layout.js';
import { PALACE, balustrade, bracketBand, latticeDoor, palacePlaque, palaceRoof, redColumn } from './palace-kit.js';

const STEPS = 8;

function buildTerrace(b) {
  const { halfW, backZ, frontZ, y, stairHalf, stairRun, stairFootZ, rail } = TERRACE;
  const x = HALL.x;
  const depth = frontZ - backZ;
  const cz = (frontZ + backZ) / 2;
  // Chân đế rộng, thân đài, mặt đài lát đá nhô mép.
  b.box(halfW * 2 + 0.4, 0.45, depth + 0.4, PALACE.marbleDeep, x, 0.225, cz);
  b.box(halfW * 2, y - 0.57, depth, PALACE.marbleShade, x, 0.45 + (y - 0.57) / 2, cz);
  b.box(halfW * 2 + 0.3, 0.12, depth + 0.3, PALACE.marble, x, y - 0.06, cz, { jitter: 0.01 });

  // Bậc lớn giữa mặt trước, xen màu để thấy rõ từng bậc.
  const rise = y / STEPS;
  const tread = stairRun / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const top = (i + 1) * rise;
    const zFront = stairFootZ - i * tread;
    b.box(stairHalf * 2, top, tread, i % 2 ? PALACE.marble : PALACE.marbleShade, x, top / 2, zFront - tread / 2, { jitter: 0.01 });
  }
  // Ngự đạo: phiến đá chạm mây nằm nghiêng giữa bậc.
  const slope = Math.atan2(y, stairRun);
  const len = Math.hypot(y, stairRun);
  b.box(1.5, 0.1, len, PALACE.marble, x, y / 2 + 0.1, (frontZ + stairFootZ) / 2, { rx: slope });
  for (const t of [0.22, 0.5, 0.78]) {
    b.add(new THREE.IcosahedronGeometry(0.32, 0), PALACE.marbleShade, {
      x, y: t * y + 0.16, z: stairFootZ - t * stairRun, sx: 1.6, sy: 0.35, sz: 0.9, rx: slope,
    });
  }

  // Lan can quanh mép đài, chừa bậc; hai lan can chạy dọc hai bên bậc.
  const x0 = x - halfW;
  const x1 = x + halfW;
  balustrade(b, x0, backZ, x1, backZ, y);
  balustrade(b, x0, backZ, x0, frontZ, y);
  balustrade(b, x1, backZ, x1, frontZ, y);
  balustrade(b, x0, frontZ, x - stairHalf - rail, frontZ, y);
  balustrade(b, x + stairHalf + rail, frontZ, x1, frontZ, y);
  for (const side of [-1, 1]) {
    const sx = x + side * (stairHalf + rail);
    balustrade(b, sx, frontZ, sx, stairFootZ, y, 0.04);
  }
}

/** Linh thú trên nóc: thân xanh ngọc đậm, đuôi cong vàng, quay vào giữa nóc. */
function ridgeBeast(b, x, y, z, side) {
  b.box(0.32, 0.7, 0.34, PALACE.jadeDark, x, y + 0.35, z);
  b.box(0.5, 0.16, 0.3, PALACE.gold, x + side * 0.12, y + 0.78, z, { rz: side * 0.7 });
  b.box(0.2, 0.3, 0.3, PALACE.gold, x - side * 0.18, y + 0.55, z, { rz: -side * 0.4 });
}

function buildHallBody(group, b, emissive) {
  const { x, z, halfW: hw, halfD: hd, doorHalf: dh, height: h } = HALL;
  const Y = TERRACE.y;
  const porchZ = z + hd + 1.8;

  // Sàn gỗ trong điện, vân ván.
  b.box(hw * 2 - 0.2, 0.05, hd * 2 - 0.2, '#7a4f2e', x, Y + 0.03, z, { jitter: 0.01 });
  for (let i = -6; i <= 6; i++) b.box(0.03, 0.05, hd * 2 - 0.2, '#5f3b22', x + i * 1.2, Y + 0.035, z, { jitter: 0 });

  // Tường son hai bên và phía sau; mặt trước là cửa bức bàn, giữa để ngỏ làm cửa chính.
  b.box(hw * 2, h, 0.5, PALACE.wallRed, x, Y + h / 2, z - hd);
  b.box(0.5, h, hd * 2, PALACE.wallRed, x - hw, Y + h / 2, z);
  b.box(0.5, h, hd * 2, PALACE.wallRed, x + hw, Y + h / 2, z);
  const segW = hw - dh;
  for (const s of [-1, 1]) {
    const cx = x + s * (dh + segW / 2);
    const panels = 3;
    for (let i = 0; i < panels; i++) {
      const px = cx - segW / 2 + (i + 0.5) * (segW / panels);
      latticeDoor(b, segW / panels - 0.06, h - 0.9, px, Y, z + hd + 0.2);
    }
    b.box(segW, 0.9, 0.5, PALACE.redDark, cx, Y + h - 0.45, z + hd); // Dạ cửa phía trên
    // Tấm sáng sau song cửa: chỉ rực lên khi đêm xuống (emissive).
    emissive.box(segW - 0.2, (h - 0.9) * 0.42, 0.02, '#ffc76f', cx, Y + (h - 0.9) - 0.12 - (h - 0.9) * 0.21, z + hd + 0.265);
  }
  b.box(dh * 2, 1.1, 0.5, PALACE.redDark, x, Y + h - 0.55, z + hd); // Lanh tô cửa chính
  for (const s of [-1, 1]) b.box(0.3, h - 1.1, 0.62, PALACE.red, x + s * dh, Y + (h - 1.1) / 2, z + hd);

  // Cột son liền tường ở các góc và giữa tường, cột hiên tự do phía trước.
  for (const dx of [-hw, -hw / 2, hw / 2, hw]) {
    redColumn(b, x + dx, z - hd, h, Y, 0.24);
  }
  for (const dz of [-hd / 2, 0, hd / 2]) {
    redColumn(b, x - hw, z + dz, h, Y, 0.24);
    redColumn(b, x + hw, z + dz, h, Y, 0.24);
  }
  for (const dx of [-hw, hw]) redColumn(b, x + dx, z + hd, h, Y, 0.24);
  for (const dx of [-7, -3.4, 3.4, 7]) redColumn(b, x + dx, porchZ, h, Y, 0.27);

  // Dầm và dải đấu củng quanh điện, chạy cả trên hàng cột hiên.
  b.box(hw * 2 + 0.6, 0.3, 0.32, PALACE.redDark, x, Y + h - 0.05, porchZ);
  bracketBand(b, hw * 2 + 1, x, Y + h + 0.3, porchZ);
  bracketBand(b, hw * 2 + 1, x, Y + h + 0.3, z - hd);
  for (const s of [-1, 1]) bracketBand(b, hd * 2 + 1.8, x + s * hw, Y + h + 0.3, z + 0.9, { ry: Math.PI / 2 });

  // Mái chồng: tầng dưới phủ cả hiên, thân gác son, tầng trên cao vút.
  palaceRoof(b, hw * 2 + 4.6, hd * 2 + 5.6, 2.2, x, Y + h + 0.45, z + 0.9);
  b.box(hw * 2 - 1, 1.7, hd * 2 - 0.6, PALACE.wallRed, x, Y + h + 1.75, z);
  bracketBand(b, hw * 2 - 0.8, x, Y + h + 2.45, z + hd - 0.3);
  bracketBand(b, hw * 2 - 0.8, x, Y + h + 2.45, z - hd + 0.3);
  const upper = { w: hw * 2 + 2.2, d: hd * 2 + 2.4, h: 3.0, y: Y + h + 2.6 };
  palaceRoof(b, upper.w, upper.d, upper.h, x, upper.y, z + 0.2);
  const ridgeHalf = (Math.max(upper.w - upper.d, 0.2) + 0.5) / 2;
  for (const side of [-1, 1]) ridgeBeast(b, x + side * ridgeHalf, upper.y + upper.h + 0.12, z + 0.2, side);

  palacePlaque(group, 'Tĩnh Tâm Điện', 3.4, 0.95, x, Y + h + 1.75, z + hd - 0.28);

  // Chiếu ngồi xếp vòng tròn
  for (const m of MATS) {
    b.cyl(0.62, 0.62, 0.05, '#c9a15f', m.x, Y + 0.08, m.z, { seg: 10, jitter: 0.06 });
    b.cyl(0.42, 0.42, 0.055, '#a8824a', m.x, Y + 0.085, m.z, { seg: 10 });
  }
  // Nến dọc tường và giữa vòng tròn
  const candles = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    candles.push([x + Math.sin(a) * 6.2, z + Math.cos(a) * 4.8]);
  }
  for (const [cx, cz] of candles) {
    b.cyl(0.06, 0.07, 0.34, '#efe6cf', cx, Y + 0.22, cz, { seg: 6 });
    emissive.add(new THREE.ConeGeometry(0.05, 0.16, 5), '#ffd27a', { x: cx, y: Y + 0.47, z: cz });
  }
  const light = new THREE.PointLight(0xffc27a, 34, 17, 1.8);
  light.position.set(x, Y + 3.2, z);
  group.add(light);
  return { candles: candles.map(([cx, cz]) => [cx, Y + 0.47, cz]), hallLight: light };
}

/** Dựng đài và điện vào batch chung của tu viện. Trả về nến và đèn trong điện cho hiệu ứng ngày đêm. */
export function buildGreatHall(group, b, emissive) {
  buildTerrace(b);
  return buildHallBody(group, b, emissive);
}
