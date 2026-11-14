// Thẻ "Bán cá" ở quầy Bena: ô tổng tiền và sức chứa túi, thanh tỉ lệ giá trị theo phẩm chất,
// mỗi phẩm chất một thẻ bày tối đa ba con quý nhất như trên mẹt, nút bán nhóm và nút bán hết.
// Chỉ vẽ; bán thật qua ui.sell (server chốt giá và quyền sở hữu). SVG cá dựng từ hằng số nên gắn innerHTML an toàn.
import { FISH, FISH_RARITY } from '../../../shared/fish-catalog.js';
import { itemRarity } from '../../../shared/fish-bag.js';
import { h } from './dom.js';
import { fishPortraitSvg } from './fish-portrait.js';
import { inkIcon } from './ink-icons.js';

export const PRECIOUS = 4; // Sử thi trở lên: bấm hai lần mới bán, như trong túi đồ
const EMPTY_FISH = FISH.find((f) => f.bait != null)?.id ?? FISH[0].id;
const rarityOf = (r) => FISH_RARITY[r] ?? FISH_RARITY[1];

const svgSpan = (cls, svg) => {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = svg;
  return el;
};

/** Cá chưa khoá trong túi, gom theo phẩm chất: [{ rarity, items, ids, value }], phẩm chất thấp trước. */
export function groupSellable(items) {
  const groups = new Map();
  for (const it of items) {
    if (it.locked) continue;
    const r = itemRarity(it);
    const g = groups.get(r) ?? { rarity: r, items: [], ids: [], value: 0 };
    g.items.push(it);
    g.ids.push(it.id);
    g.value += it.price;
    groups.set(r, g);
  }
  return [...groups.values()].sort((a, b) => a.rarity - b.rarity);
}

/** Tối đa ba con giá cao nhất của nhóm, xếp chồng lệch nhau. */
function fishTray(items) {
  const top = [...items].sort((a, b) => b.price - a.price).slice(0, 3);
  return h('div', { class: `bena-tray n${top.length}` }, top.map((it, i) => svgSpan(`bena-fish f${i}`, fishPortraitSvg(it.ref))));
}

function summary(bag, groups, total) {
  const sellable = groups.reduce((n, g) => n + g.items.length, 0);
  const locked = bag.items.length - sellable;
  const fill = bag.capacity ? bag.items.length / bag.capacity : 0;
  return h('div', { class: 'bena-summary' },
    h('div', { class: 'bena-total' },
      h('small', {}, 'Bena trả'),
      h('b', {}, inkIcon('coin'), String(total)),
      h('small', {}, sellable ? `TEU cho ${sellable} con` : 'TEU')),
    h('div', { class: `bena-cap${fill >= 0.9 ? ' warn' : ''}` },
      h('div', { class: 'bena-cap-head' }, inkIcon('bag'), h('span', {}, 'Túi'), h('b', {}, `${bag.items.length}/${bag.capacity}`)),
      h('i', { class: 'bena-meter' }, h('u', { style: `width:${Math.round(Math.min(1, fill) * 100)}%` })),
      locked
        ? h('small', { class: 'bena-locked' }, inkIcon('lock'), `${locked} món khoá, Bena không đụng`)
        : h('small', {}, fill >= 0.9 ? 'Túi sắp đầy, bán bớt nha' : 'Còn chỗ thoải mái')));
}

/**
 * Vẽ thẻ Bán cá. ui: { busy, armed, press(key, needConfirm, run), sell(ids, cards), openBag() }.
 * @returns {{ quote: string, nodes: Node[] }}
 */
export function renderSellView(bag, ui) {
  const groups = groupSellable(bag.items);
  const total = groups.reduce((sum, g) => sum + g.value, 0);
  if (!groups.length) {
    return {
      quote: 'Túi chưa có cá để bán. Ra hồ thả câu rồi quay lại nha!',
      nodes: [
        summary(bag, groups, 0),
        h('div', { class: 'bena-empty' }, svgSpan('bena-empty-art', fishPortraitSvg(EMPTY_FISH, { dark: true })), h('p', {}, 'Mẹt của Bena còn trống trơn…')),
        h('div', { class: 'bena-foot' }, h('button', { type: 'button', class: 'bena-ghost', onClick: ui.openBag }, inkIcon('bag'), 'Mở túi đồ')),
      ],
    };
  }

  const cards = groups.map((g) => {
    const info = rarityOf(g.rarity);
    const key = `r${g.rarity}`;
    const asking = ui.armed === key;
    const btn = h('button', { type: 'button', class: `bena-btn${asking ? ' ask' : ''}`, disabled: ui.busy },
      asking ? 'Bấm lần nữa' : [inkIcon('coin'), `+${g.value}`]);
    const card = h('article', { class: 'bena-card', style: `--rc:${info.color}`, 'data-rarity': String(g.rarity) },
      fishTray(g.items),
      h('div', { class: 'bena-card-txt' },
        h('b', {}, info.name),
        h('span', { class: 'bena-stars', 'aria-label': `${g.rarity} sao` }, '★'.repeat(g.rarity)),
        h('small', {}, `${g.items.length} con`)),
      btn);
    btn.addEventListener('click', () => ui.press(key, g.rarity >= PRECIOUS, () => ui.sell(g.ids, [card])));
    return card;
  });

  const hasPrecious = groups.some((g) => g.rarity >= PRECIOUS);
  const askAll = ui.armed === 'all';
  const sellAll = h('button', { type: 'button', class: `bena-cta${askAll ? ' ask' : ''}`, disabled: ui.busy },
    askAll ? `Có cá ${FISH_RARITY[PRECIOUS].name}+, bấm lần nữa` : [h('span', {}, 'Bán hết'), h('b', {}, inkIcon('coin'), `+${total}`)]);
  sellAll.addEventListener('click', () => ui.press('all', hasPrecious, () => ui.sell(groups.flatMap((g) => g.ids), cards)));

  return {
    quote: hasPrecious
      ? 'Ối, có cá quý nè! Cá Sử thi trở lên Bena hỏi lại một lần cho chắc nha.'
      : 'Bena trả đúng giá đã chốt lúc câu, cá khoá thì Bena không đụng tới nha.',
    nodes: [
      summary(bag, groups, total),
      h('div', { class: 'bena-mix', 'aria-hidden': 'true' },
        groups.map((g) => h('span', { style: `flex-grow:${g.value};--rc:${rarityOf(g.rarity).color}` }))),
      h('div', { class: 'bena-cards' }, cards),
      h('div', { class: 'bena-foot' },
        sellAll,
        h('button', { type: 'button', class: 'bena-ghost', onClick: ui.openBag }, inkIcon('bag'), 'Chọn từng con')),
    ],
  };
}
