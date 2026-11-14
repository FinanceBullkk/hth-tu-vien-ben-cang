// Cửa hàng: một bảng neo cạnh phải để vẫn thấy nhân vật thử đồ.
// Bấm món là mặc thử ngay (chỉ máy mình thấy); "Mua" trừ TEU trên server, món mua xong vào thẻ Trang bị của Túi đồ;
// "Mặc bộ này" lưu và cả phòng cùng thấy. Đóng bảng khi chưa lưu thì nhân vật về lại bộ đang mặc.
// Thay đồ đã có thì làm ở Túi đồ (bag-panel.js), như game thùng đồ: tủ đồ cũ đã gộp vào đó.
import { SHIRT_COLORS } from '../../../shared/protocol.js';
import { LOOK_SLOTS, SHOP_SECTIONS, canWear, itemId, itemName, meetsRequirement, paidItems, priceOf, requirementOf } from '../../../shared/shop.js';
import { trimShadowCasters } from '../player/avatar-lod.js';
import { openBag } from './bag-panel.js';
import { h, store } from './dom.js';
import { EFFECT_TINT } from './look-glyphs.js';
import { openModal } from './modal.js';
import { requirementStatus, vipCard } from './shop-vip-card.js';

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
  app.looks?.emit(); // Túi đồ đang mở thì vẽ lại ô trang bị theo bộ mới.
}

/** Ô vẽ món: màu áo là ô màu, hào quang nhuộm theo màu riêng, món khác là triện chữ Hán theo loại. */
export function itemSwatch(slot, index, owned) {
  const tint = slot === 'color' ? SHIRT_COLORS[index] : slot === 'effect' ? EFFECT_TINT[index] : null;
  const style = tint ? `--sw:${tint}` : '';
  return h('span', { class: `shopx-swatch slot-${slot}`, style, 'aria-hidden': 'true' }, owned ? '✓' : slot === 'color' ? '' : HANZI[slot]);
}

/** tab 'wardrobe' (lối tắt cũ của Tủ đồ) giờ mở thẻ Trang bị trong Túi đồ. */
export function openShop(app, tab = 'shop') {
  if (tab === 'wardrobe') {
    active?.close();
    return openBag(app, 'equip');
  }
  if (active) return active;
  const { wallet, me } = app;
  let current = lookOf(app.profile);
  let draft = { ...current };
  let selected = null; // id món đang xem ở thẻ Cửa hàng
  let busy = false;
  let progress = null; // Tiến độ thành tích cho hào quang chí tôn, server đếm.
  app.net.call('shop:progress').then((res) => {
    if (res?.ok && res.progress) progress = res.progress;
    if (active === api) render();
  });

  const preview = () => applyLook(me.avatar, draft);
  // Quay mặt nhân vật về phía camera để nhìn rõ bộ đồ đang thử.
  me.rot = Math.atan2(app.camera.position.x - me.x, app.camera.position.z - me.z);

  const toBag = h('button', { class: 'chip', type: 'button', title: 'Mặc, tháo đồ đã có trong Túi đồ' }, 'Túi đồ');
  const teuEl = h('b', {});
  const head = h('div', { class: 'shopx-head' }, h('div', { class: 'chips' }, h('span', { class: 'chip on' }, 'Cửa hàng'), toBag), h('span', { class: 'shopx-teu' }, teuEl, ' TEU'));
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
    // Món chí tôn lên đầu, chiếm cả hàng; còn lại xếp theo giá như cũ.
    h('div', { class: 'shopx-grid' }, [...paidItems(slot).filter((it) => requirementOf(it.id)), ...paidItems(slot).filter((it) => !requirementOf(it.id))].map((it) => {
      const owned = wallet.has(it.id);
      if (requirementOf(it.id)) {
        return vipCard(it, { owned, on: draft[slot] === it.index, poor: wallet.teu < it.price, progress, onPick: () => pick(slot, it.index) });
      }
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

  const render = () => {
    const scroll = list.scrollTop;
    teuEl.textContent = String(wallet.teu);
    list.replaceChildren(...shopList());
    list.scrollTop = scroll;

    const dirty = !sameLook(draft, current);
    const buying = selected && priceOf(selected) > 0 && !wallet.has(selected);
    undo.hidden = !dirty;
    if (buying) {
      const price = priceOf(selected);
      const [slot, index] = selected.split(':');
      const locked = !meetsRequirement(selected, progress);
      status.textContent = locked ? requirementStatus(selected, progress) : `Đang thử ${itemName(slot, Number(index))}.`;
      primary.textContent = locked ? 'Chưa đủ điều kiện' : wallet.teu < price ? `Thiếu ${price - wallet.teu} TEU` : `Mua · ${price} TEU`;
      primary.disabled = busy || locked || wallet.teu < price;
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
    if (res?.progress) progress = res.progress;
    if (res?.ok) {
      wallet.grant(item);
      app.audio.pop?.();
      app.hud.toast(res.already ? 'Món này bạn có rồi.' : 'Đã mua, món mới vào Túi đồ. Bấm "Mặc bộ này" để mặc luôn.');
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
  // Đóng sạp trước (cởi đồ đang thử) rồi mở túi ở thẻ Trang bị.
  toBag.addEventListener('click', () => {
    modal.close();
    openBag(app, 'equip');
  });

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

  const api = { close: () => modal.close() };
  active = api;
  render();
  return api;
}
