// Bộ dựng kiến trúc tiên môn cho nội viện: cột son, mái lưu ly xanh ngọc nóc vàng, lan can cẩm thạch,
// dải đấu củng xanh lam viền vàng. Vẫn low-poly màu theo đỉnh, gộp vào Batch như phần còn lại của cảnh.
import * as THREE from 'three';
import { addRoof, textTexture } from './builders.js';

export const PALACE = {
  red: '#b0372b', // cột, khung cửa sơn son
  redDark: '#87281f', // dầm, cánh cửa bức bàn
  wallRed: '#a13d2e', // tường cung đỏ son
  jade: '#3f9483', // ngói lưu ly xanh ngọc
  jadeDark: '#2c7465',
  gold: '#d8a441',
  blue: '#2d5d78', // đấu củng sơn xanh lam
  marble: '#ece6d8',
  marbleShade: '#d6cfbf',
  marbleDeep: '#bfb8a8',
  goldTile: '#dcab35', // ngói lưu ly vàng của Kim Ngân Phường
  goldTileDark: '#b98a22',
  ridgeRed: '#9b2f1f',
};

/**
 * Mái cung điện góc hất cao. Mặc định lưu ly xanh ngọc nóc vàng (nội viện);
 * gold: true là lưu ly vàng nóc son (Kim Ngân Phường).
 */
export function palaceRoof(b, w, d, h, x, y, z, { ry = 0, lift, gold = false } = {}) {
  addRoof(b, w, d, h, x, y, z, {
    ry,
    lift: lift ?? Math.min(w, d) * 0.16,
    curve: 2.1,
    a: gold ? PALACE.goldTile : PALACE.jade,
    b: gold ? PALACE.goldTileDark : PALACE.jadeDark,
    ridge: gold ? PALACE.ridgeRed : PALACE.gold,
  });
}

/** Cột son có chân đá cẩm thạch (đôn) và đầu cột vàng. y0 là mặt sàn dưới chân cột. */
export function redColumn(b, x, z, h, y0 = 0, r = 0.26) {
  b.cyl(r + 0.16, r + 0.2, 0.3, PALACE.marble, x, y0 + 0.15, z, { seg: 8 });
  b.cyl(r, r + 0.03, h - 0.3, PALACE.red, x, y0 + 0.3 + (h - 0.3) / 2, z, { seg: 10 });
  b.cyl(r + 0.06, r + 0.02, 0.16, PALACE.gold, x, y0 + h - 0.08, z, { seg: 10 });
}

/** Dải đấu củng dưới mái: thân xanh lam, hai viền vàng, nhịp khối nhỏ tượng trưng các cụm đấu. */
export function bracketBand(b, len, x, y, z, { ry = 0, depth = 0.5 } = {}) {
  b.box(len, 0.34, depth, PALACE.blue, x, y, z, { ry });
  b.box(len + 0.04, 0.06, depth + 0.04, PALACE.gold, x, y - 0.18, z, { ry });
  b.box(len + 0.04, 0.06, depth + 0.04, PALACE.gold, x, y + 0.18, z, { ry });
  const n = Math.max(2, Math.round(len / 0.9));
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + (i + 0.5) * (len / n);
    b.box(0.22, 0.2, depth + 0.16, PALACE.jadeDark, x + o * cos, y + 0.3, z - o * sin, { ry });
  }
}

/**
 * Lan can cẩm thạch từ (x0, z0) tới (x1, z1), chân ở độ cao y0 tới y1 (khác nhau khi chạy dọc bậc).
 * Trụ đầu búp sen mỗi khoảng ~1.5 m, tay vịn trên, thanh dưới.
 */
export function balustrade(b, x0, z0, x1, z1, y0, y1 = y0, { height = 0.82 } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const ry = Math.atan2(dx, dz) - Math.PI / 2;
  const n = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = y0 + (y1 - y0) * t;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    b.box(0.2, height, 0.2, PALACE.marble, px, y + height / 2, pz, { ry });
    b.add(new THREE.OctahedronGeometry(0.13, 0), PALACE.marble, { x: px, y: y + height + 0.1, z: pz, sy: 1.3 });
  }
  const slope = Math.atan2(y1 - y0, len);
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  const my = (y0 + y1) / 2;
  b.box(len, 0.09, 0.13, PALACE.marble, mx, my + height - 0.08, mz, { ry, rz: slope });
  b.box(len, 0.07, 0.1, PALACE.marbleShade, mx, my + 0.16, mz, { ry, rz: slope });
  b.box(len, height - 0.32, 0.06, PALACE.marbleShade, mx, my + 0.16 + (height - 0.32) / 2, mz, { ry, rz: slope, jitter: 0.01 });
}

/** Cánh cửa bức bàn: tấm son đậm, ô song mắt cáo vàng ở nửa trên. Mặt cửa quay về +z (ry xoay). */
export function latticeDoor(b, w, h, x, y0, z, { ry = 0 } = {}) {
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  // Song cửa nổi trước mặt cửa một chút, chừa chỗ cho tấm sáng ban đêm nằm giữa (xem great-hall.js).
  const at = (u, v, out = 0.09) => ({ x: x + u * cos + out * sin, y: y0 + v, z: z - u * sin + out * cos });
  b.box(w, h, 0.1, PALACE.redDark, x, y0 + h / 2, z, { ry });
  const top = h * 0.42;
  const cols = Math.max(2, Math.round(w / 0.32));
  for (let i = 1; i < cols; i++) {
    const p = at(-w / 2 + (i * w) / cols, h - top / 2 - 0.12);
    b.box(0.035, top, 0.04, PALACE.gold, p.x, p.y, p.z, { ry });
  }
  for (let j = 0; j <= 4; j++) {
    const p = at(0, h - 0.12 - (j * top) / 4);
    b.box(w - 0.1, 0.035, 0.04, PALACE.gold, p.x, p.y, p.z, { ry });
  }
  const mid = at(0, h * 0.42);
  b.box(w - 0.06, 0.08, 0.05, PALACE.gold, mid.x, mid.y, mid.z, { ry });
}

/** Biển chữ kiểu cung điện: nền xanh đen, chữ và viền vàng. Mặt chữ quay về +z, xoay bằng ry. */
export function palacePlaque(group, text, w, h, x, y, z, ry = 0) {
  const tex = textTexture(text, {
    w: 768, h: Math.round(768 * h / w), bg: '#1f3b57', fg: '#f0c766', border: '#d8a441',
    font: `bold ${Math.round(768 * h / w * 0.48)}px "Segoe UI",Roboto,Arial,sans-serif`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  group.add(mesh);
  return mesh;
}
