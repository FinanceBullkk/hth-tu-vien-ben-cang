// "Sổ an của tôi" và "Bảng ước của cả nhà".
import { PLACE_LABELS } from '../../../shared/protocol.js';
import { h, store, timeAgo } from './dom.js';
import { openModal } from './modal.js';

const authHeaders = () => {
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

export async function openBook(app) {
  const body = h('div', {}, h('p', { class: 'muted' }, 'Đang mở Sổ…'));
  const modal = openModal({ title: 'Sổ an của tôi', content: body, wide: true });
  let book;
  try {
    book = await fetchBook();
  } catch {
    body.replaceChildren(h('p', {}, 'Chưa mở được Sổ, thử lại sau nhé.'));
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
    ? h('ul', { class: 'book-list' }, book.fortunes.map((f) => h('li', {}, h('p', {}, f.text), h('p', { class: 'meta' }, `${f.date} · Số B/L ${f.bl}`))))
    : h('p', { class: 'muted' }, 'Chưa rút quẻ nào. Quán trà đang chờ bạn.');

  body.replaceChildren(
    h('div', { class: 'stats' },
      stat('lần lên tu viện', book.visits),
      stat('Tâm an cao nhất', book.meditation.best),
      stat('Tâm an gần nhất', book.meditation.last),
      stat('lần thỉnh chuông', book.bellCount),
      stat('sự kiện chuông đã cùng', book.bellEvents)),
    h('p', { class: 'muted small' }, 'Điểm Tâm an chỉ mình bạn thấy, không so với ai.'),
    h('h3', {}, 'Lời ước của tôi'),
    wishList,
    h('h3', {}, 'Quẻ đã rút'),
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
  openModal({ title: 'Bảng ước của cả nhà', content: scroller, wide: true });
  load();
}
