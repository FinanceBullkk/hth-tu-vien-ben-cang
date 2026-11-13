// Bảng chơi xì dách dock đáy màn hình: hàng bài nhà cái, các ghế khách khác, tay bài của mình, nút cược / rút / dằn.
// Dùng chung khung đỏ viền vàng với bầu cua (baucua.css), mặt dạ xanh riêng (xidach.css). Chỉ vẽ và nhận bấm.
// Hàng bài và ô ghế được giữ lại giữa các lần vẽ: lá mới mới bay vào, ô ghế nháy lên khi người đó rút/dằn,
// vòng giờ chạy quanh ô người đang tới lượt, dấu mộc đóng lên tay bài khi nhà cái xét tới. Bài của mình tới úp để nặn.
import { KIND_LABEL, XIDACH, handKind, handTotal } from '../../../shared/xidach.js';
import { $, h } from './dom.js';
import { handLabel, openAll, stampOf, syncHand } from './xidach-cards.js';

const PHASE_TEXT = {
  idle: 'Bàn nghỉ · cược để mở ván',
  betting: 'Nhận cược',
  playing: 'Lần lượt rút bài',
  dealer: 'Nhà cái lật bài',
  checking: 'Nhà cái xét bài',
  result: 'Chấm xong',
};
const chipTier = (amount) => (amount >= 10 ? 'gold' : amount >= 5 ? 'red' : 'ivory');
const money = (net) => (net > 0 ? `+${net}` : net < 0 ? `−${-net}` : 'hoà');

/** Trạng thái chữ của một ghế khách khác theo pha. */
function seatStatus(seat, state) {
  if (seat.cards) return `${handLabel(seat.cards)}${seat.net != null ? ` · ${money(seat.net)}` : ''}`;
  if (state.phase === 'betting') return `cược ${seat.bet}`;
  if (state.phase === 'playing') return state.turn === seat.sid ? `đang rút · ${seat.count} lá` : seat.stood ? `đã dằn · ${seat.count} lá` : 'chờ lượt';
  return `${seat.count} lá · chờ xét`;
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
  constructor({ onChip, onClear, onHit, onStand, onExit, onPeek }) {
    this.phase = h('b', { class: 'baucua-phase' }, PHASE_TEXT.idle);
    this.clock = h('span', { class: 'baucua-clock' });
    this.bar = h('i');
    this.dealerCards = h('div', { class: 'xd-hand' });
    this.dealerTotal = h('em', { class: 'xd-total' });
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
    this.clearBtn = h('button', { type: 'button', class: 'baucua-clear', onClick: onClear }, 'Rút cược');
    this.betBox = h('div', { class: 'xd-betbox' }, h('div', { class: 'baucua-chips' }, this.chips), this.clearBtn);
    this.hitBtn = h('button', { type: 'button', class: 'xd-action hit', onClick: onHit }, 'Rút bài', h('kbd', {}, 'R'));
    this.standBtn = h('button', { type: 'button', class: 'xd-action stand', onClick: onStand }, 'Dằn', h('kbd', {}, 'F'));
    this.actions = h('div', { class: 'xd-actions' }, this.hitBtn, this.standBtn);
    this.teu = h('b', {}, '0');

    this.root = h('section', { class: 'baucua-hud xidach-hud', hidden: true, 'aria-label': 'Xì dách' },
      h('header', { class: 'baucua-head' },
        h('h2', { class: 'baucua-title' }, 'Xì dách', h('span', { class: 'seal' }, '21')),
        h('div', { class: 'baucua-state' }, this.phase, this.clock),
        h('button', { type: 'button', class: 'baucua-exit', onClick: onExit }, 'Rời bàn')),
      h('div', { class: 'baucua-timer', 'aria-hidden': 'true' }, this.bar),
      h('div', { class: 'xd-felt' },
        h('div', { class: 'xd-row' }, h('span', { class: 'xd-who' }, 'Nhà cái'), this.dealerCards, this.dealerTotal),
        h('div', { class: 'xd-print', 'aria-hidden': 'true' }, 'Xì bàn · xì dách · ngũ linh ăn gấp đôi'),
        this.seats,
        this.meRow,
        this.banner),
      h('footer', { class: 'baucua-foot' }, this.betBox, this.actions, h('span', { class: 'baucua-wallet' }, h('small', {}, 'TEU'), this.teu)),
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

  /** Kết quả của mình: chữ lớn giữa mặt bàn. tone: win | lose | push. */
  showBanner(text, tone) {
    this.banner.textContent = text;
    this.banner.dataset.tone = tone;
    this.banner.hidden = false;
  }

  hideBanner() {
    this.banner.hidden = true;
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

  /** Đồng hồ: số giây và thanh thời gian; vòng giờ quanh ô người đang tới lượt. */
  tick(nowMs, state, mySid) {
    const timed = state?.phase === 'betting' || state?.phase === 'playing';
    const span = state?.phase === 'playing' ? XIDACH.turnMs : XIDACH.betMs;
    const leftMs = timed ? Math.max(0, state.endsAt - nowMs) : 0;
    const text = timed ? `${Math.ceil(leftMs / 1000)}s` : '';
    if (this.clock.textContent !== text) this.clock.textContent = text;
    this.root.classList.toggle('urgent', timed && leftMs <= 3000);
    this.bar.style.transform = `scaleX(${timed ? leftMs / span : 0})`;
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

  /** state: bàn chung; mine: { bet, cards, stood } của mình hoặc null; mySid để tách ghế của mình khỏi ghế khác. */
  render({ state, mine, mySid, teu }) {
    const phase = state?.phase ?? 'idle';
    this.root.dataset.phase = phase;
    this.phase.textContent = PHASE_TEXT[phase];

    syncHand(this.dealerCards, state?.dealer ?? []);
    this.dealerTotal.textContent = state?.dealerTotal != null ? (KIND_LABEL[state.dealerKind] || String(state.dealerTotal)) : '';
    this.#renderSeats((state?.seats ?? []).filter((s) => s.sid !== mySid), state ?? { phase });

    const cards = mine?.cards ?? [];
    if (!cards.length) this.opened.clear(); // Ván mới.
    syncHand(this.myCards, cards, false, this.squeeze);
    if (phase === 'checking' || phase === 'result') openAll(this.myCards); // Tới lúc xét thì lật hết.
    const myTurn = phase === 'playing' && state?.turn === mySid && mine && !mine.stood;
    this.myTotal.textContent = this.peeking ? 'Nặn bài' : handLabel(cards);
    this.myTotal.dataset.kind = cards.length && !this.peeking ? handKind(cards) : '';
    this.myBet.textContent = mine?.bet ? ` · cược ${mine.bet} (giữ ${mine.bet * XIDACH.holdMult})` : '';
    this.meRow.classList.toggle('turn', myTurn);
    setStamp(this.meRow, stampOf(state?.seats?.find((s) => s.sid === mySid)));

    const canBet = phase === 'idle' || phase === 'result' || (phase === 'betting' && (mine?.bet ?? 0) < XIDACH.maxBet);
    this.turn.hidden = !myTurn;
    this.betBox.hidden = !(phase === 'idle' || phase === 'betting' || phase === 'result');
    this.chips.forEach((el) => { el.disabled = !canBet; });
    this.clearBtn.disabled = !(phase === 'betting' && mine?.bet);
    this.actions.hidden = !(phase === 'playing' || phase === 'dealer' || phase === 'checking');
    this.hitBtn.disabled = !myTurn || cards.length >= XIDACH.maxCards;
    this.standBtn.disabled = !myTurn || handTotal(cards) < XIDACH.minStand;
    this.teu.textContent = String(teu);
  }
}
