// Panel Audition: hiện chuỗi cần nhập, chuỗi đã nhập và thanh nhịp để chốt Space.
import { $, h } from './dom.js';
import { ARROWS, RHYTHM } from '../../../shared/rhythm.js';

export class RhythmPanel {
  constructor(kind, onArrow, onCommit, onExit, onRetry) {
    this.root = h('section', { class: `rhythm-panel ink-panel ${kind}`, hidden: true, tabIndex: -1, 'aria-label': 'Audition chuông' });
    this.title = h('h2', { class: 'ink-title' }, 'Audition chuông', h('span', { class: 'seal' }, '鐘'));
    this.round = h('span', { class: 'rhythm-round' });
    this.score = h('span', { class: 'teu-chip' }, '0 điểm');
    this.combo = h('span', { class: 'rhythm-combo' }, 'Combo 0');
    this.pattern = h('p', { class: 'rhythm-feedback', role: 'status' });
    this.entered = h('p', { class: 'rhythm-status' }, 'Nhập chuỗi mũi tên');
    this.canvas = h('canvas', { class: 'rhythm-lanes', 'aria-hidden': 'true' });
    this.ctx = this.canvas.getContext('2d');
    const arrows = [0, 1, 2, 3].map((i) => h('button', { type: 'button', class: 'rhythm-arrow', 'aria-label': ARROWS[i], onClick: () => onArrow(i) }, ARROWS[i]));
    this.commit = h('button', { type: 'button', class: 'btn primary', onClick: onCommit }, 'Chốt nhịp');
    this.controls = h('div', { class: 'rhythm-controls' }, ...arrows, this.commit);
    this.retry = h('button', { type: 'button', class: 'btn ghost', hidden: true, onClick: onRetry }, 'Thử lưu lại');
    this.leave = h('button', { type: 'button', class: 'btn ghost', onClick: onExit }, 'Rời lượt chơi');
    this.root.append(h('header', {}, this.title, this.round), h('div', { class: 'rhythm-stats' }, this.score, this.combo), this.pattern, this.entered, this.canvas, this.controls, h('div', { class: 'rhythm-actions' }, this.retry, this.leave));
    $('rhythmLayer').append(this.root);
  }

  show() {
    this.previousFocus = document.activeElement;
    this.root.hidden = false;
    this.controls.hidden = false;
    this.retry.hidden = true;
    this.leave.textContent = 'Rời lượt chơi';
    this.root.focus({ preventScroll: true });
    document.body.classList.add('rhythm-playing');
  }

  sequence(pattern, entered) {
    this.pattern.textContent = pattern.map((n) => ARROWS[n]).join('  ');
    this.entered.textContent = entered.length ? entered.map((n) => ARROWS[n]).join('  ') : 'Nhập chuỗi mũi tên';
  }

  draw(now, target) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 500;
    const height = 90;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = height * dpr;
      this.canvas.style.height = `${height}px`; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const g = this.ctx;
    g.clearRect(0, 0, w, height); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(10, 35, w - 20, 16);
    const zone = Math.max(14, (RHYTHM.goodMs / RHYTHM.beatMs) * (w - 20));
    g.fillStyle = '#d7ad57'; g.fillRect(w / 2 - zone / 2, 30, zone, 26);
    const phase = Math.max(-1, Math.min(1, (now - target) / RHYTHM.beatMs));
    g.fillStyle = '#fff'; g.fillRect(w / 2 + phase * (w / 2 - 14) - 2, 22, 4, 42);
  }

  result(grade, summary) {
    this.entered.textContent = grade === 'perfect' ? 'Perfect!' : grade === 'good' ? 'Good!' : 'Miss';
    this.entered.dataset.grade = grade; this.stats(summary);
  }
  stats(summary) { this.score.textContent = `${summary.points || 0} điểm`; this.combo.textContent = `Combo ${summary.combo || 0} · cao nhất ${summary.maxCombo || 0}`; }
  hide() {
    if (this.root.contains(document.activeElement) && this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.root.hidden = true; document.body.classList.remove('rhythm-playing');
  }
}
