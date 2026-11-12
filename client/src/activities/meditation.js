import { MATS } from '../../../shared/layout.js';
import { openModal } from '../ui/modal.js';
import { h } from '../ui/dom.js';

export class MeditationActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
  }

  nearestFreeMat(x, z, range = 2.1) {
    let best = -1;
    MATS.forEach((m, i) => {
      const d = Math.hypot(m.x - x, m.z - z);
      if (!this.app.mats[i] && d < range) { best = i; range = d; }
    });
    return best;
  }

  async start(mat) {
    const { app } = this;
    if (!app.activities.enter(this)) return;
    const seated = await app.net.call('action:start', { kind: 'meditate', mat });
    if (app.activities.current !== this) return;
    if (!seated?.ok) {
      app.hud.toast(seated?.error || 'Chưa ngồi được.');
      app.activities.exit();
      return;
    }
    const m = MATS[mat];
    app.me.placeAt(m.x, m.z, m.rot);
    app.me.avatar.setActivity(1);
    app.follow.meditating = true;
    document.body.classList.add('meditating');
    this.modal = openModal({
      title: 'Ngồi thiền',
      content: h('div', { class: 'center' },
        h('p', {}, 'Hít vào chậm · giữ nhẹ · thở ra dài'),
        h('p', { class: 'muted' }, seated.mates?.length ? `Đang ngồi cùng ${seated.mates.join(', ')}` : 'Một khoảng yên cho mình.')),
      onClose: () => {
        if (app.activities.current !== this) return;
        app.activities.exit();
        if (app.input.enabled && !document.pointerLockElement) {
          app.input.canvas.requestPointerLock?.()?.catch(() => {});
        }
      },
    });
  }

  onSync() {}
  update() {}
  cancel() {
    document.body.classList.remove('meditating');
    this.app.follow.meditating = false;
    this.modal?.close();
    this.modal = null;
  }
}
