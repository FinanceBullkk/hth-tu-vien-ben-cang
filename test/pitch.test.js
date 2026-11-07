import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { PitchGame } from '../server/pitch.js';
import { PITCH_ZONE } from '../shared/layout.js';
import { PITCH, pitchAimState, pitchFillStep, pitchPoints, pitchRadius, pitchStage, pitchWinner } from '../shared/pitch.js';

function fixture(t, npcRoll = 0.99) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const turns = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const config = { timezone: 'Asia/Ho_Chi_Minh' };
  const pitch = new PitchGame({ db, io, config, random: () => npcRoll });
  const player = (pid, sid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return {
      pid, sid, name: pid, x: PITCH_ZONE.x, z: PITCH_ZONE.z, activity: 0, dirty: false, pitch: null,
      socket: { emit: (event, data) => { if (event === 'pitch:turn') turns.push(data); } },
    };
  };
  const jump = (at) => t.mock.timers.tick(at - Date.now());
  return { db, events, turns, pitch, player, jump };
}

/** Tâm tay phải đặt để sau khi cộng độ lắc nằm đúng giữa vòng. */
function aimOnTarget(game, now) {
  const zero = { x: 0, y: 0, bx: 0, by: 0 };
  const s = pitchAimState({ seed: game.seed, tier: game.tier, stage: game.stage, aimAt: game.aimAt, aim: zero, now });
  return {
    x: s.targetA.x - s.cursorA.x,
    y: s.targetA.y - s.cursorA.y,
    bx: s.targetB ? s.targetB.x - s.cursorB.x : 0,
    by: s.targetB ? s.targetB.y - s.cursorB.y : 0,
  };
}

/** Giữ tâm trong vòng tới khi đầy rồi ném trúng. */
function holdAndThrow(f, a) {
  const game = a.pitch;
  if (Date.now() < game.aimAt) f.jump(game.aimAt);
  const needed = PITCH.opponents[game.tier].fillMs;
  for (let held = 0; held <= needed; held += PITCH.sampleMs) {
    f.jump(Date.now() + PITCH.sampleMs);
    f.pitch.aim(a, aimOnTarget(game, Date.now()));
  }
  return f.pitch.throw(a, aimOnTarget(game, Date.now()));
}

test('bảng điểm khớp video: 10, 25, 40 sau ba cú; chín cú liền đạt 245; dẫn 50 hoặc chạm 250 là thắng', () => {
  let total = 0;
  const sums = [];
  for (let c = 1; c <= 9; c++) sums.push((total += pitchPoints(c)));
  assert.deepEqual(sums.slice(0, 3), [10, 25, 40]);
  assert.equal(sums[7], 195);
  assert.equal(sums[8], 245);
  assert.equal(pitchPoints(30), 50, 'combo cao hơn vẫn giữ mức trần');
  assert.equal(pitchWinner(245, 195), 'me');
  assert.equal(pitchWinner(250, 240), 'me');
  assert.equal(pitchWinner(195, 245), 'npc');
  assert.equal(pitchWinner(100, 60), null);
});

test('ba lượt đầu dạy dần rồi bốc theo độ khó; cùng seed ra cùng hình', () => {
  assert.equal(pitchStage(42, 0, 0).dual, false);
  assert.equal(pitchStage(42, 1, 0).dual, true);
  assert.equal(pitchStage(42, 2, 0).dual, true);
  assert.deepEqual(pitchStage(42, 5, 1), pitchStage(42, 5, 1));
  assert.equal(pitchAimState({
    seed: 1, tier: 0, stage: pitchStage(1, 0, 0), aimAt: 0, now: 0, aim: { x: 0.99, y: 0.99, bx: 0, by: 0 },
  }).inside, false, 'tâm ở góc sân không nằm trong vòng');
});

test('bắt đầu: phải đứng gần sân, trận 2 phút, chọn đối thủ, vào lại vẫn là trận cũ', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  a.x = 0;
  assert.ok(f.pitch.start(a).error.includes('đầu hồ'));
  a.x = PITCH_ZONE.x;
  const res = f.pitch.start(a, { tier: 2 });
  assert.equal(res.ok, true);
  assert.equal(res.game.tier, 2);
  assert.equal(res.game.endsAt - res.game.at, PITCH.matchMs);
  assert.equal(a.activity, 6);
  assert.equal(f.pitch.start(a).game.id, res.game.id);
  a.pitch = null;
  assert.equal(f.pitch.start(a, { tier: 99 }).game.tier, 0, 'đối thủ không có thật về mức dễ');
});

test('giữ đầy rồi ném là trúng, combo tăng; đối thủ ném theo sau', (t) => {
  const f = fixture(t, 0); // đối thủ luôn trúng
  const a = f.player('An', 1);
  f.pitch.start(a);
  assert.equal(holdAndThrow(f, a).ok, true);
  const turn = f.turns.at(-1);
  assert.equal(turn.me.hit, true);
  assert.equal(turn.me.pts, 10);
  assert.equal(turn.me.combo, 1);
  assert.equal(turn.npc.score, 10);
  assert.equal(turn.aimAt, Date.now() + PITCH.turnGapMs);
  assert.deepEqual(f.events.at(-1), { event: 'pitch:throw', data: { sid: 1, hit: true, npcHit: true } });
});

test('ném khi vòng chưa đầy là trượt và mất combo; client không tự khai điểm được', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  holdAndThrow(f, a);
  assert.equal(a.pitch.me.combo, 1);
  f.jump(a.pitch.aimAt + 100);
  f.pitch.throw(a, { x: 0, y: 0, score: 9999, fill: 1, hit: true });
  const turn = f.turns.at(-1);
  assert.equal(turn.me.hit, false);
  assert.equal(turn.me.combo, 0);
  assert.equal(a.pitch.me.score, 10);
});

test('chưa tới lượt ngắm thì không ném được; tâm lệch khỏi vòng thì vòng không đầy', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  assert.equal(f.pitch.throw(a, { x: 0, y: 0 }).ok, false);
  const game = a.pitch;
  f.jump(game.aimAt);
  for (let i = 0; i < 30; i++) {
    f.jump(Date.now() + PITCH.sampleMs);
    const onTarget = aimOnTarget(game, Date.now());
    f.pitch.aim(a, { x: onTarget.x > 0 ? -1 : 1, y: onTarget.y > 0 ? -1 : 1 });
  }
  assert.equal(game.fill, 0);
});

test('một lần mất mẫu dài không được tính là giữ yên', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  const game = a.pitch;
  f.jump(game.aimAt + 5000);
  f.pitch.aim(a, aimOnTarget(game, Date.now()));
  assert.ok(game.fill * PITCH.opponents[0].fillMs <= PITCH.maxSampleGapMs + 1);
});

test('độ trễ mạng: chấm theo giờ client gửi mẫu, không theo giờ gói tới', (t) => {
  const f = fixture(t);
  const withT = f.player('An', 1);
  const noT = f.player('Binh', 2);
  f.pitch.start(withT, { tier: 2 });
  f.pitch.start(noT, { tier: 2 });
  // Hai người cùng thấy một lượt để so công bằng.
  noT.pitch.seed = withT.pitch.seed;
  noT.pitch.stage = withT.pitch.stage;
  const game = withT.pitch;
  const lag = 200;
  const state = (now) => pitchAimState({ seed: game.seed, tier: 2, stage: game.stage, aimAt: game.aimAt, aim: { x: 0, y: 0, bx: 0, by: 0 }, now });
  // Tìm lúc vòng trôi nhanh, đặt tâm ở mép sau của vòng: lúc gửi còn trong vòng, tới khi gói đến đã bị bỏ lại.
  f.jump(game.aimAt + lag + 100);
  let sent;
  let aim;
  for (let i = 0; i < 80; i++) {
    sent = Date.now() - lag;
    const then = state(sent);
    const nowState = state(Date.now());
    const dx = (nowState.targetA.x - then.targetA.x) * PITCH.aspect;
    const dy = nowState.targetA.y - then.targetA.y;
    const moved = Math.hypot(dx, dy);
    if (moved > 0.07) {
      const edge = PITCH.opponents[2].radius * 0.98;
      aim = {
        x: then.targetA.x - then.cursorA.x - ((dx / moved) * edge) / PITCH.aspect,
        y: then.targetA.y - then.cursorA.y - (dy / moved) * edge,
      };
      break;
    }
    f.jump(Date.now() + 50);
  }
  assert.ok(aim, 'phải tìm được lúc vòng trôi đủ nhanh');
  f.pitch.aim(withT, { ...aim, t: sent });
  f.pitch.aim(noT, aim);
  assert.ok(withT.pitch.fill > 0, 'có t: tính đúng như màn hình đã thấy');
  assert.equal(noT.pitch.fill, 0, 'không có t: chấm theo vị trí vòng lúc gói tới nên trượt');
});

test('độ trễ mạng: không tua giờ được bằng t giả', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  const game = a.pitch;
  f.jump(game.aimAt + 1000);
  f.pitch.aim(a, { ...aimOnTarget(game, Date.now()), t: Date.now() + 60_000 });
  assert.equal(game.lastSampleAt, Date.now(), 't ở tương lai bị kẹp về hiện tại');
  f.jump(Date.now() + 1000);
  f.pitch.aim(a, { x: 0, y: 0, t: 1 });
  assert.equal(game.lastSampleAt, Date.now() - PITCH.maxLagMs, 't quá cũ bị kẹp trong giới hạn');
  const before = game.lastSampleAt;
  f.pitch.aim(a, { x: 0, y: 0, t: before - 50 });
  assert.equal(game.lastSampleAt, before, 'mẫu cũ hơn mẫu trước thì bỏ qua');
});

test('độ khó: tụt chậm hơn đầy, cấp khó có vòng rộng hơn ở lượt hai tâm', () => {
  assert.ok(pitchFillStep(0.5, false, 100, 2) > 0.5 - pitchFillStep(0, true, 100, 2), 'lỡ tay mất ít hơn phần đã giữ được');
  const single = pitchStage(7, 0, 2);
  const dual = pitchStage(7, 1, 2);
  assert.equal(pitchRadius(2, single), PITCH.opponents[2].radius);
  assert.equal(pitchRadius(2, dual), PITCH.opponents[2].dualRadius);
  assert.equal(pitchRadius(0, dual), PITCH.opponents[0].radius, 'đối thủ không khai dualRadius thì giữ nguyên cỡ vòng');
});

test('hai tâm: chỉ giữ tâm chuột thì vòng không đầy, phải đủ cả hai', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  holdAndThrow(f, a); // lượt 0 một tâm, lượt 1 hai tâm
  const game = a.pitch;
  assert.equal(game.stage.dual, true);
  f.jump(game.aimAt);
  for (let i = 0; i < 20; i++) {
    f.jump(Date.now() + PITCH.sampleMs);
    const good = aimOnTarget(game, Date.now());
    f.pitch.aim(a, { x: good.x, y: good.y, bx: good.bx > 0 ? -1 : 1, by: good.by > 0 ? -1 : 1 });
  }
  assert.equal(game.fill, 0, 'tâm phím lệch thì không đầy');
  assert.equal(holdAndThrow(f, a).ok, true);
  assert.equal(f.turns.at(-1).me.hit, true, 'đủ cả hai thì ném trúng');
  assert.equal(f.turns.at(-1).me.combo, 2);
});

test('hết thời gian ngắm tính trượt; đối thủ vẫn ném', (t) => {
  const f = fixture(t, 0);
  const a = f.player('An', 1);
  f.pitch.start(a);
  f.jump(a.pitch.aimEndsAt);
  f.pitch.sweep(new Map([[a.sid, a]]));
  const turn = f.turns.at(-1);
  assert.equal(turn.me.hit, false);
  assert.equal(turn.npc.hit, true);
  assert.equal(a.pitch.turn, 1);
});

test('dẫn 50 điểm là thắng ngay, đối thủ không ném cú đó; lưu đúng một lần và cộng TEU theo đối thủ', (t) => {
  const f = fixture(t); // đối thủ luôn trượt
  const a = f.player('An', 1);
  f.pitch.start(a, { tier: 1 });
  let turn;
  for (let i = 0; i < 9 && !turn?.over; i++) {
    holdAndThrow(f, a);
    turn = f.turns.at(-1);
  }
  assert.equal(turn.over.outcome, 'win');
  assert.equal(turn.over.score, 60, '10 + 15 + 15 + 20');
  assert.equal(turn.npc, null, 'trận đã xong thì đối thủ không ném nữa');
  assert.equal(turn.over.rank, 'A');
  assert.equal(turn.over.teu, 5);
  assert.equal(a.activity, 0);
  assert.equal(f.db.playerRow(a.pid).teu, 5);
  assert.equal(f.db.playerRow(a.pid).pitch_best, 60);
  assert.equal(f.pitch.throw(a, {}).ok, false, 'trận xong không ném tiếp');
  f.pitch.sweep(new Map([[a.sid, a]]));
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM pitch_scores WHERE player_id=?').get(a.pid).n, 1);
});

test('hết 2 phút: so điểm, hoà hoặc thua đều hạng C', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  f.jump(a.pitch.endsAt);
  f.pitch.sweep(new Map([[a.sid, a]]));
  const { over } = f.turns.at(-1);
  assert.equal(over.outcome, 'draw');
  assert.equal(over.rank, 'C');
  assert.equal(over.teu, 1);
});

test('bỏ dở giữa trận: không lưu điểm, không cộng TEU', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.pitch.start(a);
  holdAndThrow(f, a);
  f.pitch.leave(a);
  assert.equal(a.pitch, null);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM pitch_scores WHERE player_id=?').get(a.pid).n, 0);
  assert.equal(f.db.playerRow(a.pid).teu, 0);
});
