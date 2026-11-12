// Màn chào "Lên tu viện": nhập tên, chọn màu áo, tóc, mũ, trang phục, vũ khí và hiệu ứng,
// nhân vật xem trước ngay trong cảnh. Hai màu cuối là màu quý mở khoá bằng TEU.
import { ATTIRE_NAMES, AVATAR, EFFECT_NAMES, HAIR_NAMES, HAT_NAMES, LIMITS, PREMIUM_COLORS, SHIRT_COLORS, WEAPON_NAMES } from '../../../shared/protocol.js';

// Hàng mũ bỏ 3 id đầu (id cũ trộn tóc vào mũ, chỉ còn để di trú người chơi cũ).
const HAT_CHIP_START = 3;
const HAT_NONE = 7; // 'Không đội'
import { LoginMusic } from '../audio/login-music.js';
import { $, h, store } from './dom.js';

export class Welcome {
  constructor({ profile, onPreview, onEnter }) {
    this.profile = { name: '', color: 0, hair: 0, hat: 0, ...profile };
    this.onPreview = onPreview;
    this.onEnter = onEnter;
    this.root = $('welcome');
    this.music = new LoginMusic(this.root);
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
    this.errorEl = h('p', { class: 'welcome-error', role: 'alert' });
    this.enterBtn = h('button', { class: 'btn primary big', type: 'button', id: 'enterBtn' }, 'Vào');

    const colors = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Màu áo' });
    const premiumStart = SHIRT_COLORS.length - PREMIUM_COLORS.length;
    const unlocked = Number(store.get('unlocked') ?? 0);
    for (let i = 0; i < AVATAR.colors; i++) {
      const premiumIndex = i - premiumStart;
      const locked = premiumIndex >= 0 && !((unlocked >> premiumIndex) & 1);
      const b = h('button', { type: 'button', class: `swatch${locked ? ' locked' : ''}`, role: 'radio', 'aria-label': locked ? `${PREMIUM_COLORS[premiumIndex].name} — mở bằng ${PREMIUM_COLORS[premiumIndex].price} TEU trong Sổ an` : `Màu áo ${i + 1}` });
      b.style.background = SHIRT_COLORS[i];
      b.addEventListener('click', () => {
        if (locked) {
          this.showError(`Màu ${PREMIUM_COLORS[premiumIndex].name} mở bằng TEU — ghé Sổ an để đổi quà nhé.`);
          return;
        }
        this.setColor(i);
      });
      colors.append(b);
    }
    this.colorBtns = [...colors.children];

    const hairs = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': 'Kiểu tóc' });
    for (let i = 0; i < AVATAR.hairs; i++) {
      const b = h('button', { type: 'button', class: 'chip', role: 'radio' }, HAIR_NAMES[i]);
      b.addEventListener('click', () => this.setHair(i));
      hairs.append(b);
    }
    this.hairBtns = [...hairs.children];

    const hats = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': 'Kiểu mũ' });
    for (let i = HAT_CHIP_START; i < AVATAR.hats; i++) {
      const b = h('button', { type: 'button', class: 'chip', role: 'radio' }, HAT_NAMES[i]);
      b.addEventListener('click', () => this.setHat(i));
      hats.append(b);
    }
    this.hatBtns = [...hats.children];

    const chipRow = (label, names, groupLabel, onPick) => {
      const row = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': groupLabel });
      names.forEach((name, i) => {
        const b = h('button', { type: 'button', class: 'chip', role: 'radio' }, name);
        b.addEventListener('click', () => onPick(i));
        row.append(b);
      });
      return h('div', { class: 'field' }, h('span', {}, label), row);
    };
    const attireRow = chipRow('Trang phục', ATTIRE_NAMES.slice(0, AVATAR.attires), 'Kiểu trang phục', (i) => this.setAttire(i));
    const weaponRow = chipRow('Vũ khí', WEAPON_NAMES.slice(0, AVATAR.weapons), 'Vũ khí mang theo', (i) => this.setWeapon(i));
    const effectRow = chipRow('Aura & danh hiệu', EFFECT_NAMES.slice(0, AVATAR.effects), 'Hiệu ứng hào quang', (i) => this.setEffect(i));
    effectRow.append(h('small', {}, 'Danh hiệu trang trí đi cùng aura đã chọn, hiện phía trên tên nhân vật.'));
    // V9: đè "giảm chuyển động" của hệ điều hành — ai muốn xem aura full tốc tự bật.
    const fullFxBox = h('input', { type: 'checkbox' });
    fullFxBox.checked = store.get('fullFx') === '1';
    fullFxBox.addEventListener('change', () => store.set('fullFx', fullFxBox.checked ? '1' : '0'));
    const fullFxRow = h('label', { class: 'field', style: 'display:flex;gap:8px;align-items:center;cursor:pointer' },
      fullFxBox,
      h('span', {}, 'Hiệu ứng động đầy đủ (bỏ qua giảm chuyển động của Windows)'));
    this.attireBtns = [...attireRow.querySelectorAll('.chip')];
    this.weaponBtns = [...weaponRow.querySelectorAll('.chip')];
    this.effectBtns = [...effectRow.querySelectorAll('.chip')];

    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });
    this.enterBtn.addEventListener('click', () => this.submit());

    this.root.replaceChildren(
      h('div', { class: 'welcome-card' },
        h('span', { class: 'card-seal', 'aria-hidden': 'true' }, 'HTH'),
        h('p', { class: 'welcome-kicker' }, 'Tu viện bên cảng'),
        h('h1', {}, 'Lên tu viện'),
        h('p', { class: 'welcome-sub' }, 'Hít thở một chút giữa giờ nghỉ, cùng cả nhà.'),
        this.music.button,
        this.music.audio,
        h('label', { class: 'field', for: 'nameInput' }, 'Tên của bạn', this.nameInput),
        this.errorEl,
        this.enterBtn,
        h('button', { class: 'btn ghost', type: 'button', onClick: () => {
          this.setColor(0);
          this.setHat(6);
          this.setAttire(3);
          this.setWeapon(3);
          this.setEffect(9);
        } }, 'Mặc bộ Lee Sin · Long quyền'),
        // Nhập tên là vào được ngay; thay đồ là phần thêm, không bắt người mới phải cuộn qua mới thấy nút Vào.
        h('details', { class: 'welcome-more' },
          h('summary', {}, 'Đổi trang phục (không bắt buộc)'),
          h('div', { class: 'field' }, h('span', {}, 'Màu áo'), colors),
          h('div', { class: 'field' }, h('span', {}, 'Tóc'), hairs),
          h('div', { class: 'field' }, h('span', {}, 'Mũ'), hats),
          attireRow,
          weaponRow,
          effectRow,
          fullFxRow)),
    );
    this.setColor(this.profile.color);
    this.setHair(this.profile.hair ?? 0);
    this.setHat(this.profile.hat);
    this.setAttire(this.profile.attire ?? 0);
    this.setWeapon(this.profile.weapon ?? 0);
    this.setEffect(this.profile.effect ?? 0);
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

  setHair(i) {
    this.profile.hair = i;
    // Id mũ 0-2 là kiểu tóc cũ: chọn tóc mới thì nhả id cũ để tóc tự do hiện đúng.
    if ((this.profile.hat ?? 0) <= 2) return this.setHat(HAT_NONE);
    this.hairBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  setHat(i) {
    this.profile.hat = i;
    this.hatBtns.forEach((b, k) => {
      const id = k + HAT_CHIP_START;
      b.classList.toggle('on', id === i);
      b.setAttribute('aria-checked', id === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  setAttire(i) {
    this.profile.attire = i;
    this.attireBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  setWeapon(i) {
    this.profile.weapon = i;
    this.weaponBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  setEffect(i) {
    this.profile.effect = i;
    this.effectBtns.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    this.onPreview(this.profile);
  }

  submit() {
    const name = this.nameInput.value.replace(/\s+/g, ' ').trim();
    if (!name) {
      this.showError('Nhập tên hiển thị để cả nhà nhận ra bạn nhé.');
      this.nameInput.focus();
      return;
    }
    this.profile.name = name;
    this.enterBtn.disabled = true;
    this.enterBtn.textContent = 'Đang lên tu viện…';
    this.errorEl.textContent = '';
    this.onEnter({ ...this.profile });
  }

  showError(message) {
    this.errorEl.textContent = message;
    this.enterBtn.disabled = false;
    this.enterBtn.textContent = 'Vào';
  }

  hide() {
    this.music.stop();
    this.root.hidden = true;
    this.root.replaceChildren();
  }
}
