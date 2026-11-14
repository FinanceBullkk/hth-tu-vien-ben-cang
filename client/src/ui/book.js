// "Sổ an của tôi": bốn thẻ Tổng quan, Tu luyện, Sổ cá, Kỷ niệm. Bảng ước + bảng tuần ở board.js.
// Mua sắm đã chuyển sang Sạp Kim Bảo (shop-panel.js); Sổ an chỉ còn ghi chép, có lối tắt sang sạp.
import { FISH, FISH_BOOK_MILESTONES, fishHint } from '../../../shared/fish.js';
import { fishPortraitSvg } from './fish-portrait.js';
import { cultivation } from '../../../shared/cultivation.js';
import { PLACE_LABELS } from '../../../shared/protocol.js';
import { h, store, timeAgo } from './dom.js';
import { openModal } from './modal.js';
import { openShop } from './shop-panel.js';

export const authHeaders = () => {
  const id = store.get('playerId');
  return id ? { 'x-player-id': id } : {};
};

export async function fetchBook() {
  const res = await fetch('/api/me', { headers: authHeaders() });
  if (!res.ok) throw new Error('Không tải được Sổ');
  return res.json();
}

function stat(label, value) {
  return h('div', { class: 'stat' }, h('b', {}, value ?? '–'), h('span', {}, label));
}

/** Thanh tiến độ mảnh: nét vàng trên giấy. */
function meter(progress, label) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return h('div', { class: 'bookx-meter', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label },
    h('span', { style: `width:${pct}%` }));
}

const BOOK_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'cultivate', label: 'Tu luyện' },
  { key: 'fish', label: 'Sổ cá' },
  { key: 'memories', label: 'Kỷ niệm' },
];

export async function openBook(app, tab = store.get('bookTab') || 'overview') {
  const body = h('div', { class: 'bookx-loading' },
    h('span', { class: 'bookx-seal', 'aria-hidden': 'true' }, '安'),
    h('p', {}, 'Đang mở sổ…'));
  const modal = openModal({ title: 'Sổ an của tôi', content: body, wide: true, className: 'bookx' });
  let book;
  try {
    book = await fetchBook();
  } catch {
    body.replaceChildren(h('p', { class: 'bookx-error' }, 'Chưa mở được Sổ, thử lại sau nhé.'));
    return;
  }
  if (!modal.el.isConnected) return;

  const wishList = h('ul', { class: 'book-list' });
  const renderWishes = () => {
    if (!book.wishes.length) {
      wishList.replaceChildren(h('li', { class: 'muted' }, 'Chưa có lời ước nào. Ra cây bồ đề viết một điều nhé.'));
      return;
    }
    wishList.replaceChildren(...book.wishes.map((w) => {
      const del = h('button', { class: 'btn ghost small', type: 'button' }, 'Xoá');
      del.addEventListener('click', async () => {
        if (del.dataset.confirm !== '1') {
          del.dataset.confirm = '1';
          del.textContent = 'Xoá thật nhé?';
          return;
        }
        const res = await app.net.call('wish:delete', { id: w.id });
        if (res?.ok) {
          book.wishes = book.wishes.filter((x) => x.id !== w.id);
          renderWishes();
        } else {
          app.hud.toast(res?.error || 'Không xoá được.');
        }
      });
      return h('li', {},
        h('p', {}, w.text),
        h('p', { class: 'meta' }, `${PLACE_LABELS[w.place]} · ${timeAgo(w.createdAt)} · ❤️ ${w.likes}${w.hidden ? ' · đang được ẩn' : ''}`),
        del);
    }));
  };
  renderWishes();

  const fortunes = book.fortunes.length
    ? h('ul', { class: 'book-list' }, book.fortunes.map((f) => h('li', {}, h('p', {}, f.text), h('p', { class: 'meta' }, f.date))))
    : h('p', { class: 'muted' }, 'Chưa rút quẻ nào. Quán trà đang chờ bạn.');

  const caught = new Map((book.fish ?? []).map((f) => [f.id, f]));
  const nextMilestone = FISH_BOOK_MILESTONES.find((m) => m.count > caught.size);
  const qi = cultivation(book.qi);
  const teuNow = app.wallet?.teu ?? book.teu ?? 0;
  const ownedCount = app.wallet?.owned.size ?? 0;

  // Lối tắt sang Sạp Kim Bảo: đóng sổ trước để bảng thử đồ không bị sổ che.
  const goShop = (shopTab) => () => {
    modal.close();
    openShop(app, shopTab);
  };

  const pages = {
    overview: () => [
      h('div', { class: 'stats' },
        stat('TEU đang có', teuNow),
        stat('lần lên tu viện', book.visits),
        stat('Chân khí', book.qi ?? 0),
        stat('loài cá đã bắt', book.fish?.length ?? 0),
        stat('câu đố đã giải', book.riddleCorrect),
        stat('điểm đầu hồ cao nhất', book.pitch?.best),
        stat('lần thỉnh chuông', book.bellCount),
        stat('sự kiện chuông đã cùng', book.bellEvents),
        stat('trận luận kiếm thắng', book.pk?.wins ?? 0),
        stat('món đồ đã sắm', ownedCount)),
      h('h3', { 'data-hanzi': '寶' }, 'Túi tiền & túi đồ'),
      h('div', { class: 'bookx-purse' },
        h('p', {}, `Bạn đang có ${teuNow} TEU. Câu cá, giải đố, đầu hồ, Audition chuông, tấu nhạc, ngồi thiền đều được TEU; tiêu ở Sạp Kim Bảo cạnh lối đi tới quán trà.`),
        h('div', { class: 'bookx-purse-actions' },
          h('button', { class: 'btn primary small', type: 'button', onClick: goShop('shop') }, 'Mở Sạp Kim Bảo'),
          h('button', { class: 'btn ghost small', type: 'button', onClick: goShop('wardrobe') }, 'Mở túi đồ'))),
      h('p', { class: 'muted small' }, 'Điểm nhịp điệu chi tiết chỉ mình bạn thấy, không có bảng xếp hạng.'),
    ],
    cultivate: () => [
      h('h3', { 'data-hanzi': '氣' }, `Chân khí · Tầng ${qi.level} · ${qi.name}`),
      meter(qi.progress, 'Tiến độ lên tầng Chân khí kế tiếp'),
      h('p', { class: 'muted small' }, qi.next ? `${qi.qi}/${qi.next} khí tới tầng kế tiếp.` : 'Đã viên mãn.'),
      h('p', { class: 'muted small' }, 'Ngồi thiền để tích Chân khí. Khí càng nhiều, aura càng lớn; lên tầng mở thêm hiệu ứng.'),
      h('h3', { 'data-hanzi': '功' }, 'Công pháp'),
      book.cultivation ? meter(book.cultivation.next ? book.cultivation.points / book.cultivation.next : 1, 'Tiến độ công pháp') : '',
      h('p', {}, book.cultivation
        ? `${book.cultivation.name} · ${book.cultivation.points}${book.cultivation.next ? `/${book.cultivation.next}` : ' · viên mãn'} công pháp`
        : 'Khởi khí · 0 công pháp'),
      h('p', { class: 'muted small' }, 'Ngồi thiền để tích Chân khí và nâng tầng aura đã chọn. Chọn Không vẫn tích Chân khí nhưng không hiện aura.'),
    ],
    fish: () => [
      h('h3', { 'data-hanzi': '魚' }, 'Sổ cá'),
      meter(caught.size / FISH.length, 'Số loài cá đã bắt'),
      h('p', { class: 'muted small' }, nextMilestone
        ? `Đã bắt ${caught.size}/${FISH.length} loài. Đủ ${nextMilestone.count} loài được thưởng ${nextMilestone.teu} TEU.`
        : `Đã bắt đủ ${FISH.length} loài. Tay câu cứng nhất tu viện!`),
      h('ul', { class: 'fish-book' }, FISH.map((fish) => {
        const row = caught.get(fish.id);
        const art = h('span', { class: 'fish-book-art' });
        art.innerHTML = fishPortraitSvg(fish.id, { dark: !row });
        return h('li', { class: row ? 'caught' : '' },
          art,
          h('b', {}, row ? fish.name : '???'),
          h('span', { class: 'fish-book-stars' }, '★'.repeat(fish.rarity)),
          h('small', {}, row ? `×${row.count} · nặng nhất ${row.best} kg` : fishHint(fish)));
      })),
    ],
    memories: () => [
      h('h3', { 'data-hanzi': '願' }, 'Lời ước của tôi'),
      wishList,
      h('h3', { 'data-hanzi': '籤' }, 'Quẻ đã rút'),
      fortunes,
    ],
  };

  const page = h('div', { class: 'bookx-page' });
  const tabButtons = BOOK_TABS.map(({ key, label }) => {
    const b = h('button', { class: 'chip', type: 'button', role: 'tab' }, label);
    b.addEventListener('click', () => show(key));
    return [key, b];
  });
  const show = (key) => {
    const next = pages[key] ? key : 'overview';
    store.set('bookTab', next);
    for (const [k, b] of tabButtons) {
      b.classList.toggle('on', k === next);
      b.setAttribute('aria-selected', k === next ? 'true' : 'false');
    }
    page.replaceChildren(...pages[next]());
    modal.body.scrollTop = 0;
  };
  body.className = '';
  body.replaceChildren(h('div', { class: 'chips bookx-tabs', role: 'tablist' }, tabButtons.map(([, b]) => b)), page);
  show(tab);
}
