// "Sổ an của tôi" và "Bảng ước của cả nhà" + Bảng tuần (TEU, cá, đầu hồ).
import { FISH, FISH_BOOK_MILESTONES, fishHint } from '../../../shared/fish.js';
import { cultivation } from '../../../shared/cultivation.js';
import { PLACE_LABELS, PREMIUM_COLORS } from '../../../shared/protocol.js';
import { h, store, timeAgo } from './dom.js';
import { openModal } from './modal.js';

const authHeaders = () => {
  const id = store.get('playerId');
  return id ? { 'x-player-id': id } : {};
};

const fishName = (id) => FISH.find((f) => f.id === id)?.name ?? id;

export async function fetchBook() {
  const res = await fetch('/api/me', { headers: authHeaders() });
  if (!res.ok) throw new Error('Không tải được Sổ');
  return res.json();
}

function stat(label, value) {
  return h('div', { class: 'stat' }, h('b', {}, value ?? '–'), h('span', {}, label));
}

export async function openBook(app) {
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

  // Sổ cá: loài chưa bắt chỉ hiện gợi ý; quầy đổi quà màu áo quý bằng TEU ở ngay dưới.
  const caught = new Map((book.fish ?? []).map((f) => [f.id, f]));
  const nextMilestone = FISH_BOOK_MILESTONES.find((m) => m.count > caught.size);
  const fishList = h('div', { class: 'bookx-fish' },
    h('p', { class: 'muted small' }, nextMilestone
      ? `Đã bắt ${caught.size}/${FISH.length} loài. Đủ ${nextMilestone.count} loài được thưởng ${nextMilestone.teu} TEU.`
      : `Đã bắt đủ ${FISH.length} loài. Tay câu cứng nhất tu viện!`),
    h('ul', { class: 'fish-book' }, FISH.map((fish) => {
      const row = caught.get(fish.id);
      return h('li', { class: row ? 'caught' : '' },
        h('b', {}, row ? fish.name : '???'),
        h('span', { class: 'fish-book-stars' }, '★'.repeat(fish.rarity)),
        h('small', {}, row ? `×${row.count} · nặng nhất ${row.best} kg` : fishHint(fish)));
    })));
  // Quầy đổi quà: mỗi màu quý một thẻ ấn, bấm thẻ là mở khoá bằng TEU.
  const teuNow = book.teu ?? 0;
  const shop = h('div', { class: 'bookx-shop' });
  PREMIUM_COLORS.forEach((p, i) => {
    const owned = ((book.unlocked ?? 0) & (1 << i)) !== 0;
    const card = h('button', {
      class: `bookx-card${owned ? ' owned' : ''}${!owned && teuNow < p.price ? ' poor' : ''}`,
      type: 'button', disabled: owned,
    },
    h('span', { class: 'bookx-swatch', style: `--sw:${p.hex}`, 'aria-hidden': 'true' }, owned ? '✓' : ''),
    h('span', { class: 'bookx-card-name' }, p.name),
    h('span', { class: 'bookx-card-price' }, owned ? 'Đã sở hữu' : `${p.price} TEU`));
    if (!owned) {
      card.addEventListener('click', async () => {
        const res = await app.net.call('cosmetic:unlock', { color: i });
        if (res?.ok) {
          app.hud.toast(`Đã mở khoá màu ${p.name}! Vào màn vào game để chọn lại áo.`);
          card.disabled = true;
          card.classList.remove('poor');
          card.classList.add('owned');
          card.querySelector('.bookx-swatch').textContent = '✓';
          card.querySelector('.bookx-card-price').textContent = 'Đã sở hữu';
        } else {
          app.hud.toast(res?.error || 'Chưa mở được.');
        }
      });
    }
    shop.append(card);
  });

  body.replaceChildren(
    h('div', { class: 'stats' },
      stat('lần lên tu viện', book.visits),
      stat('TEU đang có', teuNow),
      stat('Chân khí', book.qi ?? 0),
      stat('câu đố đã giải', book.riddleCorrect),
      stat('loài cá đã bắt', book.fish?.length ?? 0),
      stat('điểm đầu hồ cao nhất', book.pitch?.best),
      stat('lần thỉnh chuông', book.bellCount),
      stat('sự kiện chuông đã cùng', book.bellEvents)),
    h('h3', { 'data-hanzi': '功' }, 'Công pháp'),
    h('p', {}, book.cultivation
      ? `${book.cultivation.name} · ${book.cultivation.points}${book.cultivation.next ? `/${book.cultivation.next}` : ' · viên mãn'} công pháp`
      : 'Khởi khí · 0 công pháp'),
    h('p', { class: 'muted small' }, 'Ngồi thiền để tích Chân khí và nâng tầng aura đã chọn. Chọn Không vẫn tích Chân khí nhưng không hiện aura.'),
    h('h3', { 'data-hanzi': '氣' }, `Chân khí · Tầng ${cultivation(book.qi).level} · ${cultivation(book.qi).name}`),
    h('p', { class: 'muted small' }, 'Ngồi thiền để tích Chân khí. Khí càng nhiều, aura càng lớn; lên tầng mở thêm hiệu ứng.'),
    h('h3', { 'data-hanzi': '魚' }, 'Sổ cá'),
    fishList,
    h('h3', { 'data-hanzi': '賜' }, 'Quầy đổi quà'),
    h('p', { class: 'muted small bookx-shop-note' }, `Dùng TEU mở màu áo quý. Bạn đang có ${teuNow} TEU.`),
    shop,
    h('p', { class: 'muted small' }, 'Điểm nhịp điệu chi tiết chỉ mình bạn thấy, không có bảng xếp hạng.'),
    h('h3', { 'data-hanzi': '願' }, 'Lời ước của tôi'),
    wishList,
    h('h3', { 'data-hanzi': '籤' }, 'Quẻ đã rút'),
    fortunes,
  );
}

export function openBoard(app) {
  const list = h('ul', { class: 'board-list' });
  const sentinel = h('div', { class: 'board-more muted' }, 'Đang tải…');
  const scroller = h('div', { class: 'board-scroll' }, list, sentinel);
  let next = 0;
  let loading = false;
  let ended = false;
  const items = new Map();

  // ----- Bảng tuần: TEU, cá to, đầu hồ -----
  const weeklyWrap = h('div', { class: 'board-scroll' }, h('p', { class: 'muted' }, 'Đang tải bảng tuần…'));
  const loadWeekly = async () => {
    try {
      const res = await fetch('/api/weekly', { headers: authHeaders() });
      const data = await res.json();
      const podium = (rows, fmt) => rows?.length
        ? h('ol', { class: 'book-list' }, rows.map((r, i) => h('li', {}, h('p', {}, `${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} ${r.name}`), h('p', { class: 'meta' }, fmt(r)))))
        : h('p', { class: 'muted' }, 'Tuần này còn trống, người đầu tiên sẽ lên bảng.');
      weeklyWrap.replaceChildren(
        h('h3', {}, 'TEU tuần này'),
        podium(data.teu, (r) => `${r.teu} TEU`),
        h('h3', {}, 'Cá to nhất tuần'),
        data.fish?.length
          ? h('ul', { class: 'book-list' }, data.fish.slice(0, 5).map((f) => h('li', {},
            h('p', {}, `${fishName(f.fish_id)} — ${f.weight} kg`),
            h('p', { class: 'meta' }, `${f.name} · ${f.local_date}`))))
          : h('p', { class: 'muted' }, 'Chưa ai câu được con nào tuần này.'),
        h('h3', {}, 'Đầu hồ tuần này'),
        podium(data.pitch, (r) => `${r.score} điểm`),
        h('p', { class: 'muted small' }, 'Bảng tính từ thứ Hai, sang tuần tự về lại số 0 cho tất cả.'),
      );
    } catch {
      weeklyWrap.replaceChildren(h('p', {}, 'Chưa tải được bảng tuần, thử lại sau nhé.'));
    }
  };

  const load = async () => {
    if (loading || ended) return;
    loading = true;
    try {
      const url = next ? `/api/wishes?before=${next}&limit=30` : '/api/wishes?limit=30';
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      for (const w of data.items) list.append(renderRow(w));
      next = data.next;
      ended = !next;
      sentinel.textContent = ended ? (items.size ? 'Hết rồi. Cả nhà đã ước từng này điều.' : 'Chưa có lời ước nào, bạn viết đầu tiên nhé.') : '';
    } catch {
      sentinel.textContent = 'Chưa tải được, thử lại sau nhé.';
    }
    loading = false;
  };

  const renderRow = (w) => {
    const heart = h('button', { class: 'btn heart small', type: 'button' });
    const paint = () => {
      heart.textContent = w.liked ? `❤️ ${w.likes}` : `🤍 ${w.likes}`;
      heart.disabled = w.mine || w.liked;
    };
    paint();
    heart.addEventListener('click', async () => {
      const res = await app.net.call('wish:like', { id: w.id });
      if (res?.ok) {
        w.liked = true;
        w.likes = res.likes;
        paint();
        app.audio.pop();
        const live = app.world.wishes.byId.get(w.id);
        if (live) live.liked = true;
      } else if (res?.error) {
        app.hud.toast(res.error);
      }
    });
    const row = h('li', {}, h('p', { class: 'board-text' }, w.text),
      h('p', { class: 'meta' }, `${w.author} · ${timeAgo(w.createdAt)} · ${PLACE_LABELS[w.place]}`), heart);
    items.set(w.id, row);
    return row;
  };

  scroller.addEventListener('scroll', () => {
    if (scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 120) load();
  });

  // Hai thẻ: lời ước và bảng tuần.
  const tabWishes = h('button', { class: 'chip on', type: 'button' }, 'Bảng ước');
  const tabWeekly = h('button', { class: 'chip', type: 'button' }, 'Bảng tuần');
  tabWishes.addEventListener('click', () => {
    tabWishes.classList.add('on');
    tabWeekly.classList.remove('on');
    content.replaceChildren(scroller);
    load();
  });
  tabWeekly.addEventListener('click', () => {
    tabWeekly.classList.add('on');
    tabWishes.classList.remove('on');
    content.replaceChildren(weeklyWrap);
    loadWeekly();
  });
  const tabs = h('div', { class: 'chips board-tabs' }, tabWishes, tabWeekly);
  const content = h('div', {}, tabs, scroller);
  openModal({ title: 'Bảng ước của cả nhà', content, wide: true });
  load();
}
