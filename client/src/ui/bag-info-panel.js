// Cột "Thông tin" bên trái túi đồ, bố cục kiểu game thùng đồ:
// tên và ngư hạng; hai cột ô hai bên vòng sáng (trái: cần, thính, mồi; phải: ba con quý nhất trong túi);
// thanh lên hạng theo số loài và "giá trị túi" như lực chiến; ô chỉ số trắng và thanh chỉ số màu của cây cần.
// Chỉ vẽ; dữ liệu lấy từ BagState. Chuỗi SVG dựng từ hằng số trong mã nên gắn innerHTML an toàn.
import { BAITS, FISH, fishById } from '../../../shared/fish-catalog.js';
import { anglerTitle, bagValue, itemRarity, nextAnglerTitle } from '../../../shared/fish-bag.js';
import { FISH_RODS, rodOf } from '../../../shared/fish-gear.js';
import { rarityColor, rarityName, rodGlyphSvg, thinhGlyphSvg } from './bag-tooltip.js';
import { h } from './dom.js';
import { fishPortraitSvg } from './fish-portrait.js';

const svgBox = (cls, svg) => {
  const el = h('span', { class: cls });
  el.innerHTML = svg;
  return el;
};

// Mức cao nhất trong các cây cần, để thanh chỉ số của cần đang dùng đo tương đối với cần xịn nhất.
const TOP = {
  half: Math.max(...FISH_RODS.map((r) => r.half)) - 1,
  drain: 1 - Math.min(...FISH_RODS.map((r) => r.drain)),
  epic: Math.max(...FISH_RODS.map((r) => r.luck?.[4] ?? 1)),
  legend: Math.max(...FISH_RODS.map((r) => r.luck?.[5] ?? 1)),
};

/**
 * Một ô cạnh vòng giữa. Bảng chi tiết khi rê chuột do bag-panel.js lo theo data-key;
 * bấm thì onPick(entry) để chọn đúng món đó trong lưới. Ô được ghi vào entries để bảng chi tiết tra theo key.
 */
function sideSlot(entries, entry, art, { onPick, label = '', aria = '' }) {
  if (!entry) return h('span', { class: 'bagx-gear empty', 'aria-hidden': 'true' });
  entries.push(entry);
  const slot = h('button', { type: 'button', class: 'bagx-gear', 'data-key': entry.key, 'data-rarity': String(entry.rarity ?? 1), style: `--rc:${rarityColor(entry.rarity ?? 1)}`, 'aria-label': aria },
    typeof art === 'string' ? svgBox(`bagx-gear-art${entry.kind === 'fish' ? ' tilt' : ''}`, art) : art, label ? h('em', {}, label) : '');
  slot.addEventListener('click', () => onPick(entry));
  return slot;
}

const box = (label, value) => h('div', { class: 'bagx-stat' }, h('span', {}, label), h('b', {}, value));

/** Thanh màu: ratio 0..1, text là con số hiển thị. */
const bar = (label, ratio, text, color) => h('div', { class: 'bagx-bar', style: `--bar:${color}` },
  h('span', {}, label),
  h('i', {}, h('u', { style: `width:${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }), h('b', {}, text)));

function levelRow(bag) {
  const next = nextAnglerTitle(bag.species);
  const ratio = next ? (bag.species - next.from) / (next.species - next.from) : 1;
  const text = next ? `${bag.species}/${next.species} loài → ${next.title}` : `Đủ ${bag.species} loài · bậc cao nhất`;
  return h('div', { class: 'bagx-level' },
    h('span', { class: 'bagx-lv' }, anglerTitle(bag.species)),
    h('i', { class: 'bagx-exp' }, h('u', { style: `width:${Math.round(ratio * 100)}%` }), h('b', {}, text)),
    h('span', { class: 'bagx-power' }, 'Giá trị túi', h('b', {}, String(bagValue(bag.items)))));
}

/** Vẽ cột Thông tin; trả về các ô vừa vẽ (có key) để bảng chi tiết tra cứu. */
export function renderInfoPanel(root, { name, bag, bait, onPick }) {
  const rod = rodOf(bag.rod);
  const top = [...bag.items].sort((a, b) => b.price - a.price || b.id - a.id).slice(0, 3);
  const best = top[0] ?? null;
  const bestRarity = best ? itemRarity(best) : 1;
  const rare = bag.items.filter((it) => itemRarity(it) >= 3).length;
  const baitInfo = BAITS.find((b) => b.id === bait) ?? BAITS[0];
  const ctx = { onPick };
  const entries = [];

  const showcase = h('div', { class: `bagx-showcase${best ? '' : ' empty'}`, style: `--rc:${rarityColor(bestRarity)}` },
    best ? svgBox('bagx-showcase-art', fishPortraitSvg(best.ref)) : h('p', {}, 'Túi trống.', h('br'), 'Ra hồ câu cá nhé!'),
    best ? h('p', { class: 'bagx-showcase-name', style: `color:${rarityColor(bestRarity)}` }, fishById(best.ref)?.name ?? '') : '',
    best ? h('p', { class: 'bagx-showcase-sub' }, `${rarityName(bestRarity)} · ${best.price} TEU`) : '');

  root.replaceChildren(
    h('div', { class: 'bagx-title' }, 'Thông tin'),
    h('div', { class: 'bagx-who' },
      h('b', {}, name || 'Khách'),
      h('span', { class: 'bagx-rank' }, 'Ngư hạng ', h('i', {}, anglerTitle(bag.species)))),
    h('div', { class: 'bagx-stage' },
      h('div', { class: 'bagx-gear-col' },
        sideSlot(entries, { key: 'info-rod', kind: 'rod', tier: bag.rod, owned: true, inUse: true, rarity: rod.rarity }, rodGlyphSvg(bag.rod), { ...ctx, aria: rod.name }),
        sideSlot(entries, { key: 'info-thinh', kind: 'thinh', count: bag.thinh, rarity: 2 }, thinhGlyphSvg(), { ...ctx, label: `×${bag.thinh}`, aria: `Thính, còn ${bag.thinh} nắm` }),
        sideSlot(entries, { key: 'info-bait', kind: 'bait', bait: baitInfo.id, rarity: 1 }, h('span', { class: 'bagx-seal' }, baitInfo.seal), { ...ctx, aria: baitInfo.name })),
      showcase,
      h('div', { class: 'bagx-gear-col' },
        ...[0, 1, 2].map((i) => {
          const item = top[i];
          return sideSlot(entries, item && { key: `info-f${item.id}`, kind: 'fish', item, rarity: itemRarity(item) }, item ? fishPortraitSvg(item.ref) : '', { ...ctx, label: item ? `${item.price}` : '', aria: item ? fishById(item.ref)?.name : '' });
        }))),
    levelRow(bag),
    h('div', { class: 'bagx-statbox' },
      h('div', { class: 'bagx-stats' },
        box('Sổ cá', `${bag.species}/${FISH.length}`),
        box('Đã câu', String(bag.caught)),
        box('Cá hiếm+', String(rare)),
        box('Ô túi', `${bag.items.length}/${bag.capacity}`)),
      h('div', { class: 'bagx-bars' },
        bar('Giữ cá', (rod.half - 1) / TOP.half, rod.half > 1 ? `+${Math.round((rod.half - 1) * 100)}%` : 'Gốc', '#ff8a2a'),
        bar('Tụt chậm', (1 - rod.drain) / TOP.drain, rod.drain < 1 ? `${Math.round((1 - rod.drain) * 100)}%` : 'Gốc', '#f5c531'),
        bar('Sử thi', (rod.luck?.[4] ?? 1) / TOP.epic, `×${rod.luck?.[4] ?? 1}`, '#b46cf0'),
        bar('Huyền thoại', (rod.luck?.[5] ?? 1) / TOP.legend, (rod.luck?.[5] ?? 1) === 0 ? 'Không' : `×${rod.luck?.[5] ?? 1}`, '#e8452c'))),
  );
  return entries;
}
