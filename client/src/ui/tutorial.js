// Hướng dẫn 3 bước cho lần đầu vào, có nút Bỏ qua. Không chặn người chơi đi lại.
import { $, h } from './dom.js';

export function showTutorial(store, isTouch) {
  if (store.get('tutorialDone') === '1') return;
  const steps = isTouch
    ? [
      ['Đi lại', 'Kéo cần ảo góc trái để đi, kéo nửa màn hình bên phải để xoay góc nhìn.'],
      ['Chơi gì?', 'Chạm nút Chơi gì? ở góc trên, chọn một trò là game đưa bạn tới ngay.'],
      ['Tự dạo chơi', 'Đi tới gần chỗ nào có nút to hiện ở góc dưới bên phải, chạm một lần là chơi.'],
    ]
    : [
      ['Đi lại', 'Dùng WASD hoặc phím mũi tên để đi. Giữ chuột phải (hoặc trái) rồi kéo để xoay góc nhìn, lăn chuột để zoom.'],
      ['Chơi gì?', 'Bấm nút Chơi gì? ở góc trên, chọn một trò là game đưa bạn tới ngay.'],
      ['Tự dạo chơi', 'Đi tới gần chỗ nào có nút to hiện giữa màn hình, bấm nút hoặc phím E là chơi. Phím T để chat.'],
    ];
  let i = 0;
  const title = h('h3');
  const text = h('p');
  const count = h('span', { class: 'tut-count' });
  const next = h('button', { class: 'btn primary', type: 'button' }, 'Tiếp');
  const skip = h('button', { class: 'btn ghost', type: 'button' }, 'Bỏ qua');
  const card = h('div', { class: 'tutorial' }, count, title, text, h('div', { class: 'tut-actions' }, skip, next));

  const finish = () => {
    store.set('tutorialDone', '1');
    card.remove();
  };
  const render = () => {
    count.textContent = `Bước ${i + 1}/${steps.length}`;
    title.textContent = steps[i][0];
    text.textContent = steps[i][1];
    next.textContent = i === steps.length - 1 ? 'Lên đường' : 'Tiếp';
  };
  next.addEventListener('click', () => {
    i += 1;
    if (i >= steps.length) finish();
    else render();
  });
  skip.addEventListener('click', finish);
  render();
  $('hud').append(card);
}
