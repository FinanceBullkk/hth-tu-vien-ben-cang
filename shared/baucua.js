// Bầu cua tôm cá: luật dùng chung cho server (chấm, trả thưởng) và client (hiển thị).
// Sáu mặt, ba viên xúc xắc. Cược một mặt: ra n viên trùng thì nhận lại tiền cược cộng n lần tiền cược.
// Thứ tự mặt theo bàn bầu cua truyền thống; id là chỉ số trong mảng, lưu trong gói tin nên chỉ được nối thêm.

export const BAUCUA_SYMBOLS = [
  { key: 'nai', name: 'Nai', icon: '🦌', color: '#b9824a' },
  { key: 'bau', name: 'Bầu', icon: '🎃', color: '#d98a2b' },
  { key: 'ga', name: 'Gà', icon: '🐓', color: '#c0392b' },
  { key: 'ca', name: 'Cá', icon: '🐟', color: '#3b7fb8' },
  { key: 'cua', name: 'Cua', icon: '🦀', color: '#d2553d' },
  { key: 'tom', name: 'Tôm', icon: '🦐', color: '#e0795f' },
];

export const BAUCUA = {
  symbols: BAUCUA_SYMBOLS.length,
  dice: 3,
  chips: [1, 5, 10], // Mệnh giá TEU mỗi lần bấm.
  maxPerSymbol: 30, // Tổng TEU tối đa cược vào một mặt trong một ván.
  maxPerRound: 50, // Tổng TEU tối đa của một người trong một ván.
  betMs: 20_000, // Thời gian đặt cược, tính từ lúc có người đặt cược đầu tiên.
  rollMs: 3_500, // Xóc đĩa; trong lúc này không nhận cược nữa.
  resultMs: 8_000, // Giữ kết quả trên bàn trước khi bàn nghỉ.
  betIntervalMs: 120, // Giãn cách tối thiểu giữa hai lần đặt cược của một người.
};

export const PHASES = ['idle', 'betting', 'rolling', 'result'];

/** Id mặt hợp lệ: số nguyên 0..5. */
export const isSymbol = (v) => Number.isInteger(v) && v >= 0 && v < BAUCUA.symbols;

/** Mệnh giá hợp lệ: đúng một trong các chip. */
export const isChip = (v) => BAUCUA.chips.includes(v);

export const sumBets = (bets) => bets.reduce((sum, v) => sum + v, 0);

/** Số viên trùng với mỗi mặt: [nai, bầu, gà, cá, cua, tôm]. */
export function matchCounts(dice) {
  const counts = new Array(BAUCUA.symbols).fill(0);
  for (const d of dice) if (isSymbol(d)) counts[d]++;
  return counts;
}

/**
 * Chấm một người: bets là mảng 6 số TEU cược theo từng mặt.
 * Tiền trả về = với mỗi mặt đã cược, trùng n viên thì cược × (1 + n), không trùng thì mất cược.
 * profit là phần lãi ròng của cả ván (không âm); returned là phần tiền cược được hoàn lại.
 */
export function settle(bets, dice) {
  const counts = matchCounts(dice);
  let payout = 0;
  for (let i = 0; i < BAUCUA.symbols; i++) {
    if (bets[i] > 0 && counts[i] > 0) payout += bets[i] * (1 + counts[i]);
  }
  const stake = sumBets(bets);
  const profit = Math.max(0, payout - stake);
  return { stake, payout, net: payout - stake, profit, returned: payout - profit };
}

/** Mảng cược trống: 6 số 0 theo thứ tự mặt. */
export const emptyBets = () => new Array(BAUCUA.symbols).fill(0);
