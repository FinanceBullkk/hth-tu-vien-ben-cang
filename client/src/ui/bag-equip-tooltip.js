// Bảng chi tiết của món ngoại hình trong túi đồ (ô lưới Trang bị và ô trang bị quanh nhân vật):
// tên tô màu phẩm chất, loại, nguồn (miễn phí, giá ở Sạp Kim Bảo, điều kiện chí tôn), đang mặc hay chưa.
import { FISH_RARITY } from '../../../shared/fish-catalog.js';
import { isPaid, itemName, priceOf, requirementOf } from '../../../shared/shop.js';
import { slotLabel } from './bag-equip-items.js';
import { h } from './dom.js';

const color = (r) => FISH_RARITY[r]?.color ?? FISH_RARITY[1].color;
const line = (label, value, cls = '') => h('p', { class: `bag-tip-line${cls ? ` bag-tip-${cls}` : ''}` }, h('span', {}, `${label}: `), value);

const NOTE = {
  effect: 'Hào quang toả quanh người, cả tu viện cùng thấy.',
  attire: 'Trang phục nhuộm theo màu áo đang mặc.',
  weapon: 'Vũ khí gác chéo sau lưng.',
  hat: 'Mũ và tóc là hai ô riêng, kết hợp tự do.',
  hair: 'Tóc và mũ là hai ô riêng, kết hợp tự do.',
  color: 'Màu áo nhuộm cả trang phục đang mặc.',
};

/** entry: { slot, index, id, rarity, worn, empty } từ bag-equip-items.js. */
export function lookTip(entry) {
  const { slot, index, id, rarity, worn, empty } = entry;
  if (empty) {
    return [
      line('Ô', h('b', {}, slotLabel(slot))),
      h('p', { class: 'bag-tip-line bag-tip-muted' }, 'Đang để trống.'),
      h('p', { class: 'bag-tip-note' }, `Bấm đúp một món ${slotLabel(slot).toLowerCase()} trong túi để mặc vào ô này.`),
    ];
  }
  const tint = color(rarity);
  const req = requirementOf(id);
  const source = req ? `Hào quang chí tôn · ${priceOf(id)} TEU` : isPaid(id) ? `Sạp Kim Bảo · ${priceOf(id)} TEU` : 'Miễn phí';
  return [
    line('Tên', h('b', { style: `color:${tint}` }, itemName(slot, index))),
    line('Phẩm chất', h('b', { style: `color:${tint}` }, `${FISH_RARITY[rarity].name} ${'★'.repeat(rarity)}`)),
    line('Loại', slotLabel(slot)),
    line('Nguồn', source, 'stat'),
    req ? h('p', { class: 'bag-tip-line bag-tip-stat' }, req.label) : '',
    req ? h('p', { class: 'bag-tip-line bag-tip-warn' }, 'Kèm danh hiệu trên đầu · không trao đổi được') : '',
    h('p', { class: `bag-tip-line bag-tip-${worn ? 'good' : 'warn'}` }, worn ? 'Đang mặc · bấm đúp để tháo' : 'Bấm đúp để mặc'),
    h('p', { class: 'bag-tip-note' }, NOTE[slot] ?? ''),
  ];
}
