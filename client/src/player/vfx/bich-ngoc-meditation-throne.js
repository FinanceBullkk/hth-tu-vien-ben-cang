import * as THREE from 'three';
import { groveGeometry, bambooLeafGeometry, mossStoneGeometry, shootGeometry } from './bich-ngoc-geometry.js';
import { makeStalk, growTwigs, leafLayout } from './bich-ngoc-grove.js';
import { chimeGeometry } from './bich-ngoc-wind-chime.js';

// Tòa ngồi thiền của Bích Ngọc (thay đoá sen đang mượn), dựng bằng hàm add(geo, x, y, z, sx, sy,
// sz, rx, ry, rz) của cultivation-manifestation. Các tầng chồng lên nhau khi lên cảnh giới:
//  tầng 3 (stage 0): ba thân trúc nhỏ có đốt, cành, lá sau lưng bên trái, cạnh một tảng đá rêu;
//  tầng 4 (stage 1): người ngồi trên phiến đá rêu dẹt; bức trúc năm thân cao thấp lệch hai bên
//    sau lưng, HỞ GIỮA ngay sau đầu;
//  tầng 5 (stage 2): trúc vây thêm hai bên sườn, một dải lá trúc xoắn nằm ngang quanh người như gió
//    đang cuốn (dưới vai, chừa mặt), chuông gió ngọc treo bên phải, măng nhú cạnh đá.
// Không vòng tròn, không đĩa sau lưng. add() nhân bản geometry nên thân trúc vừa dựng được giải
// phóng ngay; lá, đá, măng, chuông là geometry dùng chung (không dispose ở đây).
const S = makeStalk;
const LEVELS = [
  [S(-0.55, -0.52, 1.1, 0.04, [-0.05, -0.02], 0.27, 0, 0), S(-0.78, -0.3, 0.85, 0.034, [-0.05, 0], 0.24, 0, 0),
    S(-0.4, -0.74, 1.32, 0.043, [-0.03, -0.04], 0.29, 0, 0)],
  [S(-0.52, -0.8, 1.78, 0.05, [-0.06, -0.03], 0.32, 0, 0), S(-0.85, -0.6, 1.48, 0.045, [-0.07, 0], 0.3, 0, 0),
    S(0.45, -0.74, 1.88, 0.052, [0.06, -0.03], 0.33, 0, 0), S(0.74, -0.52, 1.45, 0.045, [0.07, 0], 0.3, 0, 0),
    S(0.62, -0.95, 1.62, 0.047, [0.04, -0.05], 0.31, 0, 0)],
  [S(-0.92, 0.02, 1.3, 0.045, [-0.07, 0.03], 0.29, 0, 0), S(0.9, 0.08, 1.22, 0.043, [0.07, 0.03], 0.28, 0, 0),
    S(1.0, -0.3, 1.6, 0.048, [0.06, -0.02], 0.3, 0, 0)],
].map(growTwigs);

const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), euler = new THREE.Euler();
/** Đặt geometry theo ma trận bằng add() (tách vị trí, góc, tỉ lệ). */
function addMatrix(add, geo, m) {
  m.decompose(pos, quat, scale); euler.setFromQuaternion(quat, 'XYZ');
  add(geo, pos.x, pos.y, pos.z, scale.x, scale.y, scale.z, euler.x, euler.y, euler.z);
}

function grove(add, stalks) {
  const g = groveGeometry(stalks); add(g, 0, 0, 0, 1, 1, 1); g.dispose();
  for (const leaf of leafLayout(stalks, 0.75)) addMatrix(add, bambooLeafGeometry(), leaf.base);
}

/** Dải lá trúc xoắn ngang quanh người ngồi: 1.4 vòng, cao 0.12 → 0.5 m, dưới vai, chừa mặt. */
function leafSpiral(add) {
  const up = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  for (let i = 0; i < 22; i++) {
    const s = i / 21, a = 0.6 + s * Math.PI * 2 * 1.4, r = 0.86 - 0.12 * s, y = 0.12 + 0.38 * s;
    Y.set(-Math.sin(a), 0.12, Math.cos(a)).normalize(); X.crossVectors(Y, up).normalize(); Z.crossVectors(X, Y);
    const roll = i * 0.9, ca = Math.cos(roll), sa = Math.sin(roll), sz = 0.16 + 0.05 * Math.sin(s * Math.PI);
    matrix.makeBasis(X.clone().multiplyScalar(ca).addScaledVector(Z, sa), Y, Z.clone().multiplyScalar(ca).addScaledVector(X, -sa))
      .scale(scale.set(sz, sz, sz)).setPosition(Math.cos(a) * r, y, Math.sin(a) * r);
    addMatrix(add, bambooLeafGeometry(), matrix);
  }
}

export function buildBichNgocThrone(stage, add) {
  grove(add, LEVELS[stage]);
  if (stage === 0) {
    add(mossStoneGeometry(), -0.72, 0, -0.55, 0.2, 0.2, 0.2, 0, 0.6, 0);
  } else if (stage === 1) {
    // Phiến đá rêu dẹt làm toà ngồi: rộng hơn thân người, lộ mép quanh gối.
    add(mossStoneGeometry(), 0, -0.04, -0.05, 0.62, 0.22, 0.52, 0, 0.3, 0);
    add(mossStoneGeometry(), 0.58, 0, -0.72, 0.18, 0.18, 0.18, 0, 1.4, 0);
  } else {
    leafSpiral(add);
    // Chuông gió treo trên cần trúc bên phải, ngang tầm vai ngoài xa mặt.
    const chime = chimeGeometry(); add(chime, 0.88, 1.38, -0.4, 1.2, 1.2, 1.2); chime.dispose();
    add(shootGeometry(), -0.75, 0, -0.18, 0.22, 0.22, 0.22);
    add(shootGeometry(), 0.82, 0, -0.62, 0.26, 0.26, 0.26);
  }
}
