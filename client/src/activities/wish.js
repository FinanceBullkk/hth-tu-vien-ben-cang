// Viết lời ước: nhập nội dung, chọn nơi treo, gửi lên server rồi xem hoạt ảnh treo/thả/dán.
import { CONTAINERS, POND, TREE } from '../../../shared/layout.js';
import { LIMITS, PLACE_LABELS, WISH_PLACES } from '../../../shared/protocol.js';
import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

const TOPICS = [
  ['Gia đình', 'Mong cả nhà mình luôn khoẻ và vui.'],
  ['Sức khoẻ', 'Mong năm nay ngủ ngon, ăn ngon, ít đau lưng.'],
  ['Công việc', 'Mong mọi lô hàng về đúng hẹn.'],
  ['Bình an', 'Mong lòng mình nhẹ hơn một chút mỗi ngày.'],
];

export class WishActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.left = LIMITS.wishesPerDay;
  }

  start(place) {
    const { app } = this;
    if (!app.activities.enter(this, 'write')) return;
    this.place = WISH_PLACES.includes(place) ? place : 'tree';

    const textarea = h('textarea', {
      class: 'wish-input',
      maxLength: LIMITS.wishMax,
      rows: 3,
      placeholder: 'Mình ước…',
      'aria-label': 'Nội dung lời ước',
    });
    const counter = h('span', { class: 'wish-counter' }, `0/${LIMITS.wishMax}`);
    textarea.addEventListener('input', () => {
      counter.textContent = `${[...textarea.value].length}/${LIMITS.wishMax}`;
      error.textContent = '';
    });

    const topics = h('div', { class: 'chips' }, TOPICS.map(([label, hint]) => {
      const b = h('button', { class: 'chip', type: 'button' }, label);
      b.addEventListener('click', () => {
        textarea.placeholder = hint;
        textarea.focus();
      });
      return b;
    }));

    const placeBtns = WISH_PLACES.map((p) => {
      const b = h('button', { class: 'place-card', type: 'button', role: 'radio' },
        h('span', { class: 'place-icon' }, p === 'tree' ? '🎀' : p === 'pond' ? '🪷' : '📦'), PLACE_LABELS[p]);
      b.addEventListener('click', () => {
        this.place = p;
        paint();
      });
      return b;
    });
    const paint = () => placeBtns.forEach((b, i) => {
      const on = WISH_PLACES[i] === this.place;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    paint();

    const error = h('p', { class: 'form-error', role: 'alert' });
    const send = h('button', { class: 'btn primary big', type: 'button' }, 'Gửi lời ước');
    send.addEventListener('click', async () => {
      send.disabled = true;
      const res = await app.net.call('wish:create', { text: textarea.value, place: this.place });
      send.disabled = false;
      if (!res?.ok) {
        error.textContent = res?.error || 'Chưa gửi được, thử lại nhé.';
        return;
      }
      this.left = res.remaining;
      app.world.wishes.patch(res.id, { mine: true });
      app.mineWishIds.add(res.id);
      if (this.place === 'pond') app.audio.waterDrop();
      else if (this.place === 'tree') app.audio.rustle();
      else app.audio.paper();
      // Quay mặt về đúng chỗ lời ước vừa xuất hiện để nhìn thấy nó hiện ra.
      this.turnToward(this.place, app.world.wishes.byId.get(res.id)?.world);
      modal.close();
      app.hud.toast(res.remaining > 0 ? `Đã gửi. Hôm nay bạn còn ${res.remaining} lời ước.` : 'Đã gửi. Hôm nay bạn viết đủ 3 lời ước rồi.');
    });

    const modal = openModal({
      title: 'Viết lời ước',
      content: [
        h('p', { class: 'muted small' }, 'Lời ước hiện công khai trong công ty, kèm tên bạn.'),
        h('div', { class: 'wish-box' }, textarea, counter),
        h('p', { class: 'label' }, 'Gợi ý chủ đề'),
        topics,
        h('p', { class: 'label' }, 'Treo ở đâu?'),
        h('div', { class: 'place-grid', role: 'radiogroup', 'aria-label': 'Nơi treo lời ước' }, placeBtns),
        error,
        send,
      ],
      onClose: () => {
        if (app.activities.current === this) app.activities.exit();
      },
    });
    this.modal = modal;
    textarea.focus();
  }

  turnToward(place, slotWorld) {
    const { me } = this.app;
    const target = slotWorld ?? (place === 'pond' ? POND : place === 'container'
      ? { x: CONTAINERS.minX, z: Math.max(CONTAINERS.minZ, Math.min(CONTAINERS.maxZ, me.z)) }
      : TREE);
    me.rot = Math.atan2(target.x - me.x, target.z - me.z);
  }

  update() {}

  onKey() {
    return false;
  }

  cancel() {
    this.modal?.close();
    this.modal = null;
  }
}
