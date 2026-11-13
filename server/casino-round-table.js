// Lõi chung của các bàn "đặt cửa, một người tung, cả bàn xem kết quả" (tài xỉu, cò quay).
// Server là nguồn sự thật: client chỉ gửi cửa + mệnh giá, và lực tung (chỉ để diễn hoạt). Vị trí, giới hạn, số dư,
// kết quả và tiền thưởng đều chấm ở đây. Tiền cược bị trừ ngay khi đặt và giữ trong <trò>_pending tới khi chấm.
//
// Vòng đời một ván: idle -> (có người cược) betting -> throwing -> rolling -> result -> idle.
// - throwing: người cược nhiều nhất ván (bằng nhau thì ai cược trước) được tự tung; hết giờ thì bàn tự tung.
//   Kết quả bốc thăm lúc tung, không phụ thuộc lực tung: lực chỉ để mọi máy diễn cùng một cú ném.
// - Cược lúc idle hoặc result mở ván mới ngay. Hết giờ cược mà không còn ai cược (rút hết) thì bàn về nghỉ.
import crypto from 'node:crypto';
import { isCasinoChip, sumBets } from '../shared/casino-bets.js';
import { dist2d } from '../shared/layout.js';
import { localDate } from './time.js';

const NEAR_MARGIN = 1.5; // Dung sai so với bán kính khu bàn, bù độ trễ gói vị trí.
const AUTO_POWER = 0.55; // Lực tung khi người tung không bấm kịp.

/**
 * @typedef {object} TableRules
 * @property {string} name tên trò, cũng là tiền tố sự kiện socket và tên kho giữ tiền
 * @property {string} label tên đọc được, dùng trong câu báo lỗi
 * @property {{x:number,z:number,radius:number}} zone khu bàn
 * @property {number} activity mã ACTIVITY người chơi phải đang ở
 * @property {{key:string,pays:number,max:number}[]} targets các cửa
 * @property {{maxPerRound:number,betMs:number,throwMs:number,rollMs:number,resultMs:number,betIntervalMs:number,history:number}} timing
 * @property {(random:(n:number)=>number)=>any} draw bốc kết quả
 * @property {(bets:number[], result:any)=>{stake:number,payout:number,net:number,profit:number,returned:number}} settle
 * @property {(result:any)=>any} historyEntry bản ghi gọn của một ván cho bảng cầu
 */

export class CasinoRoundTable {
  /** @param {{ db: any, io: any, config: any, rules: TableRules, random?: (n:number)=>number }} opts */
  constructor({ db, io, config, rules, random = (n) => crypto.randomInt(n) }) {
    Object.assign(this, { db, io, config, rules, random });
    this.store = db[rules.name];
    this.phase = 'idle';
    this.round = 0;
    this.roundDate = ''; // Mọi dòng TEU của một ván ghi cùng ngày bắt đầu ván.
    this.endsAt = 0;
    this.result = null; // Kết quả ván gần nhất; giữ trên bàn tới khi mở ván mới.
    this.power = 0; // Lực của cú tung ván này (0..1), chỉ để diễn hoạt.
    this.thrower = null; // { pid, sid, name } người được tung ván này.
    this.history = [];
    this.bets = new Map(); // pid -> { bets: number[], sid, name, firstAt }
    this.dirty = false; // Tổng cược đổi: gom lại, phát theo nhịp sweep.
    /** Gán từ Room: gửi kết quả riêng cho một người theo pid. */
    this.onPayout = null;
    const recovered = this.store.recover();
    if (recovered) console.log(`${rules.label}: hoàn cược treo cho ${recovered} người chơi từ lần chạy trước.`);
  }

  get event() {
    return `${this.rules.name}:state`;
  }

  emptyBets() {
    return new Array(this.rules.targets.length).fill(0);
  }

  nearTable(player) {
    const { zone } = this.rules;
    return dist2d(player.x, player.z, zone.x, zone.z) <= zone.radius + NEAR_MARGIN;
  }

  /** Đang trong giờ nhận cược. Sweep chỉ chạy 2 lần/giây nên phải tự so giờ. */
  #open(now) {
    return this.phase === 'betting' && now < this.endsAt;
  }

  totals() {
    const totals = this.emptyBets();
    for (const { bets } of this.bets.values()) for (let i = 0; i < totals.length; i++) totals[i] += bets[i];
    return totals;
  }

  /** Trạng thái phát cho cả phòng: tổng theo cửa, không có ai cược bao nhiêu. Người tung thì hiện tên. */
  publicState() {
    const t = this.thrower;
    return {
      phase: this.phase,
      round: this.round,
      endsAt: this.endsAt,
      totals: this.totals(),
      bettors: this.bets.size,
      thrower: t ? { sid: t.sid, name: t.name } : null,
      power: this.power,
      result: this.phase === 'rolling' || this.phase === 'result' ? this.result : null,
      history: [...this.history],
    };
  }

  mine(pid) {
    return [...(this.bets.get(pid)?.bets ?? this.emptyBets())];
  }

  /** Gói cho người mới vào phòng hoặc kết nối lại; isThrower để kết nối lại giữa lúc tung vẫn tung được. */
  snapshot(pid) {
    return { ...this.publicState(), mine: this.mine(pid), isThrower: this.thrower?.pid === pid };
  }

  #broadcast() {
    this.dirty = false;
    this.io.emit(this.event, this.publicState());
  }

  #startRound(now) {
    this.phase = 'betting';
    this.round++;
    this.roundDate = localDate(now, this.config.timezone);
    this.endsAt = now + this.rules.timing.betMs;
    this.result = null;
    this.power = 0;
    this.thrower = null;
    this.bets.clear();
    this.#broadcast();
  }

  #denyAccess(p) {
    if (p.activity !== this.rules.activity || !this.nearTable(p)) return `Đến bàn ${this.rules.label} trước nhé.`;
    return '';
  }

  bet(p, data) {
    const denied = this.#denyAccess(p);
    if (denied) return { ok: false, error: denied };
    const { timing, targets } = this.rules;
    const now = Date.now();
    if (now - (p.lastCasinoBet ?? 0) < timing.betIntervalMs) return { ok: false, error: 'Từ từ thôi, nhà cái đang đếm tiền.' };
    if (this.phase === 'throwing' || this.phase === 'rolling' || (this.phase === 'betting' && !this.#open(now))) {
      return { ok: false, error: 'Hết giờ đặt cược, chờ ván sau nhé.' };
    }
    // Chỉ nhận đúng số nguyên: chuỗi, boolean, mảng đều bị loại, không ép kiểu.
    const target = data?.target;
    const amount = data?.amount;
    if (!Number.isInteger(target) || target < 0 || target >= targets.length || !isCasinoChip(amount)) {
      return { ok: false, error: 'Cược không hợp lệ.' };
    }
    const entry = this.phase === 'betting' ? this.bets.get(p.pid) : null;
    const mine = entry?.bets ?? this.emptyBets();
    const cap = targets[target].max;
    if (mine[target] + amount > cap) return { ok: false, error: `Cửa ${targets[target].name} tối đa ${cap} TEU.` };
    if (sumBets(mine) + amount > timing.maxPerRound) return { ok: false, error: `Mỗi ván cược tối đa ${timing.maxPerRound} TEU.` };

    p.lastCasinoBet = now;
    const date = this.phase === 'betting' ? this.roundDate : localDate(now, this.config.timezone);
    const paid = this.store.stake(p.pid, amount, date, now);
    if (!paid.ok) return { ok: false, error: `Không đủ TEU để cược ${amount}.`, teu: paid.teu };

    // Chỉ mở ván khi đã trừ tiền thành công: cược hỏng không làm bàn chạy.
    if (this.phase !== 'betting') this.#startRound(now);
    mine[target] += amount;
    const prev = this.bets.get(p.pid);
    this.bets.set(p.pid, { bets: mine, sid: p.sid, name: p.name, firstAt: prev?.firstAt ?? now });
    this.dirty = true;
    return { ok: true, bets: [...mine], teu: paid.teu, state: this.publicState() };
  }

  /** Rút toàn bộ cược của mình, chỉ khi bàn còn nhận cược. */
  clear(p) {
    const now = Date.now();
    if (!this.#open(now)) return { ok: false, error: 'Hết giờ rút cược rồi.' };
    const { teu } = this.store.refund(p.pid, this.roundDate, now);
    if (this.bets.delete(p.pid)) this.dirty = true;
    return { ok: true, bets: this.emptyBets(), teu, state: this.publicState() };
  }

  /** Người tung bấm thả. power là lực lấy đà 0..1, chỉ để diễn hoạt; số không hợp lệ thì dùng lực mặc định. */
  throw(p, data) {
    if (this.phase !== 'throwing') return { ok: false, error: 'Chưa tới lúc tung.' };
    if (this.thrower?.pid !== p.pid) return { ok: false, error: 'Người cược lớn nhất ván mới được tung.' };
    const power = typeof data?.power === 'number' && Number.isFinite(data.power) ? Math.min(1, Math.max(0, data.power)) : AUTO_POWER;
    this.#roll(Date.now(), power);
    return { ok: true };
  }

  /** Người cược nhiều nhất ván; bằng nhau thì ai đặt trước. */
  #pickThrower() {
    let best = null;
    for (const [pid, e] of this.bets) {
      const stake = sumBets(e.bets);
      if (!best || stake > best.stake || (stake === best.stake && e.firstAt < best.firstAt)) best = { pid, sid: e.sid, name: e.name, stake, firstAt: e.firstAt };
    }
    return best && { pid: best.pid, sid: best.sid, name: best.name };
  }

  #beginThrow(now) {
    if (this.bets.size === 0) {
      this.#idle();
      return;
    }
    this.phase = 'throwing';
    this.thrower = this.#pickThrower();
    this.endsAt = now + this.rules.timing.throwMs;
    this.#broadcast();
  }

  /** Bốc kết quả và bắt đầu diễn. Gọi đúng một lần mỗi ván. */
  #roll(now, power) {
    this.result = this.rules.draw(this.random);
    this.power = power;
    this.phase = 'rolling';
    this.endsAt = now + this.rules.timing.rollMs;
    this.#broadcast();
  }

  /** Chia tiền từng người rồi hiện kết quả. Lỗi của một người không chặn những người khác. */
  #payout(now) {
    for (const [pid, { bets }] of this.bets) {
      try {
        const res = this.rules.settle(bets, this.result);
        const teu = this.store.settle(pid, res.returned, res.profit, this.roundDate, now);
        if (res.payout > 0) this.db.onTeu?.(pid, teu);
        this.onPayout?.(pid, { round: this.round, result: this.result, stake: res.stake, payout: res.payout, net: res.net, teu });
      } catch (err) {
        console.error(`Lỗi trả thưởng ${this.rules.label}:`, err);
      }
    }
    this.bets.clear();
    this.history = [this.rules.historyEntry(this.result), ...this.history].slice(0, this.rules.timing.history);
    this.phase = 'result';
    this.endsAt = now + this.rules.timing.resultMs;
    this.#broadcast();
  }

  #idle() {
    this.phase = 'idle';
    this.endsAt = 0;
    this.thrower = null;
    this.#broadcast();
  }

  /** Quét 2 lần/giây từ Room: chuyển pha theo giờ, phát tổng cược đã gom. */
  sweep(now = Date.now()) {
    if (this.phase === 'betting' && now >= this.endsAt) this.#beginThrow(now);
    else if (this.phase === 'throwing' && now >= this.endsAt) this.#roll(now, AUTO_POWER);
    else if (this.phase === 'rolling' && now >= this.endsAt) this.#payout(now);
    else if (this.phase === 'result' && now >= this.endsAt) this.#idle();
    else if (this.dirty) this.#broadcast();
  }

  /** Tắt server giữa ván: hoàn mọi cược chưa chấm ngay. */
  stop() {
    const now = Date.now();
    for (const pid of this.bets.keys()) {
      try {
        this.store.refund(pid, this.roundDate, now);
      } catch (err) {
        console.error(`Lỗi hoàn cược ${this.rules.label}:`, err);
      }
    }
    this.bets.clear();
    this.phase = 'idle';
  }
}
