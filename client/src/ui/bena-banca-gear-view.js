// Thẻ "Cần câu & thính" ở quầy Bena: mỗi cây cần một thẻ có hình cần, phẩm chất và bốn thanh chỉ số
// (cùng thanh với túi đồ), thẻ thính có thanh số nắm còn trong giỏ. Chỉ vẽ; mua thật qua ui.buy (server trừ TEU).
import { FISH_RODS, THINH } from '../../../shared/fish-gear.js';
import { rodStatBars } from './bag-info-panel.js';
import { rarityColor, rarityName, rodGlyphSvg, thinhGlyphSvg } from './bag-tooltip.js';
import { h } from './dom.js';
import { inkIcon } from './ink-icons.js';

const svgSpan = (cls, svg) => {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = svg; // SVG dựng từ hằng số trong mã
  return el;
};

/**
 * Vẽ thẻ Cần câu & thính. ui: { busy, buy(item) }.
 * @returns {{ quote: string, nodes: Node[] }}
 */
export function renderGearView(bag, wallet, ui) {
  const { teu } = wallet;
  const owns = (rod) => rod.tier === 0 || wallet.has(rod.item) || rod.tier <= bag.rod;
  const priceBtn = (item, price, full = false) => h('button', {
    type: 'button', class: 'bena-btn', disabled: ui.busy || teu < price || full,
    title: full ? 'Giỏ thính đã đầy' : teu < price ? `Còn thiếu ${price - teu} TEU` : `Mua với ${price} TEU`,
    onClick: () => ui.buy(item),
  }, inkIcon('coin'), String(price));

  const rods = FISH_RODS.filter((r) => r.tier > 0).map((rod) => {
    const have = owns(rod);
    const using = rod.tier === bag.rod;
    return h('article', { class: `bena-gear${using ? ' using' : ''}${have ? ' owned' : ''}`, style: `--rc:${rarityColor(rod.rarity)}` },
      h('div', { class: 'bena-gear-top' },
        svgSpan('bena-gear-art', rodGlyphSvg(rod.tier)),
        h('div', { class: 'bena-gear-name' },
          h('b', {}, rod.name),
          h('small', {}, `${rarityName(rod.rarity)} `, h('span', { class: 'bena-stars' }, '★'.repeat(rod.rarity)))),
        have ? h('span', { class: 'bena-badge' }, using ? 'Đang dùng' : 'Đã có') : priceBtn(rod.item, rod.price)),
      rodStatBars(rod));
  });

  const stock = Math.min(1, bag.thinh / THINH.maxStock);
  const thinh = h('article', { class: 'bena-gear thinh', style: '--rc:#e8c07a' },
    h('div', { class: 'bena-gear-top' },
      svgSpan('bena-gear-art', thinhGlyphSvg()),
      h('div', { class: 'bena-gear-name' }, h('b', {}, `${THINH.name} ×${THINH.pack}`), h('small', {}, 'Cá cắn nhanh, dễ ra cá quý')),
      priceBtn(THINH.item, THINH.price, bag.thinh >= THINH.maxStock)),
    h('div', { class: 'bena-stock' },
      h('span', {}, 'Trong giỏ'),
      h('i', { class: 'bena-meter' }, h('u', { style: `width:${Math.round(stock * 100)}%` })),
      h('b', {}, `${bag.thinh} nắm`)));

  return {
    quote: bag.rod >= FISH_RODS.length - 1
      ? 'Cần phượng hoàng rồi á? Bạn là cao thủ thiệt rồi. Mua thêm thính không?'
      : 'Cần xịn kéo cá êm hơn, hay dính cá quý hơn. Coi thử nè!',
    nodes: [h('div', { class: 'bena-gears' }, ...rods, thinh)],
  };
}
