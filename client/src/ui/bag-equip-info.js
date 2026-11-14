// Cột "Nhân vật" bên trái túi đồ khi ở thẻ Trang bị, bố cục kiểu game thùng đồ:
// tên và hào quang đang đeo; ba ô trang bị mỗi bên nhân vật 3D (trái: hào quang, trang phục, vũ khí; phải: mũ, tóc, màu áo);
// thanh sưu tầm đồ quý và giá trị bộ đang mặc như lực chiến; ô chỉ số tủ đồ.
// Chỉ vẽ; bấm ô thì onPick(entry) để bag-panel.js chọn, bấm đúp thì tháo. Chuỗi SVG dựng từ hằng số trong mã.
import { FISH_RARITY } from '../../../shared/fish-catalog.js';
import { itemName } from '../../../shared/shop.js';
import { slotHanzi, slotLabel, wardrobeStats, wornEntries } from './bag-equip-items.js';
import { h } from './dom.js';
import { inkIcon } from './ink-icons.js';
import { lookGlyphSvg } from './look-glyphs.js';

const LEFT = ['effect', 'attire', 'weapon'];
const RIGHT = ['hat', 'hair', 'color'];
const rarityColor = (r) => FISH_RARITY[r]?.color ?? FISH_RARITY[1].color;

function equipSlot(entries, entry, { selected, onPick }) {
  entries.push(entry);
  const { slot, empty } = entry;
  const art = h('span', { class: 'bagx-gear-art' });
  if (empty) art.append(h('span', { class: 'bagx-seal faint' }, slotHanzi(slot)));
  else art.innerHTML = lookGlyphSvg(slot, entry.index); // SVG dựng từ hằng số trong mã
  const el = h('button', {
    type: 'button', class: `bagx-gear equip${empty ? ' vacant' : ''}${selected === entry.key ? ' on' : ''}`,
    'data-key': entry.key, 'data-rarity': String(entry.rarity), style: `--rc:${rarityColor(entry.rarity)}`,
    'aria-label': empty ? `Ô ${slotLabel(slot)} trống` : `${slotLabel(slot)}: ${itemName(slot, entry.index)}`,
  }, art, h('small', {}, slotLabel(slot)));
  el.addEventListener('click', () => onPick(entry));
  return el;
}

const tile = (icon, tone, label, value) => h('div', { class: 'bagx-stat', style: `--tone:${tone}` },
  h('span', { class: 'bagx-stat-ico' }, inkIcon(icon)),
  h('span', { class: 'bagx-stat-txt' }, h('small', {}, label), h('b', {}, value)));

/**
 * Vẽ cột Nhân vật; trả về các ô trang bị (có key) để bảng chi tiết tra cứu.
 * portrait: phần tử giữ canvas nhân vật 3D, giữ nguyên qua các lần vẽ lại để không mất khung hình.
 */
export function renderEquipInfo(root, { name, look, owned, selected, portrait, onPick }) {
  const worn = wornEntries(look);
  const stats = wardrobeStats(owned, look);
  const entries = [];
  const ctx = { selected, onPick };
  const aura = worn.effect;
  const ratio = stats.total ? stats.collected / stats.total : 0;

  root.replaceChildren(
    h('div', { class: 'bagx-title' }, 'Nhân vật'),
    h('div', { class: 'bagx-who' },
      h('b', {}, name || 'Khách'),
      h('span', { class: 'bagx-rank' }, aura.empty ? 'Chưa đeo hào quang' : ['Hào quang ', h('i', { style: `color:${rarityColor(aura.rarity)}` }, itemName('effect', aura.index))])),
    h('div', { class: 'bagx-stage equip' },
      h('div', { class: 'bagx-gear-col' }, ...LEFT.map((slot) => equipSlot(entries, worn[slot], ctx))),
      h('div', { class: 'bagx-portrait' }, portrait, h('span', { class: 'bagx-portrait-hint' }, 'Kéo để xoay')),
      h('div', { class: 'bagx-gear-col' }, ...RIGHT.map((slot) => equipSlot(entries, worn[slot], ctx)))),
    h('div', { class: 'bagx-level' },
      h('span', { class: 'bagx-lv' }, 'Sưu tầm'),
      h('span', { class: 'bagx-power' }, inkIcon('coin'), 'Giá trị bộ đồ', h('b', {}, String(stats.outfit))),
      h('i', { class: 'bagx-exp' }, h('u', { style: `width:${Math.round(ratio * 100)}%` }), h('b', {}, `${stats.collected}/${stats.total} món quý ở Sạp Kim Bảo`))),
    h('div', { class: 'bagx-statbox' },
      h('div', { class: 'bagx-stats' },
        tile('gem', '#9b52e0', 'Hào quang', `${stats.auras}/${stats.aurasTotal}`),
        tile('robe', '#2f84d8', 'Đồ quý', `${stats.collected}/${stats.total}`),
        tile('coin', '#e9781a', 'Giá trị tủ đồ', String(stats.value)),
        tile('bag', '#21a38f', 'Đang mặc', `${Object.values(worn).filter((e) => !e.empty).length}/6`)),
      h('p', { class: 'bagx-equip-hint' }, 'Bấm đúp món trong túi để mặc, bấm đúp ô quanh nhân vật để tháo. Cả tu viện thấy ngay.')),
  );
  return entries;
}
