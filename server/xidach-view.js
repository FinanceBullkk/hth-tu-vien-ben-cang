// Bàn xì dách nhìn từ ngoài: những gì được phép phát cho cả phòng ở từng pha.
// Lá thứ hai của nhà cái úp tới khi nhà cái lật; bài khách chỉ lộ số lá và đã dằn hay chưa, tới lúc nhà cái xét
// tới nhà nào thì nhà đó mới lật. Không bao giờ có playerId ở đây: khách được nhận ra bằng sid như mọi tin phát chung khác.
import { handKind, handTotal } from '../shared/xidach.js';

export const HIDDEN_CARD = -1;

/** @param {import('./xidach.js').XiDach} game */
export function publicTable(game) {
  const { dealer, revealed } = game;
  const sidOf = (pid) => (pid ? game.seats.get(pid)?.sid ?? null : null);
  return {
    phase: game.phase,
    round: game.round,
    endsAt: game.endsAt,
    turn: sidOf(game.turn), // Khách đang tới lượt rút/dằn; endsAt là hạn lượt của người đó.
    checking: sidOf(game.checking), // Khách nhà cái vừa xét.
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
      cards: s.revealed ? [...s.cards] : null,
      kind: s.revealed ? handKind(s.cards) : null,
      total: s.revealed ? handTotal(s.cards) : null,
      net: s.result?.net ?? null,
      outcome: s.result?.outcome ?? null,
    })),
  };
}

/** Tay bài riêng của một khách (chỉ gửi cho chính họ). */
export function privateSeat(s) {
  return s ? { seat: s.seat, bet: s.bet, cards: [...s.cards], stood: s.stood } : null;
}
