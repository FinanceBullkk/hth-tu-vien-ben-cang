// Xì dách (luật miền Nam), chơi với nhà cái NPC: luật dùng chung cho server (chia, chấm, trả thưởng) và client (hiển thị).
//
// Bài: id 0..51, hạng = id % 13 (0 = Át, 1..9 = 2..10, 10 J, 11 Q, 12 K), chất = floor(id / 13).
// Át linh hoạt theo số lá: 2 lá tính 11, 10 hoặc 1; 3 lá tính 10 hoặc 1; từ 4 lá chỉ tính 1. Lấy tổng cao nhất không quá 21.
// Bài đặc biệt (cao xuống thấp): xì bàn (đôi Át) > xì dách (Át + 10/J/Q/K) > ngũ linh (5 lá không quá 21) > bài thường.
// Người chơi dưới 16 điểm là non (thua). Quắc là quá 21: người chơi quắc thua, trừ khi nhà cái cũng quắc thì hoà.
// Bằng điểm thì hoà; cùng loại bài đặc biệt cũng hoà.
// Bài đặc biệt ăn gấp đôi cả hai chiều: người chơi thắng bằng nó được x2, nhà cái thắng bằng nó thu x2.
// Vì có thể mất gấp đôi, lúc đặt cược server giữ 2 lần tiền cược, chấm xong thì hoàn phần dư.
//
// Nhà cái rút khi dưới 17, và rút tiếp khi đang 17 hoặc 18 "mềm" (có Át đang tính 10/11); luôn đạt ít nhất 15.
// Mô phỏng 1 triệu ván: chiến thuật tốt nhất dò được vẫn lỗ ~0,3% mỗi ván, người chơi thường lỗ 1–4%.
// Dừng ở 17 cứng như blackjack thì người chơi giỏi lời ~0,3–0,9%, tức bàn in TEU; test mô phỏng giữ điều này.

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♣', '♦', '♥'];
export const RED_SUITS = new Set([2, 3]);

export const XIDACH = {
  seats: 5, // Số ghế người chơi mỗi bàn.
  chips: [1, 5, 10],
  maxBet: 20, // Tổng cược tối đa một tay.
  holdMult: 2, // Giữ gấp đôi tiền cược phòng nhà cái thắng bằng bài đặc biệt.
  minStand: 16, // Dằn dưới mức này là non.
  dealerStand: 17, // Nhà cái rút khi dưới mức này...
  dealerSoftHitMax: 18, // ...và rút tiếp khi điểm mềm còn từ mức này trở xuống.
  maxCards: 5,
  betMs: 8_000, // Nhận cược, tính từ người cược đầu tiên.
  turnMs: 15_000, // Lượt của mỗi khách (lần lượt theo ghế); đủ để nặn lá úp rồi rút/dằn. Hết giờ coi như dằn.
  dealerStepMs: 700, // Nhà cái lật/rút từng lá cách nhau chừng này.
  checkStepMs: 1_000, // Nhà cái xét từng nhà cách nhau chừng này.
  resultMs: 3_000,
  actionIntervalMs: 150,
};

export const KIND = { xiban: 'xiban', xidach: 'xidach', ngulinh: 'ngulinh', normal: 'normal', non: 'non', quac: 'quac' };
export const KIND_LABEL = { xiban: 'Xì bàn', xidach: 'Xì dách', ngulinh: 'Ngũ linh', normal: '', non: 'Non', quac: 'Quắc' };
// Hạng để so: bài đặc biệt luôn hơn bài thường; bài thường so điểm.
const KIND_RANK = { xiban: 4, xidach: 3, ngulinh: 2, normal: 1 };

export const rankOf = (card) => card % 13;
export const suitOf = (card) => Math.floor(card / 13);
export const isCard = (v) => Number.isInteger(v) && v >= 0 && v < 52;
const isAce = (card) => rankOf(card) === 0;
const isTen = (card) => rankOf(card) >= 9; // 10, J, Q, K

export function cardLabel(card) {
  return `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}`;
}

/** Giá trị Át được phép theo số lá trên tay. */
function aceOptions(count) {
  if (count <= 2) return [11, 10, 1];
  if (count === 3) return [10, 1];
  return [1];
}

/** Tổng điểm tốt nhất: cao nhất mà không quá 21; nếu cách nào cũng quá thì lấy tổng nhỏ nhất. */
export function handTotal(cards) {
  let base = 0;
  let aces = 0;
  for (const c of cards) {
    if (isAce(c)) aces++;
    else base += isTen(c) ? 10 : rankOf(c) + 1;
  }
  let totals = [base];
  for (let i = 0; i < aces; i++) totals = totals.flatMap((t) => aceOptions(cards.length).map((v) => t + v));
  const ok = totals.filter((t) => t <= 21);
  return ok.length ? Math.max(...ok) : Math.min(...totals);
}

/** Phân loại một tay bài. dealer = true thì không có "non" (nhà cái luôn rút đủ). */
export function handKind(cards, { dealer = false } = {}) {
  if (cards.length === 2 && isAce(cards[0]) && isAce(cards[1])) return KIND.xiban;
  if (cards.length === 2 && ((isAce(cards[0]) && isTen(cards[1])) || (isAce(cards[1]) && isTen(cards[0])))) return KIND.xidach;
  const total = handTotal(cards);
  if (total > 21) return KIND.quac;
  if (cards.length >= XIDACH.maxCards) return KIND.ngulinh;
  if (!dealer && total < XIDACH.minStand) return KIND.non;
  return KIND.normal;
}

export const isSpecial = (kind) => kind === KIND.xiban || kind === KIND.xidach || kind === KIND.ngulinh;
/** Xì bàn, xì dách lộ ngay khi chia: không rút thêm. */
export const isNatural = (kind) => kind === KIND.xiban || kind === KIND.xidach;

/**
 * So tay người chơi với nhà cái. Trả về { outcome: 'win'|'lose'|'push', mult }: mult là số lần tiền cược được ăn
 * (khi thắng) hoặc bị thu (khi thua). Bên thắng bằng bài đặc biệt thì mult = 2.
 */
export function compareHands(player, dealer) {
  const pk = handKind(player);
  const dk = handKind(dealer, { dealer: true });
  const lose = { outcome: 'lose', mult: isSpecial(dk) ? 2 : 1 };
  const win = { outcome: 'win', mult: isSpecial(pk) ? 2 : 1 };
  const push = { outcome: 'push', mult: 0 };
  if (pk === KIND.non) return lose;
  if (pk === KIND.quac) return dk === KIND.quac ? push : lose;
  if (dk === KIND.quac) return win;
  const pr = KIND_RANK[pk];
  const dr = KIND_RANK[dk];
  if (pr !== dr) return pr > dr ? win : lose;
  if (pk !== KIND.normal) return push; // Cùng loại bài đặc biệt thì hoà.
  const pt = handTotal(player);
  const dt = handTotal(dealer);
  if (pt === dt) return push; // Bằng điểm thì hoà.
  return pt > dt ? win : lose;
}

/**
 * Chấm tiền một tay đã giữ bet × holdMult. returned: phần giữ được hoàn lại; profit: lãi ròng (không âm); net: lãi/lỗ.
 */
export function settleHand(bet, player, dealer) {
  const held = bet * XIDACH.holdMult;
  const { outcome, mult } = compareHands(player, dealer);
  if (outcome === 'win') return { outcome, mult, returned: held, profit: bet * mult, net: bet * mult };
  if (outcome === 'push') return { outcome, mult, returned: held, profit: 0, net: 0 };
  return { outcome, mult, returned: held - bet * mult, profit: 0, net: -bet * mult };
}

/** Điểm "mềm": có Át đang được tính 10 hoặc 11. */
export function isSoft(cards) {
  const hard = cards.reduce((sum, c) => sum + (isAce(c) ? 1 : isTen(c) ? 10 : rankOf(c) + 1), 0);
  return cards.some(isAce) && handTotal(cards) !== hard;
}

/** Nhà cái còn phải rút không: dưới 17, hoặc 17–18 mềm. Đủ 5 lá hay đã có bài đặc biệt/quắc thì thôi. */
export function dealerShouldHit(cards) {
  if (cards.length >= XIDACH.maxCards) return false;
  if (handKind(cards, { dealer: true }) !== KIND.normal) return false;
  const total = handTotal(cards);
  return total < XIDACH.dealerStand || (total <= XIDACH.dealerSoftHitMax && isSoft(cards));
}

/** Bộ bài mới đã xáo (Fisher–Yates). randomInt(n) trả về số nguyên 0..n-1. */
export function shuffledDeck(randomInt) {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
