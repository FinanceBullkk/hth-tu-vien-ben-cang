// Menu "Chơi gì?": người không quen game khỏi phải tự đi tìm, chọn một trò là được đưa tới và bắt đầu.
import { PLACES } from '../../../shared/layout.js';
import { h, store } from './dom.js';
import { inkIcon } from './ink-icons.js';
import { openModal } from './modal.js';

// Icon nét cho từng chỗ chơi (thay emoji trong PLACES để bảng đồng bộ với HUD).
const PLACE_ICONS = { melody: 'music', fish: 'fish', bell: 'bell', mat: 'lotus', pitch: 'pot', tea: 'sticks', tree: 'tree' };

const SEEN_KEY = 'placesMenuSeen';
const FADE_MS = 240;

/** Mờ màn hình một nhịp rồi đổi chỗ, để không giật hình và người chơi hiểu mình vừa được đưa đi. */
function travel(app, place) {
  if (place.key === 'mat') {
    if (app.activities.current) app.activities.exit();
    app.activities.meditation.start();
    return;
  }
  const veil = h('div', { class: 'place-veil' });
  document.body.append(veil);
  requestAnimationFrame(() => veil.classList.add('on'));
  setTimeout(() => {
    if (app.activities.current) app.activities.exit();
    const { me } = app;
    me.placeAt(place.x, place.z, me.rot);
    // Gửi chắc chắn (không volatile) để server biết chỗ mới trước khi trò chơi hỏi tới.
    app.net.socket.emit('move', [place.x, place.z, me.rot, 0]);
    app.activities.zoneAt(place.x, place.z)?.run();
    veil.classList.remove('on');
    setTimeout(() => veil.remove(), FADE_MS + 60);
  }, FADE_MS);
}

export function openPlacesMenu(app) {
  store.set(SEEN_KEY, '1');
  document.getElementById('playBtn')?.classList.remove('nudge');
  // Lưới icon: mỗi ô một biểu tượng + tên ngắn, mô tả nằm trong tooltip (title).
  // "Ngồi thiền" (key 'mat') cũng là thiền tại chỗ nên gộp làm một ô "Thiền tại chỗ".
  const tile = (icon, name, desc, onPick) => h('li', {},
    h('button', { type: 'button', class: 'place-tile', title: desc, onClick: () => { modal.close(); onPick(); } },
      inkIcon(icon),
      h('b', {}, name)));
  const modal = openModal({
    title: 'Chơi gì?',
    content: h('ul', { class: 'place-grid-menu' },
      tile('lotus', 'Thiền tại chỗ', 'Ngồi ngay đây, tích Chân khí và tăng tầng', () => {
        if (app.activities.current) app.activities.exit();
        app.activities.meditation.start();
      }),
      PLACES.filter((place) => place.key !== 'mat').map((place) => tile(PLACE_ICONS[place.key] ?? 'compass', place.name, place.desc, () => travel(app, place)))),
  });
}

/** Người mới: nút nhấp nháy nhẹ cho tới lần bấm đầu tiên. */
export function nudgePlacesMenu() {
  if (store.get(SEEN_KEY) !== '1') document.getElementById('playBtn')?.classList.add('nudge');
}
