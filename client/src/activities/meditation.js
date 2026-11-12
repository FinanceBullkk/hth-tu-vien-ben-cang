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
    this.move = { x: 0, y: 0 };
    this.orb = h('button', { class: 'cultivation-orb', type: 'button', onClick: () => app.activities.exit() },
      h('img', { src: '/icons/cultivation.svg', alt: '', width: 100, height: 100, draggable: false }));
    this.progress = h('progress', { class: 'cultivation-progress', max: 1, value: 0, 'aria-label': 'Chân khí tới tầng tiếp theo' });
    this.notice = h('p', { role: 'status', class: 'cultivation-notice' });
    this.panel = h('section', { class: 'cultivation-panel', hidden: true, 'aria-label': 'Tĩnh tu tích Chân khí' },
      this.orb, this.progress, this.notice);
    $('hud').append(this.panel);
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
    this.notice.textContent = 'Đang ngồi xuống…';
    this.paint(app.me.avatar.qi ?? 0);
    // Flush the last walking position before the server locks meditation in place.
    app.net.socket.emit('move', [app.me.x, app.me.z, app.me.rot, 0]);
    const seated = await app.net.call('action:start', { kind: 'meditate', mat });
    if (generation !== this.generation) return;
    if (!seated?.ok) {
      app.hud.toast(seated?.error || 'Chưa ngồi được, thử lại nhé.');
      app.activities.exit();
      return;
    }
    this.mat = seated.mat;
    app.me.placeAt(seated.x, seated.z, seated.rot);
    app.me.avatar.setActivity(1);
    app.me.avatar.setQi(seated.qi);
    this.ready = true;
    this.notice.textContent = 'Đang ngồi yên và thở chậm. Bấm quả cầu hoặc di chuyển để đứng dậy.';
    this.onSync(seated);
    this.paint(seated.qi);
  }

  onSync({ mates = [] }) {
    this.mates = mates;
  }

  paint(qi) {
    const c = cultivation(qi);
    const amount = c.next ? `${c.qi} / ${c.next} Chân khí` : `${c.qi} Chân khí, viên mãn`;
    this.orb.title = `Tầng ${c.level} · ${c.name}\n${amount}\nBấm để đứng dậy`;
    this.orb.setAttribute('aria-label', `Đứng dậy. Tầng ${c.level} · ${c.name}. ${amount}`);
    this.progress.value = c.progress;
    this.progress.setAttribute('aria-valuetext', amount);
    if (this.ready && this.lastLevel != null && c.level > this.lastLevel) {
      this.notice.textContent = `Đột phá tầng ${c.level} · ${c.name}!`;
      this.app.audio.chime(0.06);
    }
    this.lastLevel = c.level;
    this.lastQi = c.qi;
  }

  update() {
    if (this.ready && !this.app.modalBusy() && !this.app.chat.open) {
      this.app.input.moveVector(this.move);
      if (this.move.x || this.move.y) { this.app.activities.exit(); return; }
    }
    const qi = this.app.me.avatar.qi ?? 0;
    if (qi !== this.lastQi) this.paint(qi);
  }

  onKey(code, isDown) {
    if (!isDown || this.app.modalBusy()) return false;
    if (code === 'KeyT') { this.app.chat.show(); return true; }
    if (code === 'KeyE') { this.app.activities.exit(); return true; }
    return false;
  }

  cancel() {
    ++this.generation;
    this.ready = false;
    this.lastLevel = null;
    this.panel.hidden = true;
    if (this.panel.contains(document.activeElement)) this.previousFocus?.focus?.({ preventScroll: true });
  }
}
