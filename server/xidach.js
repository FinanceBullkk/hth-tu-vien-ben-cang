// Xì dách: một bàn chung tối đa 5 khách đấu với nhà cái NPC. Server là nguồn sự thật: xáo bài, chia, kiểm tra rút/dằn,
// nhà cái rút theo luật cố định trong shared/xidach.js, chấm và trả thưởng. Client chỉ gửi ý định (cược, rút, dằn).
//
// Vòng đời một ván: idle -> (có người cược) betting -> chia bài -> playing (mọi người rút/dằn cùng lúc)
// -> dealer (nhà cái lật và rút từng lá) -> result -> idle. Nhà cái có xì bàn/xì dách thì lật ngay sau khi chia và chấm luôn.
// Bài của người khác giấu tới lúc chấm; bài của mình gửi riêng qua onHand. Tiền giữ gấp đôi cược, chấm xong hoàn phần dư.
import crypto from 'node:crypto';
import { XIDACH, dealerShouldHit, handKind, handTotal, isNatural, settleHand, shuffledDeck } from '../shared/xidach.js';
import { XIDACH_ZONE, dist2d } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { localDate } from './time.js';
import { privateSeat, publicTable } from './xidach-view.js';

export { HIDDEN_CARD } from './xidach-view.js';

const NEAR_MARGIN = 1.5; // Dung sai so với bán kính khu bàn, bù độ trễ gói vị trí.

export class XiDach {
  /** shuffle: trả về bộ bài cho một ván (lá cuối mảng chia trước); test truyền bộ bài sắp sẵn. */
  constructor({ db, io, config, shuffle = () => shuffledDeck((n) => crypto.randomInt(n)) }) {
    Object.assign(this, { db, io, config, shuffle });
    this.phase = 'idle';
    this.round = 0;
    this.roundDate = '';
    this.endsAt = 0;
    this.seats = new Map(); // pid -> { pid, sid, name, seat, bet, cards, stood, result }
    this.dealer = [];
    this.deck = [];
    this.revealed = false;
    this.nextStepAt = 0;
    this.dirty = false;
    /** Gán từ Room: gửi riêng cho một người theo pid. */
    this.onHand = null; // (pid, { round, cards, stood })
    this.onPayout = null; // (pid, { round, outcome, mult, bet, net, kind, teu })
    const recovered = this.db.xidach.recover();
    if (recovered) console.log(`Xì dách: hoàn cược treo cho ${recovered} người chơi từ lần chạy trước.`);
  }

  nearTable(p) {
    return dist2d(p.x, p.z, XIDACH_ZONE.x, XIDACH_ZONE.z) <= XIDACH_ZONE.radius + NEAR_MARGIN;
  }

  #date(now) {
    return localDate(now, this.config.timezone);
  }

  #ready(p, now) {
    if (p.activity !== ACTIVITY.xidach || !this.nearTable(p)) return 'Đến bàn xì dách trước nhé.';
    if (now - (p.lastXidach ?? 0) < XIDACH.actionIntervalMs) return 'Từ từ thôi, nhà cái đang chia.';
    return null;
  }

  publicState() {
    return publicTable(this);
  }

  /** Gói gửi cho người mới vào phòng hoặc kết nối lại: kèm bài và tiền cược của chính mình. */
  snapshot(pid) {
    return { ...publicTable(this), mine: privateSeat(this.seats.get(pid)) };
  }

  #broadcast() {
    this.dirty = false;
    this.io.emit('xidach:state', this.publicState());
  }

  #sendHand(s) {
    this.onHand?.(s.pid, { round: this.round, cards: [...s.cards], stood: s.stood });
  }

  #startRound(now) {
    this.phase = 'betting';
    this.round++;
    this.roundDate = this.#date(now);
    this.endsAt = now + XIDACH.betMs;
    this.seats.clear();
    this.dealer = [];
    this.revealed = false;
  }

  bet(p, data) {
    const now = Date.now();
    const notReady = this.#ready(p, now);
    if (notReady) return { ok: false, error: notReady };
    const betting = this.phase === 'betting' && now < this.endsAt;
    if (!betting && this.phase !== 'idle' && this.phase !== 'result') return { ok: false, error: 'Ván đang chơi, chờ ván sau nhé.' };
    const amount = data?.amount;
    if (!XIDACH.chips.includes(amount)) return { ok: false, error: 'Cược không hợp lệ.' };
    const seat = betting ? this.seats.get(p.pid) : null;
    if (!seat && betting && this.seats.size >= XIDACH.seats) return { ok: false, error: `Bàn đủ ${XIDACH.seats} người rồi, chờ ván sau nhé.` };
    if ((seat?.bet ?? 0) + amount > XIDACH.maxBet) return { ok: false, error: `Mỗi tay cược tối đa ${XIDACH.maxBet} TEU.` };

    p.lastXidach = now;
    const hold = amount * XIDACH.holdMult;
    const date = betting ? this.roundDate : this.#date(now);
    const paid = this.db.xidach.stake(p.pid, hold, date, now);
    if (!paid.ok) return { ok: false, error: `Cần ${hold} TEU (giữ gấp đôi phòng cái ăn x2).`, teu: paid.teu };

    if (!betting) this.#startRound(now);
    let s = this.seats.get(p.pid);
    if (!s) {
      const used = new Set([...this.seats.values()].map((x) => x.seat));
      const free = [...Array(XIDACH.seats).keys()].find((i) => !used.has(i));
      s = { pid: p.pid, sid: p.sid, name: p.name, seat: free, bet: 0, cards: [], stood: false, result: null };
      this.seats.set(p.pid, s);
    }
    s.bet += amount;
    this.#broadcast();
    return { ok: true, bet: s.bet, seat: s.seat, teu: paid.teu, state: this.publicState() };
  }

  /** Rút cược khi còn đang nhận cược: hoàn đủ phần giữ, trả ghế. */
  clear(p) {
    const now = Date.now();
    if (!(this.phase === 'betting' && now < this.endsAt)) return { ok: false, error: 'Hết giờ rút cược rồi.' };
    const { teu } = this.db.xidach.refund(p.pid, this.roundDate, now);
    if (this.seats.delete(p.pid)) this.#broadcast();
    return { ok: true, teu, state: this.publicState() };
  }

  #turnSeat(p, now) {
    const s = this.seats.get(p.pid);
    if (this.phase !== 'playing' || now >= this.endsAt) return { error: 'Chưa tới lượt rút bài.' };
    if (!s) return { error: 'Ván này bạn không cược.' };
    if (s.stood) return { error: 'Bạn đã dằn bài rồi.' };
    return { s };
  }

  hit(p) {
    const now = Date.now();
    const notReady = this.#ready(p, now);
    if (notReady) return { ok: false, error: notReady };
    const { s, error } = this.#turnSeat(p, now);
    if (error) return { ok: false, error };
    p.lastXidach = now;
    s.cards.push(this.deck.pop());
    // Đủ 5 lá hoặc quắc thì tự dằn; quắc vẫn giấu với người khác tới lúc chấm như ngoài đời.
    if (s.cards.length >= XIDACH.maxCards || handTotal(s.cards) > 21) s.stood = true;
    this.dirty = true;
    this.#announce(s, 'hit');
    return { ok: true, cards: [...s.cards], stood: s.stood };
  }

  stand(p) {
    const now = Date.now();
    const notReady = this.#ready(p, now);
    if (notReady) return { ok: false, error: notReady };
    const { s, error } = this.#turnSeat(p, now);
    if (error) return { ok: false, error };
    if (handTotal(s.cards) < XIDACH.minStand) return { ok: false, error: `Dưới ${XIDACH.minStand} là non, phải rút thêm.` };
    p.lastXidach = now;
    s.stood = true;
    this.dirty = true;
    this.#announce(s, 'stand');
    return { ok: true, cards: [...s.cards], stood: true };
  }

  /**
   * Báo cả phòng một khách vừa rút hay dằn, để nhân vật của họ diễn và hàng ghế nháy lên.
   * Chỉ có sid, hành động và số lá: không lộ bài, không lộ quắc (quắc tự dằn nhưng vẫn báo là "rút").
   */
  #announce(s, action) {
    this.io.emit('xidach:act', { sid: s.sid, action, count: s.cards.length });
  }

  #deal(now) {
    if (this.seats.size === 0) {
      this.phase = 'idle';
      this.endsAt = 0;
      this.#broadcast();
      return;
    }
    this.deck = this.shuffle();
    const order = [...this.seats.values()].sort((a, b) => a.seat - b.seat);
    for (let round = 0; round < 2; round++) {
      for (const s of order) s.cards.push(this.deck.pop());
      this.dealer.push(this.deck.pop());
    }
    for (const s of order) {
      if (isNatural(handKind(s.cards))) s.stood = true; // Xì bàn, xì dách: lật ngửa chờ chấm, không rút.
      this.#sendHand(s);
    }
    if (isNatural(handKind(this.dealer, { dealer: true }))) {
      this.revealed = true;
      this.#settle(now);
      return;
    }
    this.phase = 'playing';
    this.endsAt = now + XIDACH.turnMs;
    if (order.every((s) => s.stood)) this.#toDealer(now);
    else this.#broadcast();
  }

  /** Hết lượt khách: ai chưa dằn coi như dằn (dưới 16 thì là non); nhà cái lật bài. */
  #toDealer(now) {
    for (const s of this.seats.values()) s.stood = true;
    this.phase = 'dealer';
    this.revealed = true;
    this.nextStepAt = now + XIDACH.dealerStepMs;
    this.#broadcast();
  }

  #settle(now) {
    for (const s of this.seats.values()) {
      try {
        const res = settleHand(s.bet, s.cards, this.dealer);
        s.result = res;
        const teu = this.db.xidach.settle(s.pid, res.returned, res.profit, this.roundDate, now);
        if (res.returned + res.profit > 0) this.db.onTeu?.(s.pid, teu);
        this.onPayout?.(s.pid, { round: this.round, outcome: res.outcome, mult: res.mult, bet: s.bet, net: res.net, kind: handKind(s.cards), teu });
      } catch (err) {
        console.error('Lỗi trả thưởng xì dách:', err);
      }
    }
    this.phase = 'result';
    this.endsAt = now + XIDACH.resultMs;
    this.#broadcast();
  }

  /** Quét 2 lần/giây từ Room: chia bài, hết lượt, nhà cái rút từng lá, chấm, nghỉ. */
  sweep(now = Date.now()) {
    if (this.phase === 'betting' && now >= this.endsAt) this.#deal(now);
    else if (this.phase === 'playing' && (now >= this.endsAt || [...this.seats.values()].every((s) => s.stood))) this.#toDealer(now);
    else if (this.phase === 'dealer' && now >= this.nextStepAt) {
      if (dealerShouldHit(this.dealer)) {
        this.dealer.push(this.deck.pop());
        this.nextStepAt = now + XIDACH.dealerStepMs;
        this.#broadcast();
      } else this.#settle(now);
    } else if (this.phase === 'result' && now >= this.endsAt) {
      this.phase = 'idle';
      this.endsAt = 0;
      this.seats.clear();
      this.dealer = [];
      this.revealed = false;
      this.#broadcast();
    } else if (this.dirty) this.#broadcast();
  }

  /** Tắt server giữa ván: hoàn mọi tiền đang giữ ngay, không chờ lần khởi động sau. */
  stop() {
    if (this.phase !== 'result') {
      const now = Date.now();
      for (const pid of this.seats.keys()) {
        try {
          this.db.xidach.refund(pid, this.roundDate, now);
        } catch (err) {
          console.error('Lỗi hoàn cược xì dách:', err);
        }
      }
    }
    this.seats.clear();
    this.phase = 'idle';
  }
}
