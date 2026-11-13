// Chỗ đặt cảnh xa tiên hiệp quanh gò: tính một lần, dùng chung cho núi đá dựng, biển mây, đảo bay.
// Gò là một mặt bàn cao hơn thung lũng xung quanh ~16 m (xem terrain.js), nên mây đặt dưới mặt gò thành biển mây.
// Chừa phía đông (cảng container, bản sắc "bên cảng") và hành lang lối lên cổng phía nam.
import { SITE } from '../../../shared/layout.js';
import { rng } from './builders.js';

export const SITE_CENTER = { x: (SITE.minX + SITE.maxX) / 2, z: (SITE.minZ + SITE.maxZ) / 2 };

// Góc phương vị tính từ trục +x quanh tâm gò; phía đông (cảng) là |góc| < EAST_GAP.
const EAST_GAP = Math.PI / 3;

/** Góc ngẫu nhiên ngoài khoảng phía đông. */
function westishAngle(r) {
  return EAST_GAP + r() * (Math.PI * 2 - EAST_GAP * 2);
}

/** Chừa lối lên cổng phía nam (bậc thềm và đường mòn) cho khỏi bị núi che. */
function blocksApproach(x, z) {
  return Math.abs(x) < 40 && z > SITE.maxZ;
}

/**
 * n điểm quanh gò trong khoảng cách [dMin, dMax] từ tâm, không rơi vào phía đông hay lối lên cổng.
 * Trả về { x, z, d, a } với d là khoảng cách tới tâm (để núi xa cao hơn).
 */
export function ringPlacements(n, dMin, dMax, seed) {
  const r = rng(seed);
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const a = westishAngle(r);
    const d = dMin + Math.sqrt(r()) * (dMax - dMin);
    const x = SITE_CENTER.x + Math.cos(a) * d;
    const z = SITE_CENTER.z + Math.sin(a) * d;
    if (blocksApproach(x, z)) continue;
    out.push({ x, z, d, a, r });
  }
  return out;
}
