// Con vật làm sân sinh động: mèo đi/nằm, chim sẻ bay đàn, cá koi. Vị trí tính từ giờ server.
import * as THREE from 'three';
import { LAKE, POND } from '../../../shared/layout.js';
import { Batch, flatMaterial, rng } from './builders.js';

const CAT_ROUTES = [
  // Mèo sân tây: lượn qua cây bồ đề và quán trà
  { color: '#d9822b', stripe: '#a85c18', speed: 0.8, pts: [[-10, 6], [-10, 18], [-25, 18], [-25, 6]], rest: 18 },
  // Mèo vườn đá
  { color: '#3a3a40', stripe: '#232327', speed: 0.7, pts: [[10, -4], [10, -14], [25, -14], [25, -4]], rest: 24 },
  // Mèo trắng cổng, hay nằm gần lối đi
  { color: '#e8e2d6', stripe: '#b8ad98', speed: 0.6, pts: [[7, 26], [7, 12], [14, 8.2], [21, 8.4], [22, 15.8], [8.4, 16.4]], rest: 30 },
];

function makeCat(colorHex, stripeHex) {
  const root = new THREE.Group();
  const b = new Batch(61);
  b.box(0.22, 0.2, 0.5, colorHex, 0, 0.27, 0);
  b.box(0.24, 0.05, 0.1, stripeHex, 0, 0.375, 0.1);
  b.box(0.24, 0.05, 0.1, stripeHex, 0, 0.375, -0.1);
  b.box(0.22, 0.2, 0.2, colorHex, 0, 0.42, 0.3);
  b.add(new THREE.ConeGeometry(0.05, 0.1, 4), colorHex, { x: -0.07, y: 0.56, z: 0.3 });
  b.add(new THREE.ConeGeometry(0.05, 0.1, 4), colorHex, { x: 0.07, y: 0.56, z: 0.3 });
  b.box(0.03, 0.03, 0.01, '#141414', -0.05, 0.44, 0.405, { jitter: 0 });
  b.box(0.03, 0.03, 0.01, '#141414', 0.05, 0.44, 0.405, { jitter: 0 });
  const body = b.build(flatMaterial());
  root.add(body);

  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06);
  legGeo.translate(0, -0.09, 0);
  const legMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
  for (const [x, z] of [[-0.07, 0.18], [0.07, 0.18], [-0.07, -0.18], [0.07, -0.18]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, 0.18, z);
    root.add(leg);
    legs.push(leg);
  }
  const tailGeo = new THREE.BoxGeometry(0.04, 0.04, 0.34);
  tailGeo.translate(0, 0, -0.17);
  const tail = new THREE.Mesh(tailGeo, legMat);
  tail.position.set(0, 0.33, -0.25);
  tail.rotation.x = 0.6;
  root.add(tail);
  return { root, legs, tail, body };
}

export class Animals {
  constructor(scene, lowQuality) {
    this.cats = CAT_ROUTES.map((route) => {
      const cat = makeCat(route.color, route.stripe);
      scene.add(cat.root);
      const segs = [];
      let total = 0;
      for (let i = 0; i < route.pts.length; i++) {
        const a = route.pts[i];
        const b = route.pts[(i + 1) % route.pts.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const walk = len / route.speed;
        segs.push({ a, b, walk, rest: route.rest, start: total });
        total += walk + route.rest;
      }
      return { ...cat, segs, total, purr: 0 };
    });

    // Chim sẻ: mỗi con là một InstancedMesh hai cánh
    this.birdCount = lowQuality ? 8 : 14;
    const pos = new Float32Array([
      0, 0, 0.12, -0.3, 0.02, -0.02, 0, 0, -0.1,
      0, 0, 0.12, 0, 0, -0.1, 0.3, 0.02, -0.02,
    ]);
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    birdGeo.computeVertexNormals();
    this.birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshLambertMaterial({ color: 0x4a3a2a, side: THREE.DoubleSide }), this.birdCount);
    this.birds.frustumCulled = false;
    scene.add(this.birds);
    const r = rng(808);
    this.birdSeed = Array.from({ length: this.birdCount }, () => [r() * 5, r() * 3, r() * 5, r() * 6.28]);

    // Cá koi
    const fishGeo = new THREE.ConeGeometry(0.13, 0.62, 5);
    fishGeo.rotateX(Math.PI / 2);
    fishGeo.scale(1, 0.4, 1);
    this.pondKoi = 9; // từ con thứ 10 trở đi bơi ở hồ câu
    this.koiCount = 13;
    this.koi = new THREE.InstancedMesh(fishGeo, new THREE.MeshBasicMaterial(), this.koiCount);
    const col = new THREE.Color();
    const koiColors = ['#f07a2a', '#f4f0e6', '#e0402a', '#f5b53a'];
    for (let i = 0; i < this.koiCount; i++) {
      col.set(koiColors[i % koiColors.length]);
      this.koi.setColorAt(i, col);
    }
    this.koi.frustumCulled = false;
    scene.add(this.koi);

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
  }

  /** Tìm mèo gần tia nhìn để phản hồi khi chạm vào. */
  catAtRay(ray, maxDist2 = 0.55) {
    for (const cat of this.cats) {
      const p = this._p.copy(cat.root.position);
      p.y += 0.35;
      if (ray.distanceSqToPoint(p) < maxDist2 && ray.origin.distanceTo(p) < 22) return cat;
    }
    return null;
  }

  update(nowMs, night) {
    const t = nowMs / 1000;
    for (const cat of this.cats) {
      const s = t % cat.total;
      let seg = cat.segs[cat.segs.length - 1];
      for (const candidate of cat.segs) {
        if (s >= candidate.start && s < candidate.start + candidate.walk + candidate.rest) {
          seg = candidate;
          break;
        }
      }
      const local = s - seg.start;
      const walking = local < seg.walk;
      const k = Math.min(1, local / seg.walk);
      const x = seg.a[0] + (seg.b[0] - seg.a[0]) * k;
      const z = seg.a[1] + (seg.b[1] - seg.a[1]) * k;
      cat.root.position.set(x, 0.04, z);
      cat.root.rotation.y = Math.atan2(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
      const swing = walking ? Math.sin(t * 9) * 0.6 : 0;
      cat.legs[0].rotation.x = swing;
      cat.legs[3].rotation.x = swing;
      cat.legs[1].rotation.x = -swing;
      cat.legs[2].rotation.x = -swing;
      // Nằm nghỉ: hạ thấp người, co chân
      const lie = walking ? 0 : Math.min(1, (local - seg.walk) * 1.4);
      cat.root.position.y = 0.04 - lie * 0.12;
      for (const leg of cat.legs) leg.scale.y = 1 - lie * 0.55;
      cat.tail.rotation.y = Math.sin(t * (walking ? 3 : 1)) * 0.5;
    }

    // Chim: chuyển động thành đàn, buổi tối bay cao và thưa hơn
    const fx = -6 + Math.sin(t * 0.05) * 26;
    const fz = 2 + Math.cos(t * 0.04) * 24;
    const fy = 12 + night * 16 + Math.sin(t * 0.1) * 2;
    for (let i = 0; i < this.birdCount; i++) {
      const [a, b, c, ph] = this.birdSeed[i];
      this._p.set(
        fx + Math.sin(t * 0.35 + ph) * (2 + a),
        fy + Math.sin(t * 0.6 + ph) * (0.5 + b * 0.5),
        fz + Math.cos(t * 0.3 + ph) * (2 + c),
      );
      this._e.set(0, Math.atan2(Math.cos(t * 0.05) * 26 * 0.05, -Math.sin(t * 0.04) * 24 * 0.04), 0);
      this._q.setFromEuler(this._e);
      this._s.set(1, 1 + Math.sin(t * 13 + ph) * 3, 1);
      this._m.compose(this._p, this._q, this._s);
      this.birds.setMatrixAt(i, this._m);
    }
    this.birds.instanceMatrix.needsUpdate = true;
    this._s.set(1, 1, 1);

    for (let i = 0; i < this.koiCount; i++) {
      const dir = i % 2 ? 1 : -1;
      const r = 1.3 + (i % 4) * 0.75;
      const a = dir * t * (0.25 + (i % 3) * 0.07) + i * 1.9;
      const wob = Math.sin(t * 2.5 + i) * 0.12;
      const home = i < this.pondKoi ? POND : LAKE.lobes[i % LAKE.lobes.length];
      this._p.set(home.x + Math.sin(a) * r, 0.06, home.z + Math.cos(a) * r);
      this._e.set(0, a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2) + wob, 0);
      this._q.setFromEuler(this._e);
      this._m.compose(this._p, this._q, this._s);
      this.koi.setMatrixAt(i, this._m);
    }
    this.koi.instanceMatrix.needsUpdate = true;
  }
}
