// Xì dách: bàn chung đấu nhà cái NPC. Đứng quanh bàn bấm E để mở bảng chơi; luật, bài và tiền đều do server.
// Client chỉ gửi ý định (cược, rút cược, rút bài, dằn) rồi vẽ đúng trạng thái server phát; bài của mình tới riêng qua
// "xidach:hand". Rời khỏi bàn thì tự thôi chơi; tay bài đã cược vẫn được chấm (hết giờ coi như dằn) và trả vào ví.
import { XIDACH_ZONE, dist2d } from '../../../shared/layout.js';
import { KIND_LABEL, XIDACH } from '../../../shared/xidach.js';
import { XiDachPanel } from '../ui/xidach-panel.js';
import { actEffect, checkEffect, newlyChecked } from './xidach-effects.js';

const EFFECT_DISTANCE = 20; // Đứng trong tầm này mới nghe tiếng bài và thấy hiệu ứng chấm bài.
const LEAVE_MARGIN = 0.9;
const ACTION_GAP_MS = 180; // Giữ nhịp trên server (150 ms).
const CHIP_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };

export class XiDachActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = false; // Đứng quanh bàn tự do; chỉ cần ở trong tầm bàn.
    this.state = null;
    this.round = 0;
    this.mine = null; // { round, seat, bet, cards, stood }
    this.payout = null; // { round, net, outcome, kind }
    this.lastAction = 0;
    this.panel = new XiDachPanel({
      onChip: (amount) => this.bet(amount),
      onClear: () => this.clear(),
      onHit: () => this.hit(),
      onStand: () => this.stand(),
      onExit: () => app.activities.exit(),
      onPeek: () => {
        this.#syncTableMine();
        this.#render();
      },
    });
    app.wallet.onChange(() => this.#render());
    // Tiếng lá bài rơi xuống bàn và tiếng lật bài, chỉ khi đứng gần.
    this.table.onLand = () => this.#near() && app.audio.tick();
    this.table.onFlip = () => this.#near() && app.audio.pop();
  }

  get table() {
    return this.app.world.xidachTable;
  }

  #near() {
    const { me } = this.app;
    return dist2d(me.x, me.z, XIDACH_ZONE.x, XIDACH_ZONE.z) < EFFECT_DISTANCE;
  }

  /** Tin công khai: một khách vừa rút hay dằn. Nhân vật của họ diễn, ô ghế trên bảng nháy lên. */
  onAct(act) {
    actEffect(this.app, act);
    if (act.sid !== this.app.sid) this.panel.flashSeat(act.sid, act.action);
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'xidach')) return;
    app.me.placeAt(app.me.x, app.me.z, Math.atan2(XIDACH_ZONE.x - app.me.x, XIDACH_ZONE.z - app.me.z));
    this.panel.show();
    this.panel.setMessage('Bấm chip để cược (giữ gấp đôi phòng cái ăn x2). Dưới 16 là non, phải rút.');
    this.#render();
  }

  cancel() {
    this.panel.hide();
  }

  update() {
    const { app } = this;
    if (dist2d(app.me.x, app.me.z, XIDACH_ZONE.x, XIDACH_ZONE.z) > XIDACH_ZONE.radius + LEAVE_MARGIN) {
      app.hud.toast('Bạn đã rời bàn xì dách.');
      app.activities.exit();
      return;
    }
    this.panel.tick(app.net.now(), this.state, app.sid);
  }

  onKey(code, isDown) {
    if (code in CHIP_KEYS) {
      if (isDown) this.bet(XIDACH.chips[CHIP_KEYS[code]]);
      return true;
    }
    if (code === 'KeyR' || code === 'KeyF') {
      if (isDown) (code === 'KeyR' ? this.hit() : this.stand());
      return true;
    }
    if (isDown && (code === 'Enter' || code === 'KeyT')) {
      this.app.chat.show();
      return true;
    }
    return false;
  }

  /** Vào phòng hoặc kết nối lại: trạng thái bàn kèm tay bài của mình nếu đang ngồi. */
  setSnapshot(snap) {
    if (!snap) return;
    this.round = snap.round;
    this.state = snap;
    this.mine = snap.mine ? { round: snap.round, ...snap.mine } : null;
    this.table.setState(snap);
    this.#render();
    this.#syncTableMine();
    this.#render();
  }

  applyState(state) {
    if (!state) return;
    const { app } = this;
    const prev = this.state;
    const playing = app.activities.current === this;
    if (state.round !== this.round) {
      this.round = state.round;
      this.mine = null;
      this.payout = null;
      this.panel.hideBanner();
      this.panel.setMessage('');
    }
    this.state = state;
    this.table.setState(state);
    this.#render();
    // Nhà cái xét tới nhà nào: ai đứng gần cũng thấy người đó thắng hay thua; nhà của mình thì hiện chữ lớn.
    for (const seat of newlyChecked(prev, state)) {
      if (this.#near()) checkEffect(app, seat);
      if (seat.sid === app.sid && playing) this.#showResult();
    }
    if (playing && state.phase === 'playing' && state.turn === app.sid && prev?.turn !== app.sid) {
      app.audio.chime(0.05);
      this.panel.setMessage('Tới lượt bạn: nặn bài, rồi Rút (R) hoặc Dằn (F).');
    }
  }

  /** Bài riêng của mình: lúc chia và (qua ack) mỗi lần rút. */
  onHand({ round, cards, stood }) {
    if (round !== this.round) return;
    const seat = this.state?.seats?.find((s) => s.sid === this.app.sid);
    this.mine = { round, seat: seat?.seat, bet: seat?.bet ?? 0, ...this.mine, cards, stood };
    this.#render();
    this.#syncTableMine(); // Tiếng lá rơi do bàn 3D phát khi lá bay tới chỗ.
  }

  /** Bàn 3D chỉ ngửa những lá mình đã nặn; lá chưa nặn vẫn úp như bài người khác. */
  #syncTableMine() {
    const { mine, panel } = this;
    this.table.setMine(mine ? { ...mine, cards: mine.cards.map((c) => (panel.opened.has(c) ? c : -1)) } : null);
  }

  #gap() {
    const now = performance.now();
    if (now - this.lastAction < ACTION_GAP_MS) return false;
    this.lastAction = now;
    return true;
  }

  async bet(amount) {
    if (!this.#gap()) return;
    const { app } = this;
    const res = await app.net.call('xidach:bet', { amount });
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa cược được, thử lại nhé.', 'error');
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      return;
    }
    this.applyState(res.state); // Có thể vừa mở ván mới.
    this.mine = { round: res.state.round, seat: res.seat, bet: res.bet, cards: this.mine?.cards ?? [], stood: false };
    this.panel.setMessage('');
    app.wallet.apply({ teu: res.teu });
    this.#render();
    this.#syncTableMine();
  }

  async clear() {
    const { app } = this;
    const res = await app.net.call('xidach:clear');
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa rút được cược.', 'error');
      return;
    }
    this.mine = null;
    this.panel.setMessage('Đã rút cược, tiền về ví.');
    app.wallet.apply({ teu: res.teu });
    this.applyState(res.state);
  }

  async #turn(event) {
    if (!this.#gap() || !this.mine) return;
    const res = await this.app.net.call(event);
    if (!res?.ok) {
      this.panel.setMessage(res?.error || 'Chưa được, thử lại nhé.', 'error');
      return;
    }
    this.panel.setMessage('');
    this.onHand({ round: this.round, cards: res.cards, stood: res.stood });
  }

  hit() {
    return this.#turn('xidach:hit');
  }

  stand() {
    return this.#turn('xidach:stand');
  }

  /** Kết quả riêng của mình (server chỉ gửi cho người có cược). Tới ngay trước tin chấm bài. */
  onPayout({ round, outcome, net, kind, teu }) {
    const { app } = this;
    this.payout = { round, outcome, net, kind };
    app.wallet.apply({ teu });
    if (app.activities.current !== this) {
      if (net > 0) app.audio.chime(0.08);
      app.hud.toast(`Xì dách: ${net > 0 ? `thắng +${net}` : net < 0 ? `thua ${-net}` : 'hoà'} TEU`);
    }
  }

  #showResult() {
    const { app, payout } = this;
    if (payout?.round !== this.round) return;
    const special = KIND_LABEL[payout.kind] && payout.outcome === 'win' ? `${KIND_LABEL[payout.kind]}! ` : '';
    const text = payout.outcome === 'win' ? `${special}+${payout.net} TEU` : payout.outcome === 'lose' ? `−${-payout.net} TEU` : 'Hoà';
    this.panel.showBanner(text, payout.outcome);
    if (payout.net > 0) app.audio.chime(0.09);
    else app.audio.pop();
  }

  #render() {
    this.panel.render({ state: this.state, mine: this.mine, mySid: this.app.sid, teu: this.app.wallet.teu });
  }
}
