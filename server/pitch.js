// Đầu hồ: đấu theo lượt với đối thủ NPC. Client chỉ gửi vị trí tâm; server tự tính vòng đầy và chấm điểm.
import crypto from 'node:crypto';
import { PITCH_ZONE, dist2d } from '../shared/layout.js';
import { ACTIVITY, TEU } from '../shared/protocol.js';
import { PITCH, clampAim, pitchAimState, pitchFillStep, pitchPoints, pitchStage, pitchTier, pitchWinner } from '../shared/pitch.js';
import { localDate } from './time.js';

const readAim = (data) => ({ x: clampAim(data?.x), y: clampAim(data?.y), bx: clampAim(data?.bx), by: clampAim(data?.by) });

/** Cộng một cú ném vào một bên: trúng tăng combo và điểm, trượt mất combo. */
function applyThrow(side, hit) {
  side.combo = hit ? side.combo + 1 : 0;
  side.bestCombo = Math.max(side.bestCombo, side.combo);
  const pts = hit ? pitchPoints(side.combo) : 0;
  side.score += pts;
  return { hit, pts, score: side.score, combo: side.combo };
}

export class PitchGame {
  constructor({ db, io, config, random = Math.random }) {
    Object.assign(this, { db, io, config, random });
  }

  nearSpot(player) {
    return dist2d(player.x, player.z, PITCH_ZONE.x, PITCH_ZONE.z) <= PITCH_ZONE.radius + 1.5;
  }

  start(player, data) {
    if (player.activity === ACTIVITY.meditate) return { ok: false, error: 'Đứng dậy trước khi chơi đầu hồ nhé.' };
    if (!this.nearSpot(player)) return { ok: false, error: 'Đến sân đầu hồ cạnh bãi container nhé.' };
    const now = Date.now();
    const current = player.pitch;
    if (current && !current.finished) return { ok: true, game: this.publicGame(current) };
    const seed = crypto.randomInt(1, 0x7fffffff);
    const tier = pitchTier(data?.tier);
    const aimAt = now + PITCH.firstAimDelayMs;
    player.pitch = {
      id: crypto.randomUUID(),
      tier,
      seed,
      at: now,
      endsAt: now + PITCH.matchMs,
      turn: 0,
      stage: pitchStage(seed, 0, tier),
      aimAt,
      aimEndsAt: aimAt + PITCH.aimMs,
      lastSampleAt: aimAt,
      fill: 0,
      aim: { x: 0, y: 0, bx: 0, by: 0 },
      me: { score: 0, combo: 0, bestCombo: 0 },
      npc: { score: 0, combo: 0, bestCombo: 0 },
      throws: 0,
      finished: false,
    };
    player.activity = ACTIVITY.pitch;
    player.dirty = true;
    return { ok: true, game: this.publicGame(player.pitch) };
  }

  publicGame(game) {
    const { id, tier, seed, at, endsAt, turn, aimAt, aimEndsAt, me, npc } = game;
    return { id, tier, seed, at, endsAt, turn, aimAt, aimEndsAt, me, npc };
  }

  /**
   * Cộng dồn vòng đầy từ mẫu trước tới mẫu này. Khoảng trống bị chặn trần để mất mạng không thành "giữ yên".
   * Chấm tại thời điểm client gửi mẫu (t) để vòng đúng chỗ người chơi đã thấy, không phải chỗ nó trôi tới lúc gói đến.
   * t bị kẹp trong maxLagMs trở lại và không được ở tương lai, nên không thể dùng để tua giờ.
   */
  #integrate(game, now, data) {
    if (data) game.aim = readAim(data);
    const sentAt = Number(data?.t);
    const at = Number.isFinite(sentAt) ? Math.min(now, Math.max(now - PITCH.maxLagMs, sentAt)) : now;
    if (at <= game.lastSampleAt) return;
    const dt = Math.min(at - game.lastSampleAt, PITCH.maxSampleGapMs);
    game.lastSampleAt = at;
    const state = pitchAimState({ seed: game.seed, tier: game.tier, stage: game.stage, aimAt: game.aimAt, aim: game.aim, now: at, slack: PITCH.serverSlack });
    game.fill = pitchFillStep(game.fill, state.inside, dt, game.tier);
  }

  aim(player, data) {
    const game = player.pitch;
    const now = Date.now();
    if (!game || game.finished || now < game.aimAt || now >= game.aimEndsAt) return { ok: false };
    this.#integrate(game, now, data);
    return { ok: true };
  }

  throw(player, data) {
    const game = player.pitch;
    if (!game || game.finished) return { ok: false };
    const now = Date.now();
    if (now < game.aimAt) return { ok: false };
    this.#integrate(game, now, data);
    this.#resolve(player, game, game.fill >= PITCH.hitFill, now);
    return { ok: true };
  }

  /** Chốt lượt: người chơi ném trước, chưa phân thắng bại thì đối thủ ném, rồi chuẩn bị lượt mới. */
  #resolve(player, game, hit, now) {
    game.throws++;
    const opp = PITCH.opponents[game.tier];
    const me = applyThrow(game.me, hit);
    let winner = pitchWinner(game.me.score, game.npc.score);
    const npc = winner ? null : applyThrow(game.npc, this.random() < opp.hitChance);
    if (!winner) winner = pitchWinner(game.me.score, game.npc.score);

    game.turn++;
    game.stage = pitchStage(game.seed, game.turn, game.tier);
    game.aimAt = now + PITCH.turnGapMs;
    game.aimEndsAt = game.aimAt + PITCH.aimMs;
    game.lastSampleAt = game.aimAt;
    game.fill = 0;

    // Người đi ngang cũng thấy tên bay.
    this.io.emit('pitch:throw', { sid: player.sid, hit, npcHit: npc ? npc.hit : null });
    const over = winner ? this.#end(player, game) : null;
    player.socket?.emit('pitch:turn', { me, npc, turn: game.turn, aimAt: game.aimAt, aimEndsAt: game.aimEndsAt, over });
  }

  /** Lưu kết quả đúng một lần. Thắng theo đối thủ nào thì hạng đó, thua hoặc hoà là hạng C. */
  #end(player, game) {
    game.finished = true;
    const { me, npc } = game;
    const outcome = me.score > npc.score ? 'win' : me.score < npc.score ? 'lose' : 'draw';
    const rank = outcome === 'win' ? PITCH.opponents[game.tier].rank : 'C';
    const now = Date.now();
    const date = localDate(now, this.config.timezone);
    this.db.addPitchScore(player.pid, me.score, rank, date, now);
    const teu = TEU.pitchRank[rank] ?? 1;
    this.db.addTeu(player.pid, teu, 'pitch', date);
    if (player.activity === ACTIVITY.pitch) {
      player.activity = ACTIVITY.none;
      player.dirty = true;
    }
    return {
      outcome,
      rank,
      teu,
      score: me.score,
      npcScore: npc.score,
      combo: me.bestCombo,
      npcCombo: npc.bestCombo,
      throws: game.throws,
      best: this.db.pitchBest(player.pid),
    };
  }

  /** Quét theo tick của Room: hết thời gian ngắm là trượt, hết giờ trận thì so điểm. */
  sweep(players) {
    const now = Date.now();
    for (const player of players.values()) {
      const game = player.pitch;
      if (!game || game.finished) continue;
      if (now >= game.endsAt) {
        const over = this.#end(player, game);
        player.socket?.emit('pitch:turn', { me: null, npc: null, turn: game.turn, aimAt: game.aimAt, aimEndsAt: game.aimEndsAt, over });
      } else if (now >= game.aimEndsAt) {
        this.#resolve(player, game, false, now);
      }
    }
  }

  /** Bỏ dở trận là bỏ cuộc: không lưu điểm, không cộng TEU. */
  leave(player) {
    player.pitch = null;
  }
}
