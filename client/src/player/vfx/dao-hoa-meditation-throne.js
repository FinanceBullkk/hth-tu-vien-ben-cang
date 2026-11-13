import { blossomGeometry, budGeometry, leafGeometry, branchGeometry, branchPoint } from './dao-hoa-geometry.js';

// Tòa ngồi thiền của Đào Hoa (thay đoá sen đang mượn), dựng bằng hàm add(geo, x, y, z, sx, sy, sz,
// rx, ry, rz) của cultivation-manifestation. Toạ độ sau lưng người ngồi:
//  tầng 3 (stage 0): một nhành đào nhỏ chớm nở cắm sau lưng bên trái;
//  tầng 4 (stage 1): nguyệt môn hai nét hở, cành đào vắt từ vai trái qua đỉnh, lách ra chỗ hở trên-phải;
//  tầng 5 (stage 2): cành thứ hai từ bên phải uốn vòm, hai cành gặp nhau thành tán hoa che đầu.
// add() nhân bản geometry nên cành vừa dựng được giải phóng ngay.
const addBranch = (add, points, radius, sides, seg) => { const g = branchGeometry(points, radius, sides, seg); add(g, 0, 0, 0, 1, 1, 1); g.dispose(); };

function sprig(add, points, radius, blooms, buds, leaves, size) {
  addBranch(add, points, radius);
  blooms.forEach((u, i) => {
    const p = branchPoint(points, u);
    add(blossomGeometry(), p.x, p.y, p.z + 0.03, size, size, size, 0.2 * Math.sin(i * 2.1), 0.3 * Math.cos(i * 1.7), i * 1.3);
  });
  buds.forEach((u, i) => {
    const p = branchPoint(points, u);
    add(budGeometry(), p.x, p.y, p.z, size * 0.45, size * 0.55, size * 0.45, 0.3, 0, (i % 2 ? 1 : -1) * 0.5);
  });
  leaves.forEach((u, i) => {
    const p = branchPoint(points, u), side = i % 2 ? 1 : -1;
    add(leafGeometry(), p.x, p.y, p.z, size * 1.3, size * 1.3, size * 1.3, 0.4, side * 0.3, side * 0.9);
  });
}

export function buildDaoHoaThrone(stage, add) {
  if (stage === 0) {
    sprig(add, [[-0.45, 0.05, -0.45], [-0.62, 0.45, -0.5], [-0.56, 0.85, -0.55], [-0.36, 1.1, -0.55]], 0.03,
      [0.5, 0.72, 0.88, 1], [0.4, 0.95], [0.3, 0.62, 0.92], 0.16);
    return;
  }
  if (stage === 1) {
    // Nguyệt môn hai nét bút: hở trên-phải (cành đào lách qua) và dưới-trái, đầu nét thuôn.
    for (const [a0, a1] of [[0.35, 1.3], [1.42, 2.12]]) {
      const arc = Array.from({ length: 25 }, (_, i) => {
        const a = (a0 + (a1 - a0) * i / 24) * Math.PI;
        return [Math.sin(a) * 0.85, 0.86 + Math.cos(a) * 0.85, -0.7];
      });
      addBranch(add, arc, 0.034, 6, 40);
    }
    sprig(add, [[-0.95, 0.35, -0.62], [-0.86, 1.05, -0.6], [-0.48, 1.58, -0.6], [0.12, 1.78, -0.63], [0.62, 1.5, -0.66]], 0.032,
      [0.3, 0.42, 0.53, 0.64, 0.74, 0.84, 1], [0.22, 0.93], [0.4, 0.6, 0.8, 0.96], 0.15);
    return;
  }
  sprig(add, [[0.95, 0.3, -0.55], [0.92, 1.05, -0.5], [0.62, 1.62, -0.45], [0.12, 1.94, -0.5], [-0.32, 1.9, -0.55]], 0.034,
    [0.3, 0.45, 0.58, 0.68, 0.78, 0.86, 0.94, 1], [0.2, 0.52, 0.98], [0.35, 0.6, 0.72, 0.9], 0.15);
  sprig(add, [[0.62, 1.62, -0.45], [0.42, 1.45, -0.4], [0.3, 1.38, -0.38]], 0.014, [1], [0.6], [0.4], 0.12);
}
