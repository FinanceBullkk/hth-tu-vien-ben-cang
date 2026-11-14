// Thú đời thường (bậc Thường, Quý): mèo mướp, chó cỏ, thỏ trắng, gấu trúc con, rùa ngọc.
// Dáng chibi đầu to thân tròn, mặt hướng +Z, chân chạm y = 0. Đầu và đuôi là nhóm riêng để lắc, vẫy.
import { ball, blush, castShadows, eyes, geo, glow, lambert, part, petFrame, pivot } from './pet-model-kit.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const PINK = lambert(0xf2a0ae);
const WHITE = lambert(0xf6f2ea);
const BLACK = lambert(0x24232a);

/** Bốn bàn chân tròn dưới thân. */
function paws(body, mat, { x = 0.07, front = 0.09, back = -0.1, r = 0.042 } = {}) {
  for (const z of [front, back]) for (const s of [-1, 1]) body.add(ball(mat, [s * x, r * 0.9, z], r, [1, 0.8, 1.2]));
}

export function buildCat() {
  const f = petFrame();
  const fur = lambert(0xd9822b);
  const stripe = lambert(0xa85c18);
  f.body.add(ball(fur, [0, 0.16, -0.02], 0.13, [1, 0.9, 1.25]));
  f.body.add(ball(WHITE, [0, 0.13, 0.07], 0.085, [1, 0.95, 0.7]));
  for (const z of [-0.1, -0.02, 0.06]) f.body.add(part(geo.box(), stripe, [0, 0.27, z], [0.17, 0.025, 0.028]));
  paws(f.body, WHITE);
  f.head = pivot(f.root, [0, 0.31, 0.1], (h) => {
    h.add(ball(fur, [0, 0, 0], 0.15, [1.1, 0.95, 1]));
    h.add(ball(WHITE, [0, -0.045, 0.1], 0.065, [1.3, 0.8, 0.7]));
    h.add(ball(PINK, [0, -0.012, 0.15], 0.016));
    for (const s of [-1, 1]) {
      h.add(part(geo.cone(4), fur, [s * 0.09, 0.13, 0], [0.055, 0.1, 0.05], [0, 0, -s * 0.3]));
      h.add(part(geo.cone(4), PINK, [s * 0.088, 0.122, 0.016], [0.03, 0.06, 0.02], [0, 0, -s * 0.3]));
    }
    for (const dx of [-0.025, 0, 0.025]) h.add(part(geo.box(), stripe, [dx, 0.1, 0.1], [0.012, 0.045, 0.01], [-0.6, 0, 0]));
    eyes(h, { x: 0.062, y: 0.02, z: 0.132, r: 0.032 });
    blush(h, { x: 0.105, y: -0.035, z: 0.105 });
  });
  f.tail = pivot(f.root, [0, 0.18, -0.17], (t) => {
    t.add(ball(fur, [0, 0.04, -0.03], 0.036), ball(fur, [0, 0.1, -0.06], 0.033), ball(stripe, [0, 0.17, -0.06], 0.031));
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.52;
  return f;
}

export function buildDog() {
  const f = petFrame();
  const fur = lambert(0xc98a3c);
  const cream = lambert(0xf1dcb0);
  f.body.add(ball(fur, [0, 0.17, -0.02], 0.13, [1, 0.92, 1.3]));
  f.body.add(ball(cream, [0, 0.15, 0.08], 0.085, [1, 1, 0.7]));
  f.body.add(part(geo.torus(), lambert(0xd8343a), [0, 0.25, 0.08], [0.085, 0.085, 0.16], [Math.PI / 2 - 0.4, 0, 0]));
  f.body.add(part(geo.cone(4), lambert(0xd8343a), [0.03, 0.2, 0.15], [0.04, 0.07, 0.015], [0.3, 0, 2.6]));
  paws(f.body, cream, { r: 0.045 });
  f.head = pivot(f.root, [0, 0.32, 0.1], (h) => {
    h.add(ball(fur, [0, 0, 0], 0.14, [1.05, 1, 1]));
    h.add(ball(cream, [0, -0.045, 0.11], 0.07, [0.95, 0.75, 1.1]));
    h.add(ball(BLACK, [0, -0.02, 0.19], 0.026, [1.2, 0.9, 1]));
    h.add(ball(PINK, [0, -0.095, 0.15], 0.026, [1, 0.45, 1]));
    for (const s of [-1, 1]) h.add(part(geo.cone(4), fur, [s * 0.085, 0.13, -0.01], [0.05, 0.1, 0.04], [0, 0, -s * 0.35]));
    eyes(h, { x: 0.058, y: 0.035, z: 0.118, r: 0.03 });
    blush(h, { x: 0.1, y: -0.02, z: 0.095 });
  });
  // Đuôi chó cỏ cong vắt lên lưng.
  f.tail = pivot(f.root, [0, 0.22, -0.17], (t) => {
    t.add(ball(fur, [0, 0.04, -0.02], 0.035), ball(fur, [0, 0.1, -0.01], 0.032), ball(cream, [0, 0.13, 0.04], 0.03));
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.52;
  return f;
}

export function buildRabbit() {
  const f = petFrame();
  f.body.add(ball(WHITE, [0, 0.13, -0.02], 0.12, [1, 0.95, 1.1]));
  for (const s of [-1, 1]) {
    f.body.add(ball(WHITE, [s * 0.075, 0.035, -0.04], 0.045, [0.9, 0.6, 1.6]));
    f.body.add(ball(WHITE, [s * 0.05, 0.05, 0.08], 0.035));
  }
  f.body.add(ball(WHITE, [0, 0.14, -0.15], 0.05));
  f.head = pivot(f.root, [0, 0.27, 0.06], (h) => {
    h.add(ball(WHITE, [0, 0, 0], 0.13, [1.05, 0.95, 1]));
    h.add(ball(PINK, [0, -0.02, 0.128], 0.014));
    for (const s of [-1, 1]) {
      h.add(ball(WHITE, [s * 0.05, 0.19, -0.02], 0.042, [0.8, 2.6, 0.55]));
      h.add(ball(PINK, [s * 0.05, 0.19, 0.0], 0.026, [0.7, 2.4, 0.3]));
    }
    eyes(h, { x: 0.058, y: 0.02, z: 0.112, r: 0.028, color: 0x7a1a36 });
    blush(h, { x: 0.09, y: -0.03, z: 0.09 });
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.hop = true; // đi bằng cách nhảy cóc
  f.height = 0.55;
  return f;
}

export function buildPanda() {
  const f = petFrame();
  f.body.add(ball(WHITE, [0, 0.17, -0.01], 0.15, [1.05, 1, 1.05]));
  f.body.add(ball(BLACK, [0, 0.27, -0.01], 0.12, [1.2, 0.35, 1]));
  for (const s of [-1, 1]) {
    f.body.add(ball(BLACK, [s * 0.11, 0.17, 0.07], 0.06, [0.9, 1.35, 0.9]));
    f.body.add(ball(BLACK, [s * 0.085, 0.05, 0.04], 0.062, [1, 0.8, 1.2]));
  }
  // Cành trúc ôm trong tay.
  f.body.add(part(geo.cyl(6), lambert(0x6cae4a), [0.04, 0.22, 0.14], [0.016, 0.34, 0.016], [0.1, 0, 0.45]));
  for (const [x, y, rz] of [[-0.03, 0.37, 0.9], [-0.06, 0.33, 1.6], [0.12, 0.08, -2.2]]) {
    f.body.add(part(geo.cone(4), lambert(0x86c95c), [x, y, 0.15], [0.025, 0.09, 0.008], [0, 0, rz]));
  }
  f.head = pivot(f.root, [0, 0.36, 0.04], (h) => {
    h.add(ball(WHITE, [0, 0, 0], 0.15, [1.08, 0.95, 1]));
    h.add(ball(BLACK, [0, -0.03, 0.14], 0.022, [1.3, 0.9, 1]));
    for (const s of [-1, 1]) {
      h.add(ball(BLACK, [s * 0.1, 0.12, -0.01], 0.05, [1, 1, 0.7]));
      const patch = ball(BLACK, [s * 0.058, 0.012, 0.118], 0.044, [1, 1.35, 0.5]);
      patch.rotation.z = s * 0.5;
      h.add(patch);
    }
    eyes(h, { x: 0.06, y: 0.018, z: 0.14, r: 0.022, color: 0x050508 });
    blush(h, { x: 0.105, y: -0.05, z: 0.1 });
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.56;
  return f;
}

export function buildTurtle() {
  const f = petFrame();
  const skin = lambert(0x8fb07a);
  const jade = lambert(0x3fae7c);
  const plate = lambert(0x7fdcae);
  f.body.add(ball(jade, [0, 0.14, 0], 0.17, [1, 0.62, 1.15], 12));
  f.body.add(part(geo.torus(), lambert(0xe2b54a), [0, 0.1, 0], [0.17, 0.195, 0.17], [Math.PI / 2, 0, 0]));
  f.body.add(part(geo.cyl(6), plate, [0, 0.245, 0], [0.06, 0.02, 0.06]));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    f.body.add(part(geo.cyl(6), plate, [Math.sin(a) * 0.1, 0.21, Math.cos(a) * 0.115], [0.045, 0.02, 0.045], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]));
  }
  for (const [x, z] of [[-0.12, 0.11], [0.12, 0.11], [-0.12, -0.11], [0.12, -0.11]]) f.body.add(ball(skin, [x, 0.04, z], 0.05, [1, 0.8, 1.1]));
  f.body.add(part(geo.cone(5), skin, [0, 0.07, -0.2], [0.03, 0.08, 0.03], [-1.7, 0, 0]));
  // Viên ngọc sáng trên đỉnh mai.
  f.body.add(ball(glow(0x9effd0, 0.9), [0, 0.27, 0], 0.03, [1, 1, 1], 8));
  f.head = pivot(f.root, [0, 0.13, 0.2], (h) => {
    h.add(ball(skin, [0, 0.02, 0.03], 0.085, [1, 0.9, 1.05]));
    eyes(h, { x: 0.042, y: 0.04, z: 0.1, r: 0.022 });
    blush(h, { x: 0.065, y: 0.0, z: 0.08, r: 0.016 });
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.36;
  return f;
}
