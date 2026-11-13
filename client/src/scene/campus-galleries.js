import * as THREE from 'three';
import { BAMBOO_CLUMPS, GALLERIES, GALLERY_POSTS } from '../../../shared/layout.js';
import { rng } from './builders.js';
import { PALACE, bracketBand, palaceRoof, redColumn } from './palace-kit.js';

export function buildCampusGalleries(b) {
  // Hành lang cột son nền cẩm thạch, dầm đỏ, dải đấu củng, mái lưu ly xanh ngọc.
  for (const g of GALLERIES) {
    b.box(g.w, g.floor, g.d, PALACE.marble, g.x, g.floor / 2, g.z, { jitter: 0.01 });
    b.box(g.w + 0.14, 0.05, g.d + 0.14, PALACE.marbleDeep, g.x, 0.025, g.z);
    for (const side of [-1, 1]) {
      b.box(0.18, 0.22, g.d, PALACE.redDark, g.x + side * 1.1, g.roof - 0.1, g.z);
      bracketBand(b, g.d, g.x + side * 1.1, g.roof + 0.12, g.z, { ry: Math.PI / 2, depth: 0.3 });
    }
    palaceRoof(b, g.d + 1, g.w + 0.7, 0.95, g.x, g.roof + 0.25, g.z, { ry: Math.PI / 2, lift: 0.3 });
  }
  for (const p of GALLERY_POSTS) redColumn(b, p.x, p.z, 3.05, 0.16, 0.14);
  const random = rng(182);
  for (const clump of BAMBOO_CLUMPS) {
    b.cyl(clump.r + 0.5, clump.r + 0.5, 0.02, '#8ca66a', clump.x, 0.02, clump.z, { seg: 12 });
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const x = clump.x + Math.cos(angle) * clump.r * 0.6;
      const z = clump.z + Math.sin(angle) * clump.r * 0.6;
      const height = 3 + random() * 2.5;
      b.cyl(0.025, 0.045, height, '#91ac69', x, height / 2, z, { seg: 5 });
      for (let y = 0.6; y < height; y += 0.6) b.cyl(0.049, 0.049, 0.035, '#a2aa79', x, y, z, { seg: 5 });
      for (let j = 0; j < 3; j++) {
        b.add(new THREE.IcosahedronGeometry(0.7, 0), j % 2 ? '#7ba364' : '#9bbb78', {
          x: x + Math.cos(angle + j) * 0.45, y: height - j * 0.5, z: z + Math.sin(angle + j) * 0.45,
          sx: 1.4, sy: 0.16, sz: 0.5, ry: angle + j,
        });
      }
    }
  }
}
