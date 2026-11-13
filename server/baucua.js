// Bầu cua tôm cá: một bàn chung ở sân. Người chơi đứng quanh bàn đặt TEU, server xóc chung một lần cho cả bàn.
// Server là nguồn sự thật: client chỉ gửi mặt và mệnh giá muốn cược; kiểm tra vị trí, giới hạn, số dư,
// gieo xúc xắc và trả thưởng đều ở đây. Tiền cược bị trừ ngay khi đặt (giữ trong baucua_pending); thắng thì trả sau khi xóc.
//
// Vòng đời một ván: idle -> (có người đặt cược) betting -> rolling -> result -> idle.
// Đặt cược lúc bàn nghỉ (idle) hoặc đang hiện kết quả (result) sẽ mở ván mới ngay.
import crypto from 'node:crypto';
import { BAUCUA, emptyBets, isChip, isSymbol, settle, sumBets } from '../shared/baucua.js';
import { BAUCUA_ZONE, dist2d } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { localDate } from './time.js';

const NEAR_MARGIN = 1.5; // Dung sai so với bán kính khu bàn, bù độ trễ gói vị trí.

export class BauCua {
  constructor({ db, io, config, random = (n) => crypto.randomInt(n) }) {
    Object.assign(this, { db, io, config, random });
    this.phase = 'idle';
    this.round = 0;
    this.roundDate = ''; // Mọi dòng TEU của một ván ghi cùng ngày, để ván vắt qua nửa đêm không bị tách đôi trên bảng tuần.
    this.endsAt = 0;
    this.dice = null; // Ba mặt của ván gần nhất; giữ trên bàn đến khi mở ván mới.
    this.history = []; // Kết quả các ván gần đây, mới nhất trước (mỗi phần tử là 3 mặt).
    this.bets = new Map(); // pid -> mảng 6 số TEU theo từng mặt (chỉ của ván đang chạy)
    this.dirty = false; // Tổng cược đổi: gom lại, phát tối đa 2 lần/giây.
    /** Gán từ Room: gửi kết quả riêng cho một người chơi theo pid. */
    this.onPayout = null;
    // Lần chạy trước sập giữa ván: tiền cược còn treo trong DB thì hoàn lại.
    const recovered = this.db.baucua.recover();
    if (recovered) console.log(`Bầu cua: hoàn cược treo cho ${recovered} người chơi từ lần chạy trước.`);
  }

  nearTable(player) {
    return dist2d(player.x, player.z, BAUCUA_ZONE.x, BAUCUA_ZONE.z) <= BAUCUA_ZONE.radius + NEAR_MARGIN;
  }

  /** Đang trong giờ nhận cược. Server quét 2 lần/giây nên phải tự so giờ, không chờ sweep đổi pha. */
  #open(now) {
    return this.phase === 'betting' && now < this.endsAt;
  }

  /** Tổng TEU và số người đang cược vào từng mặt. Không có tên người cược: chỉ số đếm. */
  totals() {
    const totals = emptyBets();
    const crowd = emptyBets();
    for (const bets of this.bets.values()) {
      for (let i = 0; i < totals.length; i++) {
        totals[i] += bets[i];
        if (bets[i] > 0) crowd[i]++;
      }
    }
    return { totals, crowd };
  }

  publicState() {
    return {
      phase: this.phase,
      round: this.round,
      endsAt: this.endsAt,
      dice: this.dice ? [...this.dice] : null,
      ...this.totals(),
      bettors: this.bets.size,
      history: this.history.map((d) => [...d]),
    };
  }

  /** Cược hiện tại của một người (bản sao). */
  mine(pid) {
    return [...(this.bets.get(pid) ?? emptyBets())];
  }

  /** Gói gửi cho người mới vào phòng hoặc kết nối lại. */
  snapshot(pid) {
    return { ...this.publicState(), mine: this.mine(pid) };
  }

  #broadcast() {
    this.dirty = false;
    this.io.emit('baucua:state', this.publicState());
  }

  #startRound(now) {
    this.phase = 'betting';
    this.round++;
    this.roundDate = localDate(now, this.config.timezone);
    this.endsAt = now + BAUCUA.betMs;
    this.dice = null;
    this.bets.clear();
    this.#broadcast();
  }

  bet(p, data) {
    // Chỉ nhận đúng số nguyên: chuỗi, boolean, mảng đều bị loại, không ép kiểu.
    const symbol = data?.symbol;
    const amount = data?.amount;
    if (!isSymbol(symbol) || !isChip(amount)) return this.#refuse(p) ?? { ok: false, error: 'Cược không hợp lệ.' };
    const add = emptyBets();
    add[symbol] = amount;
    return this.#place(p, add);
  }

  /**
   * Đặt nhiều mặt một lần (nút "Cược lại" và "Gấp đôi"): bets là mảng 6 số nguyên không âm, cộng thêm vào cược hiện có.
   * Cả gói qua hoặc cả gói bị từ chối, trừ tiền một lần.
   */
  rebet(p, data) {
    const add = data?.bets;
    const valid = Array.isArray(add) && add.length === BAUCUA.symbols
      && add.every((v) => Number.isInteger(v) && v >= 0 && v <= BAUCUA.maxPerSymbol) && sumBets(add) > 0;
    if (!valid) return this.#refuse(p) ?? { ok: false, error: 'Cược không hợp lệ.' };
    return this.#place(p, [...add]);
  }

  /** Lý do chặn chung cho mọi lần đặt (sai chỗ, bấm dồn, hết giờ), hoặc null nếu được đặt. */
  #refuse(p, now = Date.now()) {
    if (p.activity !== ACTIVITY.baucua || !this.nearTable(p)) return { ok: false, error: 'Đến bàn bầu cua trước nhé.' };
    if (now - (p.lastBaucua ?? 0) < BAUCUA.betIntervalMs) return { ok: false, error: 'Từ từ thôi, nhà cái đang đếm tiền.' };
    if (this.phase === 'rolling' || (this.phase === 'betting' && !this.#open(now))) {
      return { ok: false, error: 'Hết giờ đặt cược, chờ ván sau nhé.' };
    }
    return null;
  }

  /** Cộng add (6 số) vào cược của p sau khi kiểm tra giới hạn và trừ tiền. */
  #place(p, add) {
    const now = Date.now();
    const refused = this.#refuse(p, now);
    if (refused) return refused;
    const mine = this.bets.get(p.pid) ?? emptyBets();
    if (add.some((v, i) => mine[i] + v > BAUCUA.maxPerSymbol)) return { ok: false, error: `Mỗi mặt cược tối đa ${BAUCUA.maxPerSymbol} TEU.` };
    const amount = sumBets(add);
    if (sumBets(mine) + amount > BAUCUA.maxPerRound) return { ok: false, error: `Mỗi ván cược tối đa ${BAUCUA.maxPerRound} TEU.` };

    p.lastBaucua = now;
    const date = this.phase === 'betting' ? this.roundDate : localDate(now, this.config.timezone);
    const paid = this.db.baucua.stake(p.pid, amount, date, now);
    if (!paid.ok) return { ok: false, error: `Không đủ TEU để cược ${amount}.`, teu: paid.teu };

    // Chỉ mở ván khi cược đã trừ tiền thành công: cược hỏng không được làm bàn chạy.
    if (this.phase !== 'betting') this.#startRound(now);
    add.forEach((v, i) => { mine[i] += v; });
    this.bets.set(p.pid, mine);
    this.dirty = true;
    return { ok: true, bets: [...mine], teu: paid.teu, state: this.publicState() };
  }

  /** Rút toàn bộ cược của mình về, chỉ khi bàn còn đang nhận cược. */
  clear(p) {
    const now = Date.now();
    if (!this.#open(now)) return { ok: false, error: 'Hết giờ rút cược rồi.' };
    const { teu } = this.db.baucua.refund(p.pid, this.roundDate, now);
    if (this.bets.delete(p.pid)) this.dirty = true;
    return { ok: true, bets: emptyBets(), teu, state: this.publicState() };
  }

  /** Gieo ba viên. Gọi một lần mỗi ván, lúc hết giờ đặt cược. */
  #roll(now) {
    this.dice = Array.from({ length: BAUCUA.dice }, () => this.random(BAUCUA.symbols));
    // Lịch sử thêm lúc mở bát (#payout): dải lịch sử trên màn hình đổi cùng lúc bát mở, không sớm hơn.
    this.phase = 'rolling';
    this.endsAt = now + BAUCUA.rollMs;
    this.#broadcast();
  }

  /** Trả thưởng cho từng người cược, rồi hiện kết quả. Lỗi của một người không chặn những người khác. */
  #payout(now) {
    for (const [pid, bets] of this.bets) {
      try {
        const res = settle(bets, this.dice);
        const teu = this.db.baucua.settle(pid, res.returned, res.profit, this.roundDate, now);
        if (res.payout > 0) this.db.onTeu?.(pid, teu);
        this.onPayout?.(pid, { round: this.round, dice: [...this.dice], stake: res.stake, payout: res.payout, net: res.net, teu });
      } catch (err) {
        console.error('Lỗi trả thưởng bầu cua:', err);
      }
    }
    this.bets.clear();
    this.history = [[...this.dice], ...this.history].slice(0, BAUCUA.historySize);
    this.phase = 'result';
    this.endsAt = now + BAUCUA.resultMs;
    this.#broadcast();
  }

  /** Quét 2 lần/giây từ Room: chuyển pha theo giờ và phát tổng cược đã gom. */
  sweep(now = Date.now()) {
    if (this.phase === 'betting' && now >= this.endsAt) this.#roll(now);
    else if (this.phase === 'rolling' && now >= this.endsAt) this.#payout(now);
    else if (this.phase === 'result' && now >= this.endsAt) {
      this.phase = 'idle';
      this.endsAt = 0;
      this.#broadcast();
    } else if (this.dirty) this.#broadcast();
  }

  /** Tắt server giữa ván: hoàn mọi tiền cược chưa chấm ngay, không chờ lần khởi động sau. */
  stop() {
    const now = Date.now();
    for (const pid of this.bets.keys()) {
      try {
        this.db.baucua.refund(pid, this.roundDate, now);
      } catch (err) {
        console.error('Lỗi hoàn cược bầu cua:', err);
      }
    }
    this.bets.clear();
    this.phase = 'idle';
  }
}
