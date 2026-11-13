// Hiệu ứng trên mặt bàn xì dách 3D: chồng chip cược trước chỗ từng khách, vòng giờ nổi trên chỗ người đang tới lượt,
// dấu mộc kết quả khi nhà cái xét tới, và chip bay giữa khách với nhà cái (thua thì chip về cái, thắng thì cái đẩy chip sang).
// Toạ độ đều trong khung của nhóm bàn (tâm bàn ở gốc). Chỉ vẽ theo trạng thái server gửi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { XIDACH } from '../../../shared/xidach.js';
import { chipMaterials } from './casino-chip-materials.js';
import { h } from '../ui/dom.js';
import { stampOf } from '../ui/xidach-cards.js';

const CHIP = { r: 0.034, h: 0.011, max: 6 };
const FLY_S = 0.55;
const chipGeometry = new THREE.CylinderGeometry(CHIP.r, CHIP.r, CHIP.h, 24);

/** Mệnh giá từng chip để xếp một số TEU (chip lớn trước), tối đa CHIP.max chip cho gọn. */
function chipsFor(amount) {
  const out = [];
  let left = amount;
  for (const v of [...XIDACH.chips].sort((a, b) => b - a)) {
    while (left >= v && out.length < CHIP.max) {
      out.push(v);
      left -= v;
    }
  }
  return out;
}

export class XiDachTableFx {
  /**
   * @param {THREE.Group} group nhóm bàn
   * @param {{ seats: THREE.Vector3[], chipSpots: THREE.Vector3[], dealer: THREE.Vector3, top: number }} spots
   */
  constructor(group, spots) {
    this.group = group;
    this.spots = spots;
    this.stacks = spots.chipSpots.map((pos) => {
      const stack = new THREE.Group();
      stack.position.copy(pos);
      group.add(stack);
      return stack;
    });
    this.flying = []; // { mesh, from, to, t, done } — chip bay xong thì gỡ, done() chạy khi chip cuối tới nơi
    this.ringEl = h('div', { class: 'xd-ring' }, h('i'));
    this.ring = new CSS2DObject(this.ringEl);
    this.ring.visible = false;
    group.add(this.ring);
    // CSS2DRenderer đặt vị trí bằng style.transform của phần tử ngoài, nên hoạt ảnh đóng dấu (cũng dùng transform)
    // phải nằm ở phần tử con, nếu không dấu bị đẩy về góc màn hình.
    this.stamps = spots.seats.map((pos) => {
      const obj = new CSS2DObject(h('div', {}, h('span', { class: 'xd-3dstamp' })));
      obj.position.copy(pos).setY(spots.top + 0.12);
      obj.visible = false;
      group.add(obj);
      return obj;
    });
    this.bets = new Map(); // ghế -> số TEU đang bày
    this.round = -1;
  }

  #setStack(seat, amount) {
    if (this.bets.get(seat) === amount) return;
    this.bets.set(seat, amount);
    const stack = this.stacks[seat];
    stack.clear();
    chipsFor(amount).forEach((v, i) => {
      const chip = new THREE.Mesh(chipGeometry, chipMaterials(v));
      chip.position.set((i % 2) * 0.006, this.spots.top + CHIP.h * (i + 0.5), 0);
      chip.castShadow = true;
      stack.add(chip);
    });
  }

  /** Chip bay từ from tới to theo vòng cung, lần lượt từng chip; tới nơi thì gỡ, chip cuối gọi done. */
  #fly(amount, from, to, done) {
    const chips = chipsFor(amount);
    chips.forEach((v, i) => {
      const mesh = new THREE.Mesh(chipGeometry, chipMaterials(v));
      mesh.position.copy(from);
      mesh.visible = false;
      this.group.add(mesh);
      const target = to.clone().setY(this.spots.top + CHIP.h * (i + 0.5));
      this.flying.push({ mesh, from: from.clone(), to: target, t: -i * 0.06, done: i === chips.length - 1 ? done : null });
    });
  }

  /** Một ghế vừa được xét: đóng dấu, dời chip theo kết quả. */
  #checked(seat) {
    const stamp = stampOf(seat);
    const obj = this.stamps[seat.seat];
    // Thay phần tử con mới để hoạt ảnh đóng dấu chạy lại từ đầu mỗi lần.
    obj.element.replaceChildren(h('span', { class: `xd-3dstamp ${stamp.tone}` }, stamp.text));
    obj.visible = true;
    const chipSpot = this.spots.chipSpots[seat.seat];
    const dealer = this.spots.dealer;
    if (seat.outcome === 'lose') {
      // Thua: chồng chip của khách trượt về phía nhà cái (thua x2 thì mất gấp đôi số chip đang bày).
      this.#setStack(seat.seat, 0);
      this.#fly(-seat.net, chipSpot.clone().setY(this.spots.top), dealer, null);
    } else if (seat.outcome === 'win') {
      // Thắng: nhà cái đẩy chip thưởng sang, tới nơi thì chồng chip của khách cao lên.
      const round = this.round;
      this.#fly(seat.net, dealer, chipSpot, () => round === this.round && this.#setStack(seat.seat, seat.bet + seat.net));
    }
  }

  setState(state, prev) {
    if (state.round !== this.round) {
      this.round = state.round;
      this.bets.clear();
      this.stacks.forEach((s) => s.clear());
      this.stamps.forEach((s) => { s.visible = false; });
    }
    const before = new Map((prev?.round === state.round ? prev.seats : []).map((s) => [s.sid, s.outcome]));
    for (const seat of state.seats ?? []) {
      if (seat.outcome && !before.get(seat.sid)) this.#checked(seat);
      else if (!seat.outcome) this.#setStack(seat.seat, seat.bet);
    }
    if (state.phase === 'idle') {
      this.stacks.forEach((s) => s.clear());
      this.stamps.forEach((s) => { s.visible = false; });
      this.bets.clear();
    }
    const turn = state.phase === 'playing' ? state.seats?.find((s) => s.sid === state.turn) : null;
    this.ring.visible = Boolean(turn);
    if (turn) this.ring.position.copy(this.spots.seats[turn.seat]).setY(this.spots.top + 0.32);
    this.state = state;
  }

  update(dt, nowMs) {
    if (this.ring.visible && this.state) {
      const p = Math.max(0, Math.min(1, (this.state.endsAt - nowMs) / XIDACH.turnMs));
      this.ringEl.style.setProperty('--p', p.toFixed(3));
      this.ringEl.classList.toggle('urgent', p < 0.3);
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      if (f.t < 0) continue;
      const p = Math.min(1, f.t / FLY_S);
      const e = 1 - (1 - p) ** 3;
      f.mesh.visible = true;
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y += Math.sin(p * Math.PI) * 0.12;
      if (p < 1) continue;
      this.flying.splice(i, 1);
      this.group.remove(f.mesh);
      this.onChipLand?.();
      f.done?.();
    }
  }
}
