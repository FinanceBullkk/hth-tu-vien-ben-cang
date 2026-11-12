// Màn mở bát bầu cua: ba viên xúc xắc to lật ra giữa màn hình lần lượt, rồi hiện số TEU thắng/thua của mình.
// Không nhận bấm, tự ẩn sau một nhịp. Chỉ hiện cho người đang đứng chơi ở bàn.
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';
import { h } from './dom.js';

const SHOW_MS = 2600;

export class BauCuaReveal {
  constructor() {
    this.dice = h('div', { class: 'baucua-reveal-dice' });
    this.result = h('p', { class: 'baucua-reveal-result' });
    this.root = h('div', { class: 'baucua-reveal', hidden: true, 'aria-live': 'polite' }, this.dice, this.result);
    document.body.append(this.root);
    this.timer = 0;
  }

  /** dice: 3 mặt; net: lãi/lỗ ròng của mình ván này, null nếu mình không cược. */
  show(dice, net) {
    clearTimeout(this.timer);
    this.dice.replaceChildren(...dice.map((d, i) => {
      const s = BAUCUA_SYMBOLS[d];
      return h('div', { class: 'baucua-die', style: `--tile:${s.color};--i:${i}` },
        h('span', {}, s.icon), h('b', {}, s.name));
    }));
    if (net === null) {
      this.result.textContent = '';
      this.result.dataset.tone = '';
    } else {
      this.result.textContent = net > 0 ? `+${net} TEU` : net < 0 ? `−${-net} TEU` : 'Hoà vốn';
      this.result.dataset.tone = net > 0 ? 'win' : net < 0 ? 'lose' : '';
    }
    // Gỡ rồi gắn lại hidden để hoạt ảnh chạy lại từ đầu khi hai ván liền nhau.
    this.root.hidden = true;
    void this.root.offsetWidth;
    this.root.hidden = false;
    this.timer = setTimeout(() => this.hide(), SHOW_MS);
  }

  hide() {
    clearTimeout(this.timer);
    this.root.hidden = true;
  }
}
