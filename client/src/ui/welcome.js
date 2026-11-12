// Màn chào "Lên tu viện": nhập tên, chọn màu áo, tóc, mũ, trang phục, vũ khí và hiệu ứng,
// nhân vật xem trước ngay trong cảnh. Món trả phí chưa mua hiện khoá kèm giá, mua ở Sạp Kim Bảo trong game.
import { ATTIRE_NAMES, AVATAR, EFFECT_NAMES, HAIR_NAMES, HAT_NAMES, LIMITS, PREMIUM_COLORS, SHIRT_COLORS, WEAPON_NAMES } from '../../../shared/protocol.js';
import { canWear, itemId, itemName, priceOf } from '../../../shared/shop.js';

// Hàng mũ bỏ 3 id đầu (id cũ trộn tóc vào mũ, chỉ còn để di trú người chơi cũ).
const HAT_CHIP_START = 3;
const HAT_NONE = 7; // 'Không đội'
import { LoginMusic } from '../audio/login-music.js';
import { $, h, store } from './dom.js';

/** Món đã mở trên máy này; bản cũ chỉ có bitmask màu quý nên gộp luôn vào. */
function ownedOnDevice() {
  const owned = new Set(store.getJson('owned') ?? []);
  const unlocked = Number(store.get('unlocked') ?? 0);
  const premiumStart = SHIRT_COLORS.length - PREMIUM_COLORS.length;
  PREMIUM_COLORS.forEach((_, i) => {
    if ((unlocked >> i) & 1) owned.add(itemId('color', premiumStart + i));
  });
  return owned;
}

export class Welcome {
  constructor({ profile, onPreview, onEnter }) {
    this.profile = { name: '', color: 0, hair: 0, hat: 0, ...profile };
    this.owned = ownedOnDevice();
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
      placeholder: 'Tên của bạn',
      value: savedName,
      autocomplete: 'nickname',
      enterKeyHint: 'go',
    });
    this.errorEl = h('p', { class: 'welcome-error', role: 'alert' });
    this.enterBtn = h('button', { class: 'btn primary big', type: 'button', id: 'enterBtn' }, 'Vào');

    const colors = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Màu áo' });
    for (let i = 0; i < AVATAR.colors; i++) {
      const locked = this.isLocked('color', i);
      const b = h('button', { type: 'button', class: `swatch${locked ? ' locked' : ''}`, role: 'radio', 'aria-label': locked ? `${itemName('color', i)} — ${priceOf(itemId('color', i))} TEU ở Sạp Kim Bảo` : `Màu áo ${i + 1}` });
      b.style.background = SHIRT_COLORS[i];
      b.addEventListener('click', () => this.pick('color', i, () => this.setColor(i)));
      colors.append(b);
    }
    this.colorBtns = [...colors.children];

    const hairs = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': 'Kiểu tóc' });
    for (let i = 0; i < AVATAR.hairs; i++) {
      const b = this.chip('hair', i, HAIR_NAMES[i]);
      b.addEventListener('click', () => this.pick('hair', i, () => this.setHair(i)));
      hairs.append(b);
    }
    this.hairBtns = [...hairs.children];

    const hats = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': 'Kiểu mũ' });
    for (let i = HAT_CHIP_START; i < AVATAR.hats; i++) {
      const b = this.chip('hat', i, HAT_NAMES[i]);
      b.addEventListener('click', () => this.pick('hat', i, () => this.setHat(i)));
      hats.append(b);
    }
    this.hatBtns = [...hats.children];

    const chipRow = (label, slot, names, groupLabel, onPick) => {
      const row = h('div', { class: 'hat-list', role: 'radiogroup', 'aria-label': groupLabel });
      names.forEach((name, i) => {
        const b = this.chip(slot, i, name);
        b.addEventListener('click', () => this.pick(slot, i, () => onPick(i)));
        row.append(b);
      });
      return h('div', { class: 'field' }, h('span', {}, label), row);
    };
    const attireRow = chipRow('Trang phục', 'attire', ATTIRE_NAMES.slice(0, AVATAR.attires), 'Kiểu trang phục', (i) => this.setAttire(i));
    const weaponRow = chipRow('Vũ khí', 'weapon', WEAPON_NAMES.slice(0, AVATAR.weapons), 'Vũ khí mang theo', (i) => this.setWeapon(i));
    const effectRow = chipRow('Aura & danh hiệu', 'effect', EFFECT_NAMES.slice(0, AVATAR.effects), 'Hiệu ứng hào quang', (i) => this.setEffect(i));
    // V9: đè "giảm chuyển động" của hệ điều hành — ai muốn xem aura full tốc tự bật.
    const fullFxBox = h('input', { type: 'checkbox' });
    fullFxBox.checked = store.get('fullFx') === '1';
    fullFxBox.addEventListener('change', () => store.set('fullFx', fullFxBox.checked ? '1' : '0'));
    const fullFxRow = h('label', { class: 'field', style: 'display:flex;gap:8px;align-items:center;cursor:pointer' },
      fullFxBox,
      h('span', { title: 'Bỏ qua chế độ giảm chuyển động của Windows' }, 'Hiệu ứng động đầy đủ'));
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
        this.music.button,
        this.music.audio,
        h('h1', {}, 'Lên tu viện'),
        h('label', { class: 'field', for: 'nameInput' }, h('span', { class: 'sr-only' }, 'Tên của bạn'), this.nameInput),
        this.errorEl,
        this.enterBtn,
        // Nhập tên là vào được ngay; thay đồ là phần thêm, không bắt người mới phải cuộn qua mới thấy nút Vào.
        h('div', { class: 'welcome-extras' },
          h('button', { class: 'chip preset-chip', type: 'button', 'aria-label': 'Mặc bộ Lee Sin · Long quyền', title: 'Mặc bộ Lee Sin · Long quyền', onClick: () => this.wearPreset() }, '🐉 Lee Sin')),
        h('details', { class: 'welcome-more' },
          h('summary', {}, 'Đổi trang phục'),
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

  isLocked(slot, i) {
    return !canWear(this.owned, slot, i);
  }

  /** Chip một món; món chưa mua có ổ khoá và giá. */
  chip(slot, i, name) {
    const locked = this.isLocked(slot, i);
    const price = priceOf(itemId(slot, i));
    return h('button', { type: 'button', class: `chip${locked ? ' locked' : ''}`, role: 'radio', title: locked ? `${price} TEU ở Sạp Kim Bảo` : undefined },
      name, locked ? h('small', { class: 'chip-price' }, `🔒${price}`) : '');
  }

  pick(slot, i, apply) {
    if (this.isLocked(slot, i)) {
      this.showError(`${itemName(slot, i)} bán ở Sạp Kim Bảo cạnh cổng (${priceOf(itemId(slot, i))} TEU). Vào tu viện chơi kiếm TEU nhé.`);
      return;
    }
    this.errorEl.textContent = '';
    apply();
  }

  /** Bộ Lee Sin: mặc các món đã có, món còn thiếu thì báo để mua. */
  wearPreset() {
    const set = [
      ['color', 0, (i) => this.setColor(i)],
      ['hat', 6, (i) => this.setHat(i)],
      ['attire', 3, (i) => this.setAttire(i)],
      ['weapon', 3, (i) => this.setWeapon(i)],
      ['effect', 9, (i) => this.setEffect(i)],
    ];
    const missing = [];
    for (const [slot, i, apply] of set) {
      if (this.isLocked(slot, i)) missing.push(itemName(slot, i));
      else apply(i);
    }
    if (missing.length) this.showError(`Bộ Lee Sin còn thiếu ${missing.join(', ')}, mua ở Sạp Kim Bảo trong tu viện nhé.`);
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
