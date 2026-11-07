// Hai minigame dùng chung luật nhịp kiểu WWM: nốt rơi về vạch, server chấm từng nốt theo giờ nhận gói.
import crypto from 'node:crypto';
import { BELL, dist2d } from '../shared/layout.js';
import { LIMITS, TEU } from '../shared/protocol.js';
import { RHYTHM, RHYTHM_ROUNDS, noteTargetAt, rhythmGrade, rhythmPattern, rhythmSummary } from '../shared/rhythm.js';
import { localDate } from './time.js';

export class RhythmGame {
  constructor({ db, io, config }) {
    Object.assign(this, { db, io, config });
    this.bellHits = new Map();
  }

  allowed(player, kind) {
    return kind === 'meditate' ? player.mat != null && player.mat >= 0 : kind === 'bell' && player.mat == null && dist2d(player.x, player.z, BELL.x, BELL.z) <= BELL.radius + 1.5;
  }

  start(player, data) {
    const kind = data?.kind;
    if (!this.allowed(player, kind)) return { ok: false, error: 'Tới gác chuông hoặc ngồi lên chiếu để chơi nhé.' };
    const now = Date.now();
    const current = player.rhythm;
    if (current && !current.finished && now < current.endsAt) {
      return current.kind === kind ? { ok: true, game: this.publicGame(current) } : { ok: false, error: 'Kết thúc lượt đang chơi trước nhé.' };
    }
    const wait = kind === 'bell' ? player.lastBell + LIMITS.bellCooldownMs - now : 0;
    if (wait > 0) return { ok: false, wait, error: `Chuông đang nghỉ, đợi thêm ${Math.ceil(wait / 1000)} giây nhé.` };
    const at = Math.ceil(now / RHYTHM.barMs) * RHYTHM.barMs + RHYTHM.barMs;
    const rounds = RHYTHM_ROUNDS[kind];
    // Mỗi round có pattern riêng (3–4 nốt): lưu mảng grade từng nốt, null là chưa chấm.
    player.rhythm = { id: crypto.randomUUID(), kind, at, rounds, endsAt: at + rounds * RHYTHM.barMs, notes: Array(rounds).fill(null), patterns: Array(rounds).fill(null), finished: false };
    if (kind === 'bell') player.lastBell = now;
    return { ok: true, game: this.publicGame(player.rhythm) };
  }

  patternOf(game, round) {
    if (!game.patterns[round]) game.patterns[round] = rhythmPattern(game.at, round, game.kind);
    return game.patterns[round];
  }

  publicGame(game) {
    return { id: game.id, kind: game.kind, at: game.at, rounds: game.rounds, endsAt: game.endsAt, results: game.notes.map((n) => (n ? [...n] : null)) };
  }

  /** Chấm trễ những nốt đã qua giờ mà không ai bấm. Trả về danh sách nốt vừa trượt. */
  sweepNotes(game, now) {
    const missed = [];
    for (let round = 0; round < game.rounds; round++) {
      const pattern = this.patternOf(game, round);
      const lastTarget = noteTargetAt(game.at, round, pattern.length - 1);
      if (lastTarget + RHYTHM.lateMs > now) break; // round này (và các round sau) chưa hết giờ
      if (!game.notes[round]) game.notes[round] = Array(pattern.length).fill(null);
      for (let idx = 0; idx < pattern.length; idx++) {
        if (game.notes[round][idx] == null && now > noteTargetAt(game.at, round, idx) + RHYTHM.lateMs) {
          game.notes[round][idx] = 'miss';
          missed.push({ round, idx, grade: 'miss' });
        }
      }
    }
    return missed;
  }

  hit(player, data) {
    const game = player.rhythm;
    if (!game || game.finished || data?.id !== game.id || !this.allowed(player, game.kind)) return { ok: false };
    const { round, idx, note } = data ?? {};
    if (!Number.isInteger(round) || round < 0 || round >= game.rounds) return { ok: false };
    const pattern = this.patternOf(game, round);
    if (!Number.isInteger(idx) || idx < 0 || idx >= pattern.length) return { ok: false };
    if (!Number.isInteger(note) || note < 0 || note > 3) return { ok: false };
    const now = Date.now();
    const target = noteTargetAt(game.at, round, idx);
    if (now < target - RHYTHM.goodMs || now > target + RHYTHM.lateMs) return { ok: false };
    // Quét nốt trượt của các beat trước để điểm luôn khớp thực tế.
    this.sweepNotes(game, now);
    if (!game.notes[round]) game.notes[round] = Array(pattern.length).fill(null);
    if (game.notes[round][idx] != null) {
      return { ok: true, round, idx, grade: game.notes[round][idx], repeat: true, ...this.summarySoFar(game) };
    }
    const grade = rhythmGrade(now - target, note === pattern[idx]);
    game.notes[round][idx] = grade;
    if (grade !== 'miss') {
      if (game.kind === 'bell') {
        for (const t of this.bellHits.keys()) if (now - t > RHYTHM.barMs) this.bellHits.delete(t);
        if (!this.bellHits.has(target)) this.bellHits.set(target, new Set());
        const peers = this.bellHits.get(target);
        peers.add(player.pid);
        this.io.emit('bell:ring', { sid: player.sid, quality: grade === 'perfect' ? 1 : 0.6, force: 0.7, intensity: Math.min(0.8, (peers.size - 1) * 0.14), beat: (idx % 3) + 1 });
      } else {
        // Meditate: hoa sen mở dần theo điểm cả round, phát một lần khi round khép lại.
        const roundNotes = game.notes[round];
        if (roundNotes.every((g) => g != null)) {
          const summary = rhythmSummary(game.notes.slice(0, round + 1).flat());
          this.io.emit('rhythm:bloom', { mat: player.mat, bloom: (summary.perfect + summary.good) * 5 / (game.notes.slice(0, round + 1).flat().length), pulseAt: now });
        }
      }
    }
    return { ok: true, round, idx, grade, ...this.summarySoFar(game) };
  }

  summarySoFar(game) {
    return rhythmSummary(game.notes.flat().filter((g) => g != null));
  }

  finish(player, data) {
    const game = player.rhythm;
    if (!game || data?.id !== game.id || !this.allowed(player, game.kind)) return { ok: false, saved: false };
    if (Date.now() < game.endsAt) return { ok: false, saved: false, error: 'Bản nhạc chưa kết thúc nhé.' };
    this.sweepNotes(game, Date.now());
    const summary = rhythmSummary(game.notes.flat());
    if (!game.finished) {
      if (game.kind === 'meditate') {
        this.db.addMeditation(player.pid, summary.score, Date.now());
        game.cultivation = this.db.cultivation(player.pid);
        player.cultivationTier = game.cultivation.tier;
        this.io.emit('cultivation:update', { sid: player.sid, tier: player.cultivationTier });
      }
      else {
        this.db.bumpBell(player.pid);
        this.db.bumpStat(localDate(Date.now(), this.config.timezone), { bells: 1 });
      }
      const teu = Math.floor(summary.score / 25) * TEU.rhythmPer25;
      if (teu > 0) this.db.addTeu(player.pid, teu, 'rhythm', localDate(Date.now(), this.config.timezone));
      game.finished = true;
    }
    const tier = summary.score >= 75 ? 'high' : summary.score >= 45 ? 'mid' : 'low';
    const list = this.config.meditationPhrases?.[tier] || [];
    return { ok: true, saved: true, cultivation: game.cultivation, teu: Math.floor(summary.score / 25) * TEU.rhythmPer25, ...summary, mates: [...(player.medMates || [])], phrase: list.length ? list[crypto.randomInt(list.length)] : 'Một bản nhạc cho mình, một khoảng yên cho cả ngày.' };
  }
}
