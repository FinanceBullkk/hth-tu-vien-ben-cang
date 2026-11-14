// Bãi đá cạnh bãi container: lấy một tảng (đá thường miễn phí từ kho, đá quý mua bằng TEU), đập theo thanh lực tới khi vỡ,
// vỡ ra một viên ngọc đổi thẳng ra TEU. Mỗi người một tảng riêng trên đe mình đứng, chấm xong ngay khi vỡ.
// Server là nguồn sự thật: client chỉ gửi loại đá và thời điểm bấm (giờ server ước lượng); kiểm tra chỗ đứng, nhịp bấm,
// số dư, chấm nhát đập theo thanh lực tại thời điểm đó, bốc ngọc và trả tiền đều ở đây.
// Rời bãi hay mất kết nối khi đá chưa vỡ thì server đập nốt và trả ngọc luôn: đá đã lấy (đã trả tiền) không bao giờ mất trắng.
import crypto from 'node:crypto';
import { stoneSpotAt } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import {
  STONE, STONE_GEMS, STONE_KINDS, STONE_WEIGHT_TOTAL, gemAt, hitGrade, isStoneKind, powerAt, stonePayout,
} from '../shared/stone.js';
import { localDate } from './time.js';

const NEAR_MARGIN = 1.2; // Dung sai quanh chỗ đứng, bù độ trễ gói vị trí.

export class StoneYard {
  /**
   * @param {{ db: any, io: { emit: Function }, config: any, random?: (n: number) => number }} deps
   * random(n) trả số nguyên trong [0, n); test truyền dãy số dựng sẵn.
   */
  constructor({ db, io, config, random = (n) => crypto.randomInt(n) }) {
    Object.assign(this, { db, io, config, random });
    // Lần chạy trước tắt khi đá quý chưa vỡ: hoàn tiền mua đá còn treo.
    const recovered = this.db.stone.recover();
    if (recovered) console.log(`Bãi đá: hoàn tiền đá quý chưa vỡ cho ${recovered} người chơi từ lần chạy trước.`);
  }

  /** Đe người chơi đang đứng trước, hoặc -1. */
  spotOf(p) {
    return stoneSpotAt(p.x, p.z, NEAR_MARGIN);
  }

  #inYard(p) {
    return p.activity === ACTIVITY.stone && this.spotOf(p) >= 0;
  }

  /** Kho đá thường của một người (gửi trong snapshot và sau mỗi lần lấy đá). */
  stock(pid, now = Date.now()) {
    return this.db.stoneStock.stock(pid, now);
  }

  /** Lấy một tảng loại data.kind lên đe. Đang có tảng chưa vỡ thì trả lại đúng tảng đó, không lấy thêm. */
  start(p, data) {
    const kind = data?.kind;
    if (!isStoneKind(kind)) return { ok: false, error: 'Loại đá không hợp lệ.' };
    if (!this.#inYard(p)) return { ok: false, error: 'Đến đứng trước một đe đá ở bãi đá đã nhé.' };
    if (p.stone) return { ok: true, repeat: true, ...this.#public(p.stone) };
    const now = Date.now();
    if (now - (p.lastStoneStart ?? 0) < STONE.startGapMs) return { ok: false, error: 'Từ từ thôi, đá đang được khiêng lên.' };

    const spec = STONE_KINDS[kind];
    const date = localDate(now, this.config.timezone);
    let stock = null;
    if (spec.price === 0) {
      const took = this.db.stoneStock.take(p.pid, now);
      if (!took.ok) {
        const mins = Math.max(1, Math.ceil((took.nextAt - now) / 60_000));
        return { ok: false, error: `Hết đá thường rồi, khoảng ${mins} phút nữa có tảng mới.`, stock: took.stock, nextAt: took.nextAt };
      }
      stock = { stock: took.stock, nextAt: took.nextAt };
    } else {
      const paid = this.db.stone.stake(p.pid, spec.price, date, now);
      if (!paid.ok) return { ok: false, error: `Không đủ TEU để mua ${spec.name} (${spec.price} TEU).`, teu: paid.teu };
    }
    p.lastStoneStart = now;
    const spot = this.spotOf(p);
    p.stone = { kind, spot, hp: spec.hp, startAt: now, lastAt: 0, hits: 0, perfect: 0, date };
    this.io.emit('stone:place', { sid: p.sid, s: spot, k: kind });
    return { ok: true, ...this.#public(p.stone), ...(stock ?? this.stock(p.pid, now)), teu: this.db.shop.teu(p.pid) };
  }

  #public(stone) {
    return { kind: stone.kind, hp: stone.hp, maxHp: STONE_KINDS[stone.kind].hp, startAt: stone.startAt };
  }

  /** Một nhát đập lúc data.t (giờ server client ước lượng). Server tự tính thanh lực tại thời điểm đó để chấm. */
  hit(p, data) {
    const stone = p.stone;
    if (!stone) return { ok: false, error: 'Lấy một tảng đá lên đe trước đã.' };
    if (!this.#inYard(p)) return { ok: false, error: 'Đến đứng trước đe đá đã nhé.' };
    const t = data?.t;
    const now = Date.now();
    // Chỉ nhận số thật trong cửa sổ bù trễ; không lùi về trước lúc đặt đá, không dồn nhát nhanh hơn một lần vung búa.
    if (typeof t !== 'number' || !Number.isFinite(t) || t < now - STONE.hitLagMs || t > now + STONE.hitLeadMs) {
      return { ok: false, error: 'Nhát búa lệch nhịp, đập lại nhé.' };
    }
    if (t < stone.startAt || t - stone.lastAt < STONE.hitGapMs) return { ok: false, error: 'Búa còn đang vung.' };
    stone.lastAt = t;
    const grade = hitGrade(powerAt(stone.kind, stone.startAt, t));
    stone.hp = Math.max(0, stone.hp - STONE.damage[grade]);
    stone.hits++;
    if (grade === 'perfect') stone.perfect++;
    if (stone.hp > 0) {
      const crack = 1 - stone.hp / STONE_KINDS[stone.kind].hp;
      this.io.emit('stone:hit', { sid: p.sid, s: stone.spot, k: stone.kind, c: Math.round(crack * 100) / 100, g: grade });
      return { ok: true, grade, hp: stone.hp };
    }
    return { ok: true, grade, hp: 0, ...this.#break(p, now) };
  }

  /**
   * Đá vỡ: bốc ngọc, trả tiền, dọn đá khỏi đe, báo cả sân. auto: server đập nốt vì người chơi rời bãi (không có thưởng khéo tay).
   * Trả phần kết quả cho riêng người đập.
   */
  #break(p, now, auto = false) {
    const stone = p.stone;
    p.stone = null;
    const spec = STONE_KINDS[stone.kind];
    const gem = gemAt(stone.kind, this.random(STONE_WEIGHT_TOTAL));
    const found = STONE_GEMS[gem];
    let gain;
    let bonus = 0;
    let teu;
    if (spec.price === 0) {
      // Đá thường: thêm thưởng khéo tay khi mọi nhát đều Chuẩn.
      bonus = !auto && stone.hits > 0 && stone.perfect === stone.hits ? STONE.deftBonus : 0;
      gain = found.teu + bonus;
      teu = this.db.stoneStock.credit(p.pid, gain, stone.date, now);
    } else {
      const res = stonePayout(stone.kind, gem);
      gain = res.payout;
      try {
        teu = this.db.stone.settle(p.pid, res.returned, res.profit, stone.date, now);
      } catch (err) {
        this.db.stone.refund(p.pid, stone.date, now); // Chấm hỏng thì hoàn tiền đá ngay, không để treo tới lần khởi động sau.
        throw err;
      }
    }
    // Ngọc quý thì cả sân được báo tên; còn lại chỉ thấy đá vỡ và màu ngọc, không lộ ai được bao nhiêu.
    const shout = found.tier >= STONE.shoutTier;
    this.io.emit('stone:break', { sid: p.sid, s: stone.spot, k: stone.kind, gem, ...(shout ? { name: p.name, teu: found.teu } : {}) });
    return { broke: true, kind: stone.kind, gem, gain, bonus, net: gain - spec.price, teu, auto };
  }

  /** Rời bãi, mất kết nối, bị kích: đá chưa vỡ thì đập nốt và trả ngọc, báo riêng người chơi nếu còn kết nối. */
  leave(p) {
    if (!p.stone) return;
    try {
      const res = this.#break(p, Date.now(), true);
      p.socket?.emit('stone:auto', res);
    } catch (err) {
      console.error('Lỗi đập nốt đá:', err);
    }
  }

  /** Quét 2 lần/giây từ Room: ai cầm đá mà đã đi khỏi bãi (hoặc đổi hoạt động) thì đập nốt cho họ. */
  sweep(players) {
    for (const p of players.values()) {
      if (p.stone && !this.#inYard(p)) this.leave(p);
    }
  }

  /** Snapshot cho người vừa vào: đá đang nằm trên đe nào, nứt tới đâu. */
  snapshot(players) {
    const out = [];
    for (const p of players.values()) {
      const stone = p.stone;
      if (stone) out.push({ sid: p.sid, s: stone.spot, k: stone.kind, c: Math.round((1 - stone.hp / STONE_KINDS[stone.kind].hp) * 100) / 100 });
    }
    return out;
  }
}
