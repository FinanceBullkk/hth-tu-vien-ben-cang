// Bãi đá: đứng trước một đe ở bãi đá cạnh bãi container, bấm E là vào. Chọn loại đá (phím 1–3), bấm Lấy đá để khiêng
// một tảng lên đe, rồi bấm Đập (Space) khi kim thanh lực vào vùng vàng. Server chấm từng nhát theo thời điểm bấm và bốc
// ngọc khi đá vỡ; client vung búa, nứt đá ngay để tay không thấy trễ, đợi ngọc bay lên mới hiện tên và cộng ví.
// Người khác đập thì đe của họ cũng nứt, vỡ trên màn hình mình; ai ra ngọc quý thì cả sân được báo.
import { STONE_YARD, dist2d, stoneSpotAt } from '../../../shared/layout.js';
import { STONE, STONE_GEMS, STONE_KINDS, freeStock, hitGrade, powerAt } from '../../../shared/stone.js';
import { StoneHud } from '../ui/stone-hud.js';
import { stoneShot } from './stone-camera-shot.js';

const LEAVE_MARGIN = 0.9;
const KIND_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
const REVEAL_DELAY_MS = 450; // Ngọc bay lên một nhịp rồi mới hiện tên và cộng ví.
const RENDER_EVERY_S = 0.25; // Đồng hồ kho đá đếm theo giây, không cần vẽ lại mỗi khung.

export class StoneActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.spot = -1;
    this.kind = 0;
    this.stone = null; // Tảng đang trên đe của mình: { kind, hp, maxHp, startAt }.
    this.busy = false; // Đang chờ server cấp đá.
    this.hitting = false; // Đang chờ server chấm một nhát.
    this.lastHitT = 0;
    this.stock = { stock: STONE.freeMax, nextAt: 0 };
    this.renderT = 0;
    this.hud = new StoneHud({
      onKind: (k) => this.setKind(k),
      onAct: () => this.act(),
      onExit: () => app.activities.exit(),
    });
    app.wallet.onChange(() => this.#render());
  }

  get yard() {
    return this.app.world.stoneYard;
  }

  /** Kho đá thường từ server (snapshot, hoặc sau mỗi lần lấy đá). */
  setStock(stock) {
    if (Number.isFinite(stock?.stock)) this.stock = { stock: stock.stock, nextAt: stock.nextAt ?? 0 };
  }

  /** Kho đá thường lúc này: tự cộng phần tích thêm từ lần server báo gần nhất. */
  #stockNow(now) {
    const { stock, nextAt } = this.stock;
    return nextAt ? freeStock(stock, nextAt - STONE.freeRegenMs, now) : { stock, nextAt: 0 };
  }

  /** spot: đe người chơi đang đứng trước (zoneAt đã chọn); không có thì lấy đe gần nhất. */
  start(spot = stoneSpotAt(this.app.me.x, this.app.me.z, 0.6)) {
    const { app } = this;
    if (spot < 0 || !app.activities.enter(this, 'stone')) return;
    this.spot = spot;
    const { stand } = STONE_YARD.spots[spot];
    app.me.placeAt(stand.x, stand.z, stand.rot);
    app.follow.shot = stoneShot(spot);
    app.me.avatar.root.visible = false;
    this.hud.show();
    this.hud.setMessage('Chọn loại đá rồi bấm Lấy đá. Kim vào vùng vàng thì bấm Đập hoặc Space.');
    this.#render();
  }

  cancel() {
    const { app } = this;
    app.follow.shot = null;
    app.me.avatar.root.visible = true;
    // Đá chưa vỡ: server đập nốt và báo riêng (stone:auto), ở đây chỉ dọn đe.
    if (this.stone) this.yard.clear(this.spot);
    this.stone = null;
    this.busy = false;
    this.hud.hide();
    this.spot = -1;
  }

  setKind(k) {
    if (this.stone || !STONE_KINDS[k]) return;
    this.kind = k;
    this.app.audio.tick();
    this.#render();
  }

  act() {
    if (this.stone) this.hit();
    else this.take();
  }

  async take() {
    const { app } = this;
    if (this.busy || this.stone || this.spot < 0) return;
    const spec = STONE_KINDS[this.kind];
    if (spec.price > app.wallet.teu) {
      this.hud.setMessage(`Cần ${spec.price} TEU để mua ${spec.name}. Đập đá thường hoặc đi kiếm thêm TEU nhé.`, 'error');
      return;
    }
    const spot = this.spot;
    this.busy = true;
    this.#render();
    const res = await app.net.call('stone:start', { kind: this.kind });
    this.busy = false;
    if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
    this.setStock(res);
    if (!res?.ok) {
      this.hud.setMessage(res?.error || 'Chưa lấy được đá, thử lại nhé.', 'error');
      this.#render();
      return;
    }
    if (app.activities.current !== this || this.spot !== spot) return; // Đã rời bãi: server tự đập nốt.
    this.stone = { kind: res.kind, hp: res.hp, maxHp: res.maxHp, startAt: res.startAt };
    this.lastHitT = 0;
    this.yard.place(spot, res.kind);
    app.audio.thunk(0.35);
    this.hud.setMessage('Canh kim vào vùng vàng rồi đập!');
    this.#render();
  }

  async hit() {
    const { app } = this;
    const stone = this.stone;
    if (!stone || this.hitting) return;
    const t = app.net.now();
    if (t - this.lastHitT < STONE.hitGapMs) return;
    this.lastHitT = t;
    // Chấm thử ngay bằng cùng công thức với server để búa và chữ hiện không trễ; server chấm lại từ đúng thời điểm này.
    const guess = hitGrade(powerAt(stone.kind, stone.startAt, t));
    this.yard.swing(this.spot);
    this.hud.flashGrade(guess);
    this.hitting = true;
    const res = await app.net.call('stone:hit', { t });
    this.hitting = false;
    if (this.stone !== stone) {
      // Rời bãi ngay sau nhát cuối: đá đã vỡ ở server nên không có stone:auto, cộng ví và báo gọn ở đây.
      if (res?.broke) this.#reveal(res);
      return;
    }
    if (!res?.ok) {
      this.hud.setMessage(res?.error || 'Búa trượt, đập lại nhé.', 'error');
      return;
    }
    stone.hp = res.hp;
    this.yard.hit(this.spot, stone.kind, 1 - res.hp / stone.maxHp, res.grade);
    app.audio.thunk(res.grade === 'perfect' ? 0.9 : res.grade === 'good' ? 0.65 : 0.4);
    if (!res.broke) {
      this.#render();
      return;
    }
    this.stone = null;
    this.yard.shatter(this.spot, res.kind, res.gem);
    app.audio.rattle();
    this.#render();
    setTimeout(() => this.#reveal(res), REVEAL_DELAY_MS);
  }

  /** Ngọc đã bay lên: hiện tên, cộng ví. Đã rời bãi thì chỉ cộng ví và báo gọn. */
  #reveal(res) {
    const { app } = this;
    app.wallet.apply({ teu: res.teu });
    const gem = STONE_GEMS[res.gem];
    if (app.activities.current !== this) {
      if (res.gain > 0) app.hud.toast(`Đập đá ra ${gem.name}: +${res.gain} TEU`);
      return;
    }
    this.hud.reveal(res.gem, res.gain, res.bonus);
    const paid = STONE_KINDS[res.kind].price > 0;
    const tone = res.gain === 0 ? 'lose' : paid && res.net < 0 ? '' : 'win';
    const lead = gem.tier === 0 ? 'Chỉ toàn đá vụn' : `Ra ${gem.name}`;
    this.hud.setMessage(`${lead}${res.gain ? `, +${res.gain} TEU` : ''}${paid ? ` (${res.net >= 0 ? 'lãi' : 'lỗ'} ${Math.abs(res.net)} so với giá đá)` : ''}. Lấy tảng khác nhé.`, tone);
    if (gem.tier >= 6) app.audio.bell({ quality: 1, intensity: 1, volume: 0.6 });
    else if (gem.tier >= 3) app.audio.chime(0.06 + gem.tier * 0.02);
    else if (gem.tier > 0) app.audio.pop();
  }

  update(dt) {
    const { app } = this;
    const s = STONE_YARD.spots[this.spot];
    if (!s || dist2d(app.me.x, app.me.z, s.stand.x, s.stand.z) > STONE_YARD.useRadius + LEAVE_MARGIN) {
      app.hud.toast('Bạn đã rời bãi đá.');
      app.activities.exit();
      return;
    }
    const stone = this.stone;
    this.hud.setPower(stone ? powerAt(stone.kind, stone.startAt, app.net.now()) : null);
    this.renderT -= dt;
    if (this.renderT <= 0) this.#render();
  }

  onKey(code, isDown) {
    if (code === 'Space' || code === 'ArrowDown') {
      if (isDown) this.act();
      return true;
    }
    if (code in KIND_KEYS) {
      if (isDown) this.setKind(KIND_KEYS[code]);
      return true;
    }
    if (isDown && (code === 'Enter' || code === 'KeyT')) {
      this.app.chat.show();
      return true;
    }
    return false;
  }

  // ---------- Người khác (server phát cho cả sân; gói của chính mình đã diễn theo kết quả riêng nên bỏ qua) ----------

  onRemotePlace({ sid, s, k }) {
    if (sid !== this.app.sid) this.yard.place(s, k);
  }

  onRemoteHit({ sid, s, k, c, g }) {
    if (sid === this.app.sid) return;
    this.yard.hit(s, k, c, g);
    this.app.remotes.map.get(sid)?.avatar.reach();
  }

  onRemoteBreak({ sid, s, k, gem, name, teu }) {
    const { app } = this;
    if (sid === app.sid) return;
    this.yard.shatter(s, k, gem);
    app.remotes.map.get(sid)?.avatar.reach();
    if (name) {
      setTimeout(() => {
        app.hud.toast(`${name} đập đá ra ${STONE_GEMS[gem]?.name ?? 'ngọc quý'}, được ${teu} TEU!`);
        app.audio.chime(0.08);
      }, REVEAL_DELAY_MS);
    }
  }

  /** Mình rời bãi khi đá chưa vỡ: server đã đập nốt và trả ngọc. */
  onAuto(res) {
    const { app } = this;
    if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
    const gem = STONE_GEMS[res?.gem];
    if (gem) app.hud.toast(`Tảng đá dở đã được đập nốt: ${gem.name}${res.gain > 0 ? `, +${res.gain} TEU` : ''}`);
  }

  #render() {
    this.renderT = RENDER_EVERY_S;
    const now = this.app.net.now();
    const { stock, nextAt } = this.#stockNow(now);
    this.hud.render({ kind: this.kind, teu: this.app.wallet.teu, stone: this.stone, busy: this.busy, stock, nextAt, now });
  }
}
