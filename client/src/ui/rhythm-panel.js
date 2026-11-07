// Panel nhịp kiểu Graceful Melody: nốt rơi theo lane về vạch đánh giá, vẽ trên canvas.
import { $, h } from './dom.js';

const SANS = '"Segoe UI", "Noto Sans", Roboto, Arial, sans-serif';
const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const LANE_KEYS = ['Trái', 'Lên', 'Xuống', 'Phải'];
const GRADE_TEXT = { perfect: 'Perfect!', good: 'Good!', miss: 'Miss' };
const GRADE_COLOR = { perfect: '#f8d282', good: '#a8dec6', miss: '#f7a69d' };
const APPROACH_MS = 1400; // nốt rơi mất bao lâu từ đỉnh tới vạch

export class RhythmPanel {
  constructor(kind, onNote, onExit, onRetry) {
    this.kind = kind;
    this.onNote = onNote;
    this.root = h('section', { class: `rhythm-panel ink-panel ${kind}`, hidden: true, tabIndex: -1, 'aria-label': kind === 'bell' ? 'Nhịp chuông' : 'Nhịp sen' });
    this.title = h('h2', { class: 'ink-title' }, kind === 'bell' ? 'Nhịp chuông' : 'Nhịp sen', h('span', { class: 'seal' }, '節'));
    this.round = h('span', { class: 'rhythm-round' });
    this.score = h('span', { class: 'teu-chip' }, '0 điểm');
    this.combo = h('span', { class: 'rhythm-combo' }, 'Combo 0');
    this.feedback = h('p', { class: 'rhythm-feedback', role: 'status' }, 'Bấm phím khi nốt chạm vạch vàng');
    this.status = h('p', { class: 'rhythm-status' });
    this.canvas = h('canvas', { class: 'rhythm-lanes', 'aria-hidden': 'true' });
    this.ctx2d = this.canvas.getContext('2d');
    this.controls = h('div', { class: 'rhythm-controls' }, ...[0, 1, 2, 3].map((i) => h('button', {
      type: 'button', class: 'rhythm-arrow', 'aria-label': LANE_KEYS[i], onClick: (e) => { onNote(i); if (e.detail > 0 && !matchMedia('(pointer:coarse)').matches) this.root.focus({ preventScroll: true }); },
    }, ['←', '↑', '↓', '→'][i])));
    this.retry = h('button', { type: 'button', class: 'btn ghost', hidden: true, onClick: onRetry }, 'Thử lưu lại');
    this.leave = h('button', { type: 'button', class: 'btn ghost', onClick: onExit }, 'Rời lượt chơi');
    this.root.append(
      h('header', {}, this.title, this.round),
      h('div', { class: 'rhythm-stats' }, this.score, this.combo),
      this.canvas,
      this.feedback,
      this.status,
      this.controls,
      h('div', { class: 'rhythm-actions' }, this.retry, this.leave),
    );
    $('rhythmLayer').append(this.root);
    this.pops = []; // chữ Perfect/Good/Miss bay lên
    this.flashes = new Map(); // lane -> 0..1 sáng dần rồi tắt
  }

  show() {
    this.previousFocus = document.activeElement;
    this.root.hidden = false;
    this.controls.hidden = false;
    this.retry.hidden = true;
    this.leave.textContent = 'Rời lượt chơi';
    this.round.textContent = '';
    this.root.focus({ preventScroll: true });
    document.body.classList.add('rhythm-playing');
    this.#resize();
  }

  #resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 500;
    const hgt = Math.max(150, Math.min(240, Math.round(window.innerHeight * 0.26)));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(hgt * dpr);
    this.canvas.style.height = `${hgt}px`;
    this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = hgt;
    this.lineY = hgt - 26;
  }

  /** Vẽ một khung hình: now là giờ server (net.now()), notes là mảng {round, idx, note, target, grade}. */
  draw(now, notes, stats) {
    if (this.root.hidden) return;
    if (!this.w || Math.abs(this.canvas.clientWidth - this.w) > 2) this.#resize();
    const g = this.ctx2d;
    const { w, h: hgt, lineY } = this;
    const laneW = w / 4;
    const meditate = this.kind === 'meditate';
    const accent = meditate ? '#a8dec6' : '#f6cd87';
    g.clearRect(0, 0, w, hgt);

    // Nền lane + đường vạch
    for (let i = 0; i < 4; i++) {
      if (this.flashes.get(i) > 0) {
        g.fillStyle = meditate ? `rgba(168, 222, 198, ${0.13 * this.flashes.get(i)})` : `rgba(246, 205, 135, ${0.13 * this.flashes.get(i)})`;
        g.fillRect(i * laneW + 2, 0, laneW - 4, hgt);
        this.flashes.set(i, this.flashes.get(i) - 0.06);
      }
      g.strokeStyle = 'rgba(243, 230, 207, .07)';
      g.beginPath();
      g.moveTo(i * laneW, 0);
      g.lineTo(i * laneW, hgt);
      g.stroke();
    }
    g.strokeStyle = accent;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(6, lineY);
    g.lineTo(w - 6, lineY);
    g.stroke();
    g.lineWidth = 1;
    g.fillStyle = accent;
    g.font = `700 11px ${SANS}`;
    g.fillText('▲', 2, lineY - 6);
    g.fillText('▲', w - 14, lineY - 6);

    const speed = (lineY + 30) / APPROACH_MS;
    for (const n of notes) {
      const y = lineY - (n.target - now) * speed;
      if (n.grade === 'miss') {
        if (y > lineY - 6 && y < lineY + 40) this.#noteShape(g, n.note * laneW + laneW / 2, lineY, laneW, 'rgba(247, 166, 157, .45)', meditate);
        continue;
      }
      if (y < -26 || (n.grade && y > lineY + 46)) continue;
      if (n.grade) {
        // Nốt vừa trúng: sáng rồi tan dần dưới vạch.
        const t = now - n.hitAt;
        if (t < 320) this.#noteShape(g, n.note * laneW + laneW / 2, lineY + t * 0.12, laneW, GRADE_COLOR[n.grade], meditate, 1 - t / 320);
        continue;
      }
      if (y > lineY + 40) continue;
      const alpha = y < 10 ? 0.35 + y * 0.065 : 1;
      this.#noteShape(g, n.note * laneW + laneW / 2, y, laneW, meditate ? '#a8dec6' : '#f6cd87', meditate, Math.min(1, alpha));
    }

    // Chữ đánh giá bay lên
    this.pops = this.pops.filter((p) => now - p.at < 650);
    for (const p of this.pops) {
      const t = (now - p.at) / 650;
      g.globalAlpha = 1 - t;
      g.fillStyle = GRADE_COLOR[p.grade];
      g.font = `italic 700 ${p.grade === 'miss' ? 20 : 24}px ${SERIF}`;
      g.fillText(GRADE_TEXT[p.grade], p.x * w, lineY - 44 - t * 34);
      g.globalAlpha = 1;
    }
    if (stats && stats.maxCombo >= 3) {
      g.fillStyle = 'rgba(246, 205, 135, .8)';
      g.font = `700 15px ${SERIF}`;
      g.fillText(`${stats.combo} liên`, w - 46, 22);
    }
  }

  #noteShape(g, x, y, laneW, color, meditate, alpha = 1) {
    g.globalAlpha = alpha;
    if (meditate) {
      // Cánh sen: trái tim ngược.
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x, y - 15);
      g.bezierCurveTo(x + 13, y - 2, x + 9, y + 12, x, y + 15);
      g.bezierCurveTo(x - 9, y + 12, x - 13, y - 2, x, y - 15);
      g.fill();
      g.strokeStyle = 'rgba(20, 30, 24, .5)';
      g.stroke();
    } else {
      // Chuông nhỏ: vành rộng, hở cổ.
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x - 4, y - 13);
      g.bezierCurveTo(x - 15, y - 10, x - 13, y + 6, x - 12, y + 12);
      g.lineTo(x + 12, y + 12);
      g.bezierCurveTo(x + 13, y + 6, x + 15, y - 10, x + 4, y - 13);
      g.closePath();
      g.fill();
      g.fillRect(x - 14, y + 12, 28, 3.4);
    }
    g.globalAlpha = 1;
  }

  /** Cập nhật trạng thái nốt từ activity (mảng notes gốc), vẽ ở update kế tiếp. */
  hit(grade, lane, now) {
    if (grade === 'miss') return;
    this.flashes.set(lane, 1);
    this.pops.push({ grade, x: (lane + 0.5) / 4, at: now });
  }

  missPop(lane, now) {
    this.pops.push({ grade: 'miss', x: (lane + 0.5) / 4, at: now });
  }

  result(grade, summary) {
    this.feedback.textContent = grade === 'perfect' ? 'Chuỗi trọn vẹn!' : grade === 'good' ? 'Khá ổn, giữ nhịp nhé' : 'Chuỗi này lỡ nhịp, tiếp theo bù lại';
    this.feedback.dataset.grade = grade;
    this.stats(summary);
  }

  stats(summary) {
    this.score.textContent = `${summary.points || 0} điểm`;
    this.combo.textContent = `Combo ${summary.combo || 0} · cao nhất ${summary.maxCombo || 0}`;
  }

  hide() {
    if (this.root.contains(document.activeElement) && this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.root.hidden = true;
    document.body.classList.remove('rhythm-playing');
  }
}

export { APPROACH_MS };

