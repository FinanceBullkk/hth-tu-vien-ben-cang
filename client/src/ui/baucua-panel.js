// Bảng đặt cược bầu cua, dock ở đáy màn hình: sáu ô mặt, chọn mệnh giá, xoá cược, ví TEU và kết quả.
// Chỉ vẽ và nhận bấm; luật và số liệu do activity lấy từ server rồi đẩy vào render().
import { BAUCUA, BAUCUA_SYMBOLS, matchCounts } from '../../../shared/baucua.js';
import { $, h } from './dom.js';

const PHASE_TEXT = {
  idle: 'Bàn đang nghỉ — đặt một cược để mở ván mới',
  betting: 'Đặt cược',
  rolling: 'Đang xóc đĩa…',
  result: 'Mở bát',
};

export class BauCuaPanel {
  constructor({ onBet, onChip, onClear, onExit }) {
    this.status = h('b', { class: 'baucua-phase' }, PHASE_TEXT.idle);
    this.clock = h('span', { class: 'baucua-clock' });
    this.dice = h('div', { class: 'baucua-dice', 'aria-live': 'polite' });
    this.msg = h('p', { class: 'baucua-msg', role: 'status' });

    this.tiles = BAUCUA_SYMBOLS.map((s, i) => {
      const mine = h('span', { class: 'baucua-mine' });
      const pool = h('small', { class: 'baucua-pool' });
      const badge = h('i', { class: 'baucua-badge', hidden: true });
      const el = h('button', {
        type: 'button', class: 'baucua-tile', style: `--tile:${s.color}`,
        'aria-label': `Cược ${s.name}, phím ${i + 1}`, onClick: () => onBet(i),
      }, badge, h('span', { class: 'baucua-icon' }, s.icon), h('b', {}, s.name), mine, pool, h('kbd', {}, String(i + 1)));
      return { el, mine, pool, badge };
    });

    this.chips = BAUCUA.chips.map((amount) => h('button', {
      type: 'button', class: 'baucua-chip', onClick: () => onChip(amount),
    }, String(amount)));
    this.clearBtn = h('button', { type: 'button', class: 'btn ghost small', onClick: onClear }, 'Xoá cược');
    this.teu = h('b', {}, '0');

    this.root = h('section', { class: 'baucua-hud ink-panel', hidden: true, 'aria-label': 'Bầu cua' },
      h('header', { class: 'baucua-head' },
        h('h2', { class: 'ink-title' }, 'Bầu cua', h('span', { class: 'seal' }, '骰')),
        h('div', { class: 'baucua-state' }, this.status, this.clock),
        h('button', { type: 'button', class: 'btn ghost small', onClick: onExit }, 'Rời bàn')),
      this.dice,
      h('div', { class: 'baucua-board' }, this.tiles.map((t) => t.el)),
      h('footer', { class: 'baucua-foot' },
        h('div', { class: 'baucua-chips', role: 'group', 'aria-label': 'Mệnh giá TEU' }, this.chips),
        this.clearBtn,
        h('span', { class: 'teu-chip' }, 'TEU ', this.teu)),
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

  /** Đếm ngược theo giờ server; chỉ hiện khi đang đặt cược. */
  tick(nowMs, state) {
    const left = state?.phase === 'betting' ? Math.max(0, Math.ceil((state.endsAt - nowMs) / 1000)) : null;
    const text = left === null ? '' : `${left}s`;
    if (this.clock.textContent !== text) this.clock.textContent = text;
    this.clock.classList.toggle('urgent', left !== null && left <= 5);
  }

  /** state: bàn chung; mine: cược của mình (6 số); chip: mệnh giá đang chọn; teu: số dư. */
  render({ state, mine, chip, teu }) {
    const phase = state?.phase ?? 'idle';
    this.status.textContent = PHASE_TEXT[phase];
    const settled = (phase === 'result' || phase === 'idle') && state?.dice;
    const hits = settled ? matchCounts(state.dice) : null;
    this.dice.textContent = settled ? state.dice.map((d) => BAUCUA_SYMBOLS[d].icon).join('  ') : '';
    this.dice.hidden = !settled;

    this.tiles.forEach((tile, i) => {
      const pool = state?.totals?.[i] ?? 0;
      tile.mine.textContent = mine[i] > 0 ? `${mine[i]}` : '';
      tile.pool.textContent = pool > 0 ? `bàn ${pool}` : '';
      tile.el.disabled = phase === 'rolling';
      tile.el.classList.toggle('placed', mine[i] > 0);
      const n = hits?.[i] ?? 0;
      tile.el.classList.toggle('hit', n > 0);
      tile.badge.hidden = n === 0;
      tile.badge.textContent = n > 0 ? `×${n}` : '';
    });
    this.chips.forEach((el, i) => {
      el.classList.toggle('on', BAUCUA.chips[i] === chip);
      el.setAttribute('aria-pressed', String(BAUCUA.chips[i] === chip));
    });
    this.clearBtn.disabled = phase !== 'betting' || !mine.some((v) => v > 0);
    this.teu.textContent = String(teu);
  }
}
