// Menu "Chơi gì?": người không quen game khỏi phải tự đi tìm, chọn một trò là được đưa tới và bắt đầu.
import { PLACES } from '../../../shared/layout.js';
import { h, store } from './dom.js';
import { openModal } from './modal.js';

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
  const modal = openModal({
    title: 'Hôm nay chơi gì?',
    content: h('ul', { class: 'place-list' },
      h('li', {}, h('button', {
        type: 'button', class: 'place-row',
        onClick: () => {
          modal.close();
          if (app.activities.current) app.activities.exit();
          app.activities.meditation.start();
        },
      }, h('span', { class: 'place-text' }, h('b', {}, 'Thiền tại chỗ'), h('small', {}, 'Ngồi ngay đây, tích Chân khí và tăng tầng')))),
      PLACES.map((place) => h('li', {},
      h('button', {
        type: 'button',
        class: 'place-row',
        onClick: () => { modal.close(); travel(app, place); },
      },
      h('span', { class: 'place-icon', 'aria-hidden': 'true' }, place.icon),
      h('span', { class: 'place-text' }, h('b', {}, place.name), h('small', {}, place.desc)))))),
  });
}

/** Người mới: nút nhấp nháy nhẹ cho tới lần bấm đầu tiên. */
export function nudgePlacesMenu() {
  if (store.get(SEEN_KEY) !== '1') document.getElementById('playBtn')?.classList.add('nudge');
}
