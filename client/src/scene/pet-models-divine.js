// Thần thú (bậc 4): kỳ lân con bờm lửa vàng giẫm mây lành, rồng con vàng uốn mình ôm ngọc như ý.
// Nhiều lớp sáng chồng nhau (bờm lửa, mây, ngọc, quầng) để nhìn từ xa đã biết là thú hiếm.
import * as THREE from 'three';
import { ball, blush, castShadows, eyes, geo, glow, lambert, part, petFrame, pivot } from './pet-model-kit.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const GOLD = lambert(0xf2c14e);
const CREAM = lambert(0xffeec2);

export function buildQilin() {
  const f = petFrame();
  const scale = lambert(0x2fbfae);
  const deep = lambert(0x1f8f86);
  f.body.add(ball(scale, [0, 0.21, -0.02], 0.13, [1, 0.92, 1.3]));
  f.body.add(ball(CREAM, [0, 0.18, 0.06], 0.085, [1, 0.9, 0.8]));
  for (let i = 0; i < 4; i++) f.body.add(part(geo.cone(4), GOLD, [0, 0.33 - i * 0.005, 0.06 - i * 0.07], [0.025, 0.06, 0.03], [-0.4, 0, 0]));
  for (const [x, z] of [[-0.07, 0.09], [0.07, 0.09], [-0.07, -0.11], [0.07, -0.11]]) {
    f.body.add(part(geo.cyl(6), deep, [x, 0.08, z], [0.034, 0.12, 0.034]));
    f.body.add(part(geo.cyl(6), GOLD, [x, 0.02, z], [0.04, 0.035, 0.04]));
  }
  f.head = pivot(f.root, [0, 0.37, 0.11], (h) => {
    h.add(ball(scale, [0, 0, 0], 0.13, [1.08, 0.95, 1]));
    h.add(ball(CREAM, [0, -0.045, 0.1], 0.07, [1.15, 0.75, 0.9]));
    h.add(part(geo.cone(6), GOLD, [0, 0.16, 0.02], [0.028, 0.12, 0.028], [0.35, 0, 0]));
    h.add(ball(glow(0xfff1a8, 0.9), [0, 0.23, 0.045], 0.018, [1, 1, 1], 6));
    for (const s of [-1, 1]) {
      h.add(part(geo.cone(4), scale, [s * 0.09, 0.1, -0.03], [0.04, 0.08, 0.03], [-0.3, 0, -s * 0.7]));
      h.add(part(geo.cyl(4), GOLD, [s * 0.09, -0.06, 0.13], [0.005, 0.12, 0.005], [0.3, 0, s * 1.2]));
    }
    eyes(h, { x: 0.058, y: 0.025, z: 0.112, r: 0.03 });
    blush(h, { x: 0.095, y: -0.03, z: 0.09 });
  });
  // Bờm lửa vàng cam sau đầu và dọc gáy: nhóm riêng để lửa bập bùng.
  const mane = pivot(f.root, [0, 0.36, 0.06], (m) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.2;
      m.add(part(geo.cone(5), glow(i % 2 ? 0xffb02e : 0xffe066, 0.75), [Math.sin(a) * 0.1, 0.06 + Math.cos(a) * 0.04, -0.07], [0.035, 0.16, 0.035], [-0.9, 0, -a * 0.6]));
    }
  });
  f.tail = pivot(f.root, [0, 0.24, -0.17], (t) => {
    t.add(ball(scale, [0, 0.02, -0.03], 0.03));
    for (let i = 0; i < 3; i++) t.add(part(geo.cone(5), glow(i ? 0xffc23a : 0xfff0a0, 0.8), [(i - 1) * 0.03, 0.06, -0.08], [0.03, 0.14, 0.03], [-0.8, 0, (i - 1) * 0.4]));
  });
  // Mây lành dưới bốn chân, xoay chậm; đốm sáng vàng bốc lên quanh thân.
  const clouds = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    clouds.add(ball(glow(0xf4fbff, 0.32), [Math.cos(a) * 0.17, 0.02, Math.sin(a) * 0.2], 0.075, [1.5, 0.45, 1], 8));
  }
  f.root.add(clouds);
  f.fx.push((t) => {
    mane.scale.set(1, 1 + Math.sin(t * 9) * 0.08, 1 + Math.cos(t * 7) * 0.06);
    clouds.rotation.y = -t * 0.6;
  });
  mergeStaticMeshes(f.body);
  castShadows(f.body);
  f.height = 0.62;
  return f;
}

export function buildDragon() {
  const f = petFrame();
  f.fly = true;
  const red = lambert(0xd8343a);
  // Thân rồng: các đốt nối đuôi uốn sóng, mỗi đốt một mesh để lượn được.
  const segs = [];
  for (let i = 0; i < 7; i++) {
    const r = 0.1 - i * 0.009;
    const seg = new THREE.Group();
    seg.add(ball(GOLD, [0, 0, 0], r, [1, 0.95, 1.1], 9));
    seg.add(part(geo.cone(4), red, [0, r * 0.9, 0], [0.022, 0.06, 0.022], [-0.5, 0, 0]));
    if (i < 6) seg.add(ball(CREAM, [0, -r * 0.45, 0.01], r * 0.7, [1, 0.6, 1], 7));
    mergeStaticMeshes(seg);
    f.body.add(seg);
    segs.push(seg);
  }
  const tuft = pivot(f.body, [0, 0, 0], (t) => {
    for (let i = 0; i < 3; i++) t.add(part(geo.cone(5), red, [(i - 1) * 0.025, 0, -0.04], [0.025, 0.1, 0.02], [-1.6, 0, (i - 1) * 0.5]));
  });
  f.head = pivot(f.root, [0, 0.1, 0.14], (h) => {
    h.add(ball(GOLD, [0, 0, 0], 0.13, [1.05, 0.95, 1.1]));
    h.add(ball(CREAM, [0, -0.04, 0.12], 0.075, [1.15, 0.7, 1.05]));
    for (const s of [-1, 1]) {
      h.add(ball(lambert(0x7a4a1a), [s * 0.03, -0.02, 0.19], 0.012));
      h.add(part(geo.cyl(5), red, [s * 0.07, 0.15, -0.04], [0.014, 0.14, 0.014], [-0.4, 0, -s * 0.35]));
      h.add(part(geo.cyl(5), red, [s * 0.11, 0.19, -0.05], [0.01, 0.07, 0.01], [-0.2, 0, -s * 1.2]));
      h.add(part(geo.cyl(4), GOLD, [s * 0.12, -0.05, 0.12], [0.005, 0.18, 0.005], [0.5, 0, s * 1.3]));
      h.add(part(geo.cone(4), red, [s * 0.09, 0.06, -0.08], [0.03, 0.08, 0.02], [-1.0, 0, -s * 0.6]));
    }
    eyes(h, { x: 0.06, y: 0.035, z: 0.105, r: 0.03 });
    blush(h, { x: 0.1, y: -0.02, z: 0.085 });
  });
  // Ngọc như ý trước ngực: lõi sáng, quầng xanh và vòng hào quang xoay.
  const pearl = new THREE.Group();
  pearl.position.set(0, -0.08, 0.22);
  pearl.add(ball(glow(0xeafcff, 1), [0, 0, 0], 0.042, [1, 1, 1], 10));
  pearl.add(ball(glow(0x6fd3ff, 0.35), [0, 0, 0], 0.085, [1, 1, 1], 10));
  const halo = part(geo.torus(), glow(0xffe28a, 0.7), [0, 0, 0], 0.075, [Math.PI / 2, 0, 0]);
  pearl.add(halo);
  f.root.add(pearl);
  const clouds = new THREE.Group();
  for (let i = 0; i < 4; i++) clouds.add(ball(glow(0xfff6dc, 0.25), [(i - 1.5) * 0.12, -0.14, -0.15 - Math.abs(i - 1.5) * 0.06], 0.08, [1.5, 0.5, 1], 8));
  f.root.add(clouds);
  f.fx.push((t, moving) => {
    const speed = moving ? 6 : 3;
    segs.forEach((seg, i) => {
      seg.position.set(Math.sin(t * speed * 0.5 - i * 0.7) * 0.03 * i, Math.sin(t * speed - i * 0.9) * 0.045, -0.02 - i * 0.075);
    });
    const last = segs[segs.length - 1].position;
    tuft.position.set(last.x, last.y, last.z - 0.05);
    pearl.position.y = -0.08 + Math.sin(t * 2.2) * 0.02;
    halo.rotation.z = t * 2;
    halo.rotation.x = Math.PI / 2 + Math.sin(t) * 0.4;
    clouds.position.y = Math.sin(t * 1.3) * 0.02;
  });
  castShadows(f.body);
  f.height = 0.42;
  return f;
}
