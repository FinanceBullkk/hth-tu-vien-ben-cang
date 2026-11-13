// HUD mỏng của tài xỉu và cò quay: dải dưới đáy (pha + đếm ngược, bảng cầu, khay chip, cược của mình, ví),
// thanh lực khi người tung đang lấy đà, chữ báo lớn giữa màn hình và màn kết quả. Bàn 3D vẫn là chỗ chơi chính:
// HUD không che bàn và không nhận bấm ngoài các nút của nó. Chỉ vẽ; luật và tiền ở server. CSS ở casino-round-hud.css.
import { CASINO_CHIPS } from '../../../shared/casino-bets.js';
import { h } from './dom.js';

const REVEAL_MS = 2800;
const CALLOUT_MS = 2400;

export class CasinoRoundHud {
  constructor({ title, onChip, onClear, onExit }) {
    this.phase = h('span', { class: 'crh-phase' });
    this.road = h('div', { class: 'crh-road', 'aria-label': 'Các ván gần nhất' });
    this.chips = CASINO_CHIPS.map((v) => h('button', { class: `crh-chip c${v}`, type: 'button', onclick: () => onChip(v), 'aria-label': `Chip ${v} TEU` }, String(v)));
    this.mine = h('span', { class: 'crh-mine' });
    this.clearBtn = h('button', { class: 'crh-btn', type: 'button', onclick: onClear }, 'Rút cược');
    this.teu = h('b', { class: 'crh-teu' });
    this.msg = h('p', { class: 'crh-msg', 'aria-live': 'polite' });
    this.meter = h('div', { class: 'crh-meter', hidden: true }, h('i'));
    this.root = h('section', { class: 'crh', hidden: true, 'aria-label': title },
      this.meter,
      h('div', { class: 'crh-top' }, h('strong', { class: 'crh-title' }, title), this.phase, this.road,
        h('button', { class: 'crh-btn ghost', type: 'button', onclick: onExit }, 'Rời bàn')),
      h('div', { class: 'crh-bar' }, h('div', { class: 'crh-chips' }, this.chips), this.mine, this.clearBtn,
        h('span', { class: 'crh-wallet' }, this.teu, ' TEU')),
      this.msg);
    this.big = h('div', { class: 'crh-callout', hidden: true });
    this.revealText = h('b');
    this.revealNet = h('span');
    this.reveal_ = h('div', { class: 'crh-reveal', hidden: true, 'aria-live': 'polite' }, this.revealText, this.revealNet);
    document.body.append(this.root, this.big, this.reveal_);
    this.timers = {};
    this.lastPhaseText = '';
  }

  show() {
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
    this.big.hidden = true;
    this.reveal_.hidden = true;
    this.meter.hidden = true;
  }

  setMessage(text, tone = '') {
    this.msg.textContent = text;
    this.msg.dataset.tone = tone;
  }

  /** Chữ lớn giữa màn hình một nhịp. */
  callout(text) {
    this.#flash(this.big, 'callout', CALLOUT_MS);
    this.big.textContent = text;
  }

  hideCallout() {
    clearTimeout(this.timers.callout);
    this.big.hidden = true;
  }

  /** Màn kết quả: kết quả đọc được + lãi/lỗ của mình (null là mình không cược). */
  reveal(text, net) {
    this.revealText.textContent = text;
    this.revealNet.textContent = net == null ? '' : net > 0 ? `+${net} TEU` : net < 0 ? `−${-net} TEU` : 'Hoà vốn';
    this.reveal_.dataset.tone = net == null ? '' : net > 0 ? 'win' : net < 0 ? 'lose' : '';
    this.#flash(this.reveal_, 'reveal', REVEAL_MS);
    if (net != null) this.setMessage(net > 0 ? `Thắng ${net} TEU!` : net < 0 ? `Thua ${-net} TEU.` : 'Hoà vốn.', net > 0 ? 'win' : net < 0 ? 'lose' : '');
  }

  #flash(el, key, ms) {
    clearTimeout(this.timers[key]);
    el.hidden = true;
    void el.offsetWidth; // Chạy lại hoạt ảnh khi hai lần liền nhau.
    el.hidden = this.root.hidden;
    this.timers[key] = setTimeout(() => {
      el.hidden = true;
    }, ms);
  }

  /** Gọi mỗi khung: chữ pha + giây còn lại, thanh lực (power null là không lấy đà). */
  tick(now, state, power) {
    const left = state?.endsAt ? Math.max(0, Math.ceil((state.endsAt - now) / 1000)) : 0;
    const text = !state || state.phase === 'idle' ? 'Bàn nghỉ · bấm ô để mở ván'
      : state.phase === 'betting' ? `Nhận cược · ${left}s`
        : state.phase === 'throwing' ? `${state.thrower?.name ?? 'Nhà cái'} sắp tung · ${left}s`
          : state.phase === 'rolling' ? 'Đang ra kết quả…' : 'Kết quả';
    if (text !== this.lastPhaseText) {
      this.lastPhaseText = text;
      this.phase.textContent = text;
      this.phase.dataset.urgent = String((state?.phase === 'betting' || state?.phase === 'throwing') && left <= 3);
    }
    this.meter.hidden = power == null;
    if (power != null) this.meter.style.setProperty('--p', power.toFixed(3));
  }

  render({ chip, teu, mine, canClear, road }) {
    this.chips.forEach((b, i) => b.classList.toggle('on', CASINO_CHIPS[i] === chip));
    this.teu.textContent = String(teu ?? 0);
    this.mine.textContent = mine ? `Bạn cược: ${mine}` : 'Chưa cược';
    this.clearBtn.disabled = !canClear;
    this.road.replaceChildren(...road);
  }
}
