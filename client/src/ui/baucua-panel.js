// Bảng đặt cược bầu cua dock đáy màn hình, bố cục theo các trang cược: đầu bảng có vòng đếm ngược, pha, số người và dải
// kết quả các ván trước; giữa là sáu ô con vật (mỗi ô ghi số người và tổng tiền đang cược); đáy là khay chip với
// Rút cược / Cược lại / Gấp đôi và ví chạy số. Camera khoá nhìn bàn 3D phía trên, nên bảng giữ thấp và gọn.
// Chỉ vẽ và nhận bấm; luật và số liệu do activity lấy từ server.
import { BAUCUA, BAUCUA_SYMBOLS, matchCounts } from '../../../shared/baucua.js';
import { $, h } from './dom.js';
import { TimerRing, chipTier, countTo, flyChip } from './table-hud-parts.js';

const PHASE_TEXT = {
  idle: 'Mời đặt cược',
  betting: 'Đang nhận cược',
  rolling: 'Ngừng cược · đang xóc',
  result: 'Mở bát',
};
const MAX_DISCS = 4;
const HISTORY_SHOWN = 8;

export class BauCuaPanel {
  constructor({ onBet, onChip, onClear, onRepeat, onDouble, onExit }) {
    this.ring = new TimerRing();
    this.phase = h('b', { class: 'tbl-phase' }, PHASE_TEXT.idle);
    this.sub = h('small', { class: 'tbl-sub' });
    this.history = h('ol', { class: 'bc-history', 'aria-label': 'Kết quả các ván trước, mới nhất bên trái' });
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
    this.clearBtn = h('button', { type: 'button', class: 'tbl-btn', onClick: onClear }, 'Rút cược');
    this.repeatBtn = h('button', { type: 'button', class: 'tbl-btn', onClick: onRepeat, title: 'Đặt lại đúng cược ván trước' }, 'Cược lại');
    this.doubleBtn = h('button', { type: 'button', class: 'tbl-btn', onClick: onDouble, title: 'Đặt thêm đúng bằng cược đang có' }, 'Gấp đôi');
    this.stake = h('b');
    this.teu = h('b');
    this.purse = h('div', { class: 'tbl-purse' },
      h('span', {}, h('small', {}, 'Đang cược'), this.stake),
      h('span', {}, h('small', {}, 'Ví TEU'), this.teu));

    this.root = h('section', { class: 'baucua-hud tbl-panel', hidden: true, 'aria-label': 'Bầu cua' },
      h('header', { class: 'tbl-head' },
        this.ring.el,
        h('div', { class: 'tbl-status' }, h('span', { class: 'tbl-title' }, 'Bầu cua'), this.phase, this.sub),
        this.history,
        h('button', { type: 'button', class: 'tbl-exit', onClick: onExit, 'aria-label': 'Rời bàn', title: 'Rời bàn' }, '✕')),
      h('div', { class: 'baucua-mat' }, this.tiles.map((t) => t.el)),
      h('footer', { class: 'tbl-rail' },
        h('div', { class: 'baucua-chips', role: 'group', 'aria-label': 'Chọn mệnh giá' }, this.chips),
        h('div', { class: 'tbl-actions' }, this.clearBtn, this.repeatBtn, this.doubleBtn),
        this.purse),
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

  /** Đếm ngược theo giờ server khi đang nhận cược. */
  tick(nowMs, state) {
    const betting = state?.phase === 'betting';
    this.ring.set(betting ? Math.max(0, state.endsAt - nowMs) : null, BAUCUA.betMs);
  }

  /** Chip vừa đặt thành công bay từ khay tới ô. */
  flyBet(symbol, amount) {
    const from = this.chips.find((_, i) => BAUCUA.chips[i] === amount) ?? this.chips[0];
    flyChip(from, this.tiles[symbol]?.el, amount);
  }

  /** Mở bát có lãi: chip bay từ các ô trúng mà mình cược về ví. */
  collect(dice, mine) {
    const hits = matchCounts(dice);
    this.tiles.forEach((t, i) => {
      if (hits[i] > 0 && mine[i] > 0) flyChip(t.el, this.teu, mine[i]);
    });
  }

  #renderHistory(history) {
    const rounds = history.slice(0, HISTORY_SHOWN);
    const key = rounds.map((d) => d.join('')).join('|');
    if (this.history.dataset.key === key) return;
    this.history.dataset.key = key;
    this.history.replaceChildren(...rounds.map((dice, i) => h('li', {
      class: i === 0 ? 'new' : '', title: dice.map((d) => BAUCUA_SYMBOLS[d].name).join(' · '),
    }, dice.map((d) => h('span', {}, BAUCUA_SYMBOLS[d].icon)))));
    this.history.hidden = rounds.length === 0;
  }

  /** state: bàn chung; mine: cược của mình (6 số); chip: mệnh giá đang chọn; teu: số dư; last: cược ván trước. */
  render({ state, mine, chip, teu, last }) {
    const phase = state?.phase ?? 'idle';
    this.root.dataset.phase = phase;
    this.phase.textContent = PHASE_TEXT[phase];
    const pot = (state?.totals ?? []).reduce((s, v) => s + v, 0);
    this.sub.textContent = state?.bettors ? `${state.bettors} người · ${pot} TEU trên bàn` : 'Bấm chip rồi bấm ô để mở ván';
    this.#renderHistory(state?.history ?? []);
    const settled = (phase === 'result' || phase === 'idle') && state?.dice;
    const hits = settled ? matchCounts(state.dice) : null;

    this.tiles.forEach((tile, i) => {
      const pool = state?.totals?.[i] ?? 0;
      const crowd = state?.crowd?.[i] ?? 0;
      const amount = mine[i];
      tile.stack.hidden = amount <= 0;
      tile.amount.textContent = amount > 0 ? String(amount) : '';
      const discs = Math.min(MAX_DISCS, Math.ceil(amount / 5));
      tile.discs.forEach((d, k) => {
        d.hidden = k >= discs;
        d.className = chipTier(amount);
      });
      tile.pool.textContent = pool > 0 && phase === 'betting' ? `${crowd} người · ${pool}` : '';
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
    const lastTotal = last.reduce((s, v) => s + v, 0);
    const open = phase !== 'rolling';
    // Ván đã mở bát thì chip trên ô là của ván vừa xong (đã chấm), không còn "đang cược".
    this.root.classList.toggle('settled', Boolean(settled));
    this.stake.textContent = settled ? '0' : String(total);
    this.clearBtn.disabled = phase !== 'betting' || total === 0;
    this.repeatBtn.disabled = !open || lastTotal === 0 || (phase === 'betting' && total > 0);
    this.repeatBtn.textContent = lastTotal ? `Cược lại ${lastTotal}` : 'Cược lại';
    this.doubleBtn.disabled = phase !== 'betting' || total === 0 || total * 2 > BAUCUA.maxPerRound;
    countTo(this.teu, teu);
  }
}
