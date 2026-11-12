// Nhịp kiểu Graceful Melody: nốt rơi về vạch, bấm đúng lúc nốt chạm vạch; server chấm từng nốt.
import { MATS } from '../../../shared/layout.js';
import { RHYTHM, noteTargetAt, rhythmPattern, rhythmSummary } from '../../../shared/rhythm.js';
import { RhythmPanel } from '../ui/rhythm-panel.js';

const KEYS = { ArrowLeft: 0, ArrowUp: 1, ArrowDown: 2, ArrowRight: 3 };

export class RhythmActivity {
  constructor(app, kind) {
    Object.assign(this, { app, kind });
    this.lockMove = this.isRhythm = true;
    this.generation = 0;
    this.state = 'idle';
    this.nextAllowed = 0;
    this.panel = new RhythmPanel(kind, (n) => this.note(n), () => app.activities.exit(), () => this.finish());
    this.mates = [];
  }

  waitMs() { return Math.max(0, this.nextAllowed - performance.now()); }
  setWait(ms) { this.nextAllowed = performance.now() + ms; }

  nearestFreeMat(x, z, range = 2.1) {
    let best = -1;
    MATS.forEach((m, i) => { const d = Math.hypot(m.x - x, m.z - z); if (!this.app.mats[i] && d < range) { best = i; range = d; } });
    return best;
  }

  async start(mat, existingSeat = null) {
    const { app, kind, panel } = this;
    if (!app.activities.enter(this, kind === 'bell' ? 'bell' : null)) return;
    const generation = ++this.generation;
    this.state = 'joining';
    panel.show();
    panel.feedback.textContent = 'Đang chuẩn bị bản nhạc…';
    panel.feedback.dataset.grade = '';
    panel.status.textContent = '';
    panel.stats({ score: 0, combo: 0, maxCombo: 0 });
    if (kind === 'meditate') {
      const seated = existingSeat ?? await app.net.call('action:start', { kind, mat });
      if (generation !== this.generation) return;
      if (!seated?.ok) { app.hud.toast(seated?.error || 'Chưa ngồi được.'); app.activities.exit(); return; }
      const m = MATS[mat];
      app.me.placeAt(m.x, m.z, m.rot);
      app.me.avatar.setActivity(1);
      app.follow.meditating = true;
      this.mates = seated.mates;
    }
    const res = await app.net.call('rhythm:start', { kind });
    if (generation !== this.generation) return;
    if (!res?.ok) {
      if (res?.wait) this.setWait(res.wait);
      app.hud.toast(res?.error || 'Chưa bắt đầu được, thử lại nhé.');
      app.activities.exit();
      return;
    }
    this.game = res.game;
    // Mỗi round có 3–4 nốt; grades lưu phẳng theo (round, idx), null là chưa chấm.
    this.notes = res.game.results.map((r) => (r ? [...r] : null));
    this.patterns = res.game.results.map((r) => (r ? r.length : null));
    this.round = -1;
    this.lastPulse = null;
    this.state = 'playing';
    if (app.chat.open) app.chat.close();
  }

  onSync({ mates }) { this.mates = mates; }

  onKey(code, down) {
    if (code in KEYS) { if (down) this.note(KEYS[code]); return true; }
    if (code === 'Escape') return false;
    return false;
  }

  pattern(round) {
    if (this.patterns[round] == null) {
      this.patterns[round] = rhythmPattern(this.game.at, round, this.kind).length;
    }
    return rhythmPattern(this.game.at, round, this.kind);
  }

  /** Danh sách nốt đang hiển thị: những nốt trong khoảng rơi của các round lân cận. */
  visibleNotes(now) {
    const out = [];
    const cur = Math.floor((now - this.game.at) / RHYTHM.barMs);
    for (let round = Math.max(0, cur - 1); round <= Math.min(this.game.rounds - 1, cur + 1); round++) {
      const pattern = this.pattern(round);
      if (!this.notes[round]) this.notes[round] = Array(pattern.length).fill(null);
      for (let idx = 0; idx < pattern.length; idx++) {
        out.push({ round, idx, note: pattern[idx], target: noteTargetAt(this.game.at, round, idx), grade: this.notes[round][idx], hitAt: this.hitAt?.[`${round}:${idx}`] || 0 });
      }
    }
    return out;
  }

  note(n) {
    if (this.state !== 'playing' || this.app.net.now() < this.game.at) return;
    const now = this.app.net.now();
    const cur = Math.floor((now - this.game.at) / RHYTHM.barMs);
    if (cur < 0 || cur >= this.game.rounds) return;
    const pattern = this.pattern(cur);
    if (!this.notes[cur]) this.notes[cur] = Array(pattern.length).fill(null);
    // Nốt gần vạch nhất còn trống: bấm đúng phím thì gửi chấm, sai phím cũng gửi để server trừ.
    let idx = this.notes[cur].findIndex((g) => g == null);
    if (idx < 0) return; // hết nốt của chuỗi này: bấm thêm không bị phạt nhưng cũng vô ích
    const target = noteTargetAt(this.game.at, cur, idx);
    if (now < target - RHYTHM.goodMs) return; // nốt còn quá xa vạch: chưa tính
    this.send(cur, idx, n);
  }

  async send(round, idx, note) {
    const generation = this.generation;
    const now = this.app.net.now();
    const res = await this.app.net.call('rhythm:hit', { id: this.game.id, round, idx, note });
    if (generation !== this.generation || this.state !== 'playing') return;
    if (!res?.ok) return; // trượt cửa sổ: quét miss tự hiện ở update
    const grade = res.grade;
    if (!this.notes[round]) this.notes[round] = Array(this.pattern(round).length).fill(null);
    this.notes[round][idx] = grade;
    this.hitAt = this.hitAt || {};
    this.hitAt[`${round}:${idx}`] = now;
    const lane = this.pattern(round)[idx];
    if (grade === 'miss') {
      this.panel.missPop(lane, now);
      if (this.kind === 'bell') this.app.audio.rhythmBeat(-1, 'bell');
    } else {
      this.panel.hit(grade, lane, now);
      if (this.kind === 'meditate') this.app.audio.pluck(grade === 'perfect' ? idx : idx + 2, grade === 'perfect' ? 1 : 0.7);
    }
    if (res.points != null) this.panel.stats(res);
  }

  update() {
    if (this.state !== 'playing') return;
    const { game, app, panel } = this;
    const now = app.net.now();
    if (now >= game.endsAt) { this.finish(); return; }
    const p = now - game.at;
    const round = Math.max(0, Math.floor(p / RHYTHM.barMs));
    if (round !== this.round) {
      this.round = round;
      panel.round.textContent = `Chuỗi ${round + 1}/${game.rounds}`;
      if (round === 0) panel.feedback.textContent = this.kind === 'bell' ? 'Nốt chạm vạch vàng thì bấm · sai phím mất nốt' : 'Nốt sen rơi tới vạch thì bấm · sai phím cánh sen tan';
      panel.feedback.dataset.grade = '';
    }
    // Quét nốt trượt để hiển thị (server chấm lại độc lập khi finish).
    for (const n of this.visibleNotes(now)) {
      if (n.grade == null && now > n.target + RHYTHM.lateMs) {
        this.notes[n.round][n.idx] = 'miss';
        panel.missPop(n.note, now);
      }
    }
    panel.draw(now, this.visibleNotes(now), rhythmSummary(this.notes.flat().filter((g) => g != null)));
    panel.status.textContent = p < 0 ? `Bắt đầu sau ${Math.ceil(-p / 1000)} · 96 BPM` : this.kind === 'bell' ? 'Đúng nhịp làm chuông ngân, đồng nghiệp cùng nhịp làm âm dày hơn' : this.mates.length ? `Cùng chơi với ${this.mates.join(', ')}` : 'Đúng nhịp để sen mở cánh';
    const pulse = Math.floor(p / RHYTHM.beatMs);
    if (pulse !== this.lastPulse) {
      this.lastPulse = pulse;
      app.audio.rhythmBeat(pulse, this.kind);
      if (this.kind === 'bell' && pulse >= 0 && pulse % 16 === 15) app.audio.hornBlip(0.05);
    }
  }

  async finish() {
    if (this.state === 'saving') return;
    this.state = 'saving';
    const generation = this.generation;
    this.panel.controls.hidden = true;
    this.panel.retry.hidden = true;
    this.panel.feedback.textContent = 'Bản nhạc đã khép · đang lưu kết quả…';
    const res = await this.app.net.call('rhythm:finish', { id: this.game.id });
    if (generation !== this.generation) return;
    this.state = 'done';
    if (!res?.ok || !res.saved) { this.panel.feedback.textContent = res?.error || 'Chưa lưu được, thử lại nhé.'; this.panel.retry.hidden = false; return; }
    this.panel.stats(res);
    this.panel.feedback.dataset.grade = '';
    const teu = res.teu ? ` · +${res.teu} TEU` : '';
    this.panel.feedback.textContent = `${res.perfect} Perfect · ${res.good} Good · ${res.miss} Miss · ${res.score}% chuẩn${teu}`;
    this.panel.status.textContent = this.kind === 'meditate' ? res.phrase : 'Tiếng chuông của bạn đã hòa vào tu viện.';
    if (res.cultivation) {
      const c = res.cultivation;
      this.app.me.avatar.setCultivation(c.tier);
      this.panel.status.textContent = `+${res.score} công pháp · ${c.name} · ${c.points}${c.next ? `/${c.next}` : ' · viên mãn'}`;
    }
    this.panel.leave.textContent = 'Quay lại sân';
    this.app.audio.chime(0.08);
  }

  cancel() {
    ++this.generation;
    this.state = 'idle';
    this.panel.hide();
    this.app.follow.meditating = false;
    this.app.me.avatar.setActivity(0);
  }
}
