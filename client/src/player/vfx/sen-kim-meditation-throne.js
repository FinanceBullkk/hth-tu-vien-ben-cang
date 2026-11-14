import * as THREE from 'three';
import { petalGeometry } from './sen-kim-petal-geometry.js';

// Tòa ngồi thiền của Sen kim (thay đoá sen theme 0 đang rơi về), dựng bằng hàm
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của cultivation-manifestation. Cùng bóng dáng
// khi đứng: người ngồi GIỮA ĐÀI SEN VÀNG hai tầng cánh cuốn quanh hông, nhụy sáng sau lưng;
// không dựng gì cao hơn thắt lưng (đầu người ngồi ở y ≈ 0.8, mọi khối dưới 0.6).
//  tầng 3 (stage 0): năm cánh sen nhỏ ôm hông + túi nhụy sau lưng;
//  tầng 4 (stage 1): đài sen một tầng — chín cánh quanh hông, đế vành vàng;
//  tầng 5 (stage 2): đài sen hai tầng (ngoài 12 + trong 7) + túi nhụy + vành đế (thay tầng 4).

const LEAN = 'YXZ';

/** Một cánh sen đặt quanh người ngồi: góc a, bán kính r, kích thước s, ngả lean. */
function petal(add, a, r, y, s, lean) {
  add(petalGeometry(), Math.sin(a) * r, y, Math.cos(a) * r, s, s, s, lean, a, 0, LEAN);
}

export function buildSenKimThrone(stage, add) {
  if (stage === 0) {
    for (let i = 0; i < 5; i++) petal(add, i * Math.PI * 2 / 5 + 0.3, 0.52, 0.14, 0.3, 1.05);
    // Túi nhụy sáng nhỏ sau lưng.
    add(new THREE.SphereGeometry(0.05, 8, 6), 0, 0.42, -0.5, 1, 1.2, 1);
    return;
  }
  if (stage === 1) {
    for (let i = 0; i < 9; i++) petal(add, (i + 0.5) * Math.PI * 2 / 9, 0.6, 0.05, 0.42, 1.12);
    const base = new THREE.TorusGeometry(0.58, 0.03, 6, 40);
    add(base, 0, 0.03, 0, 1, 1, 0.75, Math.PI / 2, 0, 0); base.dispose();
    return;
  }
  for (let i = 0; i < 12; i++) petal(add, i * Math.PI * 2 / 12, 0.84, 0.03, 0.46, 1.16);
  for (let i = 0; i < 7; i++) petal(add, (i + 0.5) * Math.PI * 2 / 7, 0.5, 0.12, 0.34, 0.9);
  add(new THREE.SphereGeometry(0.05, 8, 6), 0, 0.44, -0.52, 1, 1.25, 1);
  const base = new THREE.TorusGeometry(0.8, 0.028, 6, 48);
  add(base, 0, 0.02, 0, 1, 1, 0.85, Math.PI / 2, 0, 0); base.dispose();
}
