// Linh thú (bậc 3): hồ ly chín đuôi có lửa hồ ly bay quanh, hạc tiên bay theo chủ trên làn mây.
// Hiệu ứng riêng nằm trong f.fx: hàm (t, moving) chạy mỗi khung khi thú đang hiện.
import * as THREE from 'three';
import { ball, blush, castShadows, eyes, geo, glow, lambert, part, petFrame, pivot } from './pet-model-kit.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const WHITE = lambert(0xf6f2ea);
const BLACK = lambert(0x24232a);

export function buildFox() {
  const f = petFrame();
  const fur = lambert(0xff7a2e);
  const sock = lambert(0x4a2c24);
  f.body.add(ball(fur, [0, 0.16, -0.02], 0.12, [1, 0.9, 1.3]));
  f.body.add(ball(WHITE, [0, 0.15, 0.07], 0.08, [1, 1, 0.7]));
  for (const z of [0.09, -0.1]) for (const s of [-1, 1]) f.body.add(ball(sock, [s * 0.065, 0.04, z], 0.04, [1, 0.85, 1.2]));
  f.head = pivot(f.root, [0, 0.31, 0.1], (h) => {
    h.add(ball(fur, [0, 0, 0], 0.14, [1.12, 0.92, 1]));
    h.add(part(geo.cone(6), fur, [0, -0.04, 0.14], [0.065, 0.13, 0.055], [Math.PI / 2, 0, 0]));
    h.add(ball(BLACK, [0, -0.04, 0.205], 0.02));
    for (const s of [-1, 1]) {
      h.add(ball(WHITE, [s * 0.07, -0.05, 0.08], 0.055, [1, 0.75, 0.9]));
      h.add(part(geo.cone(4), fur, [s * 0.085, 0.14, -0.01], [0.06, 0.14, 0.04], [0, 0, -s * 0.28]));
      h.add(part(geo.cone(4), WHITE, [s * 0.083, 0.13, 0.008], [0.032, 0.09, 0.02], [0, 0, -s * 0.28]));
    }
    // Ấn đỏ giữa trán.
    h.add(part(geo.box(), glow(0xff3a5a, 0.95), [0, 0.07, 0.125], [0.022, 0.035, 0.01], [0, 0, Math.PI / 4]));
    eyes(h, { x: 0.06, y: 0.03, z: 0.12, r: 0.028 });
    blush(h, { x: 0.1, y: -0.025, z: 0.09 });
  });
  // Chín đuôi xoè hình quạt sau lưng, đầu đuôi trắng và lửa hồ ly xanh.
  f.tail = pivot(f.root, [0, 0.18, -0.16], (t) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.6;
      const d = new THREE.Vector3(Math.sin(a) * 0.85, Math.cos(a) * 0.9 + 0.25, -0.45).normalize();
      const at = (k) => [d.x * k, d.y * k, d.z * k];
      t.add(ball(fur, at(0.07), 0.04), ball(fur, at(0.15), 0.052), ball(WHITE, at(0.24), 0.045));
      t.add(ball(glow(0x7fd8ff, 0.8), at(0.29), 0.028, [1, 1, 1], 6));
    }
  });
  // Ba đốm lửa hồ ly lượn quanh, mỗi đốm có quầng mờ.
  const wisps = [0, 1, 2].map(() => {
    const g = new THREE.Group();
    g.add(ball(glow(0xbfeaff, 0.95), [0, 0, 0], 0.035, [1, 1, 1], 8));
    g.add(ball(glow(0x4fb4ff, 0.35), [0, 0, 0], 0.075, [1, 1.3, 1], 8));
    f.root.add(g);
    return g;
  });
  f.fx.push((t) => {
    wisps.forEach((w, i) => {
      const a = t * 1.3 + (i * Math.PI * 2) / 3;
      w.position.set(Math.cos(a) * 0.38, 0.38 + Math.sin(t * 2.4 + i) * 0.06, Math.sin(a) * 0.38);
    });
    f.tail.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04); // chín đuôi phập phồng như thở
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.55;
  return f;
}

export function buildCrane() {
  const f = petFrame();
  f.fly = true;
  const beak = lambert(0xc9b07a);
  f.body.add(ball(WHITE, [0, 0, 0], 0.12, [0.9, 0.85, 1.45]));
  for (let i = 0; i < 4; i++) f.body.add(part(geo.cone(4), BLACK, [(i - 1.5) * 0.03, 0.02, -0.19], [0.025, 0.14, 0.012], [-2.0, 0, (i - 1.5) * 0.2]));
  for (const s of [-1, 1]) f.body.add(part(geo.cyl(5), lambert(0xd8546a), [s * 0.03, -0.06, -0.2], [0.008, 0.2, 0.008], [-1.2, 0, 0]));
  // Cổ cong chữ S nối liền từ ngực lên đầu: đoạn dưới trắng, đoạn trên đen.
  [[0.05, 0.15, 0.05, WHITE], [0.1, 0.18, 0.042, WHITE], [0.15, 0.185, 0.037, BLACK], [0.2, 0.17, 0.034, BLACK]].forEach(([y, z, r, mat]) => {
    f.body.add(ball(mat, [0, y, z], r));
  });
  f.head = pivot(f.root, [0, 0.25, 0.17], (h) => {
    h.add(ball(WHITE, [0, 0, 0], 0.065, [0.95, 0.95, 1.1]));
    h.add(ball(lambert(0xe8243c), [0, 0.05, -0.005], 0.03, [1, 0.6, 1]));
    h.add(part(geo.cone(5), beak, [0, -0.01, 0.11], [0.018, 0.11, 0.018], [Math.PI / 2, 0, 0]));
    eyes(h, { x: 0.04, y: 0.012, z: 0.05, r: 0.015 });
  });
  for (const s of [-1, 1]) {
    const wing = pivot(f.root, [s * 0.09, 0.03, 0], (w) => {
      w.add(ball(WHITE, [s * 0.16, 0, -0.02], 0.1, [1.7, 0.18, 0.9]));
      w.add(ball(BLACK, [s * 0.31, 0, -0.06], 0.06, [1.2, 0.15, 0.8]));
    });
    f.wings.push(wing);
  }
  // Làn mây tiên trôi dưới bụng.
  const clouds = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    clouds.add(ball(glow(0xeaf4ff, 0.28), [Math.cos(a) * 0.16, -0.17, Math.sin(a) * 0.16 - 0.05], 0.09, [1.4, 0.5, 1], 8));
  }
  f.root.add(clouds);
  f.fx.push((t) => {
    clouds.rotation.y = t * 0.5;
    clouds.position.y = Math.sin(t * 1.7) * 0.02;
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.4;
  return f;
}
