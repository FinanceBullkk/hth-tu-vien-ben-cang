// Điều khiển chung cho tài xỉu và cò quay, theo lối "bàn là trò chơi": vào bàn là góc máy hạ xuống mặt bàn,
// rê chuột lên bạt thì ô sáng, bấm là đặt chip vào đúng ô đó; HUD chỉ là dải mỏng ở đáy.
// Người cược lớn nhất ván tự tung: giữ chuột (hoặc Space) lấy đà, thả ra là tung. Luật, tiền, kết quả do server chấm.
import * as THREE from 'three';
import { dist2d } from '../../../shared/layout.js';
import { CasinoRoundHud } from '../ui/casino-round-hud.js';
import { casinoSeatShot } from './casino-seat-camera-shot.js';

const LEAVE_MARGIN = 0.9;
const BET_GAP_MS = 140; // Giữ nhịp server (120 ms).
const CHARGE_S = 1.1; // Giữ chừng này là đầy lực; giữ tiếp thì lực dao động như thanh lực.

/**
 * @typedef {object} CasinoConfig
 * @property {string} name 'taixiu' | 'coquay': tên sự kiện socket và mã hoạt động
 * @property {string} title
 * @property {any} zone
 * @property {{name:string, max:number}[]} targets
 * @property {(app:any)=>any} table bàn 3D trong world
 * @property {Record<string, number>} keys phím -> cửa
 * @property {string} help câu hướng dẫn khi mới vào bàn
 * @property {string} verb "tung" | "búng bi"
 * @property {number} rollMs thời gian pha rolling, để biết đã diễn được bao lâu
 * @property {(result:any)=>string} describe kết quả đọc được
 * @property {(app:any, dt:number, t:number)=>void} rollSound âm thanh trong lúc chờ kết quả (t: giây đã diễn)
 * @property {(history:any[])=>HTMLElement[]} road bảng cầu
 */

export class CasinoRoundActivity {
  /** @param {CasinoConfig} cfg */
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;
    this.lockMove = true;
    this.state = null;
    this.round = 0;
    this.mine = cfg.targets.map(() => 0);
    this.chip = 5;
    this.lastBet = 0;
    this.isThrower = false;
    this.charging = false;
    this.chargeAt = 0; // performance.now() lúc bắt đầu giữ: lực tính theo giờ thật, không theo số khung hình.
    this.thrown = false;
    this.payout = null;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.hud = new CasinoRoundHud({
      title: cfg.title,
      onChip: (v) => {
        this.chip = v;
        this.#render();
      },
      onClear: () => this.clear(),
      onExit: () => app.activities.exit(),
    });
    this.onDown = (e) => this.#pointerDown(e);
    this.onMove = (e) => this.#pointerMove(e);
    this.onUp = () => this.#release();
    app.wallet.onChange(() => this.#render());
  }

  get table() {
    return this.cfg.table(this.app);
  }

  start() {
    const { app, cfg } = this;
    if (!app.activities.enter(this, cfg.name)) return;
    const { zone } = cfg;
    const { seat } = zone;
    app.me.placeAt(seat.x, seat.z, Math.atan2(zone.x - seat.x, zone.z - seat.z));
    app.follow.shot = casinoSeatShot(zone);
    app.me.avatar.root.visible = false;
    this.table.label.visible = false; // Biển tên đè lên bàn khi nhìn từ chỗ ngồi.
    const canvas = app.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    this.hud.show();
    this.hud.setMessage(cfg.help);
    this.#render();
  }

  cancel() {
    const { app } = this;
    const canvas = app.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    app.follow.shot = null;
    app.me.avatar.root.visible = true;
    this.table.label.visible = true;
    this.charging = false;
    this.table.setHover(-1);
    this.table.setCharge(0);
    this.hud.hide();
  }

  #pick(e) {
    this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.app.camera);
    return this.table.pick(this.raycaster);
  }

  #canThrow() {
    return this.isThrower && this.state?.phase === 'throwing' && !this.thrown;
  }

  #pointerMove(e) {
    if (e.pointerType === 'mouse') this.table.setHover(this.#canThrow() ? -1 : this.#pick(e));
  }

  #pointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.#canThrow()) {
      this.#beginCharge();
      return;
    }
    const target = this.#pick(e);
    if (target >= 0) this.bet(target);
  }

  #beginCharge() {
    if (this.charging || !this.#canThrow()) return;
    this.charging = true;
    this.chargeAt = performance.now();
  }

  /** Lực hiện tại: lên đầy trong CHARGE_S giây rồi dao động, như thanh lực ném. */
  #power() {
    const p = (performance.now() - this.chargeAt) / 1000 / CHARGE_S;
    return p <= 1 ? p : 0.5 + 0.5 * Math.cos((p - 1) * Math.PI * 1.6);
  }

  async #release() {
    if (!this.charging) return;
    this.charging = false;
    const power = Math.max(0.15, this.#power());
    this.table.setCharge(0);
    this.thrown = true;
    const res = await this.app.net.call(`${this.cfg.name}:throw`, { power });
    if (!res?.ok) {
      this.thrown = false;
      this.hud.setMessage(res?.error || 'Chưa tung được.', 'error');
    }
  }

  update(dt) {
    const { app, cfg } = this;
    if (dist2d(app.me.x, app.me.z, cfg.zone.x, cfg.zone.z) > cfg.zone.radius + LEAVE_MARGIN) {
      app.hud.toast(`Bạn đã rời bàn ${cfg.title.toLowerCase()}.`);
      app.activities.exit();
      return;
    }
    const now = app.net.now();
    if (this.charging) {
      if (!this.#canThrow()) this.charging = false;
      this.table.setCharge(this.#power());
    }
    this.hud.tick(now, this.state, this.charging ? this.#power() : null);
    if (this.state?.phase === 'rolling') cfg.rollSound(app, dt, (now - (this.state.endsAt - cfg.rollMs)) / 1000);
  }

  onKey(code, isDown) {
    const { cfg } = this;
    if (code === 'Space') {
      if (isDown) this.#beginCharge();
      else this.#release();
      return true;
    }
    if (code in cfg.keys) {
      if (isDown) this.bet(cfg.keys[code]);
      return true;
    }
    if (isDown && code === 'Backspace') {
      this.clear();
      return true;
    }
    if (isDown && (code === 'Enter' || code === 'KeyT')) {
      this.app.chat.show();
      return true;
    }
    return false;
  }

  setSnapshot(snap) {
    if (!snap) return;
    this.round = snap.round;
    this.mine = [...snap.mine];
    this.applyState(snap);
    // Kết nối lại giữa lúc tung: sid đã đổi nên server báo riêng mình có phải người tung không.
    if (snap.isThrower) this.isThrower = true;
  }

  applyState(state) {
    if (!state) return;
    const { app } = this;
    const prev = this.state;
    // Sang ván mới, hoặc bàn về nghỉ sau khi đã chấm: cược cũ của mình đã xong.
    if (state.round !== this.round || state.phase === 'idle') {
      this.round = state.round;
      this.mine = this.cfg.targets.map(() => 0);
    }
    if (state.phase !== prev?.phase || state.round !== prev?.round) this.#enterPhase(state, prev);
    this.state = state;
    this.table.setState(state, app.net.now());
    this.table.setMine(this.mine);
    this.#render();
  }

  #enterPhase(state, prev) {
    const { app } = this;
    const here = app.activities.current === this;
    if (state.phase === 'throwing') {
      this.thrown = false;
      this.isThrower = state.thrower?.sid === app.sid;
      if (here && this.isThrower) {
        this.hud.callout(`Bạn cược to nhất! Giữ chuột hoặc Space rồi thả để ${this.cfg.verb}`);
        app.audio.chime(0.07);
      } else if (here) this.hud.setMessage(`${state.thrower?.name ?? 'Nhà cái'} đang ${this.cfg.verb}…`);
    } else if (state.phase === 'rolling') {
      this.isThrower = false;
      this.charging = false;
      this.hud.hideCallout();
    } else if (state.phase === 'result' && here) {
      const net = this.payout?.round === state.round ? this.payout.net : null;
      this.hud.reveal(this.cfg.describe(state.result), net);
      if (net > 0) app.audio.chime(0.1);
      else app.audio.pop();
    } else if (state.phase === 'betting' && here && prev?.phase !== 'betting') this.hud.setMessage('Ván mới! Bấm lên ô trên bàn để đặt.');
  }

  async bet(target) {
    const now = performance.now();
    if (now - this.lastBet < BET_GAP_MS) return;
    this.lastBet = now;
    const { app, cfg } = this;
    const res = await app.net.call(`${cfg.name}:bet`, { target, amount: this.chip });
    if (!res?.ok) {
      this.hud.setMessage(res?.error || 'Chưa cược được, thử lại nhé.', 'error');
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      return;
    }
    this.applyState(res.state);
    this.mine = res.bets;
    this.table.setMine(this.mine);
    app.wallet.apply({ teu: res.teu });
    app.audio.tick();
    this.hud.setMessage(`+${this.chip} vào ${cfg.targets[target].name}`);
    this.#render();
  }

  async clear() {
    const { app } = this;
    const res = await app.net.call(`${this.cfg.name}:clear`);
    if (!res?.ok) {
      this.hud.setMessage(res?.error || 'Chưa rút được cược.', 'error');
      return;
    }
    this.mine = res.bets;
    app.wallet.apply({ teu: res.teu });
    this.hud.setMessage('Đã rút cược, tiền về ví.');
    if (res.state) this.applyState(res.state);
    this.table.setMine(this.mine);
    this.#render();
  }

  /** Kết quả riêng của mình; tới ngay trước tin đổi sang pha kết quả. */
  onPayout({ round, result, net, teu }) {
    const { app, cfg } = this;
    this.payout = { round, net };
    app.wallet.apply({ teu });
    if (app.activities.current !== this) {
      const text = net > 0 ? `thắng +${net} TEU` : net < 0 ? `thua ${-net} TEU` : 'hoà vốn';
      app.hud.toast(`${cfg.title} ${cfg.describe(result)}: ${text}`);
    }
  }

  #render() {
    const { cfg } = this;
    const bets = this.mine.map((v, i) => (v > 0 ? `${cfg.targets[i].name} ${v}` : '')).filter(Boolean);
    this.hud.render({
      chip: this.chip,
      teu: this.app.wallet.teu,
      mine: bets.join(' · '),
      canClear: this.state?.phase === 'betting' && bets.length > 0,
      road: cfg.road(this.state?.history ?? []),
    });
  }
}
