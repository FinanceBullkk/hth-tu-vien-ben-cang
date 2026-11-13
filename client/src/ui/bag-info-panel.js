// Cột "Thông tin" bên trái túi đồ: tên, danh hiệu ngư phủ, ô cần câu và thính, con cá đắt nhất trong túi
// đặt giữa vòng sáng theo phẩm chất, và bảng chỉ số. Chỉ vẽ; dữ liệu lấy từ BagState.
import { FISH, fishById } from '../../../shared/fish-catalog.js';
import { anglerTitle, bagValue, itemRarity } from '../../../shared/fish-bag.js';
import { rodOf } from '../../../shared/fish-gear.js';
import { rarityColor, rarityName, rodGlyphSvg, thinhGlyphSvg } from './bag-tooltip.js';
import { h } from './dom.js';
import { fishPortraitSvg } from './fish-portrait.js';

const svgBox = (cls, svg) => {
  const el = h('span', { class: cls });
  el.innerHTML = svg; // chuỗi SVG dựng từ hằng số trong mã, không chứa dữ liệu người dùng
  return el;
};

/** Ô trang bị bên cạnh vòng giữa; onHover(entry|null, pinned) để bảng chi tiết nổi lên (chạm thì ghim lại). */
function gearSlot(entry, svg, rarity, label, onHover, extra = '') {
  const slot = h('button', { type: 'button', class: 'bagx-gear', 'data-key': entry.key, style: `--rc:${rarityColor(rarity)}`, 'aria-label': label },
    svgBox('bagx-gear-art', svg), extra ? h('em', {}, extra) : '');
  slot.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') onHover(entry); });
  slot.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') onHover(null); });
  slot.addEventListener('click', () => onHover(entry, true));
  return slot;
}

const stat = (label, value) => h('div', { class: 'bagx-stat' }, h('span', {}, label), h('b', {}, value));

export function renderInfoPanel(root, { name, bag, onHover }) {
  const rod = rodOf(bag.rod);
  const best = [...bag.items].sort((a, b) => b.price - a.price)[0] ?? null;
  const bestFish = best ? fishById(best.ref) : null;
  const bestRarity = best ? itemRarity(best) : 1;
  const rare = bag.items.filter((it) => itemRarity(it) >= 3).length;
  const luck = rod.luck?.[4] ?? 1;

  const showcase = h('div', { class: `bagx-showcase${best ? '' : ' empty'}`, style: `--rc:${rarityColor(bestRarity)}`, 'data-rarity': String(bestRarity) },
    best ? svgBox('bagx-showcase-art', fishPortraitSvg(best.ref)) : h('p', {}, 'Túi trống.', h('br'), 'Ra hồ câu cá nhé!'),
    best ? h('p', { class: 'bagx-showcase-name', style: `color:${rarityColor(bestRarity)}` }, bestFish?.name ?? '') : '',
    best ? h('p', { class: 'bagx-showcase-sub' }, `${rarityName(bestRarity)} · ${best.price} TEU`) : '');

  root.replaceChildren(
    h('div', { class: 'bagx-label' }, 'Thông tin'),
    h('div', { class: 'bagx-who' },
      h('b', {}, name || 'Khách'),
      h('span', { class: 'bagx-rank' }, 'Ngư hạng', h('i', {}, anglerTitle(bag.species)))),
    h('div', { class: 'bagx-stage' },
      h('div', { class: 'bagx-gear-col' },
        gearSlot({ key: 'info-rod', kind: 'rod', tier: bag.rod, owned: true, inUse: true }, rodGlyphSvg(bag.rod), rod.rarity, rod.name, onHover),
        gearSlot({ key: 'info-thinh', kind: 'thinh', count: bag.thinh }, thinhGlyphSvg(), 2, `Thính, còn ${bag.thinh} nắm`, onHover, `×${bag.thinh}`)),
      showcase),
    h('div', { class: 'bagx-stats' },
      stat('Sổ cá', `${bag.species}/${FISH.length}`),
      stat('Đã câu', String(bag.caught)),
      stat('Giá trị túi', `${bagValue(bag.items)} TEU`),
      stat('Cá hiếm+', String(rare)),
      stat('Giữ cá', rod.half > 1 ? `+${Math.round((rod.half - 1) * 100)}%` : 'Gốc'),
      stat('May mắn', luck > 1 ? `×${luck}` : 'Gốc')),
  );
}
