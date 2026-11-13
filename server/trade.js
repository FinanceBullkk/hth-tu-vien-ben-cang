// Trạm giao thương: phiên trao đổi trực tiếp giữa hai người cùng đứng ở trạm, đổi đồ ngoại hình và TEU, miễn phí.
// Luồng: mời (trade:invite) → nhận/từ chối (trade:respond) → mỗi bên đặt đề nghị (trade:offer) → cả hai chốt (trade:ready).
// Đề nghị đổi thì cả hai mất chốt và số phiên bản rev tăng; lệnh chốt phải mang đúng rev đang hiện,
// nên không ai bị tráo đồ phút chót. Server kiểm tra vị trí, sở hữu, số dư; đổi đồ trong một transaction (TradeStore).
import { TRADE_POST, dist2d } from '../shared/layout.js';
import { LOOK_SLOTS, itemName, parseItemId, sanitizeLook } from '../shared/shop.js';
import { TRADE, offerEmpty, readOffer } from '../shared/trade.js';
import { localDate } from './time.js';

const emit = (p, event, data) => p.socket?.emit(event, data);
const nameOf = (id) => {
  const it = parseItemId(id);
  return it ? itemName(it.slot, it.index) : id;
};
const offerOf = (side) => ({ items: [...side.items], teu: side.teu });
const sameOffer = (side, offer) => side.teu === offer.teu && side.items.join() === offer.items.join();
const newSide = (p) => ({ p, items: [], teu: 0, ready: false });

export class Trade {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.players = new Map();
    this.invites = new Map(); // "sidMời>sidĐượcMời" -> lúc hết hạn
    /** Room gán: phát bộ đồ mới khi người chơi vừa cho đi món đang mặc. */
    this.onLook = null;
  }

  bind(players) {
    this.players = players;
  }

  inZone(p, margin = 0) {
    return dist2d(p.x, p.z, TRADE_POST.x, TRADE_POST.z) < TRADE_POST.radius + margin;
  }

  invite(p, data) {
    const now = Date.now();
    if (now - (p.lastTradeInvite ?? 0) < TRADE.inviteIntervalMs) return { ok: false, error: 'Từ từ thôi, đợi người ta trả lời đã.' };
    const to = this.players.get(Number(data?.to));
    if (!to || to === p || !to.socket) return { ok: false, error: 'Người này không còn ở đây.' };
    if (!this.inZone(p)) return { ok: false, error: 'Đứng ở Trạm giao thương rồi mới mời nhé.' };
    if (!this.inZone(to)) return { ok: false, error: `${to.name} chưa đứng ở trạm.` };
    if (p.trade) return { ok: false, error: 'Bạn đang giao dịch rồi.' };
    if (to.trade) return { ok: false, error: `${to.name} đang giao dịch với người khác.` };
    p.lastTradeInvite = now;
    this.invites.set(`${p.sid}>${to.sid}`, now + TRADE.inviteMs);
    emit(to, 'trade:invite', { from: p.sid, name: p.name, ttl: TRADE.inviteMs });
    return { ok: true };
  }

  respond(p, data) {
    const fromSid = Number(data?.from);
    const key = `${fromSid}>${p.sid}`;
    const expires = this.invites.get(key);
    this.invites.delete(key);
    const from = this.players.get(fromSid);
    if (!expires || expires < Date.now() || !from?.socket) return { ok: false, error: 'Lời mời đã hết hạn.' };
    if (data?.accept !== true) {
      emit(from, 'trade:declined', { sid: p.sid, name: p.name });
      return { ok: true };
    }
    if (p.trade) return { ok: false, error: 'Bạn đang giao dịch rồi.' };
    if (from.trade) return { ok: false, error: `${from.name} đang giao dịch với người khác.` };
    if (!this.inZone(p) || !this.inZone(from)) return { ok: false, error: 'Cả hai phải cùng đứng ở Trạm giao thương.' };
    const s = { a: newSide(from), b: newSide(p), rev: 1, lastAt: Date.now() };
    from.trade = s;
    p.trade = s;
    this.dropInvites(from);
    this.dropInvites(p);
    this.push(s);
    return { ok: true };
  }

  offer(p, data) {
    const s = p.trade;
    if (!s) return { ok: false, error: 'Chưa có phiên giao dịch.' };
    const now = Date.now();
    if (now - (p.lastTradeOffer ?? 0) < TRADE.offerIntervalMs) return { ok: false, error: 'Chậm lại chút nhé.' };
    p.lastTradeOffer = now;
    const offer = readOffer(data);
    if (offer.error) return { ok: false, error: offer.error };
    const [mine, theirs] = this.sides(s, p);
    const owned = this.db.shop.owned(p.pid);
    const missing = offer.items.find((id) => !owned.has(id));
    if (missing) return { ok: false, error: `Bạn không có ${nameOf(missing)}.` };
    const theirOwned = this.db.shop.owned(theirs.p.pid);
    const dup = offer.items.find((id) => theirOwned.has(id));
    if (dup) return { ok: false, error: `${theirs.p.name} đã có ${nameOf(dup)} rồi.` };
    if (offer.teu > this.db.shop.teu(p.pid)) return { ok: false, error: 'Không đủ TEU để đặt.' };
    s.lastAt = now;
    if (sameOffer(mine, offer)) return { ok: true };
    mine.items = offer.items;
    mine.teu = offer.teu;
    this.unready(s);
    this.push(s);
    return { ok: true };
  }

  ready(p, data) {
    const s = p.trade;
    if (!s) return { ok: false, error: 'Chưa có phiên giao dịch.' };
    const [mine, theirs] = this.sides(s, p);
    s.lastAt = Date.now();
    if (data?.ready === false) {
      mine.ready = false;
      this.push(s);
      return { ok: true };
    }
    if (Number(data?.rev) !== s.rev) return { ok: false, error: 'Đề nghị vừa thay đổi, xem lại rồi chốt nhé.' };
    if (offerEmpty(s.a) && offerEmpty(s.b)) return { ok: false, error: 'Chưa ai đặt gì cả.' };
    mine.ready = true;
    if (theirs.ready) return this.execute(s);
    this.push(s);
    return { ok: true };
  }

  cancel(p) {
    if (p.trade) this.close(p.trade, p, 'đã huỷ giao dịch');
    return { ok: true };
  }

  /** Người chơi rời phòng, ngắt kết nối hay mở tab khác: huỷ phiên và mọi lời mời liên quan. */
  leave(p) {
    this.dropInvites(p);
    if (p.trade) this.close(p.trade, p, 'đã rời đi');
  }

  /** Quét định kỳ: lời mời hết hạn, người rời trạm, phiên bỏ dở quá lâu. */
  sweep(now = Date.now()) {
    for (const [key, expires] of this.invites) if (expires < now) this.invites.delete(key);
    const seen = new Set();
    for (const p of this.players.values()) {
      const s = p.trade;
      if (!s || seen.has(s)) continue;
      seen.add(s);
      const away = [s.a.p, s.b.p].find((q) => !q.socket || !this.inZone(q, TRADE.leaveMargin));
      if (away) this.close(s, away, 'đã rời trạm');
      else if (now - s.lastAt > TRADE.idleMs) this.close(s, null, 'Phiên giao dịch hết giờ.');
    }
  }

  // ---------- nội bộ ----------

  execute(s) {
    const now = Date.now();
    const { a, b } = s;
    const res = this.db.trade.swap({ pid: a.p.pid, ...offerOf(a) }, { pid: b.p.pid, ...offerOf(b) }, localDate(now, this.config.timezone), now);
    if (!res.ok) {
      const who = res.pid === a.p.pid ? a.p : b.p;
      const notice = res.reason === 'poor' ? `${who.name} không còn đủ TEU.`
        : res.reason === 'owned' ? `${who.name} đã có ${nameOf(res.item)}.`
          : `${who.name} không còn ${nameOf(res.item)}.`;
      this.unready(s);
      this.push(s, notice);
      return { ok: false, error: notice };
    }
    this.end(s);
    this.finish(a, b);
    this.finish(b, a);
    return { ok: true, done: true };
  }

  /** Sau khi đổi: món đang mặc mà vừa cho đi thì rớt về mặc định, báo cả phòng; gửi kết quả cho người này. */
  finish(mine, theirs) {
    const { p } = mine;
    const owned = this.db.shop.owned(p.pid);
    const current = Object.fromEntries(LOOK_SLOTS.map((slot) => [slot, p[slot]]));
    const look = sanitizeLook(current, owned);
    if (LOOK_SLOTS.some((slot) => look[slot] !== current[slot])) {
      Object.assign(p, look);
      p.dirty = true;
      this.db.shop.saveLook(p.pid, look);
      this.onLook?.(p, look);
    }
    emit(p, 'trade:done', { partner: theirs.p.name, gave: offerOf(mine), got: offerOf(theirs), owned: [...owned], teu: this.db.shop.teu(p.pid), look });
  }

  /** Kết thúc phiên không đổi gì. by là người gây ra (null nếu hết giờ); why là lý do kèm tên họ, hoặc câu đầy đủ khi by null. */
  close(s, by, why) {
    this.end(s);
    for (const { p } of [s.a, s.b]) {
      const reason = !by ? why : p === by ? 'Giao dịch đã huỷ.' : `${by.name} ${why}.`;
      emit(p, 'trade:closed', { reason });
    }
  }

  end(s) {
    s.a.p.trade = null;
    s.b.p.trade = null;
  }

  unready(s) {
    s.rev++;
    s.a.ready = false;
    s.b.ready = false;
  }

  sides(s, p) {
    return s.a.p === p ? [s.a, s.b] : [s.b, s.a];
  }

  dropInvites(p) {
    for (const key of this.invites.keys()) {
      const [from, to] = key.split('>').map(Number);
      if (from === p.sid || to === p.sid) this.invites.delete(key);
    }
  }

  /** Gửi mỗi bên góc nhìn của mình: đề nghị của mình, của đối phương (chỉ sid và tên, không lộ playerId). */
  push(s, notice = '') {
    for (const side of [s.a, s.b]) {
      const [mine, theirs] = this.sides(s, side.p);
      emit(side.p, 'trade:state', {
        rev: s.rev,
        notice,
        me: { ...offerOf(mine), ready: mine.ready },
        them: { sid: theirs.p.sid, name: theirs.p.name, ...offerOf(theirs), ready: theirs.ready },
      });
    }
  }
}
