// Rút xăm: chạm giữ để lắc ống xăm; kết quả là thẻ lời chúc, không dùng mẫu logistics.
import { renderFortuneCard } from '../share/share.js';
import { downloadBlob, h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

const HOLD_SECONDS = 1.7;
const SHAKE_THRESHOLD = 16;

export class FortuneActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.holding = false;
    this.progress = 0;
    this.drawing = false;
    this.rattleTimer = 0;
    this.onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0);
      if (mag > SHAKE_THRESHOLD + 9.8) this.shakeUntil = performance.now() + 200;
    };
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'shake')) return;
    this.progress = 0;
    this.holding = false;
    this.drawing = false;
    this.shakeUntil = 0;

    this.tube = h('div', { class: 'tube', 'aria-hidden': 'true' },
      h('div', { class: 'tube-sticks' }, h('i'), h('i'), h('i'), h('i'), h('i')),
      h('div', { class: 'tube-body' }, 'HTH'));
    this.bar = h('div', { class: 'hold-fill' });
    this.holdBtn = h('button', { class: 'btn primary big', type: 'button' }, 'Giữ để lắc ống xăm');
    const press = (e) => {
      e.preventDefault();
      this.holding = true;
      this.#askMotion();
    };
    const release = () => {
      this.holding = false;
    };
    this.holdBtn.addEventListener('pointerdown', press);
    this.holdBtn.addEventListener('pointerup', release);
    this.holdBtn.addEventListener('pointercancel', release);
    this.holdBtn.addEventListener('pointerleave', release);

    this.body = h('div', { class: 'fortune-stage' },
      this.tube,
      h('div', { class: 'hold-bar' }, this.bar),
      this.holdBtn,
      h('p', { class: 'muted small center' }, 'Mỗi người 1 quẻ một ngày. Mang tính giải trí.'));
    this.modal = openModal({
      title: 'Rút xăm',
      content: this.body,
      onClose: () => {
        if (app.activities.current === this) app.activities.exit();
      },
    });
    window.addEventListener('devicemotion', this.onMotion);
  }

  /** iOS yêu cầu xin quyền cảm biến từ một lần chạm. Bị từ chối thì vẫn chạm giữ được. */
  #askMotion() {
    const DM = window.DeviceMotionEvent;
    if (this.motionAsked || !DM || typeof DM.requestPermission !== 'function') return;
    this.motionAsked = true;
    DM.requestPermission().catch(() => {});
  }

  onKey(code, isDown) {
    if (code === 'Space' || code === 'KeyE') {
      this.holding = isDown;
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.drawing) return;
    const shaking = this.holding || performance.now() < this.shakeUntil;
    this.tube.classList.toggle('shaking', shaking);
    if (shaking) {
      this.progress += dt / HOLD_SECONDS;
      this.rattleTimer -= dt;
      if (this.rattleTimer <= 0) {
        this.rattleTimer = 0.17;
        this.app.audio.rattle();
      }
    } else {
      this.progress = Math.max(0, this.progress - dt * 0.5);
    }
    this.bar.style.width = `${Math.min(100, this.progress * 100)}%`;
    if (this.progress >= 1) this.draw();
  }

  async draw() {
    this.drawing = true;
    const { app } = this;
    this.tube.classList.remove('shaking');
    app.audio.stickDrop();
    const res = await app.net.call('fortune:draw');
    if (!res?.ok) {
      this.body.replaceChildren(h('p', {}, res?.error || 'Chưa rút được quẻ, thử lại nhé.'));
      return;
    }
    if (!this.modal?.el.isConnected) return;
    this.showCard(res);
  }

  showCard(f) {
    const { app } = this;
    const download = h('button', { class: 'btn primary', type: 'button' }, 'Tải thẻ lời chúc');
    download.addEventListener('click', async () => {
      const canvas = renderFortuneCard(f);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      canvas.width = 0;
      if (blob) downloadBlob(blob, `the-loi-chuc-${f.date}.png`);
    });
    this.body.replaceChildren(
      f.already ? h('p', { class: 'muted small center' }, 'Quẻ hôm nay của bạn đây. Mai quay lại nhé.') : '',
      h('article', { class: 'bl-card' },
        h('header', { class: 'bl-head' }, h('b', {}, 'LỜI CHÚC HÔM NAY')),
        h('div', { class: 'bl-goods' }, h('p', {}, f.text)),
        h('footer', { class: 'bl-foot' }, `Ngày ${f.date} · Mang tính giải trí`)),
      h('div', { class: 'row-center' }, download),
    );
    app.audio.paper();
  }

  cancel() {
    window.removeEventListener('devicemotion', this.onMotion);
    this.modal?.close();
    this.modal = null;
  }
}
