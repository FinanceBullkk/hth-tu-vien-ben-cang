// Hiển thị lời ước trong cảnh: dải lụa trên cây, đèn hoa đăng trên hồ, thẻ giấy trên container.
import * as THREE from 'three';
import { CONTAINERS, POND, TREE } from '../../../shared/layout.js';
import { LIMITS } from '../../../shared/protocol.js';

const CAP = LIMITS.wishesShownPerPlace;
const GOLDEN = 2.399963;
const APPEAR_S = 1.1;

function slotPosition(place, slot, out) {
  if (place === 'tree') {
    const a = slot * GOLDEN;
    const r = 2.1 + (slot % 7) * 0.62;
    out.set(TREE.x + Math.sin(a) * r, 4.65 + (slot % 3) * 0.18 - r * 0.07, TREE.z + Math.cos(a) * r);
  } else if (place === 'container') {
    const col = slot % 13;
    const row = Math.floor(slot / 13);
    const jx = ((slot * 37) % 10) / 10 - 0.5;
    const jy = ((slot * 53) % 10) / 10 - 0.5;
    out.set(CONTAINERS.minX - 0.1, 0.55 + row * 0.38 + jy * 0.1, CONTAINERS.minZ + 0.7 + col * 0.88 + jx * 0.18);
  } else {
    out.set(POND.x, 0.09, POND.z);
  }
  return out;
}

export class Wishes3D {
  constructor(scene) {
    this.scene = scene;
    this.byId = new Map();
    this.lists = { tree: [], pond: [], container: [] };
    this.used = { tree: new Set(), pond: new Set(), container: new Set() };
    this.time = 0;
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this._v = new THREE.Vector3();

    const ribbon = new THREE.PlaneGeometry(0.2, 1.15, 1, 3);
    ribbon.translate(0, -0.575, 0);
    this.tree = new THREE.InstancedMesh(ribbon, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x4a0e08 }), CAP);

    const lotus = new THREE.CylinderGeometry(0.3, 0.17, 0.14, 8);
    this.pond = new THREE.InstancedMesh(lotus, new THREE.MeshLambertMaterial({ emissive: 0x552233 }), CAP);
    const flame = new THREE.IcosahedronGeometry(0.1, 0);
    this.flame = new THREE.InstancedMesh(flame, new THREE.MeshBasicMaterial({ color: 0xffd27a }), CAP);

    const tag = new THREE.PlaneGeometry(0.62, 0.32);
    tag.rotateY(-Math.PI / 2);
    this.container = new THREE.InstancedMesh(tag, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x2a2418 }), CAP);

    for (const mesh of [this.tree, this.pond, this.flame, this.container]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
    this.pickables = [this.tree, this.pond, this.container];
    this.meshPlace = new Map([[this.tree, 'tree'], [this.pond, 'pond'], [this.container, 'container']]);
  }

  setAll(wishes) {
    this.byId.clear();
    for (const key of Object.keys(this.lists)) {
      this.lists[key] = [];
      this.used[key].clear();
    }
    // Danh sách mới nhất trước: thêm từ cũ đến mới để trùng thứ tự thêm dần.
    const sorted = [...wishes].sort((a, b) => a.id - b.id);
    for (const w of sorted) this.add(w, false);
    this.recolor();
  }

  add(wish, animate = true) {
    if (this.byId.has(wish.id)) return;
    const list = this.lists[wish.place];
    if (!list) return;
    if (list.length >= CAP) {
      const oldest = list.shift();
      this.used[wish.place].delete(oldest.slot);
      this.byId.delete(oldest.id);
    }
    let slot = wish.id % CAP;
    while (this.used[wish.place].has(slot)) slot = (slot + 1) % CAP;
    this.used[wish.place].add(slot);
    const entry = { ...wish, slot, born: animate ? this.time : -100, world: new THREE.Vector3() };
    slotPosition(wish.place, slot, entry.world);
    list.push(entry);
    this.byId.set(wish.id, entry);
    if (animate) this.recolor();
  }

  remove(id) {
    const entry = this.byId.get(id);
    if (!entry) return;
    const list = this.lists[entry.place];
    list.splice(list.indexOf(entry), 1);
    this.used[entry.place].delete(entry.slot);
    this.byId.delete(id);
    this.recolor();
  }

  patch(id, fields) {
    const entry = this.byId.get(id);
    if (entry) Object.assign(entry, fields);
    return entry;
  }

  recolor() {
    const c = this._c;
    this.lists.tree.forEach((w, i) => {
      c.setHSL(0.0 + ((w.slot * 7) % 5) * 0.012, 0.76, 0.42 + ((w.slot * 3) % 4) * 0.035);
      this.tree.setColorAt(i, c);
    });
    this.lists.pond.forEach((w, i) => {
      c.setHSL(0.93 + ((w.slot * 5) % 4) * 0.015, 0.7, 0.72);
      this.pond.setColorAt(i, c);
    });
    this.lists.container.forEach((w, i) => {
      const tones = ['#f2e8cf', '#f6dfb5', '#efe3c2', '#f8efd9', '#e9d8ad'];
      c.set(tones[w.slot % tones.length]);
      this.container.setColorAt(i, c);
    });
    for (const m of [this.tree, this.pond, this.container]) {
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.tree.count = this.lists.tree.length;
    this.pond.count = this.lists.pond.length;
    this.flame.count = this.lists.pond.length;
    this.container.count = this.lists.container.length;
    for (const m of this.pickables) {
      m.boundingSphere = null;
    }
  }

  update(dt, nowMs) {
    this.time += dt;
    const t = nowMs / 1000;
    const { _m: m, _p: p, _q: q, _e: e, _s: s } = this;

    this.lists.tree.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / APPEAR_S);
      const ease = k * k * (3 - 2 * k);
      e.set(Math.sin(t * 1.2 + w.slot) * 0.1, w.slot * 1.7, Math.sin(t * 1.5 + w.slot * 2) * 0.09);
      q.setFromEuler(e);
      s.set(1, ease, 1);
      m.compose(w.world, q, s);
      this.tree.setMatrixAt(i, m);
    });
    this.tree.instanceMatrix.needsUpdate = this.lists.tree.length > 0;

    this.lists.pond.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / APPEAR_S);
      const r = 0.9 + (w.slot % 7) * 0.58;
      const a = (w.slot % 2 ? 1 : -1) * t * 0.022 + w.slot * GOLDEN;
      const startR = POND.radius - 0.4;
      const rr = startR + (r - startR) * (k * k * (3 - 2 * k)); // Trôi từ bờ ra giữa hồ
      p.set(POND.x + Math.sin(a) * rr, 0.12 + Math.sin(t * 1.3 + w.slot) * 0.012, POND.z + Math.cos(a) * rr);
      w.world.copy(p);
      e.set(0, w.slot, 0);
      q.setFromEuler(e);
      s.setScalar(Math.min(1, k * 2.5));
      m.compose(p, q, s);
      this.pond.setMatrixAt(i, m);
      p.y += 0.16;
      m.compose(p, q, s);
      this.flame.setMatrixAt(i, m);
    });
    this.pond.instanceMatrix.needsUpdate = this.lists.pond.length > 0;
    this.flame.instanceMatrix.needsUpdate = this.lists.pond.length > 0;

    // Thẻ giấy chỉ đổi khi mới dán, nhưng số lượng nhỏ nên cập nhật gộp vẫn nhẹ.
    this.lists.container.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / (APPEAR_S * 0.6));
      const back = k < 1 ? (1 - k) * 0.6 : 0;
      p.copy(w.world);
      p.x -= back;
      e.set(((w.slot * 23) % 9) * 0.02 - 0.08, 0, 0);
      q.setFromEuler(e);
      s.setScalar(k < 1 ? 0.5 + k * 0.5 : 1);
      m.compose(p, q, s);
      this.container.setMatrixAt(i, m);
    });
    this.container.instanceMatrix.needsUpdate = this.lists.container.length > 0;
  }

  /** Lời ước trúng tia từ chạm/click. */
  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.pickables, false);
    for (const hit of hits) {
      if (hit.instanceId === undefined) continue;
      const place = this.meshPlace.get(hit.object);
      const entry = this.lists[place][hit.instanceId];
      if (entry) return entry;
    }
    return null;
  }

  /** Lời ước gần người chơi nhất và nằm trong hướng nhìn, để hiện thẻ đọc. */
  nearestInView(px, pz, camera, forward, maxDist = 5) {
    let best = null;
    let bestScore = Infinity;
    for (const place of ['tree', 'pond', 'container']) {
      for (const w of this.lists[place]) {
        const dx = w.world.x - px;
        const dz = w.world.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > maxDist) continue;
        this._v.copy(w.world).sub(camera.position).normalize();
        const facing = this._v.dot(forward);
        if (facing < 0.72) continue;
        const score = d + (1 - facing) * 8;
        if (score < bestScore) {
          best = w;
          bestScore = score;
        }
      }
    }
    return best;
  }
}
