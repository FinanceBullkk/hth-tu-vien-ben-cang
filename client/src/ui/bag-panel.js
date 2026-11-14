// Túi đồ kiểu game thùng đồ: cột Thông tin bên trái, lưới 7 x 7 ô bên phải với hai thẻ Cá / Đạo cụ.
// Bảng chi tiết chỉ hiện khi rê chuột đúng ô (máy cảm ứng: khi chạm ô, chạm chỗ khác là tắt); bấm ô để chọn rồi
// bán, khoá hay mua ở thanh dưới. Server quyết định mọi thứ: bán theo id món, giá đã chốt lúc câu.
import { fishById } from '../../../shared/fish-catalog.js';
import { BAG_SORTS, itemRarity, sortBag } from '../../../shared/fish-bag.js';
import { FISH_RODS } from '../../../shared/fish-gear.js';
import { selectionButtons, updateQuickSell } from './bag-action-bar.js';
import { buyGear, sellItems, toggleLock } from './bag-actions.js';
import { countTo, floatText, playSold } from './bag-effects.js';
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
  let selected = null; // key ô đang chọn: chỉ để tô viền và hiện nút, không giữ bảng chi tiết
  let tipKey = null; // key ô đang rê chuột (hoặc vừa chạm trên máy cảm ứng)
  let shownTip = null; // key bảng chi tiết đang hiện, để chỉ chạy hiệu ứng hiện lên khi đổi ô
  let armed = null; // key đang chờ bấm lần hai để xác nhận
  let busy = false;
  let teuShown = wallet.teu;
  let entryByKey = new Map();
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
  const teuEl = h('b', {}, String(teuShown));
  const coin = h('span', { class: 'bagx-coin' }, inkIcon('coin'), teuEl, h('small', {}, 'TEU'));
  const actions = h('div', { class: 'bagx-actions' });
  const quickSel = h('select', { class: 'bagx-select', 'aria-label': 'Bán nhanh tới phẩm chất' },
    ...Object.entries(QUICK_LABELS).map(([v, label]) => h('option', { value: v }, label)));
  const quickBtn = h('button', { type: 'button', class: 'bagx-btn warm' });
  const quick = h('div', { class: 'bagx-quick' }, h('span', {}, 'Bán nhanh'), quickSel, quickBtn);
  const tip = h('div', { class: 'bagx-tip', role: 'tooltip', hidden: true });
  const bagSec = h('section', { class: 'bagx-bag' },
    h('div', { class: 'bagx-bag-head' }, h('div', { class: 'bagx-title' }, 'Túi'), sortBtn, capEl),
    h('div', { class: 'bagx-mid' }, grid, h('nav', { class: 'bagx-tabs' }, tabs.fish, tabs.gear)),
    h('div', { class: 'bagx-foot' }, coin, actions, quick));

  const ownsRod = (rod) => rod.tier === 0 || wallet.has(rod.item);
  const entries = () => (tabNow === 'fish'
    ? sortBag(bag.items, sortId).map((item) => ({ key: `f${item.id}`, kind: 'fish', item, rarity: itemRarity(item) }))
    : [
      ...FISH_RODS.map((rod) => ({ key: `rod${rod.tier}`, kind: 'rod', tier: rod.tier, rarity: rod.rarity, owned: ownsRod(rod), inUse: rod.tier === bag.rod })),
      { key: 'thinh', kind: 'thinh', count: bag.thinh, rarity: 2 },
    ]);

  function slotOf(entry, i) {
    const { kind } = entry;
    const svg = kind === 'fish' ? fishPortraitSvg(entry.item.ref) : kind === 'rod' ? rodGlyphSvg(entry.tier) : thinhGlyphSvg();
    // Góc ô ghi giá bán (thứ hay so nhất khi dọn túi); cân nặng xem trong bảng chi tiết.
    const label = kind === 'fish' ? String(entry.item.price)
      : kind === 'thinh' ? `×${entry.count}` : entry.inUse ? 'Dùng' : entry.owned ? '' : `${FISH_RODS[entry.tier].price}`;
    const dim = kind === 'rod' && !entry.owned;
    const slot = h('button', {
      type: 'button', role: 'option', 'data-key': entry.key, 'data-rarity': String(entry.rarity),
      class: `bagx-slot filled${selected === entry.key ? ' on' : ''}${dim ? ' dim' : ''}`,
      style: `--rc:${rarityColor(entry.rarity)};--i:${Math.min(i, 24)}`, 'aria-selected': String(selected === entry.key),
    }, art(svg, kind === 'fish' && fishById(entry.item.ref)?.bait != null),
    label ? h('em', { class: kind === 'fish' ? 'price' : '' }, label) : '',
    kind === 'fish' && entry.item.locked ? h('i', { class: 'bagx-lock', 'aria-label': 'Đang khoá' }) : '');
    slot.addEventListener('click', () => select(entry.key));
    return slot;
  }

  const select = (key) => {
    selected = selected === key ? null : key;
    armed = null;
    render();
  };

  /** Bảng chi tiết theo đúng ô có key tipKey; ô không còn (đã bán, đổi thẻ) thì ẩn. */
  function placeTip() {
    const entry = tipKey && entryByKey.get(tipKey);
    const anchor = entry && card.querySelector(`[data-key="${tipKey}"]`);
    if (!entry || !anchor) {
      tip.hidden = true;
      shownTip = null;
      return;
    }
    tip.replaceChildren(...tipContent(entry));
    tip.style.setProperty('--rc', rarityColor(entry.rarity ?? 1));
    tip.hidden = false;
    placeTooltip(tip, body, anchor);
    if (shownTip !== tipKey) {
      tip.classList.remove('pop');
      void tip.offsetWidth; // chạy lại hiệu ứng hiện lên mỗi khi sang ô khác
      tip.classList.add('pop');
      shownTip = tipKey;
    }
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
      await sellItems(app, ids, {
        beforeRemove: (res) => {
          floatText(body, coin, `+${res.gained} TEU`);
          return playSold(card, res.sold.map((id) => `f${id}`));
        },
      });
    });
  };
  const lock = (item) => run(() => toggleLock(app, item));
  const buy = (item) => run(() => buyGear(app, item));

  function renderActions() {
    const entry = selected ? entryByKey.get(selected) : null;
    actions.replaceChildren(...selectionButtons({ entry, tab: tabNow, armed, busy, bag, wallet, sell, lock, buy }));
  }

  function renderQuick() {
    quick.hidden = tabNow !== 'fish';
    quickSel.value = String(quickMax);
    updateQuickSell(quickBtn, { items: bag.items, maxRarity: quickMax, armed, busy, sell });
  }

  /** Bấm ô ở cột Thông tin: chọn đúng món đó trong lưới (cá ở thẻ Cá, cần và thính ở thẻ Đạo cụ). */
  function pick(entry) {
    if (entry.kind === 'bait') return;
    tabNow = entry.kind === 'fish' ? 'fish' : 'gear';
    selected = entry.kind === 'fish' ? `f${entry.item.id}` : entry.kind === 'rod' ? `rod${entry.tier}` : 'thinh';
    armed = null;
    render();
  }

  function render(animate = false) {
    const list = entries();
    const infoEntries = renderInfoPanel(info, { name: app.myName, bag, bait: app.activities.fishing?.bait, onPick: pick });
    entryByKey = new Map([...list, ...infoEntries].map((e) => [e.key, e]));
    if (selected && !entryByKey.has(selected)) selected = null;
    for (const [id, el] of Object.entries(tabs)) el.classList.toggle('on', id === tabNow);
    const empty = Math.max(0, bag.capacity - list.length);
    grid.replaceChildren(...list.map(slotOf), ...Array.from({ length: empty }, () => h('span', { class: 'bagx-slot', 'aria-hidden': 'true' })));
    // Chỉ chạy hiệu ứng ô hiện dần khi đổi thẻ hay đổi cách xếp, không phải mỗi lần bấm chọn.
    grid.classList.toggle('enter', animate);
    if (animate) setTimeout(() => grid.classList.remove('enter'), 700);
    sortBtn.replaceChildren('Sắp xếp túi', h('small', {}, BAG_SORTS.find((s) => s.id === sortId)?.label ?? BAG_SORTS[0].label));
    sortBtn.hidden = tabNow !== 'fish';
    capEl.textContent = `${bag.items.length} / ${bag.capacity}`;
    capEl.classList.toggle('full', bag.full);
    if (wallet.teu !== teuShown) {
      countTo(teuEl, teuShown, wallet.teu);
      teuShown = wallet.teu;
    }
    renderActions();
    renderQuick();
    placeTip();
  }

  sortBtn.addEventListener('click', () => {
    const i = BAG_SORTS.findIndex((s) => s.id === sortId);
    sortId = BAG_SORTS[(i + 1) % BAG_SORTS.length].id;
    store.set('bagSort', sortId);
    render(true);
  });
  quickSel.addEventListener('change', () => {
    quickMax = Number(quickSel.value) || 2;
    store.set('bagQuick', String(quickMax));
    armed = null;
    render();
  });
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
  const card = modal.el.querySelector('.modal-card');
  const body = modal.body;

  // Bảng chi tiết đi theo ô đang nằm dưới con trỏ, tính lại ở mỗi lần rê: ô bị vẽ lại hay chuột lướt nhanh
  // ra ngoài cũng không bao giờ kẹt lại như khi bám sự kiện vào từng ô.
  const keyAt = (target) => target?.closest?.('[data-key]')?.dataset.key ?? null;
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const key = keyAt(e.target);
    if (key !== tipKey) { tipKey = key; placeTip(); }
  });
  card.addEventListener('pointerleave', () => { tipKey = null; placeTip(); });
  body.addEventListener('scroll', () => { if (tipKey) placeTip(); }, { passive: true });
  // Cảm ứng không có rê: chạm ô thì hiện chi tiết ô đó, chạm lần nữa hoặc chạm chỗ khác thì tắt.
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const key = keyAt(e.target);
    tipKey = key && key !== tipKey ? key : null;
    placeTip();
  });

  const api = {
    close: () => modal.close(),
    setTab(next) {
      tabNow = next === 'gear' ? 'gear' : 'fish';
      selected = null;
      tipKey = null;
      armed = null;
      render(true);
      return api;
    },
  };
  active = api;
  render(true);
  return api;
}
