import * as THREE from 'three';
import { BAMBOO_CLUMPS, GALLERIES, GALLERY_POSTS } from '../../../shared/layout.js';
import { addRoof, rng } from './builders.js';

export function buildCampusGalleries(b) {
  for (const g of GALLERIES) {
    b.box(g.w, g.floor, g.d, '#c4b99d', g.x, g.floor / 2, g.z);
    for (const side of [-1, 1]) {
      b.box(0.16, 0.18, g.d, '#97734e', g.x + side * 1.1, g.roof - 0.08, g.z);
    }
    addRoof(b, g.d + 1, g.w + 0.7, 0.85, g.x, g.roof, g.z, { ry: Math.PI / 2, lift: 0.16 });
  }
  for (const p of GALLERY_POSTS) {
    b.cyl(0.13, 0.16, 3, '#a17a51', p.x, 1.65, p.z, { seg: 8 });
    b.box(0.42, 0.22, 0.42, '#d4c8aa', p.x, 0.22, p.z);
  }
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
