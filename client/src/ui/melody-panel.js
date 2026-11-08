import { MELODY } from '../../../shared/melody.js';
import { h, store } from './dom.js';
import { MelodyField, MELODY_COLORS, MELODY_LANES } from './melody-field.js';

const WORDS = { perfect: 'Perfect', great: 'Great', good: 'Good', miss: 'Miss' };

export class MelodyPanel {
  constructor(onBegin, onNote, onExit, onVolume) {
    this.root = h('section', { class: 'melody-panel', hidden: true, tabIndex: -1, 'aria-label': 'Tấu nhạc bên hồ' });
    this.score = h('strong', {}, '0'); this.combo = h('strong', {}, '0');
    this.clock = h('span', { class: 'melody-clock' }, '1:55');
    this.progress = h('progress', { max: MELODY.durationMs, value: 0, 'aria-label': 'Tiến độ bản nhạc' });
    this.exit = h('button', { type: 'button', class: 'btn ghost', onClick: onExit }, 'Rời sân · Esc');
    this.readout = h('p', { class: 'melody-feedback', 'aria-hidden': 'true' });
    this.canvas = h('canvas', { class: 'melody-notes', 'aria-hidden': 'true' });
    this.field = new MelodyField(this.canvas);
    this.pointers = new Map();
    this.controls = h('div', { class: 'melody-keys', 'aria-label': 'Sáu phím đàn' }, MELODY.labels.map((key, lane) => {
      const button = h('button', { type: 'button', 'aria-label': `Nốt ${key}: bấm hoặc giữ` }, h('kbd', {}, key));
      button.style.setProperty('--lane-x', `${MELODY_LANES[lane] * 100}%`);
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        const occupied = [...this.pointers.values()].includes(lane);
        this.pointers.set(event.pointerId, lane);
        if (!occupied) onNote(lane, true, 'pointer');
      });
      const release = (event) => {
        if (!this.pointers.delete(event.pointerId)) return;
        if (![...this.pointers.values()].includes(lane)) onNote(lane, false, 'pointer');
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('keydown', (event) => {
        if (!['Space', 'Enter'].includes(event.code)) return;
        event.preventDefault(); if (!event.repeat) onNote(lane, true, 'button');
      });
      button.addEventListener('keyup', (event) => {
        if (!['Space', 'Enter'].includes(event.code)) return;
        event.preventDefault(); onNote(lane, false, 'button');
      });
      button.addEventListener('blur', () => onNote(lane, false, 'button'));
      button.addEventListener('click', (event) => {
        if (event.detail !== 0) return;
        onNote(lane, true, 'assistive'); onNote(lane, false, 'assistive');
      });
      return button;
    }));
    this.message = h('p', { role: 'status' }, 'Đang tải bản nhạc…');
    this.heading = h('h2', {}, 'Tấu nhạc');
    this.instructions = h('div', { class: 'melody-instructions' },
      h('p', {}, 'S D F · J K L'),
      h('p', {}, 'Bấm khi nốt chạm vòng. Giữ phím với dải xanh.'),
      h('small', {}, 'Điện thoại: chạm và giữ nút tương ứng.'));
    this.breakdown = h('div', { class: 'melody-breakdown', hidden: true });
    this.beginButton = h('button', { type: 'button', class: 'btn', disabled: true, onClick: onBegin }, 'Bắt đầu');
    this.card = h('div', { class: 'melody-card' },
      this.heading, this.message, this.instructions, this.breakdown, this.beginButton);
    this.volumeInput = this.slider('melodyVolume', 60, 'Âm lượng nhạc', () => onVolume(this.volume()));
    // The source is a gameplay recording; extra cues are opt-in to avoid doubling recorded effects.
    this.sfxInput = this.slider('melodySfxVolume', 0, 'Âm lượng báo nốt thêm');
    this.sound = h('details', { class: 'melody-sound' }, h('summary', {}, 'Âm thanh'),
      h('div', { class: 'melody-sound-body' }, h('label', {}, 'Nhạc', this.volumeInput),
        h('label', {}, 'Báo nốt thêm', this.sfxInput),
        h('small', {}, 'Bản thu giữ âm thanh trong clip. Bật báo nốt thêm nếu muốn phản hồi rõ hơn.')));
    this.root.append(this.progress, h('header', {},
      h('div', { class: 'melody-title' }, h('h1', {}, MELODY.title)), this.exit),
      h('div', { class: 'melody-score' }, h('small', {}, 'Điểm'), this.score),
      h('div', { class: 'melody-combo' }, h('small', {}, 'Combo'), this.combo),
      this.readout, this.canvas, this.controls, this.card,
      h('footer', {}, this.sound, this.clock));
    document.getElementById('app').append(this.root);
  }

  slider(key, fallback, label, change = () => {}) {
    const saved = Number(store.get(key) ?? fallback);
    const input = h('input', { type: 'range', min: 0, max: 100,
      value: Number.isFinite(saved) ? Math.max(0, Math.min(100, saved)) : fallback, 'aria-label': label });
    input.addEventListener('input', () => { store.set(key, input.value); change(); });
    return input;
  }
  volume() { return Number(this.volumeInput.value) / 100; }
  sfxVolume() { return Number(this.sfxInput.value) / 100; }

  show() {
    this.previousFocus = document.activeElement;
    this.root.hidden = false; document.body.classList.add('melody-playing');
    this.root.focus({ preventScroll: true }); this.busy('Đang tải bản nhạc…');
    this.heading.textContent = 'Tấu nhạc'; this.instructions.hidden = false; this.breakdown.hidden = true;
    this.clock.textContent = '1:55'; this.root.classList.remove('is-result');
    this.readout.textContent = ''; this.score.textContent = this.combo.textContent = '0';
    this.progress.value = 0; this.field.flashes.clear(); this.pointers.clear();
  }
  ready() {
    this.message.textContent = 'Đàn nhị · 1 phút 55 giây';
    this.beginButton.textContent = 'Bắt đầu'; this.beginButton.disabled = false;
    this.beginButton.focus({ preventScroll: true });
  }
  busy(text) {
    this.root.classList.remove('is-playing'); this.card.hidden = false;
    this.controls.hidden = true; this.canvas.hidden = true;
    this.message.textContent = text; this.beginButton.disabled = true;
  }
  error(text, label = 'Thử lại') {
    this.busy(text); this.beginButton.disabled = false; this.beginButton.textContent = label;
    this.beginButton.focus({ preventScroll: true });
  }
  begin() {
    this.root.classList.remove('is-result');
    this.root.classList.add('is-playing'); this.card.hidden = true;
    this.controls.hidden = false; this.canvas.hidden = false; this.sound.open = false;
    this.field.flashes.clear(); this.pointers.clear(); this.root.focus({ preventScroll: true });
  }
  flash(lane, grade) { this.field.flash(lane, grade); }
  feedback(grade) {
    this.readout.textContent = WORDS[grade]; this.readout.style.color = MELODY_COLORS[grade];
    this.readout.getAnimations().forEach((animation) => animation.cancel());
    if (!this.field.motion.matches) this.readout.animate([
      { opacity: 0, transform: 'translateY(6px) scale(.94)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.18 },
      { opacity: 0, transform: 'translateY(-6px) scale(1)' },
    ], { duration: 650, fill: 'forwards' });
    this.feedbackAt = performance.now();
  }
  stats(summary, elapsed) {
    this.score.textContent = String(summary.points); this.combo.textContent = String(summary.combo);
    this.progress.value = Math.max(0, elapsed);
    const left = Math.ceil(Math.max(0, MELODY.durationMs - Math.max(0, elapsed)) / 1000);
    this.clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (elapsed < 0) {
      this.readout.getAnimations().forEach((a) => a.cancel());
      this.readout.style.color = MELODY_COLORS.perfect;
      this.readout.textContent = `Sẵn sàng · ${Math.ceil(-elapsed / 1000)}`;
    } else if (performance.now() - (this.feedbackAt || 0) > 700) this.readout.textContent = '';
  }
  draw(...args) { this.field.draw(...args); }
  result(summary) {
    this.busy(`${summary.score}% chính xác · Nhận ${summary.teu} TEU`);
    this.root.classList.add('is-result');
    this.heading.textContent = 'Hoàn thành'; this.instructions.hidden = true; this.breakdown.hidden = false;
    this.breakdown.replaceChildren(...Object.entries(WORDS).map(([grade, label]) =>
      h('div', {}, h('small', { style: `color:${MELODY_COLORS[grade]}` }, label), h('strong', {}, summary[grade]))),
    h('p', {}, `Combo cao nhất · ${summary.maxCombo}`));
    this.score.textContent = String(summary.points); this.combo.textContent = String(summary.maxCombo);
    this.progress.value = MELODY.durationMs; this.clock.textContent = '0:00'; this.readout.textContent = '';
    this.beginButton.textContent = 'Chơi lại'; this.beginButton.disabled = false;
    this.beginButton.focus({ preventScroll: true });
  }
  hide() {
    this.pointers.clear(); this.root.hidden = true; document.body.classList.remove('melody-playing');
    this.previousFocus?.focus?.({ preventScroll: true });
  }
}
