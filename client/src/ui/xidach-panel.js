// Bảng chơi xì dách dock đáy màn hình, cùng khung với bầu cua (vòng đếm ngược ở đầu bảng, khay chip và ví ở đáy).
// Đầu bảng: pha, lượt ai, và bài nhà cái thu nhỏ. Mặt dạ: các ghế khách khác, rồi tay bài của mình to ở dưới.
// Đáy: lúc nhận cược là chip + Rút cược + Cược lại; lúc chơi là hai nút lớn Rút / Dằn, chỉ sáng khi tới lượt mình.
// Hàng bài và ô ghế được giữ lại giữa các lần vẽ: lá mới bay vào, ô ghế nháy khi người đó rút/dằn,
// vòng giờ chạy quanh ô người đang tới lượt, dấu mộc đóng lên tay bài khi nhà cái xét tới. Bài của mình tới úp để nặn.
import { KIND_LABEL, XIDACH, handKind, handTotal } from '../../../shared/xidach.js';
import { $, h } from './dom.js';
import { TimerRing, chipTier, countTo, flyChip } from './table-hud-parts.js';
import { handLabel, openAll, stampOf, syncHand } from './xidach-cards.js';

const PHASE_TEXT = {
  idle: 'Mời đặt cược',
  betting: 'Đang nhận cược',
  playing: 'Lần lượt rút bài',
  dealer: 'Nhà cái lật bài',
  checking: 'Nhà cái xét bài',
  result: 'Chấm xong',
};
const money = (net) => (net > 0 ? `+${net}` : net < 0 ? `−${-net}` : 'hoà');

/** Trạng thái chữ của một ghế khách khác theo pha. */
function seatStatus(seat, state) {
  if (seat.cards) return `${handLabel(seat.cards)}${seat.net != null ? ` · ${money(seat.net)}` : ''}`;
  if (state.phase === 'betting') return `cược ${seat.bet}`;
  if (state.phase === 'playing') return state.turn === seat.sid ? `đang rút · ${seat.count} lá` : seat.stood ? `đã dằn · ${seat.count} lá` : 'chờ lượt';
  return `${seat.count} lá · chờ xét`;
}

/** Dòng phụ dưới tên pha: ai đang tới lượt, bàn còn mấy ghế. */
function subText(state, mySid) {
  const seats = state?.seats ?? [];
  if (!state || state.phase === 'idle') return `Cược 1–${XIDACH.maxBet} TEU · giữ gấp đôi phòng cái ăn x2`;
  if (state.phase === 'betting') return `${seats.length}/${XIDACH.seats} ghế · dưới ${XIDACH.minStand} là non, phải rút`;
  if (state.phase === 'playing') return state.turn === mySid ? 'Tới lượt bạn: rút hay dằn?' : `Lượt ${seats.find((s) => s.sid === state.turn)?.name ?? '…'}`;
  if (state.phase === 'result') return 'Cược để mở ván mới';
  return `${seats.length} nhà · bài đặc biệt ăn gấp đôi`;
}

/** Gắn/gỡ dấu mộc trên một ô. Chỉ tạo lại khi đổi chữ để hoạt ảnh đóng dấu chạy đúng một lần. */
function setStamp(el, stamp) {
  const key = stamp ? `${stamp.text}|${stamp.tone}` : '';
  if (el.dataset.stamp === key) return;
  el.dataset.stamp = key;
  el.querySelector(':scope > .xd-stamp')?.remove();
  if (stamp) el.append(h('span', { class: `xd-stamp ${stamp.tone}` }, stamp.text));
}

export class XiDachPanel {
  /** onPeek(card): mình vừa nặn xong một lá. */
  constructor({ onChip, onClear, onRepeat, onHit, onStand, onExit, onPeek }) {
    this.ring = new TimerRing();
    this.phase = h('b', { class: 'tbl-phase' }, PHASE_TEXT.idle);
    this.sub = h('small', { class: 'tbl-sub' });
    this.dealerCards = h('div', { class: 'xd-hand' });
    this.dealerTotal = h('em', { class: 'xd-total' });
    this.dealer = h('div', { class: 'xd-dealer', 'aria-label': 'Bài nhà cái' }, h('small', {}, 'Nhà cái'), this.dealerCards, this.dealerTotal);
    this.seats = h('div', { class: 'xd-seats' });
    this.seatEls = new Map(); // sid -> { el, name, hand, info }
    this.myCards = h('div', { class: 'xd-hand big' });
    this.myTotal = h('em', { class: 'xd-total' });
    this.myBet = h('small', { class: 'xd-bet' });
    this.turn = h('span', { class: 'xd-turn', hidden: true }, 'Lượt của bạn');
    this.meRow = h('div', { class: 'xd-row me' }, h('span', { class: 'xd-who' }, 'Bạn', this.myBet, this.turn), this.myCards, this.myTotal);
    this.banner = h('div', { class: 'xd-banner', hidden: true });
    this.msg = h('p', { class: 'baucua-msg', role: 'status' });
    this.opened = new Set(); // Lá của mình đã nặn xong (theo id, trong ván hiện tại).
    this.squeeze = {
      isOpen: (card) => this.opened.has(card),
      onOpen: (card) => {
        this.opened.add(card);
        onPeek?.(card);
      },
    };

    this.chips = XIDACH.chips.map((amount) => h('button', {
      type: 'button', class: `baucua-chip ${chipTier(amount)}`, 'aria-label': `Cược thêm ${amount} TEU`, onClick: () => onChip(amount),
    }, h('span', {}, `+${amount}`)));
    this.clearBtn = h('button', { type: 'button', class: 'tbl-btn', onClick: onClear }, 'Rút cược');
    this.repeatBtn = h('button', { type: 'button', class: 'tbl-btn', onClick: onRepeat, title: 'Cược đúng như ván trước' }, 'Cược lại');
    this.betBox = h('div', { class: 'xd-betbox' },
      h('div', { class: 'baucua-chips', role: 'group', 'aria-label': 'Chọn mệnh giá' }, this.chips),
      h('div', { class: 'tbl-actions' }, this.clearBtn, this.repeatBtn));
    this.hitBtn = h('button', { type: 'button', class: 'xd-action hit', onClick: onHit }, h('span', {}, '＋'), 'Rút bài', h('kbd', {}, 'R'));
    this.standBtn = h('button', { type: 'button', class: 'xd-action stand', onClick: onStand }, h('span', {}, '✋'), 'Dằn', h('kbd', {}, 'F'));
    this.actions = h('div', { class: 'xd-actions' }, this.hitBtn, this.standBtn);
    this.stake = h('b');
    this.teu = h('b');

    this.root = h('section', { class: 'baucua-hud xidach-hud tbl-panel', hidden: true, 'aria-label': 'Xì dách' },
      h('header', { class: 'tbl-head' },
        this.ring.el,
        h('div', { class: 'tbl-status' }, h('span', { class: 'tbl-title' }, 'Xì dách'), this.phase, this.sub),
        this.dealer,
        h('button', { type: 'button', class: 'tbl-exit', onClick: onExit, 'aria-label': 'Rời bàn', title: 'Rời bàn' }, '✕')),
      h('div', { class: 'xd-felt' },
        h('div', { class: 'xd-print', 'aria-hidden': 'true' }, 'Xì bàn · xì dách · ngũ linh ăn gấp đôi'),
        this.seats,
        this.meRow,
        this.banner),
      h('footer', { class: 'tbl-rail' }, this.betBox, this.actions,
        h('div', { class: 'tbl-purse' },
          h('span', {}, h('small', {}, 'Đang cược'), this.stake),
          h('span', {}, h('small', {}, 'Ví TEU'), this.teu))),
      this.msg);
    $('rhythmLayer').append(this.root);
  }

  show() {
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
  }

  setMessage(text, tone = '') {
    this.msg.textContent = text;
    this.msg.dataset.tone = tone;
  }

  /** Kết quả của mình: chữ lớn giữa mặt bàn. tone: win | lose | push. Thắng thì chip bay về ví. */
  showBanner(text, tone) {
    this.banner.textContent = text;
    this.banner.dataset.tone = tone;
    this.banner.hidden = false;
    if (tone === 'win') flyChip(this.myCards, this.teu, 10);
  }

  hideBanner() {
    this.banner.hidden = true;
  }

  /** Chip vừa cược bay từ khay vào chỗ "Đang cược". */
  flyBet(amount) {
    const from = this.chips.find((_, i) => XIDACH.chips[i] === amount) ?? this.chips[0];
    flyChip(from, this.stake, amount);
  }

  /** Một khách khác vừa rút/dằn: ô của họ nháy lên. */
  flashSeat(sid, action) {
    const seat = this.seatEls.get(sid);
    if (!seat) return;
    seat.el.dataset.act = action === 'hit' ? 'hit' : 'stand';
    seat.el.classList.remove('flash');
    void seat.el.offsetWidth; // Chạy lại hoạt ảnh khi rút liên tiếp.
    seat.el.classList.add('flash');
  }

  /** Còn lá nào của mình chưa nặn không. */
  get peeking() {
    return this.myCards.querySelector('.xd-card.squeeze') !== null;
  }

  /** Đồng hồ: vòng đếm ngược ở đầu bảng; vòng giờ nhỏ quanh ô người đang tới lượt. */
  tick(nowMs, state, mySid) {
    const timed = state?.phase === 'betting' || state?.phase === 'playing';
    const span = state?.phase === 'playing' ? XIDACH.turnMs : XIDACH.betMs;
    const leftMs = timed ? Math.max(0, state.endsAt - nowMs) : null;
    this.ring.set(leftMs, span);
    const turnEl = state?.phase === 'playing' ? (state.turn === mySid ? this.meRow : this.seatEls.get(state.turn)?.el) : null;
    if (turnEl) turnEl.style.setProperty('--p', (leftMs / span).toFixed(3));
  }

  /** Ô ghế của khách khác: giữ lại theo sid để lá cũ không vẽ lại và hoạt ảnh nháy không bị cắt. */
  #renderSeats(others, state) {
    const alive = new Set();
    for (const s of others) {
      alive.add(s.sid);
      let seat = this.seatEls.get(s.sid);
      if (!seat) {
        seat = { name: h('b'), hand: h('span', { class: 'xd-hand' }), info: h('small') };
        seat.el = h('div', { class: 'xd-seat' }, seat.name, seat.hand, seat.info);
        this.seatEls.set(s.sid, seat);
      }
      seat.name.textContent = s.name;
      syncHand(seat.hand, s.cards ?? Array(s.count).fill(-1), true);
      seat.info.textContent = seatStatus(s, state);
      seat.el.classList.toggle('turn', state.phase === 'playing' && state.turn === s.sid);
      seat.el.classList.toggle('win', s.net > 0);
      seat.el.classList.toggle('lose', s.net < 0);
      setStamp(seat.el, stampOf(s));
      this.seats.append(seat.el); // Giữ đúng thứ tự ghế; append nút có sẵn chỉ dời chỗ.
    }
    for (const [sid, seat] of this.seatEls) {
      if (alive.has(sid)) continue;
      seat.el.remove();
      this.seatEls.delete(sid);
    }
    this.seats.hidden = others.length === 0;
  }

  /** state: bàn chung; mine: { bet, cards, stood } của mình hoặc null; mySid tách ghế mình khỏi ghế khác; last: cược ván trước. */
  render({ state, mine, mySid, teu, last = 0 }) {
    const phase = state?.phase ?? 'idle';
    this.root.dataset.phase = phase;
    this.phase.textContent = PHASE_TEXT[phase];
    this.sub.textContent = subText(state, mySid);

    syncHand(this.dealerCards, state?.dealer ?? [], true);
    this.dealerTotal.textContent = state?.dealerTotal != null ? (KIND_LABEL[state.dealerKind] || String(state.dealerTotal)) : '';
    this.dealer.hidden = !state?.dealer?.length;
    this.#renderSeats((state?.seats ?? []).filter((s) => s.sid !== mySid), state ?? { phase });

    const cards = mine?.cards ?? [];
    if (!cards.length) this.opened.clear(); // Ván mới.
    // Chia bài: lá đầu ngửa, lá thứ hai úp để nặn; lá rút thêm tới tay là ngửa luôn.
    cards.forEach((card, i) => { if (i !== 1) this.opened.add(card); });
    syncHand(this.myCards, cards, false, this.squeeze);
    if (phase === 'checking' || phase === 'result') openAll(this.myCards); // Tới lúc xét thì lật hết.
    const myTurn = phase === 'playing' && state?.turn === mySid && mine && !mine.stood;
    this.myTotal.textContent = this.peeking ? 'Nặn bài' : handLabel(cards);
    this.myTotal.dataset.kind = cards.length && !this.peeking ? handKind(cards) : '';
    this.myBet.textContent = mine?.bet ? `cược ${mine.bet}` : cards.length ? '' : 'chưa cược';
    this.meRow.classList.toggle('turn', myTurn);
    this.meRow.classList.toggle('empty', !cards.length);
    this.myCards.dataset.hint = mine?.bet ? 'Chờ nhà cái chia bài…' : 'Bấm chip bên dưới để vào ghế';
    setStamp(this.meRow, stampOf(state?.seats?.find((s) => s.sid === mySid)));

    const betPhase = phase === 'idle' || phase === 'betting' || phase === 'result';
    const myBet = phase === 'betting' ? (mine?.bet ?? 0) : 0;
    const canBet = betPhase && myBet < XIDACH.maxBet;
    this.turn.hidden = !myTurn;
    this.root.classList.toggle('my-turn', myTurn);
    this.betBox.hidden = !betPhase;
    this.chips.forEach((el, i) => { el.disabled = !canBet || myBet + XIDACH.chips[i] > XIDACH.maxBet; });
    this.clearBtn.disabled = !(phase === 'betting' && mine?.bet);
    this.repeatBtn.disabled = !betPhase || !last || myBet > 0;
    this.repeatBtn.textContent = last ? `Cược lại ${last}` : 'Cược lại';
    this.actions.hidden = betPhase;
    this.hitBtn.disabled = !myTurn || cards.length >= XIDACH.maxCards;
    this.standBtn.disabled = !myTurn || handTotal(cards) < XIDACH.minStand;
    this.stake.textContent = String(mine?.bet && phase !== 'result' ? mine.bet : 0);
    countTo(this.teu, teu);
  }
}
