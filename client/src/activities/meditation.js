// Ngồi thiền hít thở: giữ khi hít, thả khi thở; nhịp chung theo server khi có nhiều người ngồi.
import { MATS } from '../../../shared/layout.js';
import { BREATH } from '../../../shared/protocol.js';
import { $, h } from '../ui/dom.js';

const GRACE_MS = 300;

export class MeditationActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.root = $('medLayer');
    this.circle = h('div', { class: 'med-circle' });
    this.phaseEl = h('div', { class: 'med-phase' });
    this.cycleEl = h('p', { class: 'med-cycle' });
    this.matesEl = h('p', { class: 'med-mates' });
    this.holdBtn = h('button', { class: 'btn primary big med-hold', type: 'button' }, 'Giữ để hít vào');
    this.stopBtn = h('button', { class: 'btn ghost', type: 'button' }, 'Đứng dậy');
    this.resultEl = h('div', { class: 'med-result', hidden: true });
    this.root.append(
      h('div', { class: 'med-stage' }, this.circle, this.phaseEl),
      this.cycleEl, this.matesEl, this.resultEl, this.holdBtn, this.stopBtn,
    );
    const press = (e) => {
      e.preventDefault();
      this.setPressed(true);
    };
    const release = () => this.setPressed(false);
    this.holdBtn.addEventListener('pointerdown', press);
    this.holdBtn.addEventListener('pointerup', release);
    this.holdBtn.addEventListener('pointercancel', release);
    this.holdBtn.addEventListener('pointerleave', release);
    this.stopBtn.addEventListener('click', () => this.app.activities.exit());
    this.state = 'idle';
  }

  /** Chiếu trống gần nhất trong tầm với, hoặc -1. */
  nearestFreeMat(x, z, range = 2.1) {
    let best = -1;
    let bestD = range;
    MATS.forEach((m, i) => {
      if (this.app.mats[i]) return;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  async start(mat) {
    const { app } = this;
    if (!app.activities.enter(this, null)) return;
    this.state = 'joining';
    const res = await app.net.call('action:start', { kind: 'meditate', mat });
    if (!res?.ok) {
      app.hud.toast(res?.error || 'Chưa ngồi được, thử lại nhé.');
      app.activities.exit();
      return;
    }
    const m = MATS[mat];
    app.me.placeAt(m.x, m.z, m.rot);
    app.me.avatar.setActivity(1);
    document.body.classList.add('meditating');
    this.root.hidden = false;
    this.resultEl.hidden = true;
    this.circle.hidden = false;
    this.phaseEl.hidden = false;
    this.holdBtn.hidden = false;
    this.stopBtn.textContent = 'Đứng dậy';
    this.matesEl.textContent = '';
    this.setPressed(false);
    this.setEpoch(res.epoch);
    this.good = 0;
    this.total = 0;
    this.lastCycle = -1;
    this.lastStage = '';
    this.pressLate = [];
    this.pressSeen = false;
    this.releaseSeen = false;
    this.state = 'running';
    if (app.chat.open) app.chat.close();
  }

  setEpoch(epoch) {
    this.epoch = epoch;
    const now = this.app.net.now();
    // Vào giữa chừng thì chờ chu kì kế để bắt đầu cùng mọi người.
    this.startAt = now <= epoch ? epoch : epoch + Math.ceil((now - epoch) / BREATH.cycle) * BREATH.cycle;
  }

  onSync({ epoch, mates }) {
    if (this.state !== 'running') return;
    if (epoch !== this.epoch) this.setEpoch(epoch);
    this.matesEl.textContent = mates.length ? `Đang ngồi cùng ${mates.join(', ')}` : '';
  }

  setPressed(v) {
    if (this.pressed === v) return;
    this.pressed = v;
    this.holdBtn.classList.toggle('pressed', v);
    if (this.state !== 'running') return;
    const now = this.app.net.now();
    const p = now - this.startAt;
    if (p < 0) return;
    const inCycle = p % BREATH.cycle;
    // Ghi độ lệch so với nhịp để chấm độ đều.
    if (v && !this.pressSeen) {
      this.pressSeen = true;
      this.pressLate.push(inCycle > BREATH.cycle / 2 ? inCycle - BREATH.cycle : inCycle);
    } else if (!v && !this.releaseSeen) {
      this.releaseSeen = true;
      this.pressLate.push(inCycle - (BREATH.inhale + BREATH.hold));
    }
  }

  onKey(code, isDown) {
    if (code !== 'Space' && code !== 'KeyE') return false;
    if (this.state === 'running') this.setPressed(isDown);
    return true;
  }

  update(dt) {
    if (this.state !== 'running') return;
    const { app } = this;
    const now = app.net.now();
    const p = now - this.startAt;
    if (p < 0) {
      this.phaseEl.textContent = 'Chuẩn bị';
      this.cycleEl.textContent = `Bắt đầu sau ${Math.ceil(-p / 1000)} giây`;
      this.circle.style.transform = 'scale(0.55)';
      return;
    }
    const cycle = Math.floor(p / BREATH.cycle);
    if (cycle >= BREATH.cycles) {
      this.finish();
      return;
    }
    const inCycle = p % BREATH.cycle;
    if (cycle !== this.lastCycle) {
      this.lastCycle = cycle;
      this.pressSeen = false;
      this.releaseSeen = false;
      this.cycleEl.textContent = `Hơi thở ${cycle + 1}/${BREATH.cycles}`;
    }
    let stage;
    let scale;
    if (inCycle < BREATH.inhale) {
      stage = 'Hít vào';
      scale = 0.55 + 0.45 * (inCycle / BREATH.inhale);
    } else if (inCycle < BREATH.inhale + BREATH.hold) {
      stage = 'Giữ';
      scale = 1;
    } else {
      stage = 'Thở ra';
      scale = 1 - 0.45 * ((inCycle - BREATH.inhale - BREATH.hold) / BREATH.exhale);
    }
    if (stage !== this.lastStage) {
      if (stage === 'Hít vào') app.audio.breath(true);
      if (stage === 'Thở ra') app.audio.breath(false);
      this.lastStage = stage;
      this.phaseEl.textContent = stage;
      this.holdBtn.textContent = stage === 'Thở ra' ? 'Thả tay, thở ra' : 'Giữ để hít vào';
    }
    this.circle.style.transform = `scale(${scale.toFixed(3)})`;

    // Bỏ qua khoảng ngắn quanh lúc đổi nhịp để không phạt phản xạ tự nhiên.
    const boundary = BREATH.inhale + BREATH.hold;
    const nearEdge = inCycle < GRACE_MS || inCycle > BREATH.cycle - GRACE_MS || Math.abs(inCycle - boundary) < GRACE_MS;
    if (!nearEdge) {
      const want = inCycle < boundary;
      this.total += dt;
      if (Boolean(this.pressed) === want) this.good += dt;
    }
  }

  score() {
    // Không bấm gì vẫn khớp được phần "thở ra", nên chỉ tính phần vượt 50%.
    const frac = this.total > 0 ? this.good / this.total : 0;
    const base = Math.max(0, (frac - 0.5) * 2);
    const late = this.pressLate;
    let steady = 0;
    if (late.length >= 2) {
      const mean = late.reduce((a, b) => a + b, 0) / late.length;
      const sd = Math.sqrt(late.reduce((a, b) => a + (b - mean) ** 2, 0) / late.length);
      steady = Math.max(0, 1 - sd / 1000);
    }
    return Math.round(100 * base * (0.85 + 0.15 * steady));
  }

  async finish() {
    this.state = 'done';
    const { app } = this;
    const score = this.score();
    const res = await app.net.call('meditation:finish', { score });
    if (this.state !== 'done') return;
    this.circle.hidden = true;
    this.phaseEl.hidden = true;
    this.holdBtn.hidden = true;
    this.cycleEl.textContent = '';
    this.resultEl.replaceChildren(
      h('p', { class: 'med-score-label' }, 'Tâm an'),
      h('p', { class: 'med-score' }, String(score)),
      h('p', { class: 'med-phrase' }, res?.phrase || 'Một phút cho mình, vậy là đủ tốt rồi.'),
      h('p', { class: 'muted small' }, 'Điểm này chỉ mình bạn thấy.'),
    );
    this.resultEl.hidden = false;
    app.audio.chime(0.1);
  }

  cancel() {
    this.state = 'idle';
    this.pressed = false;
    this.root.hidden = true;
    document.body.classList.remove('meditating');
    this.app.me.avatar.setActivity(0);
  }
}
