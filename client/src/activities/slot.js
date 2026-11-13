// Máy gạt cần: đứng trước một máy trong hành lang phía tây, bấm E là vào máy. Camera hạ ngang tầm mắt nhìn thẳng mặt máy,
// thân mình được ẩn trên máy mình để không che (người khác vẫn thấy mình đứng gạt). Bấm lên máy, nút "Gạt cần" hoặc Space
// để gạt; 1/2/3 chọn mức cược. Server bốc và chấm ngay; client kéo cần, quay cuộn, đợi cuộn cuối dừng mới hiện kết quả
// và cộng ví, nên số dư không "biết trước" kết quả. Người khác gạt thì máy của họ cũng quay trên màn hình mình.
import * as THREE from 'three';
import { SLOT_ZONE, dist2d, slotMachineAt } from '../../../shared/layout.js';
import { SLOT, SLOT_SYMBOLS } from '../../../shared/slot.js';
import { REELS_DONE_S } from '../scene/slot-machine-reels.js';
import { SlotHud } from '../ui/slot-hud.js';
import { slotShot } from './slot-camera-shot.js';

const LEAVE_MARGIN = 0.9;
const BET_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
const TICK_EVERY_S = 0.075; // Tiếng lạch cạch của cuộn khi đang quay.
const SETTLE_FALLBACK_MS = 2500;

export class SlotActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.machine = -1;
    this.bet = SLOT.bets[1] ?? SLOT.bets[0];
    this.spinning = false;
    this.pending = null; // Kết quả server của lượt đang quay, chờ cuộn cuối dừng.
    this.doneAt = 0; // Mốc dự phòng: khung hình bị bóp (tab ẩn) thì cũng không chờ cuộn mãi.
    this.tickT = 0;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.hud = new SlotHud({
      onBet: (v) => this.setBet(v),
      onPull: () => this.pull(),
      onExit: () => app.activities.exit(),
    });
    this.onDown = (e) => this.#pointerDown(e);
    this.onMove = (e) => this.#pointerMove(e);
    app.wallet.onChange(() => this.#render());
  }

  get machines() {
    return this.app.world.slotMachines;
  }

  /** machine: máy người chơi đang đứng trước (zoneAt đã chọn); không có thì lấy máy gần nhất. */
  start(machine = slotMachineAt(this.app.me.x, this.app.me.z, 0.6)) {
    const { app } = this;
    if (machine < 0 || !app.activities.enter(this, 'slot')) return;
    this.machine = machine;
    const { stand } = SLOT_ZONE.machines[machine];
    app.me.placeAt(stand.x, stand.z, stand.rot);
    app.follow.shot = slotShot(machine);
    app.me.avatar.root.visible = false;
    const canvas = app.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    this.hud.show();
    this.hud.setMessage('Bấm lên máy, nút Gạt cần hoặc Space để gạt. Phím 1–3 đổi mức cược.');
    this.#render();
  }

  cancel() {
    const { app } = this;
    const canvas = app.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.style.cursor = '';
    app.follow.shot = null;
    app.me.avatar.root.visible = true;
    this.machines.setHot(-1);
    // Rời máy giữa lúc quay: tiền đã chấm xong ở server, cộng ví luôn và báo gọn.
    if (this.pending) this.#settle(false);
    this.hud.hide();
    this.machine = -1;
  }

  setBet(v) {
    if (!SLOT.bets.includes(v)) return;
    this.bet = v;
    this.app.audio.tick();
    this.#render();
  }

  #pick(e) {
    this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.app.camera);
    return this.machines.pick(this.raycaster, this.machine);
  }

  #pointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    const hot = !this.spinning && this.#pick(e) >= 0;
    this.machines.setHot(hot ? this.machine : -1);
    this.app.renderer.domElement.style.cursor = hot ? 'pointer' : '';
  }

  #pointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.#pick(e) >= 0) this.pull();
  }

  async pull() {
    const { app } = this;
    if (this.spinning || this.machine < 0) return;
    if (app.wallet.teu < this.bet) {
      this.hud.setMessage(`Cần ${this.bet} TEU để gạt. Hạ mức cược hoặc đi kiếm thêm TEU nhé.`, 'error');
      return;
    }
    const machine = this.machine;
    this.spinning = true;
    this.machines.pull(machine);
    this.machines.setHot(-1);
    app.audio.stickDrop();
    this.hud.setMessage('');
    this.#render();
    const res = await app.net.call('slot:spin', { amount: this.bet });
    if (!res?.ok) {
      this.spinning = false;
      this.hud.setMessage(res?.error || 'Máy kẹt, gạt lại nhé.', 'error');
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      this.#render();
      return;
    }
    if (app.activities.current !== this || this.machine !== machine) {
      // Đã rời máy trong lúc chờ server: không diễn nữa, chỉ báo kết quả.
      this.pending = res;
      this.#settle(false);
      return;
    }
    this.pending = res;
    this.doneAt = performance.now() + REELS_DONE_S * 1000 + SETTLE_FALLBACK_MS;
    // Ví trừ cược ngay; phần thắng cộng khi cuộn cuối dừng.
    app.wallet.apply({ teu: res.teu - res.payout });
    this.machines.spin(machine, res.reels, res.mult, () => app.audio.thunk(0.55));
  }

  update(dt) {
    const { app } = this;
    const m = SLOT_ZONE.machines[this.machine];
    if (!m || dist2d(app.me.x, app.me.z, m.stand.x, m.stand.z) > SLOT_ZONE.useRadius + LEAVE_MARGIN) {
      app.hud.toast('Bạn đã rời máy gạt cần.');
      app.activities.exit();
      return;
    }
    if (!this.pending) return;
    // Kết quả hiện đúng lúc cuộn cuối dừng trên màn hình (không theo đồng hồ thật, vì khung hình có thể chậm).
    const reeling = this.machines.isSpinning(this.machine);
    this.tickT -= dt;
    if (reeling && this.tickT <= 0) {
      this.tickT = TICK_EVERY_S;
      app.audio.tick();
    }
    if (!reeling || performance.now() >= this.doneAt) this.#settle(true);
  }

  /** Cuộn cuối đã dừng (here) hoặc người chơi rời máy: cộng ví, báo kết quả, mở khoá gạt tiếp. */
  #settle(here) {
    const { app } = this;
    const res = this.pending;
    this.pending = null;
    this.spinning = false;
    if (!res) return;
    app.wallet.apply({ teu: res.teu });
    this.hud.pushHistory(res.reels, res.mult);
    const icons = res.reels.map((id) => SLOT_SYMBOLS[id].icon).join(' ');
    if (!here) {
      if (res.net > 0) app.hud.toast(`Gạt cần ${icons}: thắng +${res.net} TEU`);
      return;
    }
    if (res.mult > 0) {
      this.hud.reveal(res.reels, res.mult, res.net);
      const what = res.kind === 'triple' ? `Ba ${SLOT_SYMBOLS[res.symbol].name}` : `Đôi ${SLOT_SYMBOLS[res.symbol].name}`;
      this.hud.setMessage(res.net > 0 ? `${what} ×${res.mult}: thắng +${res.net} TEU!` : `${what}: hoà vốn.`, res.net > 0 ? 'win' : '');
      if (res.reels.every((id) => id === SLOT.jackpot)) app.audio.bell({ quality: 1, intensity: 1, volume: 0.6 });
      else if (res.net > 0) app.audio.chime(0.1);
      else app.audio.pop();
    } else {
      this.hud.setMessage('Trượt rồi, gạt tiếp nhé.', 'lose');
    }
    this.#render();
  }

  onKey(code, isDown) {
    if (code === 'Space' || code === 'ArrowDown') {
      if (isDown) this.pull();
      return true;
    }
    if (code in BET_KEYS) {
      if (isDown) this.setBet(SLOT.bets[BET_KEYS[code]]);
      return true;
    }
    if (isDown && (code === 'Enter' || code === 'KeyT')) {
      this.app.chat.show();
      return true;
    }
    return false;
  }

  /** Người khác gạt (server phát cho cả sân): máy của họ quay; thắng lớn thì báo tên khi cuộn dừng. */
  onRemoteSpin({ sid, m, reels, mult, name, payout }) {
    const { app } = this;
    if (sid === app.sid || !Array.isArray(reels)) return;
    this.machines.pull(m);
    this.machines.spin(m, reels, mult);
    app.remotes.map.get(sid)?.avatar.reach();
    if (name) {
      setTimeout(() => {
        const icons = reels.map((id) => SLOT_SYMBOLS[id]?.icon ?? '').join('');
        const jackpot = reels.every((id) => id === SLOT.jackpot);
        app.hud.toast(`${jackpot ? 'NỔ HŨ! ' : ''}${name} gạt ra ${icons} ×${mult}, ăn ${payout} TEU`);
        app.audio.chime(0.08);
      }, REELS_DONE_S * 1000);
    }
  }

  #render() {
    this.hud.render({ bet: this.bet, teu: this.app.wallet.teu, spinning: this.spinning });
  }
}
