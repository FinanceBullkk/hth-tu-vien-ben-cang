// Phần bàn dùng chung cho tài xỉu và cò quay: bàn gỗ tròn, tấm bạt vẽ bằng canvas có vùng bấm cho từng cửa,
// chồng chip 3D theo tổng cược của cả bàn, nhà cái NPC và biển tên. Bàn là nơi chơi: người chơi bấm thẳng lên bạt,
// không có bảng 2D che màn hình. Lớp con vẽ bạt (drawFelt) và dựng phần riêng (khay xúc xắc, bánh xe).
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { floorHeight } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { chipMaterials } from './casino-chip-materials.js';
import { TableDealer } from './table-dealer.js';

export const TOP_Y = 0.8; // Mặt bàn cao hơn nền chừng này.
const CHIP_R = 0.034;
const CHIP_H = 0.008;
const MAX_STACK = 12; // Chồng cao hơn thì gộp, tránh cột chip xuyên mái.
const LABEL_SHOW_DISTANCE = 22;

export const matte = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

export function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Tách tổng TEU thành chip 10/5/1 từ dưới lên, như nhà cái đổi chip. */
export function chipBreakdown(amount) {
  const out = [];
  let rest = amount;
  for (const v of [10, 5, 1]) {
    while (rest >= v && out.length < MAX_STACK) {
      out.push(v);
      rest -= v;
    }
  }
  return out;
}

export class CasinoFeltTable {
  /**
   * @param {THREE.Scene} scene
   * @param {{ zone: any, title: string, dealer: {name:string, look:object}, felt: {w:number, d:number, x:number, px:number, py:number} }} opts
   * felt: kích thước tấm bạt (m) theo trục ngang người chơi (w) và trục sâu về phía nhà cái (d), tâm cách tâm bàn x mét
   * về phía nhà cái; px × py là cỡ canvas.
   */
  constructor(scene, { zone, title, dealer, felt }) {
    this.zone = zone;
    this.felt = felt;
    this.group = new THREE.Group();
    this.group.position.set(zone.x, floorHeight(zone.x, zone.z), zone.z);
    // Trục +x cục bộ của bàn hướng về nhà cái; người chơi đứng phía -x nhìn qua bàn.
    this.group.rotation.y = Math.atan2(zone.dealer.z - zone.z, zone.dealer.x - zone.x) * -1;
    scene.add(this.group);
    this.#buildTable(zone.tableRadius);
    this.#buildFelt();
    this.#buildLabel(title);
    this.dealer = new TableDealer(scene, { spot: zone.dealer, ...dealer });
    this.regions = []; // { target, x0, y0, x1, y1 } theo pixel canvas, lớp con điền khi vẽ.
    this.stacks = new Map(); // target -> Group chồng chip
    this.hover = -1;
    this.mine = [];
    this.winners = new Set();
    this.state = null;
    this.labelClock = 0;
    this.local = new THREE.Vector3();
  }

  #buildTable(radius) {
    const wood = matte(0x5b351c);
    const dark = matte(0x3a2211);
    const top = mesh(new THREE.CylinderGeometry(radius, radius, 0.07, 40), wood, 0, TOP_Y - 0.035, 0);
    const cloth = mesh(new THREE.CylinderGeometry(radius - 0.05, radius - 0.05, 0.012, 40), matte(0x14452f), 0, TOP_Y + 0.001, 0);
    const rim = mesh(new THREE.TorusGeometry(radius, 0.04, 6, 40), dark, 0, TOP_Y + 0.005, 0);
    rim.rotation.x = Math.PI / 2;
    const stem = mesh(new THREE.CylinderGeometry(0.14, 0.22, TOP_Y - 0.08, 10), dark, 0, (TOP_Y - 0.08) / 2, 0);
    const foot = mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.06, 18), dark, 0, 0.03, 0);
    this.group.add(top, cloth, rim, stem, foot);
  }

  #buildFelt() {
    const { w, d, x, px, py } = this.felt;
    this.canvas = document.createElement('canvas');
    this.canvas.width = px;
    this.canvas.height = py;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    // Canvas: trục ngang (u) chạy trái → phải theo mắt người chơi, trục dọc (v) từ mép gần người chơi ra xa.
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: this.texture }));
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.position.set(x, TOP_Y + 0.009, 0);
    this.feltMesh = plane;
    this.group.add(plane);
  }

  #buildLabel(title) {
    this.labelSub = h('small', {}, '');
    this.label = new CSS2DObject(h('div', { class: 'casino-label' }, h('b', {}, title), this.labelSub));
    this.label.position.set(0, TOP_Y + 1.15, 0);
    this.group.add(this.label);
  }

  /** Toạ độ cục bộ của bàn -> pixel canvas bạt. Người chơi nhìn theo +x nên bên phải họ là +z; mép trên canvas là phía xa. */
  feltToCanvas(lx, lz) {
    const { w, d, x, px, py } = this.felt;
    return { u: ((lz + w / 2) / w) * px, v: ((d / 2 - (lx - x)) / d) * py };
  }

  /** Pixel canvas -> toạ độ cục bộ trên mặt bàn (để đặt chồng chip đúng ô). */
  canvasToLocal(u, v) {
    const { w, d, x, px, py } = this.felt;
    return { x: x + d / 2 - (v / py) * d, z: (u / px) * w - w / 2 };
  }

  /** Cửa dưới tia chuột (Raycaster đã đặt theo camera), -1 nếu không trúng ô nào. */
  pick(raycaster) {
    const hit = raycaster.intersectObject(this.feltMesh, false)[0];
    if (!hit) return -1;
    this.local.copy(hit.point);
    this.group.worldToLocal(this.local);
    const { u, v } = this.feltToCanvas(this.local.x, this.local.z);
    const r = this.regions.find((g) => u >= g.x0 && u <= g.x1 && v >= g.y0 && v <= g.y1);
    return r ? r.target : -1;
  }

  /** Vẽ lại bạt: lớp con vẽ, rồi tô ô đang trỏ, ô mình đã cược và ô thắng. */
  redraw() {
    const g = this.canvas.getContext('2d');
    this.regions = [];
    this.drawFelt(g, this.canvas.width, this.canvas.height);
    for (const r of this.regions) {
      const won = this.winners.has(r.target);
      const mine = this.mine[r.target] > 0;
      if (!won && !mine && r.target !== this.hover) continue;
      g.save();
      g.lineWidth = won ? 8 : 5;
      g.strokeStyle = won ? '#ffe27a' : r.target === this.hover ? 'rgba(255,255,255,.95)' : 'rgba(255,214,120,.8)';
      if (won) {
        g.fillStyle = 'rgba(255,226,122,.28)';
        g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      } else if (r.target === this.hover) {
        g.fillStyle = 'rgba(255,255,255,.14)';
        g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      }
      g.strokeRect(r.x0 + 3, r.y0 + 3, r.x1 - r.x0 - 6, r.y1 - r.y0 - 6);
      g.restore();
    }
    this.texture.needsUpdate = true;
  }

  /** Lớp con ghi đè: vẽ toàn bộ bạt và đẩy vùng bấm vào this.regions. */
  drawFelt() {}

  setHover(target) {
    if (target === this.hover) return;
    this.hover = target;
    this.redraw();
  }

  setMine(bets) {
    this.mine = bets;
    this.redraw();
  }

  setWinners(targets) {
    this.winners = new Set(targets);
    this.redraw();
  }

  /** Dựng lại các chồng chip theo tổng cược của cả bàn. Chỉ dựng ô đổi số. */
  setTotals(totals) {
    totals.forEach((amount, target) => {
      const old = this.stacks.get(target);
      if ((old?.userData.amount ?? 0) === amount) return;
      if (old) this.group.remove(old);
      this.stacks.delete(target);
      if (!amount) return;
      const r = this.regions.find((g) => g.target === target);
      if (!r) return;
      const spot = this.canvasToLocal((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
      const stack = new THREE.Group();
      stack.userData.amount = amount;
      chipBreakdown(amount).forEach((v, i) => {
        const chip = mesh(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 18), chipMaterials(v), (i % 2) * 0.003, TOP_Y + 0.014 + i * CHIP_H, 0);
        stack.add(chip);
      });
      stack.position.set(spot.x, 0, spot.z);
      this.group.add(stack);
      this.stacks.set(target, stack);
    });
  }

  /** Nhịp vẽ chung: nhà cái, biển tên chỉ hiện khi đứng gần. pose do lớp con chọn. */
  updateCommon(dt, camera, pose) {
    this.dealer.update(dt, camera, pose);
    this.labelClock -= dt;
    if (this.labelClock <= 0) {
      this.labelClock = 0.5;
      const near = camera.position.distanceTo(this.group.position) < LABEL_SHOW_DISTANCE;
      this.label.element.style.display = near ? '' : 'none';
    }
  }
}
