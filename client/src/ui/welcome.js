// Màn chào "Lên tu viện": nhập tên, chọn màu áo và kiểu tóc/mũ, nhân vật xem trước ngay trong cảnh.
import { AVATAR, HAT_NAMES, LIMITS, SHIRT_COLORS } from '../../../shared/protocol.js';
import { $, h } from './dom.js';

export class Welcome {
  constructor({ profile, onPreview, onEnter }) {
    this.profile = { name: '', color: 0, hat: 0, ...profile };
    this.onPreview = onPreview;
    this.onEnter = onEnter;
    this.root = $('welcome');
    this.render();
  }

  render() {
    const savedName = this.profile.name;
    this.nameInput = h('input', {
      id: 'nameInput',
      type: 'text',
      maxLength: LIMITS.nameMax,
      placeholder: 'Tên hiển thị của bạn',
      value: savedName,
      autocomplete: 'nickname',
      enterKeyHint: 'go',
    });
    this.codeInput = h('input', {
      id: 'codeInput',
      class: 'code-input',
      type: 'text',
      maxLength: 32,
      placeholder: 'Mã trong nhóm Zalo công ty',
      value: this.profile.code ?? '',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: false,
      enterKeyHint: 'go',
    });
    this.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });
    this.codeField = h('label', { class: 'field', for: 'codeInput', hidden: true }, 'Mã vào cửa', this.codeInput);
    this.errorEl = h('p', { class: 'welcome-error', role: 'alert' });
    this.enterBtn = h('button', { class: 'btn primary big', type: 'button', id: 'enterBtn' }, 'Vào');

    const colors = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Màu áo' });
    for (let i = 0; i < AVATAR.colors; i++) {
      const b = h('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-label': `Màu áo ${i + 1}` });
      b.style.background = SHIRT_COLORS[i];
      b.addEventListener('click', () => this.setColor(i));
      colors.append(b);
    }
    this.colorBtns = [...colors.children];

    const hats = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': 'Kiểu tóc hoặc mũ' });
    for (let i = 0; i < AVATAR.hats; i++) {
      const b = h('button', { type: 'button', class: 'chip', role: 'radio' }, HAT_NAMES[i]);
      b.addEventListener('click', () => this.setHat(i));
      hats.append(b);
    }
    this.hatBtns = [...hats.children];

    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });
    this.enterBtn.addEventListener('click', () => this.submit());

    this.root.replaceChildren(
      h('div', { class: 'welcome-card' },
        h('p', { class: 'welcome-kicker' }, 'HTH – Tu viện bên cảng'),
        h('h1', {}, 'Lên tu viện'),
        h('p', { class: 'welcome-sub' }, 'Hít thở một chút giữa giờ nghỉ, cùng cả nhà.'),
        this.codeField,
        h('label', { class: 'field', for: 'nameInput' }, 'Tên của bạn', this.nameInput),
        h('div', { class: 'field' }, h('span', {}, 'Màu áo'), colors),
        h('div', { class: 'field' }, h('span', {}, 'Tóc và mũ'), hats),
        this.errorEl,
        this.enterBtn),
    );
    this.setColor(this.profile.color);
    this.setHat(this.profile.hat);
    this.root.hidden = false;
    if (!savedName && !matchMedia('(pointer:coarse)').matches) this.nameInput.focus();
  }

  setColor(i) {
    this.profile.color = i;
    this.colorBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  setHat(i) {
    this.profile.hat = i;
    this.hatBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  /** Server cho biết có cần mã không; chỉ khi đó mới hiện ô nhập. */
  setNeedCode(need) {
    this.needCode = need;
    this.codeField.hidden = !need;
  }

  submit() {
    const code = this.codeInput.value.replace(/\s+/g, '');
    if (this.needCode && !code) {
      this.showError('Nhập mã vào cửa nhé, mã có trong nhóm Zalo công ty.');
      this.codeInput.focus();
      return;
    }
    const name = this.nameInput.value.replace(/\s+/g, ' ').trim();
    if (!name) {
      this.showError('Nhập tên hiển thị để cả nhà nhận ra bạn nhé.');
      this.nameInput.focus();
      return;
    }
    this.profile.name = name;
    this.profile.code = code;
    this.enterBtn.disabled = true;
    this.enterBtn.textContent = 'Đang lên tu viện…';
    this.errorEl.textContent = '';
    this.onEnter({ ...this.profile });
  }

  showError(message, focusCode = false) {
    this.errorEl.textContent = message;
    this.enterBtn.disabled = false;
    this.enterBtn.textContent = 'Vào';
    if (focusCode) {
      this.setNeedCode(true);
      this.codeInput.focus();
      this.codeInput.select();
    }
  }

  hide() {
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}
