import { MELODY, MELODY_NOTES, melodyCandidate, melodyGrade, melodySummary } from '../../../shared/melody.js';

export class MelodyPerformance {
  constructor(app, game, panel, audio) {
    Object.assign(this, { app, game, panel, audio, active: true });
    this.results = Array(MELODY_NOTES.length).fill(null);
    this.holds = new Map(); this.sources = new Set(); this.pressed = new Set();
    this.revisions = []; this.pending = new Set();
  }

  input(lane, down, source = 'keyboard') {
    if (!this.active) return;
    const token = `${source}:${lane}`, wasPressed = this.pressed.has(lane);
    if (down) this.sources.add(token); else this.sources.delete(token);
    const isPressed = [...this.sources].some((key) => key.endsWith(`:${lane}`));
    if (isPressed === wasPressed) return;
    if (isPressed) this.pressed.add(lane); else this.pressed.delete(lane);
    const elapsed = this.audio.elapsed();
    if (!down) {
      for (const [index] of this.holds) if (MELODY_NOTES[index].lane === lane) this.release(index, elapsed);
      return;
    }
    if ([...this.holds.keys()].some((index) => MELODY_NOTES[index].lane === lane)) return;
    const index = melodyCandidate(elapsed, lane, this.results);
    this.panel.flash(lane, 'press');
    if (index < 0 || this.pending.has(index)) return;
    const note = MELODY_NOTES[index], grade = melodyGrade(elapsed - note.at);
    if (note.duration) this.holds.set(index, grade); else this.results[index] = grade;
    this.feedback(lane, grade, true);
    this.send(index, 'down', elapsed);
  }

  feedback(lane, grade, sound = false) {
    this.panel.flash(lane, grade); this.panel.feedback(grade);
    if (sound) this.audio.cue(grade, this.panel.sfxVolume());
  }

  release(index, elapsed) {
    const note = MELODY_NOTES[index];
    const grade = elapsed >= note.at + note.duration - MELODY.releaseMs ? this.holds.get(index) : 'miss';
    this.holds.delete(index); this.results[index] = grade;
    this.feedback(note.lane, grade);
    this.send(index, 'up', elapsed);
  }

  async send(index, phase, elapsed) {
    const revision = (this.revisions[index] ?? 0) + 1;
    this.revisions[index] = revision; this.pending.add(index);
    const res = await this.app.net.call('melody:hit', { id: this.game.id, index,
      lane: MELODY_NOTES[index].lane, phase, at: Math.round(this.game.at + elapsed) });
    if (!this.active || this.revisions[index] !== revision) return;
    this.pending.delete(index);
    if (res?.timedOut) {
      this.app.activities.exit(); this.app.hud.toast('Mạng gián đoạn. Lượt tấu nhạc đã dừng.'); return;
    }
    const grade = res?.ok ? res.grade : 'miss';
    const previous = this.holds.get(index) ?? this.results[index];
    if (res?.holding && this.holds.has(index)) this.holds.set(index, grade);
    else { this.holds.delete(index); this.results[index] = grade; }
    if (previous !== grade) this.feedback(MELODY_NOTES[index].lane, grade);
    if (!res?.ok && !this.warned) {
      this.warned = true; this.app.hud.toast('Nhịp chưa được server nhận. Kiểm tra kết nối nếu bị lặp lại.');
    }
  }

  update() {
    const elapsed = this.audio.elapsed();
    for (const [index] of this.holds) {
      const note = MELODY_NOTES[index];
      if (elapsed >= note.at + note.duration) this.release(index, elapsed);
    }
    MELODY_NOTES.forEach((note, index) => {
      if (this.results[index] == null && !this.holds.has(index) && !this.pending.has(index) && elapsed > note.at + MELODY.lateMs) {
        this.results[index] = 'miss'; this.feedback(note.lane, 'miss');
      }
    });
    this.panel.draw(elapsed, this.results, this.holds, this.pressed);
    this.panel.stats(melodySummary(this.results), elapsed);
    return elapsed;
  }

  stop() { this.active = false; this.sources.clear(); this.pressed.clear(); this.holds.clear(); }
}
