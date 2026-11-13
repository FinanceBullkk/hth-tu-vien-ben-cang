import * as THREE from 'three';
import { guqinGeometry, stringEnds, huiPoint, stringLift, HUI, STRINGS } from './nguyet-bach-geometry.js';

// Tòa ngồi thiền của Nguyệt Bạch (effect 7), dựng bằng add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order)
// của cultivation-manifestation. Bố cục lệch một bên như khi đứng, không đối xứng tâm:
//  tầng 3 (stage 0): cổ cầm nhỏ đặt ngang trước gối, bảy dây và phím huy;
//  tầng 4 (stage 1): vầng trăng tròn dày treo sau vai trái (+x), vành bạc, dải mây vắt dưới trăng;
//  tầng 5 (stage 2): cổ cầm lớn dựng đứng sau vai phải (−x), cao hơn đầu, đủ dây và phím huy.
// Tầng 4 vẫn hiện ở tầng 5 (trăng và đàn là cặp đối trọng). add() nhân bản geometry nên mọi hình
// dựng tạm được giải phóng ngay.

/** Một cây cổ cầm (thân + dây + phím huy) đặt theo cùng một phép biến đổi. */
function lute(add, len, width, depth, at, rot) {
  const body = guqinGeometry(len, width, depth);
  add(body, ...at, 1, 1, 1, ...rot); body.dispose();
  const lift = stringLift(depth);
  for (let k = 0; k < STRINGS; k++) {
    const [[x0, y0], [x1, y1]] = stringEnds(k, len, width);
    const string = new THREE.CylinderGeometry(0.0045, 0.0045, Math.hypot(x1 - x0, y1 - y0), 4);
    string.rotateZ(-Math.atan2(x1 - x0, y1 - y0)); string.translate((x0 + x1) / 2, (y0 + y1) / 2, lift);
    add(string, ...at, 1, 1, 1, ...rot); string.dispose();
  }
  const stud = new THREE.SphereGeometry(1, 6, 4);
  HUI.forEach((f, i) => {
    const [x, y] = huiPoint(i, len, width), s = (f === 0.5 ? 0.022 : 0.015) * len / 2;
    const g = stud.clone().scale(s, s, s * 0.5).translate(x, y, depth * 1.05);
    add(g, ...at, 1, 1, 1, ...rot); g.dispose();
  });
  stud.dispose();
}

export function buildNguyetBachThrone(stage, add) {
  if (stage === 0) {
    // Đàn nằm ngang trước gối: trục dọc thân quay sang +x, mặt dây ngửa lên hơi nghiêng về người xem.
    lute(add, 0.8, 0.14, 0.03, [-0.4, 0.3, 0.5], [-Math.PI / 2 + 0.35, 0, -Math.PI / 2]);
    return;
  }
  if (stage === 1) {
    const disc = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 48); disc.rotateX(Math.PI / 2);
    add(disc, 0.74, 1.66, -0.72, 1, 1, 1); disc.dispose();
    const rim = new THREE.TorusGeometry(0.52, 0.026, 6, 64);
    add(rim, 0.74, 1.66, -0.7, 1, 1, 1); rim.dispose();
    const puff = new THREE.SphereGeometry(1, 10, 6);
    [[0.3, 1.42, 0.17], [0.52, 1.38, 0.2], [0.78, 1.4, 0.22], [1.04, 1.45, 0.18], [1.24, 1.5, 0.13]].forEach(([x, y, s]) =>
      add(puff, x, y, -0.6, s, s * 0.32, 0.05));
    puff.dispose();
    return;
  }
  lute(add, 1.95, 0.3, 0.06, [-0.72, 0.04, -0.55], [0, 0.28, 0.06]);
}
