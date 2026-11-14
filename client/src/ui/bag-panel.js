// Túi đồ kiểu game thùng đồ: khung gỗ, cột Thông tin bên trái, lưới 7 x 7 ô bên phải với hai thẻ Cá / Đạo cụ.
// Rê chuột (hoặc chạm) vào ô để xem bảng chi tiết; chọn ô rồi bán, khoá, hay mua cần ở thanh dưới.
// Server quyết định mọi thứ: bán theo id món, giá đã chốt lúc câu; client chỉ vẽ lại theo kết quả trả về.
import { fishById } from '../../../shared/fish-catalog.js';
import { BAG_SORTS, bagValue, itemRarity, quickSellable, sortBag } from '../../../shared/fish-bag.js';
import { FISH_RODS, THINH } from '../../../shared/fish-gear.js';
import { buyGear, sellItems, toggleLock } from './bag-actions.js';
import { renderInfoPanel } from './bag-info-panel.js';
import { placeTooltip, rarityColor, rodGlyphSvg, thinhGlyphSvg, tipContent } from './bag-tooltip.js';
import { h, store } from './dom.js';
import { fishPortraitSvg } from './fish-portrait.js';
import { inkIcon } from './ink-icons.js';
import { openModal } from './modal.js';

const CONFIRM_MS = 3000;
const QUICK_LABELS = { 1: 'Thường', 2: 'Quý trở xuống', 3: 'Hiếm trở xuống', 4: 'Sử thi trở xuống' };
let active = null;

/** tilt: cá thật xoay chéo cho to bằng ô vuông, như icon vật phẩm; đồ thất lạc và đồ câu giữ thẳng. */
const art = (svg, tilt = false) => {
  const el = h('span', { class: `bagx-art${tilt ? ' tilt' : ''}` });
  el.innerHTML = svg; // SVG dựng từ hằng số và bảng ngoại hình trong mã
  return el;
};

export function openBag(app, tab = 'fish') {
  if (active) return active.setTab(tab);
  const { bag, wallet } = app;
  let tabNow = tab === 'gear' ? 'gear' : 'fish';
  let selected = null; // key ô đang chọn
  let hover = null; // { entry } ô chuột đang rê
  let pinned = null; // entry ghim bằng chạm ở cột Thông tin
  let armed = null; // key đang chờ bấm lần hai để xác nhận
  let busy = false;
  let sortId = store.get('bagSort') ?? 'new';
  let quickMax = Number(store.get('bagQuick')) || 2;

  const info = h('section', { class: 'bagx-info' });
  const grid = h('div', { class: 'bagx-grid', role: 'listbox', 'aria-label': 'Ô túi đồ' });
  const tabs = {
    fish: h('button', { type: 'button', class: 'bagx-tab' }, inkIcon('fish'), h('span', {}, 'Cá')),
    gear: h('button', { type: 'button', class: 'bagx-tab' }, inkIcon('bag'), h('span', {}, 'Đạo cụ')),
  };
  const sortBtn = h('button', { type: 'button', class: 'bagx-btn sort', title: 'Đổi cách xếp: mới câu, giá cao, phẩm chất' });
  const capEl = h('span', { class: 'bagx-cap' });
  const teuEl = h('b', {});
  const actions = h('div', { class: 'bagx-actions' });
  const quickSel = h('select', { class: 'bagx-select', 'aria-label': 'Bán nhanh tới phẩm chất' },
    ...Object.entries(QUICK_LABELS).map(([v, label]) => h('option', { value: v }, label)));
  const quickBtn = h('button', { type: 'button', class: 'bagx-btn warm' });
  const quick = h('div', { class: 'bagx-quick' }, h('span', {}, 'Bán nhanh'), quickSel, quickBtn);
  const tip = h('div', { class: 'bagx-tip', role: 'tooltip', hidden: true });
  const bagSec = h('section', { class: 'bagx-bag' },
    h('div', { class: 'bagx-bag-head' }, h('div', { class: 'bagx-title' }, 'Túi'), sortBtn, capEl),
    h('div', { class: 'bagx-mid' }, grid, h('nav', { class: 'bagx-tabs' }, tabs.fish, tabs.gear)),
    h('div', { class: 'bagx-foot' }, h('span', { class: 'bagx-coin' }, inkIcon('coin'), teuEl, h('small', {}, 'TEU')), actions, quick));

  const ownsRod = (rod) => rod.tier === 0 || wallet.has(rod.item);
  const entries = () => (tabNow === 'fish'
    ? sortBag(bag.items, sortId).map((item) => ({ key: `f${item.id}`, kind: 'fish', item, rarity: itemRarity(item) }))
    : [
      ...FISH_RODS.map((rod) => ({ key: `rod${rod.tier}`, kind: 'rod', tier: rod.tier, rarity: rod.rarity, owned: ownsRod(rod), inUse: rod.tier === bag.rod })),
      { key: 'thinh', kind: 'thinh', count: bag.thinh, rarity: 2 },
    ]);
  const findEntry = (key) => entries().find((e) => e.key === key) ?? null;

  function slotOf(entry) {
    const { kind } = entry;
    const svg = kind === 'fish' ? fishPortraitSvg(entry.item.ref) : kind === 'rod' ? rodGlyphSvg(entry.tier) : thinhGlyphSvg();
    // Góc ô ghi giá bán (thứ hay so nhất khi dọn túi); cân nặng xem trong bảng chi tiết.
    const label = kind === 'fish' ? String(entry.item.price)
      : kind === 'thinh' ? `×${entry.count}` : entry.inUse ? 'Dùng' : entry.owned ? '' : `${FISH_RODS[entry.tier].price}`;
    const dim = kind === 'rod' && !entry.owned;
    const slot = h('button', {
      type: 'button', role: 'option', 'data-key': entry.key, 'data-rarity': String(entry.rarity),
      class: `bagx-slot filled${selected === entry.key ? ' on' : ''}${dim ? ' dim' : ''}`,
      style: `--rc:${rarityColor(entry.rarity)}`, 'aria-selected': String(selected === entry.key),
    }, art(svg, kind === 'fish' && fishById(entry.item.ref)?.bait != null), label ? h('em', { class: kind === 'fish' ? 'price' : '' }, label) : '', kind === 'fish' && entry.item.locked ? h('i', { class: 'bagx-lock', 'aria-label': 'Đang khoá' }) : '');
    slot.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = { entry }; placeTip(); } });
    slot.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = null; placeTip(); } });
    slot.addEventListener('click', () => { selected = selected === entry.key ? null : entry.key; pinned = null; armed = null; render(); });
    return slot;
  }

  /** Đặt bảng chi tiết cạnh ô đang rê (ưu tiên) hoặc ô đang chọn; hết chỗ bên phải thì lật sang trái. */
  function placeTip() {
    const entry = hover?.entry ?? pinned ?? (selected && findEntry(selected));
    const host = modal.el.querySelector('.modal-card');
    const anchor = entry && host.querySelector(`[data-key="${entry.key}"]`);
    if (!entry || !anchor) { tip.hidden = true; return; }
    tip.replaceChildren(...tipContent(entry));
    tip.style.setProperty('--rc', rarityColor(entry.rarity ?? 1));
    tip.hidden = false;
    placeTooltip(tip, host, anchor);
  }

  const arm = (key) => {
    armed = key;
    setTimeout(() => { if (armed === key) { armed = null; render(); } }, CONFIRM_MS);
    render();
  };

  /** Chạy một lệnh server, khoá nút trong lúc chờ rồi vẽ lại. */
  const run = async (task) => {
    busy = true;
    armed = null;
    render();
    await task();
    busy = false;
    render();
  };
  const sell = (ids, confirmKey) => {
    if (confirmKey && armed !== confirmKey) return arm(confirmKey);
    return run(async () => {
      const res = await sellItems(app, ids);
      if (res?.ok && res.sold.includes(Number(selected?.slice(1)))) selected = null;
    });
  };
  const lock = (item) => run(() => toggleLock(app, item));
  const buy = (item) => run(() => buyGear(app, item));

  const btn = (label, cls, onClick, disabled = false) => h('button', { type: 'button', class: `bagx-btn ${cls}`, disabled: busy || disabled, onClick }, label);

  function renderActions() {
    const entry = selected && findEntry(selected);
    if (!entry) return actions.replaceChildren(h('p', { class: 'bagx-hint' }, tabNow === 'fish' ? 'Chọn một ô để bán hoặc khoá.' : 'Chọn cần hay thính để xem và mua.'));
    if (entry.kind === 'fish') {
      const { item } = entry;
      const needConfirm = entry.rarity >= 4;
      const sellLabel = armed === entry.key ? 'Bấm lần nữa để bán' : `Bán · ${item.price} TEU`;
      return actions.replaceChildren(
        btn(item.locked ? 'Mở khoá' : 'Khoá', 'cool', () => lock(item)),
        btn(sellLabel, armed === entry.key ? 'hot' : 'warm', () => sell([item.id], needConfirm ? entry.key : null), item.locked));
    }
    if (entry.kind === 'thinh') {
      const full = bag.thinh + THINH.pack > THINH.maxStock;
      return actions.replaceChildren(btn(full ? 'Giỏ thính đầy' : `Mua ${THINH.pack} nắm · ${THINH.price} TEU`, 'warm', () => buy(THINH.item), full || wallet.teu < THINH.price));
    }
    const rod = FISH_RODS[entry.tier];
    if (entry.inUse || rod.tier <= bag.rod) return actions.replaceChildren(btn(entry.inUse ? 'Đang dùng' : 'Đã có cần xịn hơn', 'cool', null, true));
    const poor = wallet.teu < rod.price;
    return actions.replaceChildren(btn(poor ? `Thiếu ${rod.price - wallet.teu} TEU` : `Mua · ${rod.price} TEU`, 'warm', () => buy(rod.item), poor));
  }

  function renderQuick() {
    quick.hidden = tabNow !== 'fish';
    const list = quickSellable(bag.items, quickMax);
    const key = `quick${quickMax}`;
    quickSel.value = String(quickMax);
    quickBtn.textContent = armed === key ? `Bán ${list.length} món?` : `${list.length} món · ${bagValue(list)} TEU`;
    quickBtn.classList.toggle('hot', armed === key);
    quickBtn.disabled = busy || list.length === 0;
    quickBtn.onclick = () => sell(list.map((it) => it.id), quickMax >= 3 || list.length > 10 ? key : null);
  }

  function render() {
    if (selected && !findEntry(selected)) selected = null;
    renderInfoPanel(info, {
      name: app.myName,
      bag,
      bait: app.activities.fishing?.bait,
      onHover: (entry, pin) => { if (pin) pinned = pinned?.key === entry?.key ? null : entry; else hover = entry && { entry }; placeTip(); },
      onPick: (id) => { tabNow = 'fish'; selected = `f${id}`; hover = null; pinned = null; armed = null; render(); },
    });
    for (const [id, el] of Object.entries(tabs)) el.classList.toggle('on', id === tabNow);
    const list = entries();
    const empty = Math.max(0, bag.capacity - list.length);
    grid.replaceChildren(...list.map(slotOf), ...Array.from({ length: empty }, () => h('span', { class: 'bagx-slot', 'aria-hidden': 'true' })));
    sortBtn.replaceChildren('Sắp xếp túi', h('small', {}, BAG_SORTS.find((s) => s.id === sortId)?.label ?? BAG_SORTS[0].label));
    sortBtn.hidden = tabNow !== 'fish';
    capEl.textContent = `${bag.items.length} / ${bag.capacity}`;
    capEl.classList.toggle('full', bag.full);
    teuEl.textContent = String(wallet.teu);
    renderActions();
    renderQuick();
    placeTip();
  }

  sortBtn.addEventListener('click', () => {
    const i = BAG_SORTS.findIndex((s) => s.id === sortId);
    sortId = BAG_SORTS[(i + 1) % BAG_SORTS.length].id;
    store.set('bagSort', sortId);
    render();
  });
  quickSel.addEventListener('change', () => {
    quickMax = Number(quickSel.value) || 2;
    store.set('bagQuick', String(quickMax));
    armed = null;
    render();
  });
  grid.addEventListener('pointerleave', () => { hover = null; placeTip(); });
  for (const id of Object.keys(tabs)) tabs[id].addEventListener('click', () => api.setTab(id));

  const offBag = bag.onChange(() => render());
  const offWallet = wallet.onChange(() => render());
  const modal = openModal({
    title: 'Túi đồ',
    content: [h('div', { class: 'bagx-wrap' }, info, bagSec), tip],
    className: 'bagx',
    wide: true,
    onClose: () => { offBag(); offWallet(); active = null; },
  });

  const api = {
    close: () => modal.close(),
    setTab(next) {
      tabNow = next === 'gear' ? 'gear' : 'fish';
      selected = null;
      hover = null;
      pinned = null;
      armed = null;
      render();
      return api;
    },
  };
  active = api;
  render();
  return api;
}

