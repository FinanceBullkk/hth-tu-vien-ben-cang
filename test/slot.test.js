// Máy gạt cần: luật bốc và chấm, tỉ lệ hoàn vốn, bố cục dãy máy, server chấm ngay từng lần gạt (bốc giả định trước),
// dữ liệu giả mạo, chỗ đứng, nhịp gạt, thiếu TEU, chấm hỏng giữa chừng, sập giữa lúc trừ và trả, và một lượt qua socket thật.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import { Db } from '../server/db.js';
import { Slot } from '../server/slot.js';
import { localDate } from '../server/time.js';
import {
  BAUCUA_ZONE, PLACES, PLAYER_RADIUS, SLOT_ZONE, TAIXIU_ZONE, dist2d, resolveCollision, slotMachineAt,
} from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { SLOT, SLOT_SYMBOLS, SLOT_WEIGHT_TOTAL, expectedReturn, lineOf, rollFor, settleSpin, symbolAt } from '../shared/slot.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const EPOCH = '2000-01-01';
const [DAO, QUYT, DEN, LIXI, VANG, RONG] = [0, 1, 2, 3, 4, 5];
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);

test('luật: bốc theo trọng số, ăn bộ ba hoặc đôi, đôi Đào không ăn', () => {
  assert.equal(SLOT_SYMBOLS.length, 6);
  assert.equal(SLOT_WEIGHT_TOTAL, 34);
  // Dải trọng số liên tiếp: 0..11 Đào, 12..20 Quýt, ..., 33 Rồng.
  assert.equal(symbolAt(0), DAO);
  assert.equal(symbolAt(11), DAO);
  assert.equal(symbolAt(12), QUYT);
  assert.equal(symbolAt(SLOT_WEIGHT_TOTAL - 1), RONG);
  for (let s = 0; s < SLOT_SYMBOLS.length; s++) assert.equal(symbolAt(rollFor(s)), s);
  const counts = new Array(6).fill(0);
  for (let r = 0; r < SLOT_WEIGHT_TOTAL; r++) counts[symbolAt(r)]++;
  assert.deepEqual(counts, SLOT_SYMBOLS.map((s) => s.weight));

  assert.deepEqual(lineOf([RONG, RONG, RONG]), { kind: 'triple', symbol: RONG, mult: 200 });
  assert.deepEqual(lineOf([LIXI, DAO, LIXI]), { kind: 'pair', symbol: LIXI, mult: 2 }, 'đôi ở hai ô bất kỳ');
  assert.deepEqual(lineOf([DAO, DAO, QUYT]).kind, 'none', 'đôi Đào không ăn');
  assert.deepEqual(lineOf([DAO, QUYT, DEN]).mult, 0);

  // ×n đã gồm tiền cược: cược 5, ba Túi vàng ×80 = 400, lãi 395.
  assert.deepEqual(settleSpin(5, [VANG, VANG, VANG]), { stake: 5, mult: 80, kind: 'triple', symbol: VANG, payout: 400, net: 395, profit: 395, returned: 5 });
  // Đôi Quýt ×1: hoà vốn, hoàn đúng tiền cược, không có lãi.
  assert.deepEqual(settleSpin(10, [QUYT, DAO, QUYT]), { stake: 10, mult: 1, kind: 'pair', symbol: QUYT, payout: 10, net: 0, profit: 0, returned: 10 });
  // Trượt: mất cược.
  assert.deepEqual(settleSpin(1, [DAO, QUYT, DEN]), { stake: 1, mult: 0, kind: 'none', symbol: -1, payout: 0, net: -1, profit: 0, returned: 0 });
});

test('máy luôn lợi thế nhẹ: hoàn vốn kỳ vọng ~95,6%, khoảng 35% lượt có ăn', () => {
  const { rtp, hit } = expectedReturn();
  assert.ok(rtp > 0.94 && rtp < 0.97, `RTP ${rtp}`);
  assert.ok(hit > 0.33 && hit < 0.37, `tỉ lệ ăn ${hit}`);
  // Mức cược đúng khay chip, và ba Rồng là nổ hũ.
  assert.deepEqual(SLOT.bets, [1, 5, 10]);
  assert.equal(SLOT_SYMBOLS[SLOT.jackpot].key, 'rong');
});

test('dãy máy trong hành lang tây: máy là vật cản, chỗ đứng đi tới được, không lẫn vùng bàn khác, có trong menu', () => {
  assert.equal(SLOT_ZONE.machines.length, 3);
  SLOT_ZONE.machines.forEach((m, i) => {
    const { stand } = m;
    assert.deepEqual(resolveCollision(stand.x, stand.z), { x: stand.x, z: stand.z }, `chỗ đứng máy ${i} không kẹt`);
    const pushed = resolveCollision(m.x + 0.2, m.z);
    assert.ok(dist2d(pushed.x, pushed.z, m.x, m.z) >= SLOT_ZONE.machineRadius + PLAYER_RADIUS - 1e-6, `không đứng đè lên máy ${i}`);
    assert.equal(slotMachineAt(stand.x, stand.z), i, 'đứng trước máy nào thì chơi máy đó');
    for (const zone of [BAUCUA_ZONE, TAIXIU_ZONE]) assert.ok(dist2d(stand.x, stand.z, zone.x, zone.z) > zone.radius + 1);
  });
  assert.equal(slotMachineAt(0, 0), -1, 'giữa sân không phải chỗ máy');
  const place = PLACES.find((p) => p.key === 'slot');
  assert.equal(slotMachineAt(place.x, place.z), 1, 'menu đưa tới máy giữa');
});

// ---------- Máy chơi (bốc giả định trước) ----------

function fixture(rolls = []) {
  const db = new Db(':memory:');
  const events = [];
  const queue = [...rolls];
  const game = new Slot({ db, io: { emit: (name, data) => events.push([name, data]) }, config, random: () => queue.shift() ?? 0 });
  let sid = 0;
  const player = (pid, teu, over = {}) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'seed', DATE);
    const { stand } = SLOT_ZONE.machines[1];
    return { pid, sid: ++sid, name: `Khách ${pid[0]}`, x: stand.x, z: stand.z, activity: ACTIVITY.slot, lastSlot: 0, ...over };
  };
  // Bỏ nhịp chống gạt dồn để thử nhiều lần liên tiếp.
  const spin = (p, amount) => {
    p.lastSlot = 0;
    return game.spin(p, { amount });
  };
  const reasons = (pid) => db.db.prepare('SELECT reason, amount FROM teu_log WHERE player_id=? AND reason LIKE ? ORDER BY id').all(pid, 'slot:%');
  const queueRolls = (...symbols) => queue.push(...symbols.map(rollFor));
  return { db, game, events, player, spin, reasons, queueRolls };
}

test('gạt ăn, gạt trượt, gạt hoà: trả tiền ngay, ghi log, không treo tiền, bảng tuần tính lãi/lỗ ròng', () => {
  const { db, events, player, spin, reasons, queueRolls } = fixture();
  const a = player(A, 100);

  queueRolls(RONG, RONG, RONG);
  const jackpot = spin(a, 10);
  assert.deepEqual([jackpot.ok, jackpot.reels, jackpot.mult, jackpot.payout, jackpot.net, jackpot.teu], [true, [RONG, RONG, RONG], 200, 2000, 1990, 2090]);
  assert.equal(jackpot.machine, 1);
  assert.deepEqual(reasons(A), [{ reason: 'slot:bet', amount: -10 }, { reason: 'slot:return', amount: 10 }, { reason: 'slot:win', amount: 1990 }]);
  // Cả sân thấy máy 1 quay; thắng lớn thì có tên người trúng, nhưng không bao giờ có playerId.
  assert.deepEqual(events.at(-1), ['slot:spin', { sid: a.sid, m: 1, reels: [RONG, RONG, RONG], mult: 200, name: 'Khách a', payout: 2000 }]);

  queueRolls(DAO, QUYT, DEN);
  const miss = spin(a, 5);
  assert.deepEqual([miss.ok, miss.mult, miss.net, miss.teu], [true, 0, -5, 2085]);
  assert.deepEqual(events.at(-1)[1], { sid: a.sid, m: 1, reels: [DAO, QUYT, DEN], mult: 0 }, 'thua thì không lộ tên');

  queueRolls(QUYT, DAO, QUYT);
  const push = spin(a, 1);
  assert.deepEqual([push.mult, push.net, push.teu], [1, 0, 2085], 'đôi Quýt hoà vốn');
  assert.equal(db.slot.held(A), 0, 'mỗi lần gạt chấm xong ngay, không còn tiền treo');
  assert.equal(JSON.stringify(events).includes(A), false);

  // Bảng tuần: 100 (cấp) + 1990 − 5 + 0.
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 2085 });
  db.close();
});

test('bảng tuần không mua được hạng bằng cách gạt liên tục: thua bao nhiêu trừ bấy nhiêu', () => {
  const { db, player, spin, queueRolls } = fixture();
  const b = player(B, 30);
  for (let i = 0; i < 3; i++) {
    queueRolls(DAO, QUYT, DEN);
    assert.equal(spin(b, 10).ok, true);
  }
  assert.equal(db.shop.teu(B), 0);
  assert.deepEqual(db.weekly(EPOCH).teu, [], 'lỗ hết thì không có trên bảng');
  db.close();
});

test('dữ liệu giả mạo, sai chỗ, gạt dồn, thiếu TEU đều bị chặn và không mất đồng nào', () => {
  const { db, game, events, player, spin, queueRolls } = fixture();
  const a = player(A, 12);

  for (const bad of [null, undefined, 'x', {}, { amount: '5' }, { amount: 3 }, { amount: -1 }, { amount: 1.5 }, { amount: 1e9 }, { amount: [5] }]) {
    a.lastSlot = 0;
    assert.equal(game.spin(a, bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(spin({ ...a, activity: ACTIVITY.baucua }, 1).ok, false, 'chưa vào máy');
  assert.equal(spin({ ...a, x: 0, z: 0 }, 1).ok, false, 'đứng xa máy');
  assert.equal(db.shop.teu(A), 12);
  assert.equal(events.length, 0);

  queueRolls(DAO, QUYT, DEN);
  assert.equal(game.spin(a, { amount: 10 }).ok, true);
  const again = game.spin(a, { amount: 1 });
  assert.deepEqual([again.ok, again.error], [false, 'Máy còn đang quay.'], 'chưa hết nhịp quay thì chưa gạt được');

  const poor = spin(a, 5);
  assert.deepEqual([poor.ok, poor.teu], [false, 2], 'thiếu TEU: báo số dư, không trừ');
  assert.equal(db.shop.teu(A), 2);
  assert.equal(db.slot.held(A), 0);
  db.close();
});

test('chấm hỏng giữa chừng: hoàn cược ngay, không để treo', () => {
  const { db, game, player, queueRolls } = fixture();
  const a = player(A, 20);
  const real = db.slot.settle.bind(db.slot);
  db.slot.settle = () => {
    throw new Error('đĩa đầy');
  };
  queueRolls(RONG, RONG, RONG);
  assert.throws(() => game.spin(a, { amount: 10 }), /đĩa đầy/);
  assert.deepEqual([db.shop.teu(A), db.slot.held(A)], [20, 0]);
  db.slot.settle = real;
  db.close();
});

test('server sập đúng lúc đã trừ cược mà chưa trả: lần khởi động sau hoàn lại, không hoàn lần hai', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-slot-crash-'));
  const file = path.join(dir, 'crash.db');
  const quiet = console.log;
  console.log = () => {};
  try {
    const db = new Db(file);
    db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(A, 50, 'seed', DATE);
    db.slot.stake(A, 10, DATE); // Trừ cược xong thì sập, chưa kịp chấm.
    assert.deepEqual([db.shop.teu(A), db.slot.held(A)], [40, 10]);
    db.close();

    const again = new Db(file);
    new Slot({ db: again, io: { emit() {} }, config });
    assert.deepEqual([again.shop.teu(A), again.slot.held(A)], [50, 0]);
    again.close();
    const third = new Db(file);
    new Slot({ db: third, io: { emit() {} }, config });
    assert.equal(third.shop.teu(A), 50, 'không hoàn lần hai');
    third.close();
  } finally {
    console.log = quiet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- Qua socket thật ----------

const SOCKET_PORT = 4394; // Khác 3911/39xx (server), 4391 (bầu cua), 4392 (xì dách), 4393 (tài xỉu).

function startServer(dir, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['server/index.js'], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, PORT: String(SOCKET_PORT), ...env },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    proc.stdout.on('data', (d) => {
      if (String(d).includes('đang chạy')) resolve(proc);
    });
    proc.on('error', reject);
    proc.on('exit', () => reject(new Error(`server tắt sớm trong ${dir}`)));
  });
}

test('gạt cần qua socket: phải đứng ở máy, người khác thấy máy quay, ngắt kết nối rồi vào lại vẫn đúng ví', { timeout: 20000 }, async () => {
  const pid = 'e'.repeat(32);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-slot-'));
  const cfgFile = path.join(dir, 'config.json');
  const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
  example.bellSchedule = [];
  example.newPlayersPerMinute = 1000;
  fs.writeFileSync(cfgFile, JSON.stringify(example));
  const dbPath = path.join(dir, 'test.db');
  const seed = new Db(dbPath);
  seed.touchPlayer({ id: pid, name: 'Khách Gạt', color: 0, hat: 7, now: Date.now(), isVisit: true });
  seed.addTeu(pid, 40, 'seed', DATE);
  seed.close();

  const proc = await startServer(dir, { ADMIN_KEY: 'k'.repeat(32), DB_PATH: dbPath, HTH_CONFIG: cfgFile });
  const sockets = [];
  const connect = () => new Promise((resolve, reject) => {
    const s = io(`http://127.0.0.1:${SOCKET_PORT}`, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
  const call = (s, ev, data) => s.timeout(3000).emitWithAck(ev, data);
  try {
    const a = await connect();
    const hello = await call(a, 'hello', { name: 'Khách Gạt', color: 0, hat: 7, playerId: pid });
    assert.equal(hello.ok, true);
    assert.equal(hello.snapshot.teu, 40);
    const b = await connect();
    assert.equal((await call(b, 'hello', { name: 'Người Xem', color: 0, hat: 7 })).ok, true);

    // Chưa vào máy, đứng ở cổng: bị chặn.
    assert.equal((await call(a, 'slot:spin', { amount: 5 })).ok, false);

    const { stand } = SLOT_ZONE.machines[2];
    await call(a, 'move', [stand.x, stand.z, stand.rot, 0, Date.now()]);
    assert.equal((await call(a, 'action:start', { kind: 'slot' })).ok, true);
    const seen = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('hết giờ chờ slot:spin')), 3000);
      b.on('slot:spin', (v) => {
        clearTimeout(timer);
        resolve(v);
      });
    });
    const res = await call(a, 'slot:spin', { amount: 5 });
    assert.equal(res.ok, true);
    assert.equal(res.machine, 2);
    assert.equal(res.reels.length, 3);
    assert.ok(res.reels.every((r) => Number.isInteger(r) && r >= 0 && r < 6));
    assert.equal(res.teu, 40 - 5 + res.payout);
    const spun = await seen;
    assert.deepEqual([spun.m, spun.reels, spun.mult], [2, res.reels, res.mult]);
    assert.equal(JSON.stringify(spun).includes(pid), false, 'tin phát chung không lộ playerId');

    // Dữ liệu giả và gạt dồn không làm hỏng máy.
    for (const bad of [null, 'x', { amount: '5' }, { amount: 1e9 }]) assert.equal((await call(a, 'slot:spin', bad)).ok, false);
    assert.equal((await call(a, 'slot:spin', { amount: 1 })).error, 'Máy còn đang quay.');

    // Ngắt kết nối ngay sau khi gạt: tiền đã chấm xong, vào lại ví đúng như ack.
    a.disconnect();
    const a2 = await connect();
    const again = await call(a2, 'hello', { name: 'Khách Gạt', color: 0, hat: 7, playerId: pid });
    assert.equal(again.snapshot.teu, res.teu);
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
