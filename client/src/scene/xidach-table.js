// Bàn xì dách ở sân trước thiền đường: bàn bán nguyệt phủ dạ xanh (xidach-table-model.js), nhà cái Mikumilu đứng phía đông, khách đứng phía trục.
// Mỗi ghế (0..4) có một quạt bài trên mặt bàn theo hình cung phía khách; bài nhà cái nằm phía nhà cái.
// Bài người khác úp tới lúc chấm, bài của mình ngửa (activity gửi qua setMine). Cảnh chỉ vẽ theo trạng thái server gửi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { XIDACH_ZONE, floorHeight } from '../../../shared/layout.js';
import { KIND_LABEL, XIDACH } from '../../../shared/xidach.js';
import { h } from '../ui/dom.js';
import { DEAL_GAP_S, flipAnim, flyAnim, stepCard } from './card-motion.js';
import { cardBackMaterial, cardFaceMaterial } from './card-textures.js';
import { TableDealer, pickLine } from './table-dealer.js';
import { buildXiDachTableModel } from './xidach-table-model.js';
import { XiDachTableFx } from './xidach-table-fx.js';

const TOP_Y = 0.8;
const RADIUS = XIDACH_ZONE.tableRadius - 0.03;
const CHORD = 0.7; // Cạnh thẳng phía nhà cái của mặt bàn bán nguyệt.
const CARD = { w: 0.12, h: 0.17, gap: 0.075 };
const SEAT_RADIUS = 0.56; // Quạt bài của khách cách tâm bàn chừng này, về phía tây (phía khách).
const CHIP_RADIUS = 0.72; // Vòng đặt cược của khách, ngoài quạt bài, trong đệm da.
const SEAT_ANGLES = [-56, -28, 0, 28, 56].map((d) => (d * Math.PI) / 180);
const DEALER_X = 0.4;
const TRAY = { x: 0.62, length: 0.5 }; // Khay chip nhà cái, dọc cạnh thẳng.
const SHOE = { x: 0.45, y: TOP_Y + 0.07, z: -0.4 }; // Mép trước hộp bài cạnh tay nhà cái; lá chia bay ra từ đây.
const cardMaterial = (card) => (card >= 0 ? cardFaceMaterial(card) : cardBackMaterial());
const LABEL_SHOW_DISTANCE = 22;
const DEALER = { name: 'Mikumilu', look: { color: 7, hair: 1, hat: 7, attire: 6 } };
const LINES = {
  betting: ['Mời bà con vô cược, tám giây thôi!', 'Xì dách đây, ai chơi nào!'],
  playing: ['Rút hay dằn đây?', 'Non là phạt nghen!'],
  dealer: ['Cái lật bài nè!', 'Coi cái nè!'],
};

export class XiDachTable {
  constructor(scene) {
    const { x, z } = XIDACH_ZONE;
    this.group = new THREE.Group();
    this.group.position.set(x, floorHeight(x, z), z);
    const at = (r) => SEAT_ANGLES.map((a) => new THREE.Vector3(-Math.cos(a) * r, 0, Math.sin(a) * r));
    this.group.add(buildXiDachTableModel({
      top: TOP_Y, radius: RADIUS, chord: CHORD, chipSpots: at(CHIP_RADIUS), emblem: { x: 0.08, z: 0 }, tray: TRAY, shoe: SHOE,
    }));
    this.cardGeometry = new THREE.PlaneGeometry(CARD.w, CARD.h);
    // Lá nằm ngửa có đầu lá hướng -z; xoay quanh trục đứng một góc φ thì đầu lá hướng (-sin φ, -cos φ).
    // Muốn đầu lá chỉ về tâm bàn từ ghế ở góc a (vị trí (-cos a, sin a)·R) thì φ = a - π/2; hàng nhà cái φ = -π/2.
    this.dealerCards = this.#cardRow(DEALER_X, 0, -Math.PI / 2);
    this.seatCards = SEAT_ANGLES.map((a) => this.#cardRow(-Math.cos(a) * SEAT_RADIUS, Math.sin(a) * SEAT_RADIUS, a - Math.PI / 2));
    this.#buildLabel();
    // Chip cược bày trong vòng đặt cược trước từng khách; chip thua bay về khay nhà cái, chip thưởng bay ra từ khay.
    this.fx = new XiDachTableFx(this.group, { seats: at(SEAT_RADIUS), chipSpots: at(CHIP_RADIUS), dealer: new THREE.Vector3(TRAY.x, TOP_Y + 0.04, 0), top: TOP_Y });
    this.fx.onChipLand = () => this.onLand?.();
    scene.add(this.group);
    this.dealer = new TableDealer(scene, { spot: XIDACH_ZONE.dealer, ...DEALER });

    this.state = null;
    this.phase = 'idle';
    this.mine = null; // { seat, cards }
    this.labelClock = 0;
  }

  /** Một hàng 5 lá nằm trên bàn, xoay để đầu lá hướng về nhà cái (chữ đọc xuôi với khách). */
  #cardRow(x, z, yaw) {
    const holder = new THREE.Group();
    holder.position.set(x, TOP_Y + 0.012, z);
    holder.rotation.y = yaw;
    const cards = Array.from({ length: XIDACH.maxCards }, (_, i) => {
      const card = new THREE.Mesh(this.cardGeometry, cardBackMaterial());
      card.rotation.order = 'XYZ'; // Lật quanh trục dọc của lá (y cục bộ) sau khi đã nằm ngửa.
      card.rotation.x = -Math.PI / 2;
      card.position.set((i - 2) * CARD.gap, i * 0.0015, 0);
      card.visible = false;
      card.receiveShadow = true;
      card.userData = { shown: false, card: undefined, anim: null };
      holder.add(card);
      return card;
    });
    this.group.add(holder);
    // Vị trí chồng bài tính trong khung của hàng này, để lá bay từ chồng bài ra đúng chỗ.
    cards.shoe = () => {
      this.group.updateMatrixWorld(true);
      return holder.worldToLocal(this.group.localToWorld(new THREE.Vector3(SHOE.x, SHOE.y, SHOE.z)));
    };
    return cards;
  }

  #buildLabel() {
    this.labelSub = h('small', {}, '');
    this.label = new CSS2DObject(h('div', { class: 'baucua-label xidach-label' }, h('b', {}, 'Xì dách'), this.labelSub));
    this.label.position.set(0, TOP_Y + 1.1, 0);
    this.group.add(this.label);
  }

  /**
   * Bày một hàng bài: cards là mảng id (âm = úp), count là số lá khi chưa biết mặt.
   * Lá mới xuất hiện thì bay từ chồng bài tới chỗ; lá úp thành ngửa thì lật; các lá xếp lại đều quanh tâm hàng.
   */
  #lay(row, cards, count = cards?.length ?? 0) {
    const n = Math.min(count, row.length);
    const start = -(n - 1) / 2;
    row.forEach((mesh, i) => {
      const ud = mesh.userData;
      if (i >= n) {
        mesh.visible = false;
        Object.assign(ud, { shown: false, card: undefined, anim: null });
        return;
      }
      const tx = (start + i) * CARD.gap;
      const ty = i * 0.0015;
      const want = cards?.[i] >= 0 ? cards[i] : -1;
      if (!ud.shown) {
        const from = row.shoe();
        ud.shown = true;
        ud.card = want;
        mesh.material = cardMaterial(want);
        mesh.rotation.y = 0;
        mesh.visible = false; // Hiện khi tới lượt bay.
        ud.anim = flyAnim(from, tx, ty, this.queue++ * DEAL_GAP_S);
        return;
      }
      if (ud.anim?.kind === 'fly') Object.assign(ud.anim, { tx, ty });
      else mesh.position.set(tx, ty, 0);
      if (ud.card === want) return;
      if (ud.card === -1 && want >= 0) ud.anim = flipAnim(want, ty, this.queue++ * DEAL_GAP_S * 0.6);
      else mesh.material = cardMaterial(want);
      ud.card = want;
    });
  }

  /** Chạy hoạt ảnh bay và lật của mọi lá đang chuyển động. */
  #animate(dt) {
    const hooks = { material: cardMaterial, onLand: () => this.onLand?.(), onFlip: () => this.onFlip?.() };
    for (const row of [this.dealerCards, ...this.seatCards]) {
      for (const mesh of row) if (mesh.userData.anim) stepCard(mesh, dt, hooks);
    }
  }

  #render() {
    this.queue = 0; // Lá mới trong cùng một lần vẽ được chia lần lượt, cách nhau DEAL_GAP_S.
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
    const prev = this.state;
    this.state = state;
    this.phase = state.phase;
    if (state.phase === 'idle' || state.phase === 'betting') this.mine = this.mine?.round === state.round ? this.mine : null;
    if (changed && prev) this.#announce(state);
    // Mỗi lần xét một nhà, nhà cái nhấc tay lật bài nhà đó.
    if (prev && state.checking && state.checking !== prev.checking) this.dealer.flourish(0.5);
    this.#render();
    this.fx.setState(state, prev);
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
    } else if (state.phase === 'checking') {
      const kind = KIND_LABEL[state.dealerKind];
      dealer.say(kind ? `Cái ${kind}! Xét hết!` : `Cái ${state.dealerTotal}, đi xét nè!`, 2800);
    }
  }

  #labelText(now) {
    const s = this.state;
    const left = () => Math.max(0, Math.ceil((s.endsAt - now) / 1000));
    const dealerHand = () => (KIND_LABEL[s.dealerKind] ? `cái ${KIND_LABEL[s.dealerKind]}` : `cái ${s.dealerTotal} điểm`);
    if (!s || s.phase === 'idle') return 'bấm E để chơi';
    if (s.phase === 'betting') return `nhận cược · ${left()}s · ${s.seats.length}/${XIDACH.seats}`;
    if (s.phase === 'playing') return `lượt ${s.seats.find((x) => x.sid === s.turn)?.name ?? '…'} · ${left()}s`;
    if (s.phase === 'dealer') return `${dealerHand()}…`;
    if (s.phase === 'checking') return `${dealerHand()} · đang xét`;
    return dealerHand();
  }

  update(dt, camera, nowMs) {
    this.#animate(dt);
    this.fx.update(dt, nowMs);
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
