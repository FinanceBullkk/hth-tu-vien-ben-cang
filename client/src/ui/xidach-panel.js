// Bảng chơi xì dách dock đáy màn hình: hàng bài nhà cái, các ghế khách khác, tay bài của mình, nút cược / rút / dằn.
// Dùng chung khung đỏ viền vàng với bầu cua (baucua.css), mặt dạ xanh riêng (xidach.css). Chỉ vẽ và nhận bấm.
import { KIND_LABEL, RANKS, RED_SUITS, SUITS, XIDACH, handKind, handTotal, rankOf, suitOf } from '../../../shared/xidach.js';
import { $, h } from './dom.js';

const PHASE_TEXT = {
  idle: 'Bàn nghỉ · cược để mở ván',
  betting: 'Nhận cược',
  playing: 'Rút hay dằn',
  dealer: 'Nhà cái lật bài',
  result: 'Chấm bài',
};
const chipTier = (amount) => (amount >= 10 ? 'gold' : amount >= 5 ? 'red' : 'ivory');

/** Một lá bài DOM; id âm là lá úp. */
export function cardEl(card, small = false) {
  if (!(card >= 0)) return h('span', { class: `xd-card back${small ? ' small' : ''}`, 'aria-label': 'Lá úp' });
  const red = RED_SUITS.has(suitOf(card));
  return h('span', { class: `xd-card${red ? ' red' : ''}${small ? ' small' : ''}`, 'aria-label': `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}` },
    h('b', {}, RANKS[rankOf(card)]), h('i', {}, SUITS[suitOf(card)]));
}

/** Nhãn điểm của một tay: "Xì dách", "Quắc", "Non 13", hay chỉ số điểm. */
export function handLabel(cards) {
  if (!cards?.length) return '';
  const kind = handKind(cards);
  const total = handTotal(cards);
  if (kind === 'normal') return String(total);
  if (kind === 'non' || kind === 'quac') return `${KIND_LABEL[kind]} ${total}`;
  return KIND_LABEL[kind];
}

export class XiDachPanel {
  constructor({ onChip, onClear, onHit, onStand, onExit }) {
    this.phase = h('b', { class: 'baucua-phase' }, PHASE_TEXT.idle);
    this.clock = h('span', { class: 'baucua-clock' });
    this.bar = h('i');
    this.dealerCards = h('div', { class: 'xd-hand' });
    this.dealerTotal = h('em', { class: 'xd-total' });
    this.seats = h('div', { class: 'xd-seats' });
    this.myCards = h('div', { class: 'xd-hand big' });
    this.myTotal = h('em', { class: 'xd-total' });
    this.myBet = h('small', { class: 'xd-bet' });
    this.banner = h('div', { class: 'xd-banner', hidden: true });
    this.msg = h('p', { class: 'baucua-msg', role: 'status' });

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
        this.seats,
        h('div', { class: 'xd-row me' }, h('span', { class: 'xd-who' }, 'Bạn', this.myBet), this.myCards, this.myTotal),
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

  tick(nowMs, state) {
    const timed = state?.phase === 'betting' || state?.phase === 'playing';
    const span = state?.phase === 'playing' ? XIDACH.turnMs : XIDACH.betMs;
    const leftMs = timed ? Math.max(0, state.endsAt - nowMs) : 0;
    const text = timed ? `${Math.ceil(leftMs / 1000)}s` : '';
    if (this.clock.textContent !== text) this.clock.textContent = text;
    this.root.classList.toggle('urgent', timed && leftMs <= 3000);
    this.bar.style.transform = `scaleX(${timed ? leftMs / span : 0})`;
  }

  /** state: bàn chung; mine: { bet, cards, stood } của mình hoặc null; mySid để bỏ ghế của mình khỏi hàng ghế khác. */
  render({ state, mine, mySid, teu }) {
    const phase = state?.phase ?? 'idle';
    this.root.dataset.phase = phase;
    this.phase.textContent = PHASE_TEXT[phase];

    const dealer = state?.dealer ?? [];
    this.dealerCards.replaceChildren(...dealer.map((c) => cardEl(c)));
    this.dealerTotal.textContent = state?.dealerTotal != null ? (KIND_LABEL[state.dealerKind] || String(state.dealerTotal)) : '';

    const others = (state?.seats ?? []).filter((s) => s.sid !== mySid);
    this.seats.replaceChildren(...others.map((s) => h('div', { class: `xd-seat${s.net > 0 ? ' win' : s.net < 0 ? ' lose' : ''}` },
      h('b', {}, s.name),
      h('span', { class: 'xd-hand' }, ...(s.cards ?? Array(s.count).fill(-1)).map((c) => cardEl(c, true))),
      h('small', {}, s.cards ? `${handLabel(s.cards)}${s.net != null ? ` · ${s.net > 0 ? '+' : ''}${s.net}` : ''}` : s.stood ? 'đã dằn' : `cược ${s.bet}`))));
    this.seats.hidden = others.length === 0;

    const cards = mine?.cards ?? [];
    this.myCards.replaceChildren(...cards.map((c) => cardEl(c)));
    this.myTotal.textContent = handLabel(cards);
    this.myTotal.dataset.kind = cards.length ? handKind(cards) : '';
    this.myBet.textContent = mine?.bet ? ` · cược ${mine.bet} (giữ ${mine.bet * XIDACH.holdMult})` : '';

    const canBet = phase === 'idle' || phase === 'result' || (phase === 'betting' && (mine?.bet ?? 0) < XIDACH.maxBet);
    const myTurn = phase === 'playing' && mine && !mine.stood && cards.length > 0;
    this.betBox.hidden = !(phase === 'idle' || phase === 'betting' || phase === 'result');
    this.chips.forEach((el) => { el.disabled = !canBet; });
    this.clearBtn.disabled = !(phase === 'betting' && mine?.bet);
    this.actions.hidden = !(phase === 'playing' || phase === 'dealer');
    this.hitBtn.disabled = !myTurn || cards.length >= XIDACH.maxCards;
    this.standBtn.disabled = !myTurn || handTotal(cards) < XIDACH.minStand;
    this.teu.textContent = String(teu);
  }
}
