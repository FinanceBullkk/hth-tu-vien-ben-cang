import { MELODY, MELODY_NOTES } from '../../../shared/melody.js';

export const MELODY_COLORS = { perfect: '#ffe1a0', great: '#d6b6ff', good: '#9ae5c7', miss: '#c8c9c8', press: '#fff5dc', hold: '#96edff' };
export const MELODY_LANES = [0.085, 0.235, 0.385, 0.615, 0.765, 0.915];

export class MelodyField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.flashes = new Map();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
  }

  flash(lane, grade) { this.flashes.set(lane, { at: performance.now(), grade }); }

  circle(x, y, r, color, width = 1, fill = false) {
    const g = this.ctx;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { g.fillStyle = color; g.fill(); }
    else { g.strokeStyle = color; g.lineWidth = width; g.stroke(); }
  }

  glow(x, y, r, color, alpha) {
    const g = this.ctx, gradient = g.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color); gradient.addColorStop(1, `${color}00`);
    g.globalAlpha = alpha;
    this.circle(x, y, r, gradient, 1, true);
    g.globalAlpha = 1;
  }

  flower(x, y, r, color) {
    const g = this.ctx;
    g.save(); g.translate(x, y); g.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2); g.beginPath();
      g.moveTo(0, -r); g.lineTo(r * 0.34, -r * 0.45); g.lineTo(0, -r * 0.12); g.lineTo(-r * 0.34, -r * 0.45); g.fill();
    }
    g.restore();
  }

  draw(elapsed, results, holds, pressed) {
    const { canvas, ctx: g } = this;
    const w = canvas.clientWidth, height = canvas.clientHeight;
    if (!w || !height) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, height);
    const line = height - 40, radius = Math.min(27, w * 0.052), speed = line / MELODY.approachMs;
    g.strokeStyle = '#dcc89b30'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, line); g.lineTo(w, line); g.stroke();
    for (let lane = 0; lane < 6; lane++) {
      const x = w * MELODY_LANES[lane];
      this.circle(x, line, radius + 4, '#efdfb35c');
      this.circle(x, line, radius, '#efdfb329');
      this.flower(x, line, radius * 0.58, '#ded2b33d');
      if (pressed.has(lane)) this.circle(x, line, radius + 4, '#fff0c0', 2);
      const flash = this.flashes.get(lane);
      if (!flash) continue;
      const age = performance.now() - flash.at, life = this.motion.matches ? 180 : 480;
      if (age > life) { this.flashes.delete(lane); continue; }
      const p = age / life, color = MELODY_COLORS[flash.grade] ?? MELODY_COLORS.press;
      this.glow(x, line, radius * 2.3, color, (1 - p) * 0.65);
      g.globalAlpha = 1 - p;
      this.circle(x, line, radius + (this.motion.matches ? 2 : p * radius), color, 2);
      if (!this.motion.matches && flash.grade !== 'miss' && flash.grade !== 'press') {
        this.circle(x, line, radius * (0.8 + p * 0.85), color);
        for (let i = 0; i < 7; i++) {
          const a = i * 2.399 + lane, spread = radius * (0.8 + p * 1.8);
          this.circle(x + Math.cos(a) * spread, line + Math.sin(a) * spread - p * 12, 1.3, color, 1, true);
        }
      }
      if (p < 0.25 && flash.grade !== 'miss') this.circle(x, line, radius * (1 - p), '#fff8df', 1, true);
      g.globalAlpha = 1;
    }
    MELODY_NOTES.forEach((note, index) => {
      if (results[index] != null) return;
      const holding = holds.has(index), x = w * MELODY_LANES[note.lane];
      const y = holding ? line : line - (note.at - elapsed) * speed;
      if (y < -radius || y > height + radius) return;
      const tail = Math.max(-radius, line - (note.at + note.duration - elapsed) * speed);
      if (note.duration && tail < y) {
        const ribbon = g.createLinearGradient(x, tail, x, y);
        ribbon.addColorStop(0, '#96dfff40'); ribbon.addColorStop(1, holding ? '#96edffb0' : '#96dfff70');
        g.fillStyle = ribbon; g.fillRect(x - radius * 0.55, tail, radius * 1.1, y - tail);
        g.strokeStyle = '#b4eaff90'; g.lineWidth = 1;
        g.strokeRect(x - radius * 0.55, tail, radius * 1.1, y - tail);
        this.circle(x, tail, radius * 0.55, '#98c9e78a', 1, true);
        this.flower(x, tail, radius * 0.4, '#e3f5ff90');
      }
      if (holding) {
        const pulse = this.motion.matches ? 0.7 : 0.65 + Math.sin(elapsed / 140) * 0.12;
        this.glow(x, y, radius * 2, MELODY_COLORS.hold, pulse);
        this.circle(x, y, radius + 6, '#c9f8ff', 2);
      }
      this.circle(x, y, radius * 0.86, holding ? '#9aeefff0' : note.duration ? '#7caec8b8' : '#e8e9e0d9', 1, true);
      this.circle(x, y, radius * 0.86, note.duration ? '#d0f5ff' : '#fff8e7', 1.6);
      this.flower(x, y, radius * 0.66, holding ? '#fff' : '#ffffffcf');
    });
  }
}
