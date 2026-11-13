// Bầu cua: bàn chung ở góc chợ. Đứng quanh bàn bấm E để mở bảng đặt cược; luật, tiền và xúc xắc đều do server chấm.
// Client chỉ gửi mặt và mệnh giá, rồi vẽ lại đúng trạng thái server phát. Rời khỏi bàn thì tự thôi chơi,
// cược đã đặt vẫn được chấm và trả thưởng vào ví như thường. Lúc chơi camera khoá nhìn bàn (tableShot).
import { BAUCUA, emptyBets, sumBets } from '../../../shared/baucua.js';
import { BAUCUA_ZONE, dist2d } from '../../../shared/layout.js';
import { BauCuaPanel } from '../ui/baucua-panel.js';
import { BauCuaReveal } from '../ui/baucua-reveal.js';
import { Callout } from '../ui/table-hud-parts.js';
import { tableShot } from './table-camera-shot.js';

const RATTLE_EVERY_S = 0.11; // Tiếng xúc xắc lắc trong đĩa khi nhà cái xóc.
const LEAVE_MARGIN = 0.9; // Đi xa hơn bán kính bàn chừng này thì tự rời (server cho dung sai rộng hơn).
const BET_GAP_MS = 140; // Giữ nhịp trên server (120 ms): bấm giữ phím số không đốt hết chip.
const DEFAULT_CHIP = BAUCUA.chips[Math.min(1, BAUCUA.chips.length - 1)];
const SYMBOL_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 };

export class BauCuaActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = false; // Đứng quanh bàn tự do; chỉ cần ở trong tầm bàn.
    this.state = null;
    this.round = 0;
    this.mine = emptyBets();
    this.last = emptyBets(); // Cược của ván gần nhất mình có đặt, cho nút "Cược lại".
    this.chip = DEFAULT_CHIP;
    this.lastBet = 0;
    this.payout = null; // Kết quả riêng của ván gần nhất { round, net }, tới ngay trước tin mở bát.
    this.rattleT = 0;
    this.reveal = new BauCuaReveal();
    this.callout = new Callout();
    this.panel = new BauCuaPanel({
      onBet: (symbol) => this.bet(symbol),
      onChip: (amount) => {
        this.chip = amount;
        this.#render();
      },
      onClear: () => this.clear(),
      onRepeat: () => this.rebet(this.#lastBets()),
      onDouble: () => this.rebet(this.mine),
      onExit: () => app.activities.exit(),
    });
    app.wallet.onChange(() => this.#render());
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'baucua')) return;
    // Quay mặt vào bàn; camera khoá góc nhìn bàn từ phía khách.
    app.me.placeAt(app.me.x, app.me.z, Math.atan2(BAUCUA_ZONE.x - app.me.x, BAUCUA_ZONE.z - app.me.z));
    app.follow.shot = tableShot(BAUCUA_ZONE);
    this.panel.show();
    this.panel.setMessage('Chọn chip, bấm ô (hoặc phím 1–6) để cược. Trùng mấy viên ăn mấy lần.');
    this.#render();
  }

  cancel() {
    this.app.follow.shot = null;
    this.panel.hide();
    this.reveal.hide();
    this.callout.hide();
  }

  update(dt) {
    const { app } = this;
    if (dist2d(app.me.x, app.me.z, BAUCUA_ZONE.x, BAUCUA_ZONE.z) > BAUCUA_ZONE.radius + LEAVE_MARGIN) {
      app.hud.toast('Bạn đã rời bàn bầu cua.');
      app.activities.exit();
      return;
    }
    this.panel.tick(app.net.now(), this.state);
    if (this.state?.phase === 'rolling') {
      this.rattleT -= dt;
      if (this.rattleT <= 0) {
        this.rattleT = RATTLE_EVERY_S;
        app.audio.rattle();
      }
    }
  }

  onKey(code, isDown) {
    if (code in SYMBOL_KEYS) {
      if (isDown) this.bet(SYMBOL_KEYS[code]);
      return true;
    }
    if (isDown && (code === 'Enter' || code === 'KeyT')) {
      this.app.chat.show();
      return true;
    }
    return false;
  }

  /** Vào phòng hoặc kết nối lại: nhận nguyên trạng thái bàn kèm cược của mình. */
  setSnapshot(snap) {
    if (!snap) return;
    this.round = snap.round;
    this.mine = [...snap.mine];
    this.state = snap;
    this.app.world.baucuaTable.setState(snap);
    this.#render();
  }

  /** Server phát trạng thái bàn (đổi pha, tổng cược). Sang ván mới thì cược cũ của mình đã được chấm xong. */
  applyState(state) {
    if (!state) return;
    const opening = state.phase === 'result' && (this.state?.phase !== 'result' || this.state?.round !== state.round);
    const playing = this.app.activities.current === this;
    if (playing && state.phase !== this.state?.phase) {
      if (state.phase === 'betting') this.callout.show('Đặt cược!', 'go');
      else if (state.phase === 'rolling') this.callout.show('Ngừng cược', 'stop');
    }
    if (state.round !== this.round) {
      if (sumBets(this.mine) > 0) this.last = this.mine;
      this.round = state.round;
      this.mine = emptyBets();
      this.panel.setMessage('');
    }
    this.state = state;
    this.app.world.baucuaTable.setState(state);
    this.#render();
    if (opening && state.dice && playing) this.#open(state);
  }

  /** Mở bát: ba viên to giữa màn hình, kèm lãi/lỗ của mình nếu ván này mình có cược. */
  #open(state) {
    const { app } = this;
    const net = this.payout?.round === state.round ? this.payout.net : null;
    this.reveal.show(state.dice, net);
    app.audio.pop();
    if (net > 0) {
      app.audio.chime(0.09);
      this.panel.collect(state.dice, this.mine);
    }
  }

  async bet(symbol) {
    const now = performance.now();
    if (now - this.lastBet < BET_GAP_MS) return;
    this.lastBet = now;
    const { app } = this;
    const res = await app.net.call('baucua:bet', { symbol, amount: this.chip });
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa cược được, thử lại nhé.', 'error');
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      return;
    }
    this.#placed(res);
    this.panel.flyBet(symbol, this.chip);
    app.audio.tick();
  }

  /** Cược nhiều mặt một lần: "Cược lại" (cược ván trước) hoặc "Gấp đôi" (thêm đúng bằng cược đang có). */
  async rebet(bets) {
    if (sumBets(bets) <= 0) return;
    const now = performance.now();
    if (now - this.lastBet < BET_GAP_MS) return;
    this.lastBet = now;
    const { app } = this;
    const add = [...bets];
    const res = await app.net.call('baucua:rebet', { bets: add });
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa cược được, thử lại nhé.', 'error');
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      return;
    }
    this.#placed(res);
    add.forEach((amount, symbol) => amount > 0 && this.panel.flyBet(symbol, amount));
    app.audio.tick();
  }

  /** Ack cược thành công. Ack có thể mở ván mới: áp trạng thái trước, rồi mới ghi cược của mình để không bị xoá nhầm. */
  #placed(res) {
    this.applyState(res.state);
    this.mine = res.bets;
    this.panel.setMessage('');
    this.app.wallet.apply({ teu: res.teu });
    this.#render();
  }

  async clear() {
    const { app } = this;
    const res = await app.net.call('baucua:clear');
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa rút được cược.', 'error');
      return;
    }
    this.mine = res.bets;
    this.panel.setMessage('Đã rút cược, tiền về ví.');
    app.wallet.apply({ teu: res.teu });
    if (res.state) this.applyState(res.state);
    this.#render();
  }

  /** Kết quả ván của riêng mình (server chỉ gửi cho người có cược). */
  onPayout({ round, stake, payout, net, teu }) {
    const { app } = this;
    this.payout = { round, net };
    app.wallet.apply({ teu });
    const text = net > 0 ? `Thắng +${net} TEU` : net < 0 ? `Thua ${-net} TEU` : 'Hoà vốn';
    if (app.activities.current === this) this.panel.setMessage(`${text} · cược ${stake}, nhận ${payout}`, net > 0 ? 'win' : 'lose');
    else {
      // Đã rời bàn: không có màn mở bát, báo gọn bằng toast.
      if (net > 0) app.audio.chime(0.08);
      app.hud.toast(`Bầu cua: ${text}`);
    }
  }

  /** Cược của ván trước để "Cược lại": ván vừa mở bát mà mình có cược thì chính là cược đó (chưa sang ván mới). */
  #lastBets() {
    const settled = this.state?.phase === 'result' || this.state?.phase === 'idle';
    return settled && sumBets(this.mine) > 0 ? this.mine : this.last;
  }

  #render() {
    this.panel.render({ state: this.state, mine: this.mine, chip: this.chip, teu: this.app.wallet.teu, last: this.#lastBets() });
  }
}
