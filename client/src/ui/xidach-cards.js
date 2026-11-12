// Lá bài DOM cho bảng xì dách: vẽ một lá, nhãn điểm của một tay, và đồng bộ một hàng bài theo kiểu "chia thêm":
// lá mới thì bay vào, lá úp vừa lật thì lật, lá cũ đứng yên (không vẽ lại cả tay mỗi lần trạng thái đổi).
import { KIND_LABEL, RANKS, RED_SUITS, SUITS, handKind, handTotal, rankOf, suitOf } from '../../../shared/xidach.js';
import { h } from './dom.js';

/** Một lá bài DOM; id âm là lá úp. */
export function cardEl(card, small = false) {
  if (!(card >= 0)) return h('span', { class: `xd-card back${small ? ' small' : ''}`, 'aria-label': 'Lá úp' });
  const red = RED_SUITS.has(suitOf(card));
  return h('span', { class: `xd-card${red ? ' red' : ''}${small ? ' small' : ''}`, 'aria-label': `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}` },
    h('b', {}, RANKS[rankOf(card)]), h('i', {}, SUITS[suitOf(card)]));
}

/** Nhãn điểm của một tay: "Xì dách", "Quắc 25", "Non 13", hay chỉ số điểm. */
export function handLabel(cards) {
  if (!cards?.length) return '';
  const kind = handKind(cards);
  const total = handTotal(cards);
  if (kind === 'normal') return String(total);
  if (kind === 'non' || kind === 'quac') return `${KIND_LABEL[kind]} ${total}`;
  return KIND_LABEL[kind];
}

/**
 * Đồng bộ hàng bài trong container với mảng cards (id, âm là úp).
 * Thêm lá ở cuối: chỉ lá mới có hoạt ảnh chia. Lá úp thành ngửa: lá đó lật. Đổi hẳn tay khác (ván mới): vẽ lại.
 */
export function syncHand(container, cards, small = false) {
  const key = cards.join(',');
  if (container.dataset.key === key) return;
  const prev = container.dataset.key ? container.dataset.key.split(',').map(Number) : [];
  container.dataset.key = key;
  const sameStart = prev.length <= cards.length && prev.every((c, i) => c === cards[i] || (c < 0 && cards[i] >= 0));
  if (!sameStart) {
    container.replaceChildren(...cards.map((c) => cardEl(c, small)));
    return;
  }
  cards.forEach((card, i) => {
    if (i >= prev.length) container.append(cardEl(card, small));
    else if (prev[i] < 0 && card >= 0) {
      const flipped = cardEl(card, small);
      flipped.classList.add('flip');
      container.children[i].replaceWith(flipped);
    }
  });
}
