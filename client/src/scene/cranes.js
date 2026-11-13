// Đàn hạc tiên lượn vòng chậm trên gò: thân trắng cổ đen mào đỏ, cánh trắng chóp đen vỗ thong thả.
// Ba InstancedMesh (thân, cánh trái, cánh phải) cho cả đàn: mỗi khung chỉ tính lại ma trận, ba lần vẽ.
import * as THREE from 'three';
import { Batch } from './builders.js';
import { SITE_CENTER } from './xianxia-backdrop-layout.js';

const WHITE = '#f3f1ea';
const BLACK = '#24262a';
const RED = '#c4302b';

/** Thân hạc hướng về +z: mình thuôn, cổ dài vươn trước, đầu mào đỏ, mỏ vàng xám, chân duỗi sau. */
function bodyGeometry() {
  const b = new Batch(61);
  b.add(new THREE.IcosahedronGeometry(0.42, 0), WHITE, { sx: 0.8, sy: 0.7, sz: 1.7, jitter: 0.03 });
  b.box(0.1, 0.1, 0.9, BLACK, 0, 0.08, 0.95, { rx: -0.15 });
  b.add(new THREE.IcosahedronGeometry(0.13, 0), WHITE, { x: 0, y: 0.16, z: 1.42 });
  b.box(0.08, 0.04, 0.08, RED, 0, 0.27, 1.42);
  b.add(new THREE.ConeGeometry(0.035, 0.36, 4), '#a59a76', { x: 0, y: 0.14, z: 1.66, rx: Math.PI / 2 });
  b.box(0.36, 0.08, 0.45, BLACK, 0, 0.02, -0.75); // lông đuôi đen
  for (const s of [-1, 1]) b.box(0.03, 0.03, 1.0, BLACK, s * 0.07, -0.12, -1.2, { rx: 0.1 });
  return b.build(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { castShadow: false }).geometry;
}

/** Cánh trái (side = 1) hoặc phải (side = -1), bản lề ở gốc toạ độ; nửa ngoài chóp đen. */
function wingGeometry(side) {
  const b = new Batch(62 + side);
  b.box(1.2, 0.04, 0.62, WHITE, side * 0.6, 0, 0, { jitter: 0.02 });
  b.box(0.8, 0.035, 0.5, BLACK, side * 1.55, 0, -0.04);
  return b.build(new THREE.MeshLambertMaterial({ vertexColors: true }), { castShadow: false }).geometry;
}

export class Cranes {
  constructor(scene, lowQuality) {
    this.count = lowQuality ? 4 : 7;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    this.body = new THREE.InstancedMesh(bodyGeometry(), mat, this.count);
    this.left = new THREE.InstancedMesh(wingGeometry(1), mat, this.count);
    this.right = new THREE.InstancedMesh(wingGeometry(-1), mat, this.count);
    for (const mesh of [this.body, this.left, this.right]) {
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    // Bay thành hình chữ V lỏng: con đầu đàn ở trước, các con sau lệch hai bên và thấp dần.
    this.slots = Array.from({ length: this.count }, (_, i) => {
      const rank = Math.ceil(i / 2);
      const side = i % 2 ? 1 : -1;
      return { lag: rank * 0.045, offset: side * rank * 3.2, drop: rank * 0.9, phase: i * 0.9 };
    });
    this.time = 0;
    this._m = new THREE.Matrix4();
    this._w = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1.4, 1.4, 1.4);
    this.update(0);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    const radius = 95;
    for (let i = 0; i < this.count; i++) {
      const slot = this.slots[i];
      const a = t * 0.045 - slot.lag;
      // Đường lượn hơi méo, lên xuống nhẹ; hướng bay là tiếp tuyến vòng tròn.
      const rr = radius + Math.sin(t * 0.07) * 18 + slot.offset;
      const x = SITE_CENTER.x + Math.cos(a) * rr;
      const z = SITE_CENTER.z + Math.sin(a) * rr;
      const y = 38 + Math.sin(t * 0.21 + slot.phase) * 2.5 - slot.drop;
      const heading = Math.atan2(-Math.sin(a), Math.cos(a));
      this._e.set(0, heading, Math.sin(t * 0.3) * 0.12, 'YXZ');
      this._q.setFromEuler(this._e);
      this._m.compose(this._p.set(x, y, z), this._q, this._s);
      this.body.setMatrixAt(i, this._m);
      const flap = Math.sin(t * 2.2 + slot.phase) * 0.55;
      for (const [mesh, side] of [[this.left, 1], [this.right, -1]]) {
        this._w.makeRotationZ(side * flap).premultiply(this._m);
        mesh.setMatrixAt(i, this._w);
      }
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.left.instanceMatrix.needsUpdate = true;
    this.right.instanceMatrix.needsUpdate = true;
  }
}
