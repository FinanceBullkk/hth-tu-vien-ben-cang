// Bàn xì dách ở sân trước thiền đường: bàn tròn phủ dạ xanh, Bà Năm nhà cái đứng phía đông, khách đứng phía trục.
// Mỗi ghế (0..4) có một quạt bài trên mặt bàn theo hình cung phía khách; bài nhà cái nằm phía nhà cái.
// Bài người khác úp tới lúc chấm, bài của mình ngửa (activity gửi qua setMine). Cảnh chỉ vẽ theo trạng thái server gửi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { XIDACH_ZONE, floorHeight } from '../../../shared/layout.js';
import { KIND_LABEL, XIDACH } from '../../../shared/xidach.js';
import { h } from '../ui/dom.js';
import { cardBackMaterial, cardFaceMaterial } from './card-textures.js';
import { TableDealer, pickLine } from './table-dealer.js';

const TOP_Y = 0.8;
const CARD = { w: 0.12, h: 0.17, gap: 0.075 };
const SEAT_RADIUS = 0.56; // Quạt bài của khách cách tâm bàn chừng này, về phía tây (phía khách).
const SEAT_ANGLES = [-56, -28, 0, 28, 56].map((d) => (d * Math.PI) / 180);
const DEALER_X = 0.5;
const LABEL_SHOW_DISTANCE = 22;
const DEALER = { name: 'Bà Năm nhà cái', look: { color: 7, hair: 1, hat: 7, attire: 6 } };
const LINES = {
  betting: ['Mời bà con vô cược, tám giây thôi!', 'Xì dách đây, ai chơi nào!'],
  playing: ['Rút hay dằn đây?', 'Non là phạt nghen!'],
  dealer: ['Cái lật bài nè!', 'Coi cái nè!'],
};

const matte = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class XiDachTable {
  constructor(scene) {
    const { x, z } = XIDACH_ZONE;
    this.group = new THREE.Group();
    this.group.position.set(x, floorHeight(x, z), z);
    this.#buildTable();
    this.cardGeometry = new THREE.PlaneGeometry(CARD.w, CARD.h);
    // Lá nằm ngửa có đầu lá hướng -z; xoay quanh trục đứng một góc φ thì đầu lá hướng (-sin φ, -cos φ).
    // Muốn đầu lá chỉ về tâm bàn từ ghế ở góc a (vị trí (-cos a, sin a)·R) thì φ = a - π/2; hàng nhà cái φ = -π/2.
    this.dealerCards = this.#cardRow(DEALER_X, 0, -Math.PI / 2);
    this.seatCards = SEAT_ANGLES.map((a) => this.#cardRow(-Math.cos(a) * SEAT_RADIUS, Math.sin(a) * SEAT_RADIUS, a - Math.PI / 2));
    this.#buildLabel();
    scene.add(this.group);
    this.dealer = new TableDealer(scene, { spot: XIDACH_ZONE.dealer, ...DEALER });

    this.state = null;
    this.phase = 'idle';
    this.mine = null; // { seat, cards }
    this.labelClock = 0;
  }

  #buildTable() {
    const r = XIDACH_ZONE.tableRadius - 0.03;
    const dark = matte(0x3f2414);
    const top = mesh(new THREE.CylinderGeometry(r, r, 0.07, 32), matte(0x6a3f22), 0, TOP_Y - 0.035, 0);
    const felt = mesh(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.012, 32), matte(0x1f5c3a), 0, TOP_Y + 0.001, 0);
    const line = mesh(new THREE.TorusGeometry(r - 0.28, 0.008, 4, 40, Math.PI * 0.75), matte(0xe9c46a), 0, TOP_Y + 0.009, 0);
    line.rotation.set(Math.PI / 2, 0, Math.PI * 0.625);
    const rim = mesh(new THREE.TorusGeometry(r, 0.035, 6, 32), dark, 0, TOP_Y, 0);
    rim.rotation.x = Math.PI / 2;
    const stem = mesh(new THREE.CylinderGeometry(0.13, 0.2, TOP_Y - 0.08, 10), dark, 0, (TOP_Y - 0.08) / 2, 0);
    const foot = mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 16), dark, 0, 0.03, 0);
    // Chồng bài của nhà cái.
    const shoe = mesh(new THREE.BoxGeometry(CARD.h, 0.05, CARD.w), cardBackMaterial(), DEALER_X + 0.12, TOP_Y + 0.03, -0.42);
    this.group.add(top, felt, line, rim, stem, foot, shoe);
  }

  /** Một hàng 5 lá nằm trên bàn, xoay để đầu lá hướng về nhà cái (chữ đọc xuôi với khách). */
  #cardRow(x, z, yaw) {
    const holder = new THREE.Group();
    holder.position.set(x, TOP_Y + 0.012, z);
    holder.rotation.y = yaw;
    const cards = Array.from({ length: XIDACH.maxCards }, (_, i) => {
      const card = new THREE.Mesh(this.cardGeometry, cardBackMaterial());
      card.rotation.x = -Math.PI / 2;
      card.position.set((i - 2) * CARD.gap, i * 0.0015, 0);
      card.visible = false;
      card.receiveShadow = true;
      holder.add(card);
      return card;
    });
    this.group.add(holder);
    return cards;
  }

  #buildLabel() {
    this.labelSub = h('small', {}, '');
    this.label = new CSS2DObject(h('div', { class: 'baucua-label xidach-label' }, h('b', {}, 'Xì dách'), this.labelSub));
    this.label.position.set(0, TOP_Y + 1.1, 0);
    this.group.add(this.label);
  }

  /** Bày một hàng bài: cards là mảng id (âm = úp) hoặc chỉ số lá (count) khi chưa biết mặt. */
  #lay(row, cards, count = cards?.length ?? 0) {
    const n = Math.min(count, row.length);
    const start = -(n - 1) / 2;
    row.forEach((mesh, i) => {
      mesh.visible = i < n;
      if (i >= n) return;
      mesh.position.x = (start + i) * CARD.gap;
      const card = cards?.[i];
      mesh.material = card >= 0 ? cardFaceMaterial(card) : cardBackMaterial();
    });
  }

  #render() {
    const s = this.state;
    this.#lay(this.dealerCards, s?.dealer ?? []);
    const bySeat = new Map((s?.seats ?? []).map((x) => [x.seat, x]));
    this.seatCards.forEach((row, i) => {
      const seat = bySeat.get(i);
      if (!seat) return this.#lay(row, [], 0);
      const own = this.mine?.seat === i && this.mine.cards.length ? this.mine.cards : null;
      return this.#lay(row, seat.cards ?? own, Math.max(seat.count, own?.length ?? 0));
    });
  }

  setState(state) {
    const changed = state.phase !== this.phase;
    const first = !this.state;
    this.state = state;
    this.phase = state.phase;
    if (state.phase === 'idle' || state.phase === 'betting') this.mine = this.mine?.round === state.round ? this.mine : null;
    if (changed && !first) this.#announce(state);
    this.#render();
    this.labelClock = 0;
  }

  /** Bài của chính mình (ngửa) trên ghế của mình. */
  setMine(mine) {
    this.mine = mine;
    this.#render();
  }

  #announce(state) {
    const { dealer } = this;
    if (state.phase === 'betting') dealer.say(pickLine(LINES.betting), 3000);
    else if (state.phase === 'playing') dealer.say(pickLine(LINES.playing), 2500);
    else if (state.phase === 'dealer') {
      dealer.say(pickLine(LINES.dealer), 1800);
      dealer.flourish();
    } else if (state.phase === 'result') {
      const kind = KIND_LABEL[state.dealerKind];
      dealer.say(kind ? `Cái ${kind}!` : `Cái ${state.dealerTotal} điểm.`, 2800);
    }
  }

  #labelText(now) {
    const s = this.state;
    const left = () => Math.max(0, Math.ceil((s.endsAt - now) / 1000));
    if (!s || s.phase === 'idle') return 'bấm E để chơi';
    if (s.phase === 'betting') return `nhận cược · ${left()}s · ${s.seats.length}/${XIDACH.seats}`;
    if (s.phase === 'playing') return `rút hay dằn · ${left()}s`;
    if (s.phase === 'dealer') return `cái ${s.dealerTotal} điểm…`;
    return KIND_LABEL[s.dealerKind] ? `cái ${KIND_LABEL[s.dealerKind]}` : `cái ${s.dealerTotal} điểm`;
  }

  update(dt, camera, nowMs) {
    const dealing = this.phase === 'playing' || this.phase === 'dealer';
    this.dealer.update(dt, camera, dealing ? 'deal' : 'idle');
    this.labelClock -= dt;
    if (this.labelClock <= 0) {
      this.labelClock = 0.25;
      this.labelSub.textContent = this.#labelText(nowMs);
    }
    this.label.visible = camera.position.distanceTo(this.group.position) < LABEL_SHOW_DISTANCE;
  }
}
