// Tài xỉu và lõi bàn chung CasinoRoundTable: luật, lợi thế nhà cái, người tung, giả mạo, ngắt giữa ván, sập server,
// và một lượt qua socket thật (kèm kiểm tra cò quay đã được nối vào phòng).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import { Db } from '../server/db.js';
import { TaiXiu } from '../server/taixiu.js';
import { localDate } from '../server/time.js';
import { expectedReturn } from '../shared/casino-bets.js';
import { ALL_DICE, BAO, TAI, TAIXIU, TAIXIU_TARGETS, XIU, settleTaixiu, taixiuSide, taixiuWins } from '../shared/taixiu.js';
import { PLACES, PLAYER_RADIUS, TAIXIU_ZONE, resolveCollision } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const EPOCH = '2000-01-01';
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const C = 'c'.repeat(32);
const bets = (map) => Object.assign([0, 0, 0], map);

test('luật: xỉu 4–10, tài 11–17, bộ ba thì tài xỉu đều thua còn bão ăn 30', () => {
  assert.equal(taixiuWins(XIU, [1, 3, 6]), true);
  assert.equal(taixiuWins(TAI, [1, 4, 6]), true);
  assert.equal(taixiuWins(TAI, [4, 4, 4]), false, 'bão: tài thua dù tổng 12');
  assert.equal(taixiuWins(XIU, [2, 2, 2]), false, 'bão: xỉu thua dù tổng 6');
  assert.equal(taixiuWins(BAO, [5, 5, 5]), true);
  assert.deepEqual([taixiuSide([6, 6, 6]), taixiuSide([5, 5, 1]), taixiuSide([1, 2, 3])], ['bao', 'tai', 'xiu']);
  // Tài 10 + bão 2, ra 3-3-3: tài mất 10, bão nhận 2 × 31 = 62.
  assert.deepEqual(settleTaixiu(bets({ [TAI]: 10, [BAO]: 2 }), [3, 3, 3]), { stake: 12, payout: 62, net: 50, profit: 50, returned: 12 });
  // Cược cả hai cửa: một cửa hoàn gấp đôi, cửa kia mất, hoà vốn.
  assert.deepEqual(settleTaixiu(bets({ [TAI]: 5, [XIU]: 5 }), [1, 2, 3]), { stake: 10, payout: 10, net: 0, profit: 0, returned: 10 });
});

test('nhà cái luôn lợi thế: tài/xỉu hoàn 210/216, bão hoàn 186/216', () => {
  const wins = (t, dice) => taixiuWins(t, dice);
  assert.equal(expectedReturn(TAI, TAIXIU_TARGETS, ALL_DICE, wins) * 216, 210);
  assert.equal(expectedReturn(XIU, TAIXIU_TARGETS, ALL_DICE, wins) * 216, 210);
  assert.equal(Math.round(expectedReturn(BAO, TAIXIU_TARGETS, ALL_DICE, wins) * 216), 186);
});

test('bàn nằm trong sân: là vật cản, chỗ đứng đi tới được và có trong menu Chơi gì', () => {
  const { seat } = TAIXIU_ZONE;
  assert.deepEqual(resolveCollision(seat.x, seat.z), { x: seat.x, z: seat.z });
  const pushed = resolveCollision(TAIXIU_ZONE.x + 0.3, TAIXIU_ZONE.z);
  assert.ok(Math.hypot(pushed.x - TAIXIU_ZONE.x, pushed.z - TAIXIU_ZONE.z) >= TAIXIU_ZONE.tableRadius + PLAYER_RADIUS - 1e-6);
  const place = PLACES.find((p) => p.key === 'taixiu');
  assert.deepEqual([place.x, place.z], [seat.x, seat.z]);
});

// ---------- Bàn chơi (đồng hồ giả) ----------

function fixture({ dice = [6, 5, 4] } = {}) {
  const db = new Db(':memory:');
  const events = [];
  const payouts = [];
  const rolls = dice.map((d) => d - 1); // random(6) trả 0..5
  const game = new TaiXiu({ db, io: { emit: (name, data) => events.push([name, data]) }, config, random: () => rolls.shift() });
  game.onPayout = (pid, result) => payouts.push([pid, result]);
  let sid = 0;
  const player = (pid, teu, over = {}) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'seed', DATE);
    return { pid, sid: ++sid, name: `Khách ${pid[0]}`, x: TAIXIU_ZONE.seat.x, z: TAIXIU_ZONE.seat.z, activity: ACTIVITY.taixiu, ...over };
  };
  const bet = (p, target, amount) => {
    p.lastCasinoBet = 0; // Bỏ nhịp chống bấm dồn để đặt liên tiếp.
    return game.bet(p, { target, amount });
  };
  return { db, game, events, payouts, player, bet };
}

test('một ván đủ pha: cược, người cược lớn nhất tung, chia tiền, nghỉ; bảng cầu và bảng tuần', () => {
  const { db, game, events, payouts, player, bet } = fixture({ dice: [6, 5, 4] });
  const a = player(A, 100);
  const b = player(B, 50);
  const c = player(C, 50);

  assert.equal(bet(a, TAI, 10).teu, 90, 'trừ tiền ngay');
  assert.equal(bet(b, XIU, 10).ok, true);
  assert.equal(bet(b, BAO, 1).ok, true);
  assert.equal(bet(c, TAI, 5).ok, true);
  assert.deepEqual(game.totals(), [10, 15, 1]);

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'throwing');
  assert.deepEqual(game.publicState().thrower, { sid: b.sid, name: 'Khách b' }, 'B cược 11 là lớn nhất');
  assert.equal(game.publicState().result, null, 'chưa tung thì chưa có kết quả');
  assert.equal(bet(c, TAI, 1).ok, false, 'đang tung thì không nhận cược');
  assert.equal(game.throw(a, { power: 1 }).ok, false, 'không phải người tung');
  assert.equal(game.throw(b, { power: 0.8 }).ok, true);
  assert.equal(game.phase, 'rolling');
  assert.deepEqual(game.publicState().result, [6, 5, 4]);
  assert.equal(game.publicState().power, 0.8);
  assert.equal(game.throw(b, { power: 1 }).ok, false, 'không tung hai lần');
  assert.equal(payouts.length, 0, 'xúc xắc còn lăn thì chưa chia tiền');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'result');
  // Tổng 15 là tài. A: 90 + 20 = 110. B: xỉu và bão đều mất → 39. C: 45 + 10 = 55.
  assert.deepEqual([A, B, C].map((pid) => db.shop.teu(pid)), [110, 39, 55]);
  assert.deepEqual(Object.fromEntries(payouts.map(([pid, r]) => [pid[0], r.net])), { a: 10, b: -11, c: 5 });
  assert.deepEqual([A, B, C].map((pid) => db.taixiu.held(pid)), [0, 0, 0]);
  assert.deepEqual(game.publicState().history, [{ dice: [6, 5, 4], side: 'tai' }]);
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 110, 'Khách b': 39, 'Khách c': 55 }, 'bảng tuần tính lãi/lỗ ròng');
  assert.equal(JSON.stringify(events).includes(A), false, 'tin phát chung không lộ playerId');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'idle');
  db.close();
});

test('người tung: bằng tiền thì ai cược trước; không tung kịp thì bàn tự tung', () => {
  const { db, game, player, bet } = fixture({ dice: [1, 1, 2] });
  const a = player(A, 50);
  const b = player(B, 50);
  bet(a, XIU, 5);
  bet(b, TAI, 5);
  game.sweep(game.endsAt);
  assert.equal(game.publicState().thrower.sid, a.sid);
  game.sweep(game.endsAt - 1);
  assert.equal(game.phase, 'throwing');
  game.sweep(game.endsAt);
  assert.equal(game.phase, 'rolling', 'hết giờ là tự tung');
  assert.ok(game.power > 0 && game.power < 1);
  db.close();
});

test('lực tung giả mạo không làm hỏng ván, chỉ dùng lực mặc định', () => {
  for (const data of [null, { power: 'max' }, { power: NaN }, { power: Infinity }, { power: 99 }]) {
    const { db, game, player, bet } = fixture();
    const a = player(A, 20);
    bet(a, TAI, 5);
    game.sweep(game.endsAt);
    assert.equal(game.throw(a, data).ok, true);
    assert.ok(game.power >= 0 && game.power <= 1, JSON.stringify(data));
    db.close();
  }
});

test('cược giả mạo và vượt mức bị từ chối, không trừ một đồng', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 100);
  for (const data of [null, 'tai', [], { target: '1', amount: 5 }, { target: 1, amount: '5' }, { target: 1.5, amount: 5 }, { target: -1, amount: 5 }, { target: 3, amount: 5 }, { target: TAI, amount: 3 }, { target: TAI, amount: 1e9 }]) {
    a.lastCasinoBet = 0;
    assert.equal(game.bet(a, data).ok, false, JSON.stringify(data));
  }
  assert.equal(db.shop.teu(A), 100);
  assert.equal(game.phase, 'idle', 'cược hỏng không mở ván');
  bet(a, BAO, 1);
  bet(a, BAO, 1);
  bet(a, BAO, 1);
  assert.match(bet(a, BAO, 1).error, /tối đa 3/);
  for (let i = 0; i < 3; i++) bet(a, TAI, 10);
  assert.equal(bet(a, XIU, 10).ok, true, 'tới 43');
  assert.match(bet(a, XIU, 10).error, /tối đa 50/);
  assert.equal(db.shop.teu(A), 57);
  const poor = player(B, 3);
  assert.deepEqual(bet(poor, TAI, 5), { ok: false, error: 'Không đủ TEU để cược 5.', teu: 3 });
  db.close();
});

test('phải ở đúng bàn: sai hoạt động, đứng xa hay bấm dồn đều bị chặn', () => {
  const { db, game, player } = fixture();
  assert.equal(game.bet(player(A, 50, { activity: ACTIVITY.baucua }), { target: TAI, amount: 1 }).ok, false);
  assert.equal(game.bet(player(B, 50, { x: 0, z: 30 }), { target: TAI, amount: 1 }).ok, false);
  const c = player(C, 50);
  assert.equal(game.bet(c, { target: TAI, amount: 1 }).ok, true);
  assert.equal(game.bet(c, { target: TAI, amount: 1 }).ok, false, 'bấm dồn trong 120 ms');
  assert.equal(db.shop.teu(C), 49);
  db.close();
});

test('rút hết cược thì hết giờ bàn về nghỉ, không ai phải tung', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 50);
  bet(a, TAI, 10);
  assert.equal(game.clear(a).teu, 50);
  game.sweep(game.endsAt);
  assert.equal(game.phase, 'idle');
  assert.equal(game.clear(a).ok, false, 'bàn nghỉ thì không có gì để rút');
  assert.equal(db.shop.teu(A), 50);
  db.close();
});

test('người chơi mất kết nối giữa ván: vẫn được chấm theo playerId; lỗi gửi một người không chặn người khác', () => {
  const { db, game, player, bet } = fixture({ dice: [1, 2, 3] });
  const a = player(A, 50);
  const b = player(B, 50);
  bet(a, XIU, 10);
  bet(b, XIU, 5);
  game.onPayout = (pid) => {
    if (pid === A) throw new Error('socket đã đóng');
  };
  const quiet = console.error;
  console.error = () => {};
  try {
    game.sweep(game.endsAt);
    game.sweep(game.endsAt); // A rời mạng, không tung: bàn tự tung.
    game.sweep(game.endsAt);
  } finally {
    console.error = quiet;
  }
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [60, 55]);
  db.close();
});

test('tắt server giữa ván hoàn cược; sau khi chia tiền thì không hoàn thêm', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 50);
  bet(a, TAI, 10);
  game.sweep(game.endsAt);
  game.stop();
  assert.deepEqual([db.shop.teu(A), db.taixiu.held(A), game.phase], [50, 0, 'idle']);
  game.stop();
  assert.equal(db.shop.teu(A), 50, 'không hoàn hai lần');
  db.close();
});

test('server sập giữa ván: lần khởi động sau hoàn đủ, không hoàn lần hai', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-taixiu-crash-'));
  const file = path.join(dir, 'crash.db');
  const quiet = console.log;
  console.log = () => {};
  try {
    const db = new Db(file);
    db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(A, 100, 'seed', DATE);
    const game = new TaiXiu({ db, io: { emit() {} }, config });
    game.bet({ pid: A, sid: 1, name: 'a', x: TAIXIU_ZONE.x, z: TAIXIU_ZONE.z, activity: ACTIVITY.taixiu }, { target: TAI, amount: 10 });
    assert.equal(db.shop.teu(A), 90);
    db.close();
    for (let i = 0; i < 2; i++) {
      const again = new Db(file);
      new TaiXiu({ db: again, io: { emit() {} }, config });
      assert.deepEqual([again.shop.teu(A), again.taixiu.held(A)], [100, 0]);
      again.close();
    }
  } finally {
    console.log = quiet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- Qua socket thật ----------

const SOCKET_PORT = 4393; // Khác 3911/39xx (server), 4391 (bầu cua), 4392 (xì dách).

test('tài xỉu + cò quay qua socket: chỉ cược ở bàn, người tung thấy mình, kết nối lại vẫn tung được', { timeout: 25000 }, async () => {
  const pid = 'd'.repeat(32);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-taixiu-'));
  const cfgFile = path.join(dir, 'config.json');
  const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
  example.bellSchedule = [];
  example.newPlayersPerMinute = 1000;
  fs.writeFileSync(cfgFile, JSON.stringify(example));
  const dbPath = path.join(dir, 'test.db');
  const seed = new Db(dbPath);
  seed.touchPlayer({ id: pid, name: 'Khách Tung', color: 0, hat: 7, now: Date.now(), isVisit: true });
  seed.addTeu(pid, 40, 'seed', DATE);
  seed.close();

  const proc = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['server/index.js'], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, PORT: String(SOCKET_PORT), ADMIN_KEY: 'k'.repeat(32), DB_PATH: dbPath, HTH_CONFIG: cfgFile },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    p.stdout.on('data', (d) => String(d).includes('đang chạy') && resolve(p));
    p.on('error', reject);
    p.on('exit', () => reject(new Error('server tắt sớm')));
  });
  const sockets = [];
  const connect = () => new Promise((resolve, reject) => {
    const s = io(`http://127.0.0.1:${SOCKET_PORT}`, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
  const call = (s, ev, data) => s.timeout(3000).emitWithAck(ev, data);
  const waitFor = (s, ev, ok, ms = 3000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`hết giờ chờ ${ev}`)), ms);
    s.on(ev, (v) => {
      if (ok(v)) {
        clearTimeout(timer);
        resolve(v);
      }
    });
  });
  try {
    const a = await connect();
    const hello = await call(a, 'hello', { name: 'Khách Tung', color: 0, hat: 7, playerId: pid });
    assert.equal(hello.snapshot.taixiu.phase, 'idle');
    assert.deepEqual(hello.snapshot.taixiu.mine, [0, 0, 0]);
    assert.equal(hello.snapshot.coquay.mine.length, 46, 'cò quay đã nối vào phòng');

    const b = await connect();
    await call(b, 'hello', { name: 'Người Xem', color: 0, hat: 7 });

    assert.equal((await call(a, 'taixiu:bet', { target: TAI, amount: 5 })).ok, false, 'đứng xa bàn');
    assert.equal((await call(a, 'coquay:bet', { target: 0, amount: 1 })).ok, false, 'chưa vào bàn cò quay');

    const seat = TAIXIU_ZONE.seat;
    await call(a, 'move', [seat.x, seat.z, seat.rot, 0, Date.now()]);
    assert.equal((await call(a, 'action:start', { kind: 'taixiu' })).ok, true);
    const seen = waitFor(b, 'taixiu:state', (s) => s.phase === 'betting' && s.totals[TAI] === 5);
    const placed = await call(a, 'taixiu:bet', { target: TAI, amount: 5 });
    assert.deepEqual([placed.ok, placed.teu, placed.bets], [true, 35, [0, 5, 0]]);
    const state = await seen;
    assert.equal(JSON.stringify(state).includes(pid), false, 'tin phát chung không lộ playerId');
    for (const bad of [null, 'tai', { target: 'x', amount: 5 }, { target: TAI, amount: 1e9 }]) {
      assert.equal((await call(a, 'taixiu:bet', bad)).ok, false);
    }
    assert.equal((await call(a, 'taixiu:throw', { power: 1 })).ok, false, 'chưa tới lúc tung');

    // Kết nối lại giữa ván, chờ tới lượt tung: snapshot/state báo mình là người tung, tung được.
    a.disconnect();
    const a2 = await connect();
    const again = await call(a2, 'hello', { name: 'Khách Tung', color: 0, hat: 7, playerId: pid });
    assert.equal(again.snapshot.taixiu.mine[TAI], 5);
    assert.equal(again.snapshot.teu, 35);
    const throwing = await waitFor(b, 'taixiu:state', (s) => s.phase === 'throwing', TAIXIU.betMs + 2000);
    assert.equal(throwing.thrower.name, 'Khách Tung');
    const rolling = waitFor(b, 'taixiu:state', (s) => s.phase === 'rolling');
    assert.equal((await call(a2, 'taixiu:throw', { power: 0.9 })).ok, true);
    const rolled = await rolling;
    assert.equal(rolled.result.length, 3);
    assert.equal(rolled.power, 0.9);
  } finally {
    sockets.forEach((s) => s.disconnect());
    proc.removeAllListeners('exit');
    await new Promise((resolve) => {
      proc.on('exit', resolve);
      proc.kill();
    });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
