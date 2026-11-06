// Vòng sáng co dần dùng chung cho thỉnh chuông cá nhân và sự kiện chuông cả công ty.
import { $, h } from './dom.js';

export class RingOverlay {
  constructor() {
    this.root = $('ringLayer');
    this.shrink = h('div', { class: 'ring-shrink' });
    this.target = h('div', { class: 'ring-target' });
    this.hint = h('p', { class: 'ring-hint' });
    this.closeBtn = h('button', { class: 'btn ghost ring-close', type: 'button' }, 'Thôi');
    this.root.append(this.target, this.shrink, this.hint, this.closeBtn);
    this.onTap = null;
    this.onCancel = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.closeBtn) return;
      e.preventDefault();
      this.onTap?.();
    });
    this.closeBtn.addEventListener('click', () => this.onCancel?.());
  }

  show(hint, { onTap, onCancel }) {
    this.hint.textContent = hint;
    this.onTap = onTap;
    this.onCancel = onCancel;
    this.closeBtn.hidden = !onCancel;
    this.root.hidden = false;
    this.flashClear();
  }

  hide() {
    this.root.hidden = true;
    this.onTap = null;
    this.onCancel = null;
  }

  setScale(s) {
    this.shrink.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  setHint(text) {
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }

  flash(good) {
    this.target.classList.add(good ? 'hit' : 'miss');
  }

  flashClear() {
    this.target.classList.remove('hit', 'miss');
  }
}
