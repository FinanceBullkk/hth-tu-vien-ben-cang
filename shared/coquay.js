// Cò quay (roulette châu Âu): luật dùng chung cho server (quay, chấm) và client (vẽ bánh xe, mặt bạt).
// 37 ô 0–36. Số đơn ăn 35, tá ăn 2, đỏ/đen/chẵn/lẻ/nhỏ/lớn ăn 1. Ra 0 thì mọi cửa ngoài đều thua.
// Mọi cửa hoàn vốn 36/37: nhà cái lợi 2,7%.
import { CASINO_CHIPS, settleBets } from './casino-bets.js';

/** Thứ tự ô trên bánh xe châu Âu, theo chiều kim đồng hồ khi nhìn từ trên xuống. */
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const POCKETS = 37;
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const pocketColor = (n) => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

// Cửa 0..36 là số đơn; các cửa ngoài nối sau. Mỗi cửa ngoài có test(n) cho số 1..36 (số 0 luôn thua).
const OUTSIDE = [
  { key: 'red', name: 'Đỏ', pays: 1, max: 30, test: (n) => RED.has(n) },
  { key: 'black', name: 'Đen', pays: 1, max: 30, test: (n) => !RED.has(n) },
  { key: 'even', name: 'Chẵn', pays: 1, max: 30, test: (n) => n % 2 === 0 },
  { key: 'odd', name: 'Lẻ', pays: 1, max: 30, test: (n) => n % 2 === 1 },
  { key: 'low', name: '1–18', pays: 1, max: 30, test: (n) => n <= 18 },
  { key: 'high', name: '19–36', pays: 1, max: 30, test: (n) => n >= 19 },
  { key: 'd1', name: '1–12', pays: 2, max: 20, test: (n) => n <= 12 },
  { key: 'd2', name: '13–24', pays: 2, max: 20, test: (n) => n >= 13 && n <= 24 },
  { key: 'd3', name: '25–36', pays: 2, max: 20, test: (n) => n >= 25 },
];

export const COQUAY_TARGETS = [
  // Số đơn: tối đa 5 TEU, trúng là +175.
  ...Array.from({ length: POCKETS }, (_, n) => ({ key: `n${n}`, name: String(n), pays: 35, max: 5 })),
  ...OUTSIDE.map(({ test, ...rest }) => rest),
];
/** Id cửa ngoài theo key, ví dụ OUTSIDE_ID.red. */
export const OUTSIDE_ID = Object.fromEntries(OUTSIDE.map((o, i) => [o.key, POCKETS + i]));

export const COQUAY = {
  chips: CASINO_CHIPS,
  maxPerRound: 50,
  betMs: 12_000, // Mặt bạt nhiều cửa hơn tài xỉu nên cho thêm chút thời gian.
  throwMs: 5_000, // Người cược lớn nhất búng bi; hết giờ thì nhà cái búng.
  rollMs: 6_000, // Bi chạy quanh vành, rơi xuống, nảy vài ô rồi nằm yên.
  resultMs: 4_000,
  betIntervalMs: 120,
  history: 14,
};

export const isPocket = (v) => Number.isInteger(v) && v >= 0 && v < POCKETS;

/** Ô bi dừng có thắng cửa này không. */
export function coquayWins(target, n) {
  if (target < POCKETS) return target === n;
  if (n === 0) return false;
  return OUTSIDE[target - POCKETS].test(n);
}

/** random(n) trả số nguyên 0..n-1. */
export const spinCoquay = (random) => random(POCKETS);

export const settleCoquay = (bets, n) => settleBets(bets, COQUAY_TARGETS, (t) => coquayWins(t, n));

export const ALL_POCKETS = Array.from({ length: POCKETS }, (_, n) => n);
