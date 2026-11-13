// Sơn môn tam quan: ba gian cột son trên thềm cẩm thạch, mái lưu ly xanh ngọc nóc vàng, biển xanh chữ vàng,
// hai sư tử đá giữ cổng trên bậc thềm ngoài. Vị trí cột và sư tử khớp vật cản trong shared/layout.js.
import * as THREE from 'three';
import { GATE_LIONS } from '../../../shared/layout.js';
import { PALACE, bracketBand, palacePlaque, palaceRoof, redColumn } from './palace-kit.js';

const GATE_Z = 30;

/** Sư tử đá ngồi trên bệ, quay mặt ra ngoài cổng (+z). Bên trái vờn cầu, bên phải giữ sư tử con. */
function stoneLion(b, { x, z, side }) {
  const stone = PALACE.marbleShade;
  const mane = '#a9a395';
  b.box(1.0, 0.7, 1.2, PALACE.marble, x, 0.35, z);
  b.box(1.1, 0.1, 1.3, PALACE.marbleDeep, x, 0.05, z);
  b.box(0.72, 0.55, 0.8, stone, x, 0.98, z - 0.12); // mông và chân sau
  b.box(0.6, 0.8, 0.46, stone, x, 1.2, z + 0.16, { rx: -0.18 }); // ngực
  for (const s of [-1, 1]) b.box(0.16, 0.62, 0.18, stone, x + s * 0.2, 1.0, z + 0.36); // chân trước
  b.add(new THREE.IcosahedronGeometry(0.4, 0), mane, { x, y: 1.72, z: z + 0.12, sy: 1.05, jitter: 0.08 });
  b.add(new THREE.IcosahedronGeometry(0.3, 0), stone, { x, y: 1.74, z: z + 0.36, sz: 0.85 });
  b.box(0.26, 0.12, 0.12, mane, x, 1.62, z + 0.6); // mõm
  if (side < 0) {
    b.add(new THREE.IcosahedronGeometry(0.17, 1), PALACE.gold, { x: x + 0.22, y: 0.86, z: z + 0.52 });
  } else {
    b.add(new THREE.IcosahedronGeometry(0.18, 0), stone, { x: x - 0.24, y: 0.86, z: z + 0.48 });
  }
}

export function buildMountainGate(group, b) {
  const z = GATE_Z;
  // Thềm cẩm thạch dưới ba gian cổng, thấp sát mặt sân.
  b.box(10.2, 0.08, 2.4, PALACE.marble, 0, 0.04, z, { jitter: 0.01 });
  [-4.4, 4.4].forEach((x) => redColumn(b, x, z, 4.2, 0, 0.26));
  [-1.8, 1.8].forEach((x) => redColumn(b, x, z, 6.0, 0, 0.3));

  // Gian giữa: lanh tô son, dải đấu củng, mái cao.
  b.box(3.9, 0.36, 0.5, PALACE.redDark, 0, 4.85, z);
  b.box(3.9, 0.26, 0.42, PALACE.red, 0, 3.55, z);
  bracketBand(b, 4.4, 0, 5.62, z, { depth: 0.56 });
  palaceRoof(b, 7.0, 3.9, 2.0, 0, 5.98, z);
  // Hai gian bên thấp hơn.
  for (const s of [-1, 1]) {
    b.box(2.9, 0.3, 0.44, PALACE.redDark, s * 3.1, 3.42, z);
    bracketBand(b, 3.2, s * 3.1, 3.92, z, { depth: 0.5 });
    palaceRoof(b, 4.7, 3.3, 1.4, s * 3.1, 4.18, z);
  }

  palacePlaque(group, 'HTH', 2.6, 0.95, 0, 4.25, z + 0.27);
  palacePlaque(group, 'Tu viện bên cảng', 3.0, 0.8, 0, 4.25, z - 0.27, Math.PI);

  for (const lion of GATE_LIONS) stoneLion(b, lion);
}
