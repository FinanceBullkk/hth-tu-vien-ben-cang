// Máy gạt cần (slot): luật dùng chung cho server (quay, chấm, trả thưởng) và client (vẽ cuộn, bảng thưởng).
// Ba cuộn, một đường thưởng ở giữa. Mỗi cuộn ra một hình theo trọng số; ăn theo bộ ba hoặc đôi giống nhau (ở đâu cũng được).
// "×n" là số lần tiền cược được trả về, đã gồm tiền cược: ×1 là hoà vốn, ×0 là mất cược.
// Id hình là chỉ số trong mảng, gửi trong gói tin nên chỉ được nối thêm vào cuối.
import { CASINO_CHIPS } from './casino-bets.js';

export const SLOT_SYMBOLS = [
  { key: 'dao', name: 'Đào', icon: '🍑', color: '#e7837c', weight: 12, triple: 5, pair: 0 },
  { key: 'quyt', name: 'Quýt', icon: '🍊', color: '#ee8f24', weight: 9, triple: 10, pair: 1 },
  { key: 'den', name: 'Đèn lồng', icon: '🏮', color: '#d4372a', weight: 6, triple: 20, pair: 1 },
  { key: 'lixi', name: 'Lì xì', icon: '🧧', color: '#c0262b', weight: 4, triple: 40, pair: 2 },
  { key: 'vang', name: 'Túi vàng', icon: '💰', color: '#d9a225', weight: 2, triple: 80, pair: 3 },
  { key: 'rong', name: 'Rồng', icon: '🐉', color: '#21935f', weight: 1, triple: 200, pair: 8 },
];

/** Tổng trọng số: server bốc một số nguyên trong [0, WEIGHT_TOTAL) cho mỗi cuộn. */
export const SLOT_WEIGHT_TOTAL = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export const SLOT = {
  reels: 3,
  bets: CASINO_CHIPS, // Mệnh giá mỗi lần gạt: đúng khay chip các bàn khác.
  spinMs: 1900, // Client quay chừng này rồi mới dừng hết ba cuộn.
  spinGapMs: 1700, // Server: giãn cách tối thiểu giữa hai lần gạt của một người (chừa độ trễ mạng).
  jackpot: SLOT_SYMBOLS.length - 1, // Ba Rồng: nổ hũ.
  bigWin: 40, // Từ ×40 trở lên: cả sân được báo tên người trúng.
};

/** Hình hợp lệ: số nguyên 0..5. */
export const isSlotSymbol = (v) => Number.isInteger(v) && v >= 0 && v < SLOT_SYMBOLS.length;

/** Mệnh giá hợp lệ: đúng một trong các mức cược. Không ép kiểu: chuỗi "5" bị loại. */
export const isSlotBet = (v) => SLOT.bets.includes(v);

/** Số bốc được (0..WEIGHT_TOTAL-1) -> id hình, theo dải trọng số liên tiếp. */
export function symbolAt(roll) {
  let left = roll;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    left -= SLOT_SYMBOLS[i].weight;
    if (left < 0) return i;
  }
  return SLOT_SYMBOLS.length - 1;
}

/** Số bốc nhỏ nhất ra đúng hình s (để test dựng sẵn kết quả). */
export function rollFor(symbol) {
  let start = 0;
  for (let i = 0; i < symbol; i++) start += SLOT_SYMBOLS[i].weight;
  return start;
}

/**
 * Đường thưởng của ba cuộn: { kind: 'triple'|'pair'|'none', symbol, mult }.
 * Đôi tính ở bất kỳ hai cuộn nào; hình đôi có pair = 0 (Đào) thì không ăn.
 */
export function lineOf(reels) {
  const [a, b, c] = reels;
  if (a === b && b === c) return { kind: 'triple', symbol: a, mult: SLOT_SYMBOLS[a].triple };
  const twin = a === b || a === c ? a : b === c ? b : -1;
  if (twin >= 0 && SLOT_SYMBOLS[twin].pair > 0) return { kind: 'pair', symbol: twin, mult: SLOT_SYMBOLS[twin].pair };
  return { kind: 'none', symbol: -1, mult: 0 };
}

/**
 * Chấm một lần gạt. payout = cược × mult. profit là lãi ròng (không âm), returned là phần tiền cược được hoàn,
 * khớp cách TableStakeStore.settle ghi "slot:return" và "slot:win".
 */
export function settleSpin(stake, reels) {
  const line = lineOf(reels);
  const payout = stake * line.mult;
  const profit = Math.max(0, payout - stake);
  return { stake, mult: line.mult, kind: line.kind, symbol: line.symbol, payout, net: payout - stake, profit, returned: payout - profit };
}

/** Hoàn vốn kỳ vọng (RTP) chính xác theo trọng số, duyệt mọi tổ hợp ba cuộn. Dùng trong test và docs. */
export function expectedReturn() {
  const n = SLOT_SYMBOLS.length;
  let rtp = 0;
  let hit = 0;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
    const p = (SLOT_SYMBOLS[a].weight * SLOT_SYMBOLS[b].weight * SLOT_SYMBOLS[c].weight) / SLOT_WEIGHT_TOTAL ** 3;
    const { mult } = lineOf([a, b, c]);
    rtp += p * mult;
    if (mult > 0) hit += p;
  }
  return { rtp, hit };
}
