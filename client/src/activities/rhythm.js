// Audition chuông: nhập chuỗi mũi tên, bấm Space khi vạch trắng tới vùng vàng.
import { RHYTHM, rhythmPattern, rhythmSummary, roundTargetAt } from '../../../shared/rhythm.js';
import { RhythmPanel } from '../ui/rhythm-panel.js';

const KEYS = { ArrowLeft: 0, ArrowUp: 1, ArrowDown: 2, ArrowRight: 3 };

export class RhythmActivity {
  constructor(app, kind) {
    Object.assign(this, { app, kind });
    this.lockMove = this.isRhythm = true;
    this.generation = 0;
    this.state = 'idle';
    this.nextAllowed = 0;
    this.panel = new RhythmPanel(kind, (n) => this.arrow(n), () => this.commit(), () => app.activities.exit(), () => this.finish());
  }

  waitMs() { return Math.max(0, this.nextAllowed - performance.now()); }
  setWait(ms) { this.nextAllowed = performance.now() + ms; }

  async start() {
    const { app, panel } = this;
    if (!app.activities.enter(this, 'bell')) return;
    const generation = ++this.generation;
    this.state = 'joining';
    panel.show(); panel.pattern.textContent = 'Đang chuẩn bị bản nhạc…'; panel.entered.textContent = '';
    panel.stats({ points: 0, combo: 0, maxCombo: 0 });
    const res = await app.net.call('rhythm:start', { kind: 'bell' });
    if (generation !== this.generation) return;
    if (!res?.ok) {
      if (res?.wait) this.setWait(res.wait);
      app.hud.toast(res?.error || 'Chưa bắt đầu được, thử lại nhé.'); app.activities.exit(); return;
    }
    this.game = res.game;
    this.results = [...res.game.results];
    this.round = -1; this.entered = []; this.lastPulse = null; this.state = 'playing';
    if (app.chat.open) app.chat.close();
  }

  onKey(code, down) {
    if (!down) return code in KEYS || code === 'Space';
    if (code in KEYS) { this.arrow(KEYS[code]); return true; }
    if (code === 'Space') { this.commit(); return true; }
    return false;
  }

  pattern(round = this.round) { return rhythmPattern(this.game.at, round, 'bell'); }
  arrow(n) {
    if (this.state !== 'playing' || this.round < 0 || this.entered.length >= this.pattern().length) return;
    this.entered.push(n); this.panel.sequence(this.pattern(), this.entered); this.app.audio.rhythmBeat(n, 'bell');
  }

  async commit() {
    if (this.state !== 'playing' || this.round < 0 || this.results[this.round] != null) return;
    const round = this.round;
    const generation = this.generation;
    const res = await this.app.net.call('rhythm:hit', { id: this.game.id, round, sequence: [...this.entered] });
    if (generation !== this.generation || !res?.ok) return;
    this.results[round] = res.grade;
    this.panel.result(res.grade, res);
  }

  update() {
    if (this.state !== 'playing') return;
    const now = this.app.net.now();
    if (now >= this.game.endsAt) { this.finish(); return; }
    const round = Math.max(0, Math.floor((now - this.game.at) / RHYTHM.barMs));
    if (round !== this.round && round < this.game.rounds) {
      if (this.round >= 0 && this.results[this.round] == null) this.results[this.round] = 'miss';
      this.round = round; this.entered = [];
      this.panel.round.textContent = `Chuỗi ${round + 1}/${this.game.rounds}`;
      this.panel.sequence(this.pattern(), this.entered);
      this.panel.stats(rhythmSummary(this.results.filter(Boolean)));
    }
    const target = roundTargetAt(this.game.at, round);
    this.panel.draw(now, target);
    const pulse = Math.floor((now - this.game.at) / RHYTHM.beatMs);
    if (pulse !== this.lastPulse) { this.lastPulse = pulse; this.app.audio.rhythmBeat(pulse, 'bell'); }
  }

  async finish() {
    if (this.state === 'saving') return;
    this.state = 'saving';
    const generation = this.generation;
    this.panel.controls.hidden = true; this.panel.retry.hidden = true; this.panel.entered.textContent = 'Đang lưu kết quả…';
    const res = await this.app.net.call('rhythm:finish', { id: this.game.id });
    if (generation !== this.generation) return;
    this.state = 'done';
    if (!res?.ok || !res.saved) { this.panel.entered.textContent = res?.error || 'Chưa lưu được, thử lại nhé.'; this.panel.retry.hidden = false; return; }
    this.panel.stats(res);
    const teu = res.teu ? ` · +${res.teu} TEU` : '';
    this.panel.pattern.textContent = `${res.perfect} Perfect · ${res.good} Good · ${res.miss} Miss · ${res.score}% chuẩn${teu}`;
    this.panel.entered.textContent = 'Tiếng chuông của bạn đã hòa vào tu viện.';
    this.panel.leave.textContent = 'Quay lại sân'; this.app.audio.chime(0.08);
  }

  cancel() { ++this.generation; this.state = 'idle'; this.panel.hide(); }
}
