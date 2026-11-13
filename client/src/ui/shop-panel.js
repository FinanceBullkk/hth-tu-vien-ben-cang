// Cửa hàng + Tủ đồ: một bảng neo cạnh phải để vẫn thấy nhân vật thử đồ.
// Bấm món là mặc thử ngay (chỉ máy mình thấy); "Mua" trừ TEU trên server; "Mặc bộ này" lưu và cả phòng cùng thấy.
// Đóng bảng khi chưa lưu thì nhân vật về lại bộ đang mặc.
import { AVATAR, SHIRT_COLORS } from '../../../shared/protocol.js';
import { HAT_SHOP_START, LOOK_SLOTS, SHOP_SECTIONS, canWear, itemId, itemName, paidItems, priceOf } from '../../../shared/shop.js';
import { trimShadowCasters } from '../player/avatar-lod.js';
import { h, store } from './dom.js';
import { openModal } from './modal.js';

const SLOT_COUNT = { color: AVATAR.colors, hair: AVATAR.hairs, hat: AVATAR.hats, attire: AVATAR.attires, weapon: AVATAR.weapons, effect: AVATAR.effects };
const SLOT_START = { hat: HAT_SHOP_START };
const HANZI = Object.fromEntries(SHOP_SECTIONS.map((s) => [s.slot, s.hanzi]));

let active = null; // Chỉ một bảng mở cùng lúc; mở lại thì chuyển thẻ.

export const lookOf = (p) => Object.fromEntries(LOOK_SLOTS.map((slot) => [slot, p[slot] ?? 0]));
const sameLook = (a, b) => LOOK_SLOTS.every((slot) => a[slot] === b[slot]);

export function applyLook(avatar, look) {
  avatar.setLook(look.color, look.hat, look.hair, look.attire, look.weapon, look.effect);
  trimShadowCasters(avatar);
}

/** Ghi bộ đồ đã lưu vào hồ sơ trên máy, để màn chào và lần kết nối lại dùng đúng bộ này. */
export function rememberLook(app, look) {
  Object.assign(app.profile, look);
  const { name, color, hair, hat, attire, weapon, effect } = app.profile;
  store.setJson('profile', { name, color, hair, hat, attire, weapon, effect });
}

// Màu chủ đạo của từng hào quang trả phí, để ô trong sạp không giống hệt nhau.
const EFFECT_TINT = { 3: '#5b6fd6', 4: '#e2672a', 7: '#c9d6e8', 8: '#4b2f63', 9: '#d4a017', 10: '#c0392b', 11: '#e8c34a', 12: '#5fb7d9' };

/** Ô vẽ món: màu áo là ô màu, hào quang nhuộm theo màu riêng, món khác là triện chữ Hán theo loại. */
export function itemSwatch(slot, index, owned) {
  const tint = slot === 'color' ? SHIRT_COLORS[index] : slot === 'effect' ? EFFECT_TINT[index] : null;
  const style = tint ? `--sw:${tint}` : '';
  return h('span', { class: `shopx-swatch slot-${slot}`, style, 'aria-hidden': 'true' }, owned ? '✓' : slot === 'color' ? '' : HANZI[slot]);
}

export function openShop(app, tab = 'shop') {
  if (active) {
    active.setTab(tab);
    return active;
  }
  const { wallet, me } = app;
  let current = lookOf(app.profile);
  let draft = { ...current };
  let selected = null; // id món đang xem ở thẻ Cửa hàng
  let busy = false;

  const preview = () => applyLook(me.avatar, draft);
  // Quay mặt nhân vật về phía camera để nhìn rõ bộ đồ đang thử.
  me.rot = Math.atan2(app.camera.position.x - me.x, app.camera.position.z - me.z);

  const tabs = { shop: h('button', { class: 'chip', type: 'button' }, 'Cửa hàng'), wardrobe: h('button', { class: 'chip', type: 'button' }, 'Tủ đồ') };
  const teuEl = h('b', {});
  const head = h('div', { class: 'shopx-head' }, h('div', { class: 'chips' }, tabs.shop, tabs.wardrobe), h('span', { class: 'shopx-teu' }, teuEl, ' TEU'));
  const list = h('div', { class: 'shopx-list' });
  const status = h('p', { class: 'shopx-status' });
  const primary = h('button', { class: 'btn primary', type: 'button' });
  const undo = h('button', { class: 'btn ghost', type: 'button' }, 'Hoàn tác');
  const foot = h('div', { class: 'shopx-foot' }, status, h('div', { class: 'shopx-actions' }, undo, primary));

  const pick = (slot, index) => {
    draft = { ...draft, [slot]: index };
    selected = itemId(slot, index);
    preview();
    render();
  };

  const shopList = () => SHOP_SECTIONS.map(({ slot, label, hanzi }) => h('section', {},
    h('h3', { 'data-hanzi': hanzi }, label),
    h('div', { class: 'shopx-grid' }, paidItems(slot).map((it) => {
      const owned = wallet.has(it.id);
      const card = h('button', {
        class: `shopx-card${owned ? ' owned' : ''}${draft[slot] === it.index ? ' on' : ''}${!owned && wallet.teu < it.price ? ' poor' : ''}`,
        type: 'button', 'aria-pressed': draft[slot] === it.index ? 'true' : 'false',
      },
      itemSwatch(slot, it.index, owned),
      h('span', { class: 'shopx-name' }, itemName(slot, it.index)),
      h('span', { class: 'shopx-price' }, owned ? 'Đã có' : `${it.price} TEU`));
      card.addEventListener('click', () => pick(slot, it.index));
      return card;
    }))));

  const wardrobeList = () => SHOP_SECTIONS.map(({ slot, label, hanzi }) => {
    const chips = [];
    for (let i = SLOT_START[slot] ?? 0; i < SLOT_COUNT[slot]; i++) {
      if (!canWear(wallet.owned, slot, i)) continue;
      const on = draft[slot] === i;
      const chip = slot === 'color'
        ? h('button', { class: `swatch${on ? ' on' : ''}`, type: 'button', style: `background:${SHIRT_COLORS[i]}`, 'aria-label': itemName(slot, i), 'aria-pressed': String(on) })
        : h('button', { class: `chip${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on) }, itemName(slot, i));
      chip.addEventListener('click', () => pick(slot, i));
      chips.push(chip);
    }
    return h('section', {}, h('h3', { 'data-hanzi': hanzi }, label), h('div', { class: slot === 'color' ? 'swatches' : 'hat-list' }, chips));
  });

  let tabNow = tab;
  const render = () => {
    const scroll = list.scrollTop;
    tabs.shop.classList.toggle('on', tabNow === 'shop');
    tabs.wardrobe.classList.toggle('on', tabNow === 'wardrobe');
    teuEl.textContent = String(wallet.teu);
    list.replaceChildren(...(tabNow === 'shop' ? shopList() : [
      h('p', { class: 'muted small' }, 'Chỉ hiện đồ miễn phí và đồ đã mua. Muốn thêm đồ thì qua thẻ Cửa hàng.'),
      ...wardrobeList(),
    ]));
    list.scrollTop = scroll;

    const dirty = !sameLook(draft, current);
    const buying = tabNow === 'shop' && selected && priceOf(selected) > 0 && !wallet.has(selected);
    undo.hidden = !dirty;
    if (buying) {
      const price = priceOf(selected);
      const [slot, index] = selected.split(':');
      status.textContent = `Đang thử ${itemName(slot, Number(index))}.`;
      primary.textContent = wallet.teu < price ? `Thiếu ${price - wallet.teu} TEU` : `Mua · ${price} TEU`;
      primary.disabled = busy || wallet.teu < price;
      primary.dataset.mode = 'buy';
    } else if (dirty) {
      const locked = LOOK_SLOTS.find((slot) => !canWear(wallet.owned, slot, draft[slot]));
      status.textContent = locked ? 'Bộ này có món chưa mua.' : 'Đang thử đồ, chưa lưu.';
      primary.textContent = 'Mặc bộ này';
      primary.disabled = busy || Boolean(locked);
      primary.dataset.mode = 'wear';
    } else {
      status.textContent = 'Đang mặc bộ này.';
      primary.textContent = 'Đã mặc';
      primary.disabled = true;
      primary.dataset.mode = '';
    }
  };

  const buy = async () => {
    const item = selected;
    busy = true;
    render();
    const res = await app.net.call('shop:buy', { item });
    busy = false;
    if (Number.isFinite(res?.teu)) wallet.apply({ teu: res.teu });
    if (res?.ok) {
      wallet.grant(item);
      app.audio.pop?.();
      app.hud.toast(res.already ? 'Món này bạn có rồi.' : `Đã mua! Bấm "Mặc bộ này" để mặc luôn.`);
    } else {
      app.hud.toast(res?.error || 'Chưa mua được, thử lại nhé.');
    }
    render();
  };

  const wear = async () => {
    busy = true;
    render();
    const res = await app.net.call('look:set', draft);
    busy = false;
    if (res?.ok) {
      current = { ...res.look };
      draft = { ...res.look };
      rememberLook(app, current);
      app.hud.toast('Đã thay đồ, cả tu viện cùng thấy.');
    } else {
      app.hud.toast(res?.error || 'Chưa thay được, thử lại nhé.');
    }
    preview();
    render();
  };

  primary.addEventListener('click', () => {
    if (primary.dataset.mode === 'buy') buy();
    else if (primary.dataset.mode === 'wear') wear();
  });
  undo.addEventListener('click', () => {
    draft = { ...current };
    selected = null;
    preview();
    render();
  });
  tabs.shop.addEventListener('click', () => api.setTab('shop'));
  tabs.wardrobe.addEventListener('click', () => api.setTab('wardrobe'));

  const unsubscribe = wallet.onChange(() => render());
  const modal = openModal({
    title: 'Sạp Kim Bảo',
    content: [head, list, foot],
    className: 'shopx',
    onClose: () => {
      unsubscribe();
      active = null;
      // Chưa lưu thì cởi đồ thử, về lại bộ đang mặc.
      if (!sameLook(lookOf(app.profile), draft)) applyLook(me.avatar, lookOf(app.profile));
    },
  });
  modal.el.classList.add('modal-dock');

  const api = {
    close: () => modal.close(),
    setTab(next) {
      tabNow = next === 'wardrobe' ? 'wardrobe' : 'shop';
      selected = null;
      render();
    },
  };
  active = api;
  render();
  return api;
}
