// Hiển thị lời ước trong cảnh: dải lụa trên cây, đèn hoa đăng trên hồ, thẻ giấy trên container.
// Nguyên tắc kiểu WWM/Sky: lời ước là vật thể sáng, tự phát ánh sáng về đêm, thả ra có nghi thức,
// và được phúc (tim) thì vật thể đổi trạng thái (hạt vàng, đèn bùng, triện đỏ).
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONTAINERS, POND, SPAWN, TREE, TREE_BRANCHES } from '../../../shared/layout.js';
import { LIMITS } from '../../../shared/protocol.js';
import { glowTexture } from './builders.js';

const CAP = LIMITS.wishesShownPerPlace;
const GOLDEN = 2.399963;
const APPEAR_S = 1.1;
const TIERS = Math.ceil(CAP / TREE_BRANCHES.length);
// Tầm đọc thẻ theo từng nơi: cây và hồ rộng nên cho phép xa hơn một chút.
const READ_DIST = { tree: 6.5, pond: 7.5, container: 5 };

function slotPosition(place, slot, out) {
  if (place === 'tree') {
    // Bám theo cành thật: mỗi cành nhận một lớp dải lụa dọc theo chiều cành,
    // anchor nằm ngay mặt dưới cành (trừ bán kính cành) nên không còn dải nào lơ lửng.
    const br = TREE_BRANCHES[slot % TREE_BRANCHES.length];
    const tier = Math.floor(slot / TREE_BRANCHES.length) % TIERS;
    const jx = ((slot * 37) % 10) / 10 - 0.5;
    const jz = ((slot * 53) % 10) / 10 - 0.5;
    const r = 2.1 + (tier / (TIERS - 1)) * (br.len - 2.7) + jx * 0.22;
    const slope = 0.1206; // độ dốc cành theo mét ngang (khớp rx = PI/2 - 0.12 khi dựng)
    const y = br.y + (r - br.len / 2) * slope - (0.3 - (r / br.len) * 0.16) - 0.03;
    const perp = jz * 0.3; // lệch ngang cành một chút cho tự nhiên
    out.set(TREE.x + Math.sin(br.a) * r + Math.cos(br.a) * perp, y, TREE.z + Math.cos(br.a) * r - Math.sin(br.a) * perp);
  } else if (place === 'container') {
    const col = slot % 13;
    const row = Math.floor(slot / 13);
    const jx = ((slot * 37) % 10) / 10 - 0.5;
    const jy = ((slot * 53) % 10) / 10 - 0.5;
    // Hàng trên cùng hạ xuống dưới biển "Bảng ước" trên vách container.
    out.set(CONTAINERS.minX - 0.1, 0.5 + row * 0.34 + jy * 0.06, CONTAINERS.minZ + 0.7 + col * 0.88 + jx * 0.18);
  } else {
    out.set(POND.x, 0.09, POND.z);
  }
  return out;
}

/** Thẻ giấy có viền sơn đỏ vẽ một lần bằng canvas, mọi instance dùng chung. */
function tagTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2e6cb';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#b8432e';
  g.lineWidth = 6;
  g.strokeRect(5, 5, 118, 54);
  g.fillStyle = '#b8432e';
  g.beginPath();
  g.arc(64, 13, 4, 0, 7);
  g.fill(); // Lỗ dây thẻ
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Wishes3D {
  constructor(scene) {
    this.scene = scene;
    this.byId = new Map();
    this.lists = { tree: [], pond: [], container: [] };
    this.used = { tree: new Set(), pond: new Set(), container: new Set() };
    this.time = 0;
    this.viewer = { x: SPAWN.x, z: SPAWN.z, cam: null };
    this.onLand = null;
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this._v = new THREE.Vector3();
    this.glowMap = glowTexture();

    // Dải lụa: MeshBasic để tự sáng — về đêm chúng là thứ nổi bật nhất trên cây.
    const ribbon = new THREE.PlaneGeometry(0.3, 1.5, 1, 4);
    ribbon.translate(0, -0.75, 0);
    this.tree = new THREE.InstancedMesh(ribbon, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CAP);

    // Đèn hoa đăng: thân sáng + ngọn lửa + quầng additive + vệt phản chiếu trên mặt nước.
    const lotus = new THREE.CylinderGeometry(0.36, 0.22, 0.2, 8);
    this.pond = new THREE.InstancedMesh(lotus, new THREE.MeshLambertMaterial({ color: 0x7a2d1a, emissive: 0xff6a2a, emissiveIntensity: 0.85 }), CAP);
    const flame = new THREE.IcosahedronGeometry(0.12, 0);
    this.flame = new THREE.InstancedMesh(flame, new THREE.MeshBasicMaterial({ color: 0xffd27a }), CAP);
    const glowGeo = new THREE.PlaneGeometry(1.9, 1.9);
    this.glow = new THREE.InstancedMesh(glowGeo, new THREE.MeshBasicMaterial({
      map: this.glowMap, color: 0xffa04a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }), CAP);
    const flat = new THREE.PlaneGeometry(1.5, 0.85);
    flat.rotateX(-Math.PI / 2);
    this.glowWater = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({
      map: this.glowMap, color: 0xff9448, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
    }), CAP);

    // Thẻ container + triện đỏ khi được thả phúc.
    const tag = new THREE.PlaneGeometry(0.74, 0.38);
    tag.rotateY(-Math.PI / 2);
    this.container = new THREE.InstancedMesh(tag, new THREE.MeshLambertMaterial({
      map: tagTexture(), side: THREE.DoubleSide, emissive: 0x2a2418,
    }), CAP);
    const seal = new THREE.CircleGeometry(0.085, 10);
    seal.rotateY(-Math.PI / 2);
    this.seal = new THREE.InstancedMesh(seal, new THREE.MeshBasicMaterial({ color: 0xc23b22 }), CAP);

    // Hạt vàng trượt vào đầu dải lụa khi được thả phúc.
    this.bead = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshBasicMaterial({ color: 0xffd24a }), CAP);

    // Ba đèn point ấm cho ba điểm ước — đêm về là lúc chúng trả hóa chơi.
    this.lights = [
      new THREE.PointLight(0xffb46a, 0, 13, 1.8),
      new THREE.PointLight(0xffa04a, 0, 10, 1.8),
      new THREE.PointLight(0xffc27a, 0, 11, 1.8),
    ];
    this.lights[0].position.set(TREE.x, 4.4, TREE.z);
    this.lights[1].position.set(POND.x, 1.3, POND.z);
    this.lights[2].position.set(CONTAINERS.minX - 0.8, 1.7, (CONTAINERS.minZ + CONTAINERS.maxZ) / 2);

    for (const mesh of [this.tree, this.pond, this.flame, this.glow, this.glowWater, this.container, this.seal, this.bead]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
    for (const light of this.lights) scene.add(light);

    // Nhãn tên tác giả: chỉ 3 cái, gắn cho 3 lời ước gần người chơi nhất.
    this.marks = Array.from({ length: 3 }, () => {
      const el = document.createElement('div');
      el.className = 'wish-mark';
      const obj = new CSS2DObject(el);
      obj.visible = false;
      scene.add(obj);
      return { obj, el, cur: '' };
    });

    this.pickables = [this.tree, this.pond, this.container];
    this.meshPlace = new Map([[this.tree, 'tree'], [this.pond, 'pond'], [this.container, 'container']]);
  }

  /** main.js gọi mỗi khung: cho biết người chơi đứng đâu + camera để quay quầng sáng. */
  setViewer(x, z, camera) {
    this.viewer.x = x;
    this.viewer.z = z;
    this.viewer.cam = camera;
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

  add(wish, animate = true, from = null) {
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
    // Điểm xuất phát của nghi thức: cây/lụa bay từ tay người thả, đèn trôi từ chân người thả.
    if (animate && wish.place === 'tree') {
      entry.flyFrom = new THREE.Vector3(from?.x ?? TREE.x + 2.4, 1.3, from?.z ?? TREE.z + 2.4);
    }
    if (animate && wish.place === 'pond') {
      const dx = (from?.x ?? POND.x) - POND.x;
      const dz = (from?.z ?? POND.z) - POND.z;
      entry.startA = Math.atan2(dx, dz);
      entry.startR = Math.min(POND.radius - 0.4, Math.max(0.8, Math.hypot(dx, dz)));
    }
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
    if (!entry) return null;
    if (fields.likes !== undefined && fields.likes > (entry.likes ?? 0)) entry.flareT = this.time;
    Object.assign(entry, fields);
    return entry;
  }

  recolor() {
    const c = this._c;
    this.lists.tree.forEach((w, i) => {
      // Bảng ấm kiểu vải lụa: vàng mật, hồng sen, đỏ son, xen một dải ngọc cho đỡ đơn điệu.
      const hues = [0.09, 0.97, 0.02, 0.06, 0.52];
      const hue = hues[(w.slot * 3) % hues.length] + (((w.slot * 7) % 5) - 2) * 0.008;
      c.setHSL(hue % 1, 0.78, 0.58 + ((w.slot * 5) % 4) * 0.035);
      this.tree.setColorAt(i, c);
    });
    this.lists.pond.forEach((w, i) => {
      c.setHSL(0.93 + ((w.slot * 5) % 4) * 0.015, 0.7, 0.72);
      this.pond.setColorAt(i, c);
    });
    this.lists.container.forEach((w, i) => {
      const tones = ['#f6efdd', '#faf1e0', '#f1e4c8', '#fdf6ea', '#eedcb4'];
      c.set(tones[w.slot % tones.length]);
      this.container.setColorAt(i, c);
    });
    for (const m of [this.tree, this.pond, this.container]) {
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.tree.count = this.lists.tree.length;
    this.pond.count = this.lists.pond.length;
    this.flame.count = this.lists.pond.length;
    this.glow.count = this.lists.pond.length;
    this.glowWater.count = this.lists.pond.length;
    this.container.count = this.lists.container.length;
    for (const m of this.pickables) {
      m.boundingSphere = null;
    }
  }

  update(dt, nowMs, night = 0) {
    this.time += dt;
    const t = nowMs / 1000;
    const { _m: m, _p: p, _q: q, _e: e, _s: s } = this;
    const flick = 0.9 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.7) * 0.04;

    // Dải lụa: bay từ tay người thả ra cành theo vòng cung, rồi đung đưa.
    let beads = 0;
    this.lists.tree.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / APPEAR_S);
      const ease = k * k * (3 - 2 * k);
      let px = w.world.x;
      let py = w.world.y;
      let pz = w.world.z;
      if (w.flyFrom && k < 1) {
        // Bezier bậc hai: tay người → điểm vồng lên giữa đường → mặt cành.
        const mx = (w.flyFrom.x + w.world.x) / 2;
        const mz = (w.flyFrom.z + w.world.z) / 2;
        const my = Math.max(w.flyFrom.y, w.world.y) + 1.7;
        const u = 1 - ease;
        px = u * u * w.flyFrom.x + 2 * u * ease * mx + ease * ease * w.world.x;
        py = u * u * w.flyFrom.y + 2 * u * ease * my + ease * ease * w.world.y;
        pz = u * u * w.flyFrom.z + 2 * u * ease * mz + ease * ease * w.world.z;
        if (k >= 1 - dt / APPEAR_S && !w.landed) {
          w.landed = true;
          this.onLand?.(0.25); // Cánh hoa rơi nhẹ khi dải lụa thắt lên cành
        }
      } else if (w.flyFrom && !w.landed) {
        w.landed = true;
        this.onLand?.(0.25);
      }
      e.set(Math.sin(t * 1.2 + w.slot) * 0.1, w.slot * 1.7, Math.sin(t * 1.5 + w.slot * 2) * 0.09);
      if (w.flyFrom && k < 1) e.set(ease * 2.2, w.slot * 1.7, Math.sin(ease * 6) * 0.4);
      q.setFromEuler(e);
      s.set(1, Math.min(1, 0.25 + ease), 1);
      m.compose(p.set(px, py, pz), q, s);
      this.tree.setMatrixAt(i, m);
      if (w.likes > 0) {
        // Hạt phúc gắn trên đầu dải, nảy lên một nhịp khi vừa được thả tim.
        const pop = w.flareT === undefined ? 1 : 1 + Math.exp(-3.5 * (this.time - w.flareT)) * 0.9;
        s.setScalar(pop);
        m.compose(p.set(px, py + 0.1, pz), q, s);
        this.bead.setMatrixAt(beads++, m);
      }
    });
    this.tree.instanceMatrix.needsUpdate = this.lists.tree.length > 0;
    this.bead.count = beads;
    this.bead.instanceMatrix.needsUpdate = beads > 0;

    // Đèn hoa đăng: trôi từ chân người thả ra chỗ của mình, sáng dần lên rồi bồng bềnh quanh hồ.
    let glows = 0;
    this.lists.pond.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / APPEAR_S);
      const ease = k * k * (3 - 2 * k);
      const r = 0.8 + (w.slot % 7) * 0.42;
      const a = (w.slot % 2 ? 1 : -1) * t * 0.022 + w.slot * GOLDEN;
      const startR = w.startR ?? POND.radius - 0.4;
      const rr = startR + (r - startR) * ease;
      const aa = w.startA === undefined ? a : w.startA + (a - w.startA) * ease;
      const lit = Math.min(1, Math.max(0, (k - 0.45) / 0.55)); // Sáng dần trên đoạn cuối của hành trình
      p.set(POND.x + Math.sin(aa) * rr, 0.12 + Math.sin(t * 1.3 + w.slot) * 0.012, POND.z + Math.cos(aa) * rr);
      w.world.copy(p);
      e.set(0, w.slot, 0);
      q.setFromEuler(e);
      s.setScalar(Math.min(1, 0.4 + k));
      m.compose(p, q, s);
      this.pond.setMatrixAt(i, m);
      const fy = p.y + 0.19;
      const fs = 0.85 + Math.sin(t * 9 + w.slot * 2) * 0.12; // Lửa nhấp nháy
      s.setScalar(Math.max(0.001, fs * lit * Math.min(1, 0.4 + k)));
      m.compose(p.set(p.x, fy, p.z), q, s);
      this.flame.setMatrixAt(i, m);
      if (this.viewer.cam) {
        // Quầng sáng quay theo camera, phình lên một nhịp khi vừa được thả phúc.
        const flare = w.flareT === undefined ? 0 : Math.exp(-2.6 * (this.time - w.flareT));
        const gs = (1.35 + flare * 0.8) * lit;
        s.setScalar(Math.max(0.001, gs));
        m.compose(p.set(w.world.x, fy + 0.25, w.world.z), this.viewer.cam.quaternion, s);
        this.glow.setMatrixAt(glows, m);
        s.set(gs * 0.9, gs * 0.5, gs * 0.9);
        m.compose(p.set(w.world.x, 0.1, w.world.z), q, s); // Vệt sáng loang trên mặt nước
        this.glowWater.setMatrixAt(glows, m);
        glows++;
      }
    });
    this.pond.instanceMatrix.needsUpdate = this.lists.pond.length > 0;
    this.flame.instanceMatrix.needsUpdate = this.lists.pond.length > 0;
    this.glow.count = glows;
    this.glow.instanceMatrix.needsUpdate = glows > 0;
    this.glowWater.count = glows;
    this.glowWater.instanceMatrix.needsUpdate = glows > 0;

    // Thẻ giấy: ghim lên vách có swing, triện đỏ ở góc khi được thả phúc.
    let seals = 0;
    this.lists.container.forEach((w, i) => {
      const k = Math.min(1, (this.time - w.born) / (APPEAR_S * 0.6));
      const back = k < 1 ? (1 - k) * 0.6 : 0;
      const swing = k < 1 ? Math.sin(k * Math.PI * 2.5) * (1 - k) * 0.5 : 0;
      p.copy(w.world);
      p.x -= back;
      e.set(((w.slot * 23) % 9) * 0.02 - 0.08, swing, 0);
      q.setFromEuler(e);
      s.setScalar(k < 1 ? 0.5 + k * 0.5 : 1);
      m.compose(p, q, s);
      this.container.setMatrixAt(i, m);
      if (w.likes > 0) {
        const pop = w.flareT === undefined ? 1 : 1 + Math.exp(-3.5 * (this.time - w.flareT)) * 1.1;
        s.setScalar(pop);
        m.compose(p.set(w.world.x - 0.02, w.world.y - 0.08, w.world.z + 0.24), q, s);
        this.seal.setMatrixAt(seals++, m);
      }
    });
    this.container.instanceMatrix.needsUpdate = this.lists.container.length > 0;
    this.seal.count = seals;
    this.seal.instanceMatrix.needsUpdate = seals > 0;

    // Ba điểm ước tự tỏa sáng khi trời tối; đèn hồ là nguồn sáng chính trên mặt nước.
    this.lights[0].intensity = (0.25 + night * 0.9) * flick;
    this.lights[1].intensity = (0.35 + night * 1.9) * flick;
    this.lights[2].intensity = (0.2 + night * 1.1) * flick;

    this.#updateMarks();
  }

  /** Nhãn tác giả: gắn cho 3 lời ước gần người chơi nhất, mỗi cái là một DOM node tái dùng. */
  #updateMarks() {
    const near = [];
    for (const place of ['tree', 'pond', 'container']) {
      for (const w of this.lists[place]) {
        const d = Math.hypot(w.world.x - this.viewer.x, w.world.z - this.viewer.z);
        if (d <= 11) near.push([d, w]);
      }
    }
    near.sort((a, b) => a[0] - b[0]);
    const lift = { tree: 0.45, pond: 0.75, container: 0.45 };
    for (let i = 0; i < this.marks.length; i++) {
      const mark = this.marks[i];
      const w = near[i]?.[1];
      if (!w) {
        mark.obj.visible = false;
        mark.cur = '';
        continue;
      }
      mark.obj.visible = true;
      mark.obj.position.set(w.world.x, w.world.y + lift[w.place], w.world.z);
      const text = `${w.author} · ❤ ${w.likes ?? 0}`;
      if (mark.cur !== text) {
        mark.cur = text;
        mark.el.textContent = text;
      }
    }
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

  /** Chọn lời ước có hình chiếu trên màn hình gần điểm chạm (px, py) nhất.
   *  Dự phòng cho tap khi tia không trúng mesh mỏng (dải lụa 0.2m, đèn nhỏ). */
  pickScreen(px, py, camera, viewW, viewH, maxPx = 34) {
    let best = null;
    let bestD = maxPx * maxPx;
    for (const place of ['tree', 'pond', 'container']) {
      for (const w of this.lists[place]) {
        this._v.copy(w.world).project(camera);
        if (this._v.z > 1) continue; // Đằng sau camera hoặc ngoài far plane
        if (camera.position.distanceTo(w.world) > 20) continue; // Camera lùi sau lưng ~8.5m nên phải rộng hơn tầm đọc
        const sx = (this._v.x * 0.5 + 0.5) * viewW;
        const sy = (-this._v.y * 0.5 + 0.5) * viewH;
        const dx = sx - px;
        const dy = sy - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
    }
    return best;
  }

  /** Lời ước gần người chơi nhất và nằm trong hướng nhìn, để hiện thẻ đọc. */
  nearestInView(px, pz, camera, forward) {
    let best = null;
    let bestScore = Infinity;
    for (const place of ['tree', 'pond', 'container']) {
      const maxDist = READ_DIST[place];
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
