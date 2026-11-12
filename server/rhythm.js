// Audition chuông: nhập trọn chuỗi mũi tên, chốt Space đúng phách; server chấm thời gian và chuỗi.
import crypto from 'node:crypto';
import { BELL, dist2d } from '../shared/layout.js';
import { ACTIVITY, LIMITS, TEU } from '../shared/protocol.js';
import { RHYTHM, RHYTHM_ROUNDS, rhythmGrade, rhythmPattern, rhythmSummary, roundTargetAt } from '../shared/rhythm.js';
import { localDate } from './time.js';

export class RhythmGame {
  constructor({ db, io, config }) { Object.assign(this, { db, io, config }); this.bellHits = new Map(); }
  allowed(player, kind) { return kind === 'bell' && player.mat == null && player.activity !== ACTIVITY.meditate && dist2d(player.x, player.z, BELL.x, BELL.z) <= BELL.radius + 1.5; }

  start(player, data) {
    const kind = data?.kind;
    if (!this.allowed(player, kind)) return { ok: false, error: 'Tới gác chuông để chơi nhé.' };
    const now = Date.now();
    const current = player.rhythm;
    if (current && !current.finished && now < current.endsAt) return { ok: true, game: this.publicGame(current) };
    const wait = player.lastBell + LIMITS.bellCooldownMs - now;
    if (wait > 0) return { ok: false, wait, error: `Chuông đang nghỉ, đợi thêm ${Math.ceil(wait / 1000)} giây nhé.` };
    const at = Math.ceil(now / RHYTHM.barMs) * RHYTHM.barMs + RHYTHM.barMs;
    const rounds = RHYTHM_ROUNDS.bell;
    player.rhythm = { id: crypto.randomUUID(), kind, at, rounds, endsAt: at + rounds * RHYTHM.barMs, results: Array(rounds).fill(null), finished: false };
    player.lastBell = now;
    return { ok: true, game: this.publicGame(player.rhythm) };
  }

  publicGame(game) { return { id: game.id, kind: game.kind, at: game.at, rounds: game.rounds, endsAt: game.endsAt, results: [...game.results] }; }
  sweep(game, now) {
    for (let round = 0; round < game.rounds; round++) {
      if (game.results[round] == null && now > roundTargetAt(game.at, round) + RHYTHM.lateMs) game.results[round] = 'miss';
    }
  }

  hit(player, data) {
    const game = player.rhythm;
    if (!game || game.finished || data?.id !== game.id || !this.allowed(player, 'bell')) return { ok: false };
    const { round, sequence } = data ?? {};
    if (!Number.isInteger(round) || round < 0 || round >= game.rounds || !Array.isArray(sequence)) return { ok: false };
    if (sequence.length > 5 || sequence.some((n) => !Number.isInteger(n) || n < 0 || n > 3)) return { ok: false };
    const now = Date.now();
    const target = roundTargetAt(game.at, round);
    if (now < target - RHYTHM.goodMs || now > target + RHYTHM.lateMs) return { ok: false };
    this.sweep(game, now);
    if (game.results[round] != null) return { ok: true, grade: game.results[round], repeat: true, ...rhythmSummary(game.results.filter(Boolean)) };
    const pattern = rhythmPattern(game.at, round, 'bell');
    const correct = sequence.length === pattern.length && sequence.every((n, i) => n === pattern[i]);
    const grade = rhythmGrade(now - target, correct);
    game.results[round] = grade;
    if (grade !== 'miss') {
      for (const t of this.bellHits.keys()) if (now - t > RHYTHM.barMs) this.bellHits.delete(t);
      if (!this.bellHits.has(target)) this.bellHits.set(target, new Set());
      const peers = this.bellHits.get(target);
      peers.add(player.pid);
      this.io.emit('bell:ring', { sid: player.sid, quality: grade === 'perfect' ? 1 : 0.6, force: 0.9, intensity: Math.min(0.8, (peers.size - 1) * 0.14), beat: 1 });
    }
    return { ok: true, grade, ...rhythmSummary(game.results.filter(Boolean)) };
  }

  finish(player, data) {
    const game = player.rhythm;
    if (!game || data?.id !== game.id || !this.allowed(player, 'bell')) return { ok: false, saved: false };
    if (Date.now() < game.endsAt) return { ok: false, saved: false, error: 'Bản nhạc chưa kết thúc nhé.' };
    this.sweep(game, Date.now());
    const summary = rhythmSummary(game.results);
    const teu = Math.floor(summary.score / 25) * TEU.rhythmPer25;
    if (!game.finished) {
      this.db.bumpBell(player.pid);
      this.db.bumpStat(localDate(Date.now(), this.config.timezone), { bells: 1 });
      if (teu > 0) this.db.addTeu(player.pid, teu, 'rhythm', localDate(Date.now(), this.config.timezone));
      game.finished = true;
    }
    return { ok: true, saved: true, teu, ...summary };
  }
}
