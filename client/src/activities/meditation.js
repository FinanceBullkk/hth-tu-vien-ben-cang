import { MATS } from '../../../shared/layout.js';
import { cultivation } from '../../../shared/cultivation.js';
import { h, $ } from '../ui/dom.js';

export class MeditationActivity {
  constructor(app) {
    this.app = app;
    this.kind = 'meditate';
    this.lockMove = true;
    this.generation = 0;
    this.mates = [];
    this.heading = h('h2', { class: 'ink-title' }, 'Tĩnh tu');
    this.amount = h('strong', { class: 'cultivation-amount' });
    this.progress = h('progress', { max: 1, value: 0, 'aria-label': 'Tiến độ tới tầng tiếp theo' });
    this.hint = h('p', { class: 'cultivation-hint' });
    this.company = h('p', { class: 'cultivation-company' });
    this.notice = h('p', { role: 'status', class: 'cultivation-notice' });
    this.lotus = h('button', { class: 'btn ghost', type: 'button', onClick: () => this.playRhythm() }, 'Chơi Nhịp sen');
    this.leave = h('button', { class: 'btn primary', type: 'button', onClick: () => app.activities.exit() }, 'Đứng dậy');
    this.panel = h('section', { class: 'cultivation-panel ink-panel', hidden: true, tabIndex: -1, 'aria-label': 'Tĩnh tu tích Chân khí' },
      h('span', { class: 'cultivation-eyebrow' }, 'TĨNH TÂM · DƯỠNG KHÍ'), this.heading, this.amount, this.progress,
      this.hint, this.notice, this.company,
      h('p', { class: 'cultivation-help' }, 'Mỗi 6 giây nhận 1 Chân khí. Đứng dậy vẫn giữ tiến độ.'),
      h('div', { class: 'cultivation-actions' }, this.lotus, this.leave));
    $('rhythmLayer').append(this.panel);
  }

  nearestFreeMat(x, z, range = 2.1) {
    let best = -1;
    MATS.forEach((m, i) => { const d = Math.hypot(m.x - x, m.z - z); if (!this.app.mats[i] && d < range) { best = i; range = d; } });
    return best;
  }

  async start(mat) {
    const { app } = this;
    if (!app.activities.enter(this)) return;
    const generation = ++this.generation;
    this.mat = mat;
    this.ready = false;
    this.previousFocus = document.activeElement;
    this.panel.hidden = false;
    this.panel.focus({ preventScroll: true });
    document.body.classList.add('meditating');
    this.notice.textContent = 'Đang chọn chiếu…';
    this.lotus.disabled = true;
    this.paint(app.me.avatar.qi ?? 0);
    if (app.chat.open) app.chat.close();
    const seated = await app.net.call('action:start', { kind: 'meditate', mat });
    if (generation !== this.generation) return;
    if (!seated?.ok) {
      app.hud.toast(seated?.error || 'Chưa ngồi được, thử lại nhé.');
      app.activities.exit();
      return;
    }
    const m = MATS[mat];
    app.me.placeAt(m.x, m.z, m.rot);
    app.me.avatar.setActivity(1);
    app.me.avatar.setQi(seated.qi);
    app.follow.meditating = true;
    this.ready = true;
    this.lotus.disabled = false;
    this.notice.textContent = 'Khí tụ theo từng nhịp thở…';
    this.onSync(seated);
    this.paint(seated.qi);
  }

  onSync({ mates = [] }) {
    this.mates = mates;
    this.company.textContent = mates.length ? `Đồng tu cùng ${mates.join(', ')}` : 'Một khoảng yên cho riêng mình';
  }

  paint(qi) {
    const c = cultivation(qi);
    this.heading.textContent = `Tầng ${c.level} · ${c.name}`;
    this.amount.textContent = `${c.qi.toLocaleString('vi-VN')} Chân khí`;
    this.progress.value = c.progress;
    this.progress.setAttribute('aria-valuetext', c.next ? `${c.qi} / ${c.next} Chân khí` : 'Đã đạt tầng cao nhất');
    this.hint.textContent = c.next ? `Còn ${c.next - c.qi} khí để đột phá tầng ${c.level + 1}` : 'Viên mãn · tiếp tục tích khí để aura đầy hơn';
    if (this.ready && this.lastLevel != null && c.level > this.lastLevel) {
      this.notice.textContent = `Đột phá tầng ${c.level} · ${c.name}!`;
      this.app.audio.chime(0.06);
    }
    this.lastLevel = c.level;
    this.lastQi = c.qi;
  }

  update() {
    const qi = this.app.me.avatar.qi ?? 0;
    if (qi !== this.lastQi) this.paint(qi);
  }

  playRhythm() {
    if (!this.ready) return;
    const mat = this.mat;
    const mates = this.mates;
    this.app.activities.current = null;
    this.cancel();
    this.app.activities.lotus.start(mat, { ok: true, mates });
  }

  cancel() {
    ++this.generation;
    this.ready = false;
    this.lastLevel = null;
    this.panel.hidden = true;
    document.body.classList.remove('meditating');
    this.app.follow.meditating = false;
    this.previousFocus?.focus?.({ preventScroll: true });
  }
}
