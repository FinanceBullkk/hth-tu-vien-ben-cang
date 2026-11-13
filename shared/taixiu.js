// Tài xỉu: luật dùng chung cho server (gieo, chấm) và client (vẽ bàn, gợi ý).
// Ba viên xúc xắc 1–6. Xỉu là tổng 4–10, Tài là tổng 11–17, ăn 1 ăn 1; ra bộ ba (bão) thì cả Tài lẫn Xỉu đều thua.
// Cửa Bão (bộ ba bất kỳ) ăn 1 ăn 30. Hoàn vốn: Tài/Xỉu 210/216 (nhà cái lợi 2,8%), Bão 186/216 (lợi 13,9%).
import { CASINO_CHIPS, settleBets } from './casino-bets.js';

export const TAIXIU_TARGETS = [
  { key: 'xiu', name: 'Xỉu', hint: '4–10', pays: 1, max: 30 },
  { key: 'tai', name: 'Tài', hint: '11–17', pays: 1, max: 30 },
  // Giữ thấp: 3 TEU trúng bão là +90, ngang mức lãi lớn nhất của bầu cua.
  { key: 'bao', name: 'Bão', hint: '1 ăn 30', pays: 30, max: 3 },
];
export const [XIU, TAI, BAO] = [0, 1, 2];

export const TAIXIU = {
  chips: CASINO_CHIPS,
  dice: 3,
  maxPerRound: 50, // Tổng TEU tối đa của một người trong một ván.
  betMs: 10_000, // Nhận cược, tính từ lúc có người cược đầu tiên.
  throwMs: 5_000, // Người cược lớn nhất có chừng này để tự tung; hết giờ thì tự tung.
  rollMs: 2_600, // Xúc xắc bay, nảy và dừng trên bàn.
  resultMs: 4_000, // Giữ kết quả trên bàn; cược lúc này là mở ván mới.
  betIntervalMs: 120, // Giãn cách tối thiểu giữa hai lần đặt của một người.
  history: 18, // Số ván gần nhất hiện trên bảng cầu.
};

export const diceSum = (dice) => dice[0] + dice[1] + dice[2];
export const isTriple = (dice) => dice[0] === dice[1] && dice[1] === dice[2];
export const isDie = (v) => Number.isInteger(v) && v >= 1 && v <= 6;

/** Ba viên đã gieo có thuộc cửa này không. */
export function taixiuWins(target, dice) {
  if (target === BAO) return isTriple(dice);
  if (isTriple(dice)) return false;
  const sum = diceSum(dice);
  return target === TAI ? sum >= 11 : sum <= 10;
}

/** Cửa của một ván để vẽ bảng cầu: 'bao', 'tai' hoặc 'xiu'. */
export const taixiuSide = (dice) => (isTriple(dice) ? 'bao' : diceSum(dice) >= 11 ? 'tai' : 'xiu');

/** random(n) trả số nguyên 0..n-1. */
export const rollTaixiu = (random) => Array.from({ length: TAIXIU.dice }, () => random(6) + 1);

export const settleTaixiu = (bets, dice) => settleBets(bets, TAIXIU_TARGETS, (t) => taixiuWins(t, dice));

/** Mọi bộ ba viên đồng khả năng (216 bộ), cho test và tính hoàn vốn. */
export const ALL_DICE = Array.from({ length: 216 }, (_, i) => [1 + (i % 6), 1 + (Math.floor(i / 6) % 6), 1 + Math.floor(i / 36)]);
