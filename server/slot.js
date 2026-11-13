// Máy gạt cần: dãy máy trong hành lang phía tây. Mỗi lần gạt là một ván riêng của người gạt, chấm xong ngay.
// Server là nguồn sự thật: client chỉ gửi mức cược; kiểm tra chỗ đứng, nhịp gạt, số dư, bốc ba cuộn và trả thưởng đều ở đây.
// Tiền đi qua TableStakeStore "slot" như các bàn đỏ đen: trừ cược (giữ trong slot_pending) rồi chấm ngay trong cùng lượt xử lý,
// nên bảng tuần tính lãi/lỗ ròng của máy giống bầu cua, xì dách.
import crypto from 'node:crypto';
import { slotMachineAt } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { SLOT, SLOT_WEIGHT_TOTAL, isSlotBet, settleSpin, symbolAt } from '../shared/slot.js';
import { localDate } from './time.js';

const NEAR_MARGIN = 1.2; // Dung sai quanh chỗ đứng, bù độ trễ gói vị trí.

export class Slot {
  /**
   * @param {{ db: any, io: { emit: Function }, config: any, random?: (n: number) => number }} deps
   * random(n) trả số nguyên trong [0, n); test truyền dãy số dựng sẵn.
   */
  constructor({ db, io, config, random = (n) => crypto.randomInt(n) }) {
    Object.assign(this, { db, io, config, random });
    // Lần chạy trước sập đúng giữa lúc trừ cược và trả thưởng (rất hiếm): hoàn cược còn treo.
    const recovered = this.db.slot.recover();
    if (recovered) console.log(`Gạt cần: hoàn cược treo cho ${recovered} người chơi từ lần chạy trước.`);
  }

  /** Máy người chơi đang đứng trước, hoặc -1 nếu không ở máy nào. */
  machineOf(p) {
    return slotMachineAt(p.x, p.z, NEAR_MARGIN);
  }

  /** Gạt cần với mức cược data.amount. Trả kết quả cho riêng người gạt; cả sân thấy cuộn quay trên máy đó. */
  spin(p, data) {
    const amount = data?.amount;
    if (!isSlotBet(amount)) return { ok: false, error: 'Mức cược không hợp lệ.' };
    const machine = this.machineOf(p);
    if (p.activity !== ACTIVITY.slot || machine < 0) return { ok: false, error: 'Đến trước máy gạt cần đã nhé.' };
    const now = Date.now();
    if (now - (p.lastSlot ?? 0) < SLOT.spinGapMs) return { ok: false, error: 'Máy còn đang quay.' };

    const date = localDate(now, this.config.timezone);
    const paid = this.db.slot.stake(p.pid, amount, date, now);
    if (!paid.ok) return { ok: false, error: `Không đủ TEU để gạt ${amount}.`, teu: paid.teu };
    p.lastSlot = now;

    const reels = Array.from({ length: SLOT.reels }, () => symbolAt(this.random(SLOT_WEIGHT_TOTAL)));
    const res = settleSpin(amount, reels);
    let teu;
    try {
      teu = this.db.slot.settle(p.pid, res.returned, res.profit, date, now);
    } catch (err) {
      this.db.slot.refund(p.pid, date, now); // Chấm hỏng thì hoàn cược ngay, không để treo tới lần khởi động sau.
      throw err;
    }
    // Thắng lớn thì cả sân được báo tên; còn lại chỉ là cuộn quay trên máy, không lộ ai thắng thua bao nhiêu.
    const big = res.mult >= SLOT.bigWin;
    this.io.emit('slot:spin', { sid: p.sid, m: machine, reels, mult: res.mult, ...(big ? { name: p.name, payout: res.payout } : {}) });
    return { ok: true, machine, reels, mult: res.mult, kind: res.kind, symbol: res.symbol, stake: amount, payout: res.payout, net: res.net, teu };
  }
}
