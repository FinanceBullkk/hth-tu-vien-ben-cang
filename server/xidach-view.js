// Bàn xì dách nhìn từ ngoài: những gì được phép phát cho cả phòng ở từng pha.
// Lá thứ hai của nhà cái úp tới khi nhà cái lật; bài khách chỉ lộ số lá và đã dằn hay chưa, tới lúc chấm mới lật hết.
// Không bao giờ có playerId ở đây: khách được nhận ra bằng sid và tên hiển thị như mọi tin phát chung khác.
import { handKind, handTotal } from '../shared/xidach.js';

export const HIDDEN_CARD = -1;

/** @param {import('./xidach.js').XiDach} game */
export function publicTable(game) {
  const showAll = game.phase === 'result';
  const { dealer, revealed } = game;
  return {
    phase: game.phase,
    round: game.round,
    endsAt: game.phase === 'dealer' ? 0 : game.endsAt,
    dealer: revealed ? [...dealer] : dealer.map((c, i) => (i === 0 ? c : HIDDEN_CARD)),
    dealerTotal: revealed ? handTotal(dealer) : null,
    dealerKind: revealed ? handKind(dealer, { dealer: true }) : null,
    seats: [...game.seats.values()].sort((a, b) => a.seat - b.seat).map((s) => ({
      seat: s.seat,
      sid: s.sid,
      name: s.name,
      bet: s.bet,
      count: s.cards.length,
      stood: s.stood,
      cards: showAll ? [...s.cards] : null,
      kind: showAll ? handKind(s.cards) : null,
      total: showAll ? handTotal(s.cards) : null,
      net: s.result?.net ?? null,
    })),
  };
}

/** Tay bài riêng của một khách (chỉ gửi cho chính họ). */
export function privateSeat(s) {
  return s ? { seat: s.seat, bet: s.bet, cards: [...s.cards], stood: s.stood } : null;
}
