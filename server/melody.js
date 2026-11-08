import crypto from 'node:crypto';
import { MELODY_ZONE, dist2d } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { MELODY, MELODY_NOTES, melodyGrade, melodySummary } from '../shared/melody.js';
import { localDate } from './time.js';

export class MelodyGame {
  constructor({ db, config }) { Object.assign(this, { db, config }); }

  start(player) {
    if (player.melody) return { ok: false, error: 'Rời lượt hiện tại trước nhé.' };
    if (player.activity || player.mat != null || player.rod ||
        dist2d(player.x, player.z, MELODY_ZONE.x, MELODY_ZONE.z) > MELODY_ZONE.radius) {
      return { ok: false, error: 'Tới sân đàn bên hồ để tấu nhạc nhé.' };
    }
    if (this.owner) return { ok: false, error: 'Có người đang tấu nhạc, đợi hết bài nhé.' };
    const at = Date.now() + MELODY.leadMs;
    const game = { id: crypto.randomUUID(), at, endsAt: at + MELODY.durationMs,
      results: Array(MELODY_NOTES.length).fill(null), holds: new Map(), finished: false };
    player.melody = game;
    this.owner = player;
    Object.assign(player, MELODY_ZONE.seat, { activity: ACTIVITY.melody, anim: 0, dirty: true });
    return { ok: true, game: { id: game.id, at, endsAt: game.endsAt } };
  }

  valid(player, id) {
    return player.melody?.id === id && this.owner === player && player.activity === ACTIVITY.melody;
  }

  sweepNotes(game, now) {
    MELODY_NOTES.forEach((note, i) => {
      if (game.results[i] != null) return;
      const hold = game.holds.get(i);
      if (hold && now > game.at + note.at + note.duration + MELODY.maxLagMs) {
        game.results[i] = hold.grade;
        game.holds.delete(i);
      } else if (!hold && now > game.at + note.at + MELODY.lateMs + MELODY.maxLagMs) game.results[i] = 'miss';
    });
  }

  hit(player, data) {
    if (!data || !this.valid(player, data.id) || player.melody.finished) return { ok: false };
    const { index, lane, phase = 'down' } = data;
    if (!Number.isInteger(index) || index < 0 || index >= MELODY_NOTES.length ||
        !Number.isInteger(lane) || lane < 0 || lane >= 6 || !['down', 'up'].includes(phase)) return { ok: false };
    const game = player.melody;
    const note = MELODY_NOTES[index];
    const now = Date.now();
    if (lane !== note.lane) return { ok: false };
    // Bounded input time absorbs normal network transit; arbitrary backdating is rejected.
    const inputAt = data.at ?? now;
    if (!Number.isFinite(inputAt) || inputAt > now + 20 || inputAt < now - MELODY.maxLagMs) return { ok: false };
    this.sweepNotes(game, now);
    if (game.results[index] != null) return { ok: true, index, grade: game.results[index], repeat: true };
    const hold = game.holds.get(index);
    if (phase === 'up') {
      if (!hold) return { ok: false };
      game.results[index] = inputAt >= game.at + note.at + note.duration - MELODY.releaseMs ? hold.grade : 'miss';
      game.holds.delete(index);
      return { ok: true, index, grade: game.results[index] };
    }
    if (hold) return { ok: true, index, grade: hold.grade, holding: true, repeat: true };
    const delta = inputAt - game.at - note.at;
    if (delta < -MELODY.goodMs || delta > MELODY.lateMs) return { ok: false };
    const grade = melodyGrade(delta);
    if (note.duration && grade !== 'miss') {
      game.holds.set(index, { grade });
      return { ok: true, index, grade, holding: true };
    }
    game.results[index] = grade;
    return { ok: true, index, grade };
  }

  finish(player, data) {
    if (!this.valid(player, data?.id)) return { ok: false };
    const game = player.melody;
    if (Date.now() < game.endsAt) return { ok: false, error: 'Bản nhạc chưa kết thúc.' };
    this.sweepNotes(game, Date.now());
    const summary = melodySummary(game.results);
    const teu = Math.floor(summary.score / 25);
    if (!game.finished) {
      if (teu) this.db.addTeu(player.pid, teu, 'melody', localDate(Date.now(), this.config.timezone));
      game.finished = true;
    }
    return { ok: true, ...summary, teu };
  }

  leave(player) {
    player.melody = null;
    if (this.owner === player) this.owner = null;
    if (player.activity === ACTIVITY.melody) Object.assign(player, { activity: ACTIVITY.none, dirty: true });
  }

  sweep() {
    const player = this.owner;
    if (!player || Date.now() <= player.melody.endsAt + 30000) return;
    this.leave(player);
    player.socket?.emit('melody:expired');
  }
}
