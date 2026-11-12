// Bảng đặt cược bầu cua dock ở đáy màn hình, vẽ như tấm bạt đỏ ngoài chợ Tết: sáu ô con vật, chip tròn xếp chồng
// lên ô mình đã cược, thanh thời gian chạy lùi. Chỉ vẽ và nhận bấm; luật và số liệu do activity lấy từ server.
import { BAUCUA, BAUCUA_SYMBOLS, matchCounts } from '../../../shared/baucua.js';
import { $, h } from './dom.js';

const PHASE_TEXT = {
  idle: 'Bàn nghỉ · đặt để mở ván',
  betting: 'Nhận cược',
  rolling: 'Đang xóc…',
  result: 'Mở bát',
};
const MAX_DISCS = 4;
const chipTier = (amount) => (amount >= 10 ? 'gold' : amount >= 5 ? 'red' : 'ivory');

export class BauCuaPanel {
  constructor({ onBet, onChip, onClear, onExit }) {
    this.phase = h('b', { class: 'baucua-phase' }, PHASE_TEXT.idle);
    this.clock = h('span', { class: 'baucua-clock' });
    this.bar = h('i');
    this.msg = h('p', { class: 'baucua-msg', role: 'status' });

    this.tiles = BAUCUA_SYMBOLS.map((s, i) => {
      const discs = Array.from({ length: MAX_DISCS }, () => h('i'));
      const amount = h('em');
      const stack = h('span', { class: 'baucua-stack', hidden: true }, discs, amount);
      const pool = h('small', { class: 'baucua-pool' });
      const badge = h('i', { class: 'baucua-badge', hidden: true });
      const el = h('button', {
        type: 'button', class: 'baucua-tile', style: `--tile:${s.color}`,
        'aria-label': `Cược ${s.name}, phím ${i + 1}`, onClick: () => onBet(i),
      },
      badge,
      h('span', { class: 'baucua-face' }, s.icon),
      h('b', { class: 'baucua-name' }, s.name),
      stack, pool, h('kbd', {}, String(i + 1)));
      return { el, discs, amount, stack, pool, badge };
    });

    this.chips = BAUCUA.chips.map((amount) => h('button', {
      type: 'button', class: `baucua-chip ${chipTier(amount)}`, 'aria-label': `Chip ${amount} TEU`, onClick: () => onChip(amount),
    }, h('span', {}, String(amount))));
    this.clearBtn = h('button', { type: 'button', class: 'baucua-clear', onClick: onClear }, 'Rút cược');
    this.teu = h('b', {}, '0');
    this.stake = h('span', { class: 'baucua-stake' });

    this.root = h('section', { class: 'baucua-hud', hidden: true, 'aria-label': 'Bầu cua' },
      h('header', { class: 'baucua-head' },
        h('h2', { class: 'baucua-title' }, 'Bầu cua', h('span', { class: 'seal' }, '骰')),
        h('div', { class: 'baucua-state' }, this.phase, this.clock),
        h('button', { type: 'button', class: 'baucua-exit', onClick: onExit, 'aria-label': 'Rời bàn' }, 'Rời bàn')),
      h('div', { class: 'baucua-timer', 'aria-hidden': 'true' }, this.bar),
      h('div', { class: 'baucua-mat' }, this.tiles.map((t) => t.el)),
      h('footer', { class: 'baucua-foot' },
        h('div', { class: 'baucua-chips', role: 'group', 'aria-label': 'Chọn mệnh giá' }, this.chips),
        this.stake,
        this.clearBtn,
        h('span', { class: 'baucua-wallet' }, h('small', {}, 'TEU'), this.teu)),
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

  /** Đếm ngược theo giờ server: số giây và thanh thời gian chạy lùi khi đang nhận cược. */
  tick(nowMs, state) {
    const betting = state?.phase === 'betting';
    const leftMs = betting ? Math.max(0, state.endsAt - nowMs) : 0;
    const text = betting ? `${Math.ceil(leftMs / 1000)}s` : '';
    if (this.clock.textContent !== text) this.clock.textContent = text;
    this.root.classList.toggle('urgent', betting && leftMs <= 3000);
    this.bar.style.transform = `scaleX(${betting ? leftMs / BAUCUA.betMs : 0})`;
  }

  /** state: bàn chung; mine: cược của mình (6 số); chip: mệnh giá đang chọn; teu: số dư. */
  render({ state, mine, chip, teu }) {
    const phase = state?.phase ?? 'idle';
    this.root.dataset.phase = phase;
    this.phase.textContent = PHASE_TEXT[phase];
    const settled = (phase === 'result' || phase === 'idle') && state?.dice;
    const hits = settled ? matchCounts(state.dice) : null;

    this.tiles.forEach((tile, i) => {
      const pool = state?.totals?.[i] ?? 0;
      const amount = mine[i];
      tile.stack.hidden = amount <= 0;
      tile.amount.textContent = amount > 0 ? String(amount) : '';
      const discs = Math.min(MAX_DISCS, Math.ceil(amount / 5));
      tile.discs.forEach((d, k) => {
        d.hidden = k >= discs;
        d.className = chipTier(amount);
      });
      tile.pool.textContent = pool > amount ? `cả bàn ${pool}` : '';
      tile.el.disabled = phase === 'rolling';
      tile.el.classList.toggle('placed', amount > 0);
      const n = hits?.[i] ?? 0;
      tile.el.classList.toggle('hit', n > 0);
      tile.el.classList.toggle('miss', Boolean(hits) && n === 0);
      tile.badge.hidden = n === 0;
      tile.badge.textContent = n > 0 ? `×${n}` : '';
    });
    this.chips.forEach((el, i) => {
      const on = BAUCUA.chips[i] === chip;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', String(on));
    });
    const total = mine.reduce((s, v) => s + v, 0);
    // Ván đã mở bát thì chip trên ô là của ván vừa xong (đã chấm), không còn "đang cược".
    this.root.classList.toggle('settled', Boolean(settled));
    this.stake.textContent = total <= 0 ? '' : settled ? `Ván vừa rồi cược ${total}` : `Đang cược ${total}`;
    this.clearBtn.disabled = phase !== 'betting' || total === 0;
    this.teu.textContent = String(teu);
  }
}
