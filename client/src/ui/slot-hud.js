// HUD máy gạt cần: dải mỏng dưới đáy như HUD tài xỉu / cò quay (dùng chung lớp .crh), máy 3D vẫn là chỗ chơi chính.
// Gồm khay mức cược, nút gạt lớn (cũng là phím Space), ví, dải kết quả vài lần gạt gần nhất của mình, bảng thưởng gập được,
// và màn kết quả giữa màn hình khi trúng. Chỉ vẽ; luật và tiền ở server. CSS ở slot.css.
import { SLOT, SLOT_SYMBOLS } from '../../../shared/slot.js';
import { h } from './dom.js';

const REVEAL_MS = 2600;
const HISTORY_SHOWN = 8;

const icons = (reels) => reels.map((id) => SLOT_SYMBOLS[id].icon).join('');

export class SlotHud {
  constructor({ onBet, onPull, onExit }) {
    this.history = h('ol', { class: 'slot-history', 'aria-label': 'Các lần gạt gần nhất, mới nhất bên trái' });
    this.chips = SLOT.bets.map((v) => h('button', {
      class: `crh-chip c${v}`, type: 'button', onclick: () => onBet(v), 'aria-label': `Cược ${v} TEU mỗi lần gạt`,
    }, String(v)));
    this.pullBtn = h('button', { class: 'slot-pull', type: 'button', onclick: onPull }, h('b', {}, 'Gạt cần'), h('kbd', {}, 'Space'));
    this.teu = h('b', { class: 'crh-teu' });
    this.msg = h('p', { class: 'crh-msg', 'aria-live': 'polite' });
    this.paytable = h('details', { class: 'slot-pay' },
      h('summary', {}, 'Bảng thưởng'),
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Hình'), h('th', {}, 'Ba hình'), h('th', {}, 'Đôi'))),
        h('tbody', {}, [...SLOT_SYMBOLS].reverse().map((s) => h('tr', {},
          h('td', {}, `${s.icon} ${s.name}`),
          h('td', {}, `×${s.triple}`),
          h('td', {}, s.pair ? `×${s.pair}` : '–'))))),
      h('small', {}, '×n là số lần tiền cược được trả về (×1 là hoà vốn). Đôi tính ở hai ô bất kỳ.'));
    this.root = h('section', { class: 'crh slot-hud', hidden: true, 'aria-label': 'Máy gạt cần' },
      h('div', { class: 'crh-top' }, h('strong', { class: 'crh-title' }, 'Gạt cần'), this.history,
        h('button', { class: 'crh-btn ghost', type: 'button', onclick: onExit }, 'Rời máy')),
      h('div', { class: 'crh-bar' }, h('div', { class: 'crh-chips', role: 'group', 'aria-label': 'Mức cược' }, this.chips),
        this.pullBtn, h('span', { class: 'crh-wallet' }, this.teu, ' TEU')),
      this.msg, this.paytable);
    this.revealIcons = h('b');
    this.revealNet = h('span');
    this.revealTag = h('em');
    this.reveal_ = h('div', { class: 'crh-reveal slot-reveal', hidden: true, 'aria-live': 'polite' }, this.revealTag, this.revealIcons, this.revealNet);
    document.body.append(this.root, this.reveal_);
    this.timer = 0;
    this.items = [];
  }

  show() {
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
    this.reveal_.hidden = true;
  }

  setMessage(text, tone = '') {
    this.msg.textContent = text;
    this.msg.dataset.tone = tone;
  }

  /** Thêm một lần gạt vào dải lịch sử (mới nhất bên trái); lần có ăn được tô vàng kèm hệ số. */
  pushHistory(reels, mult) {
    this.items = [{ reels, mult }, ...this.items].slice(0, HISTORY_SHOWN);
    this.history.replaceChildren(...this.items.map(({ reels: r, mult: m }, i) => h('li', {
      class: `${m > 1 ? 'win' : m === 1 ? 'push' : ''} ${i === 0 ? 'new' : ''}`.trim(),
      title: m > 0 ? `×${m}` : 'trượt',
    }, icons(r), m > 1 ? h('i', {}, `×${m}`) : null)));
  }

  /** Màn kết quả khi có ăn: ba hình to, số TEU; nổ hũ thì thêm chữ "NỔ HŨ!". */
  reveal(reels, mult, net) {
    const jackpot = reels.every((id) => id === SLOT.jackpot);
    this.revealTag.textContent = jackpot ? 'NỔ HŨ!' : mult >= SLOT.bigWin ? 'THẮNG LỚN!' : '';
    this.revealIcons.textContent = icons(reels);
    this.revealNet.textContent = net > 0 ? `+${net} TEU` : 'Hoà vốn';
    this.reveal_.dataset.tone = net > 0 ? 'win' : '';
    this.reveal_.classList.toggle('jackpot', jackpot);
    clearTimeout(this.timer);
    this.reveal_.hidden = true;
    void this.reveal_.offsetWidth; // Chạy lại hoạt ảnh khi hai lần trúng liền nhau.
    this.reveal_.hidden = this.root.hidden;
    this.timer = setTimeout(() => {
      this.reveal_.hidden = true;
    }, jackpot ? REVEAL_MS * 1.6 : REVEAL_MS);
  }

  /** bet: mức đang chọn; spinning: máy đang quay (khoá nút gạt). */
  render({ bet, teu, spinning }) {
    this.chips.forEach((b, i) => {
      const on = SLOT.bets[i] === bet;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    this.teu.textContent = String(teu ?? 0);
    this.pullBtn.disabled = spinning;
    this.pullBtn.classList.toggle('broke', (teu ?? 0) < bet);
  }
}
