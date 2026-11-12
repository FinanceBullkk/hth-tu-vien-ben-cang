// "Bảng ước của cả nhà" và Bảng tuần (TEU kiếm được, cá to, đầu hồ).
import { FISH } from '../../../shared/fish.js';
import { PLACE_LABELS } from '../../../shared/protocol.js';
import { authHeaders } from './book.js';
import { h, timeAgo } from './dom.js';
import { openModal } from './modal.js';

const fishName = (id) => FISH.find((f) => f.id === id)?.name ?? id;

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
