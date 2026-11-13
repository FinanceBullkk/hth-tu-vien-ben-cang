// Lá bài DOM cho bảng xì dách: vẽ một lá, nhãn điểm của một tay, và đồng bộ một hàng bài theo kiểu "chia thêm":
// lá mới thì bay vào, lá úp vừa lật thì lật, lá cũ đứng yên (không vẽ lại cả tay mỗi lần trạng thái đổi).
import { KIND_LABEL, RANKS, SUITS, handKind, handTotal, rankOf, suitOf } from '../../../shared/xidach.js';
import { cardImageUrl } from '../scene/card-textures.js';
import { h } from './dom.js';

/** Một lá bài DOM (ảnh vẽ chung với lá trên bàn 3D); id âm là lá úp. */
export function cardEl(card, small = false) {
  const face = card >= 0;
  const label = face ? `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}` : 'Lá úp';
  return h('span', {
    class: `xd-card${face ? '' : ' back'}${small ? ' small' : ''}`, role: 'img', 'aria-label': label,
    style: `background-image: url(${cardImageUrl(card)})`,
  });
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

const STAMP_KIND = { xiban: 'XÌ BÀN', xidach: 'XÌ DÁCH', ngulinh: 'NGŨ LINH', quac: 'QUẮC', non: 'NON' };
const STAMP_OUTCOME = { win: 'THẮNG', lose: 'THUA', push: 'HOÀ' };

/** Dấu mộc kết quả của một ghế đã được xét: bài đặc biệt / quắc / non ghi tên bài, còn lại ghi thắng/thua/hoà. */
export function stampOf(seat) {
  if (!seat?.outcome) return null;
  return { text: STAMP_KIND[seat.kind] ?? STAMP_OUTCOME[seat.outcome], tone: seat.outcome };
}

const PEEL_PX = 70; // Kéo lên chừng này là hé hết lá.
const PEEL_OPEN = 0.6; // Hé quá chừng này thì lá tự lật hẳn.

/**
 * Lá để nặn: mặt lá nằm dưới, tấm lưng lá phủ lên. Kéo lá lên thì tấm lưng co dần từ dưới lên (hé mặt lá),
 * quá PEEL_OPEN thì lật hẳn; chạm một cái cũng lật. onOpen(card) báo đã xem lá này.
 */
function squeezeCardEl(card, onOpen) {
  const el = cardEl(card);
  el.classList.add('squeeze');
  const cover = document.createElement('span');
  cover.className = 'xd-cover';
  cover.style.backgroundImage = `url(${cardImageUrl(-1)})`;
  el.append(cover);
  let startY = null;
  let peel = 0;
  const open = () => {
    if (!el.classList.contains('squeeze')) return;
    el.classList.remove('squeeze');
    el.classList.add('flip');
    cover.remove();
    onOpen(card);
  };
  el.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    el.classList.add('peeling'); // Không dựa vào :active: máy cảm ứng không giữ :active khi kéo.
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (startY === null) return;
    peel = Math.max(0, Math.min(1, (startY - e.clientY) / PEEL_PX));
    el.style.setProperty('--peel', peel.toFixed(3));
    if (peel >= PEEL_OPEN) open();
  });
  const release = () => {
    if (startY === null) return;
    startY = null;
    el.classList.remove('peeling');
    if (peel < 0.08) open(); // Chạm không kéo: lật luôn.
    else if (el.classList.contains('squeeze')) el.style.setProperty('--peel', '0');
    peel = 0;
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.open = open;
  return el;
}

/** Lật hết các lá đang chờ nặn trong container (hết lượt, tới lúc xét). */
export function openAll(container) {
  for (const el of container.querySelectorAll('.xd-card.squeeze')) el.open?.();
}

/**
 * Đồng bộ hàng bài trong container với mảng cards (id, âm là úp).
 * Thêm lá ở cuối: chỉ lá mới có hoạt ảnh chia. Lá úp thành ngửa: lá đó lật. Đổi hẳn tay khác (ván mới): vẽ lại.
 * squeeze = { isOpen(card), onOpen(card) }: lá ngửa chưa xem thì tới tay ở dạng úp để nặn (chỉ dùng cho bài của mình).
 */
export function syncHand(container, cards, small = false, squeeze = null) {
  const key = cards.join(',');
  if (container.dataset.key === key) return;
  const prev = container.dataset.key ? container.dataset.key.split(',').map(Number) : [];
  container.dataset.key = key;
  const make = (c) => (squeeze && c >= 0 && !squeeze.isOpen(c) ? squeezeCardEl(c, squeeze.onOpen) : cardEl(c, small));
  const sameStart = prev.length <= cards.length && prev.every((c, i) => c === cards[i] || (c < 0 && cards[i] >= 0));
  if (!sameStart) {
    container.replaceChildren(...cards.map(make));
    return;
  }
  cards.forEach((card, i) => {
    if (i >= prev.length) container.append(make(card));
    else if (prev[i] < 0 && card >= 0) {
      const flipped = cardEl(card, small);
      flipped.classList.add('flip');
      container.children[i].replaceWith(flipped);
    }
  });
}
