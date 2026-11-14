// Bãi đá: luật ngọc và hoàn vốn, thanh lực, kho đá thường tích theo giờ, bố cục bãi, server chấm từng nhát và trả ngọc
// (bốc giả định trước), dữ liệu giả mạo, sai chỗ, thiếu TEU, rời bãi hay mất kết nối giữa chừng, sập giữa lúc mua và trả,
// và một lượt qua socket thật.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import { Db } from '../server/db.js';
import { StoneYard } from '../server/stone.js';
import { localDate } from '../server/time.js';
import {
  BENA_BANCA, CIRCLES, LAKE, MELODY_ZONE, PITCH_ZONE, PLACES, PLAYER_RADIUS, STONE_YARD, dist2d, lakeDistance, resolveCollision, stoneSpotAt,
} from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import {
  STONE, STONE_GEMS, STONE_KINDS, STONE_WEIGHT_TOTAL, expectedValue, freeStock, gemAt, hitGrade, minHits, powerAt, rollFor, stonePayout,
} from '../shared/stone.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const EPOCH = '2000-01-01';
const [THUONG, NGOC, LINH] = [0, 1, 2];
const [VUN, THACH_ANH, MA_NAO, BICH, LAM, HONG, LINH_THACH] = [0, 1, 2, 3, 4, 5, 6];
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
// Pha của thanh lực: 0.5 là đỉnh (Chuẩn), 0.36 ra lực 0.72 (Khá), 0.1 ra lực 0.2 (Yếu).
const PHASE = { perfect: 0.5, good: 0.36, weak: 0.1 };

test('luật: bảng ngọc đủ trọng số, đá thường không ra đá vụn, đá mua hoàn vốn ~95%', () => {
  for (const spec of STONE_KINDS) {
    assert.equal(spec.weights.length, STONE_GEMS.length);
    assert.equal(spec.weights.reduce((a, b) => a + b, 0), STONE_WEIGHT_TOTAL, spec.name);
  }
  // Dải trọng số liên tiếp: đá thường 0..699 Thạch anh, 700..919 Mã não, ...
  assert.equal(gemAt(THUONG, 0), THACH_ANH);
  assert.equal(gemAt(THUONG, 699), THACH_ANH);
  assert.equal(gemAt(THUONG, 700), MA_NAO);
  assert.equal(gemAt(THUONG, 999), HONG);
  assert.equal(gemAt(NGOC, 0), VUN);
  assert.equal(gemAt(LINH, 999), LINH_THACH);
  for (let k = 0; k < STONE_KINDS.length; k++) {
    const counts = new Array(STONE_GEMS.length).fill(0);
    for (let r = 0; r < STONE_WEIGHT_TOTAL; r++) counts[gemAt(k, r)]++;
    assert.deepEqual(counts, STONE_KINDS[k].weights);
    STONE_KINDS[k].weights.forEach((w, g) => { if (w) assert.equal(gemAt(k, rollFor(k, g)), g); });
  }
  assert.throws(() => rollFor(THUONG, VUN), 'đá thường không có đá vụn');

  assert.ok(Math.abs(expectedValue(THUONG).ev - 2.15) < 1e-9, 'đá thường trung bình 2,15 TEU');
  assert.equal(expectedValue(THUONG).rtp, null);
  for (const k of [NGOC, LINH]) {
    const { rtp } = expectedValue(k);
    assert.ok(rtp > 0.94 && rtp < 0.97, `${STONE_KINDS[k].name} hoàn vốn ${rtp}`);
  }
  // Tiền ngọc đá quý chia như TableStakeStore: phần hoàn không vượt giá đá, phần lãi không âm.
  assert.deepEqual(stonePayout(NGOC, HONG), { price: 10, payout: 50, returned: 10, profit: 40, net: 40 });
  assert.deepEqual(stonePayout(NGOC, MA_NAO), { price: 10, payout: 3, returned: 3, profit: 0, net: -7 });
  assert.deepEqual(stonePayout(LINH, VUN), { price: 30, payout: 0, returned: 0, profit: 0, net: -30 });
  assert.deepEqual(STONE_KINDS.map((_, k) => minHits(k)), [3, 4, 4]);
});

test('thanh lực chạy lên xuống theo giờ, chấm Chuẩn/Khá/Yếu theo vị trí kim', () => {
  const period = STONE_KINDS[THUONG].periodMs;
  assert.equal(powerAt(THUONG, 1000, 1000), 0);
  assert.equal(powerAt(THUONG, 1000, 1000 + period / 2), 1);
  assert.ok(Math.abs(powerAt(THUONG, 1000, 1000 + period / 4) - 0.5) < 1e-9);
  assert.ok(Math.abs(powerAt(THUONG, 1000, 1000 + period * 3) - 0) < 1e-9, 'lặp lại mỗi chu kỳ');
  assert.ok(powerAt(THUONG, 1000, 900) >= 0, 'trước lúc đặt đá vẫn ra số hợp lệ');
  assert.equal(hitGrade(1), 'perfect');
  assert.equal(hitGrade(STONE.perfectMin), 'perfect');
  assert.equal(hitGrade(STONE.perfectMin - 0.01), 'good');
  assert.equal(hitGrade(STONE.goodMin), 'good');
  assert.equal(hitGrade(STONE.goodMin - 0.01), 'weak');
  for (const [grade, phase] of Object.entries(PHASE)) assert.equal(hitGrade(powerAt(LINH, 0, phase * STONE_KINDS[LINH].periodMs)), grade);
});

test('kho đá thường: đầy thì đứng, chưa đầy thì tích từng tảng và giữ phần thời gian lẻ', () => {
  const R = STONE.freeRegenMs;
  assert.deepEqual(freeStock(STONE.freeMax, 0, 5000), { stock: STONE.freeMax, at: 5000, nextAt: 0 });
  assert.deepEqual(freeStock(3, 1000, 1000 + R * 2 + 500), { stock: 5, at: 1000 + R * 2, nextAt: 1000 + R * 3 });
  assert.deepEqual(freeStock(0, 0, R * 100), { stock: STONE.freeMax, at: R * 100, nextAt: 0 }, 'không vượt trần');
  assert.deepEqual(freeStock(2, 1000, 900), { stock: 2, at: 1000, nextAt: 1000 + R }, 'đồng hồ lùi không trừ đá');

  const db = new Db(':memory:');
  db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: 0, isVisit: true });
  const t0 = 1_000_000;
  assert.deepEqual(db.stoneStock.stock(A, t0), { stock: STONE.freeMax, nextAt: 0 }, 'người mới: kho đầy');
  for (let i = 0; i < STONE.freeMax; i++) assert.equal(db.stoneStock.take(A, t0).ok, true);
  const empty = db.stoneStock.take(A, t0);
  assert.deepEqual([empty.ok, empty.stock, empty.nextAt], [false, 0, t0 + R], 'hết đá: không lấy được, báo giờ có tảng mới');
  assert.deepEqual(db.stoneStock.stock(A, t0 + R + 10), { stock: 1, nextAt: t0 + 2 * R });
  assert.equal(db.stoneStock.take(A, t0 + R + 10).ok, true);
  assert.deepEqual(db.stoneStock.stock(A, t0 + R + 20), { stock: 0, nextAt: t0 + 2 * R }, 'lấy tảng vừa tích không làm mất phần lẻ');
  db.close();
});

test('bãi đá cạnh bãi container: đe là vật cản, chỗ đứng đi tới được, không lấn sân đầu hồ, hồ câu hay vật khác, có trong menu', () => {
  assert.equal(STONE_YARD.spots.length, 4);
  STONE_YARD.spots.forEach((s, i) => {
    const { stand } = s;
    const free = resolveCollision(stand.x, stand.z);
    assert.ok(dist2d(free.x, free.z, stand.x, stand.z) < 1e-6, `chỗ đứng đe ${i} không kẹt`);
    const pushed = resolveCollision(s.x + 0.1, s.z);
    assert.ok(dist2d(pushed.x, pushed.z, s.x, s.z) >= STONE_YARD.anvilRadius + PLAYER_RADIUS - 1e-6, `không đứng đè lên đe ${i}`);
    assert.equal(stoneSpotAt(stand.x, stand.z), i, 'đứng trước đe nào thì đập ở đe đó');
    assert.ok(dist2d(stand.x, stand.z, PITCH_ZONE.x, PITCH_ZONE.z) > PITCH_ZONE.radius + STONE_YARD.useRadius, 'không lẫn vùng đầu hồ');
    assert.ok(dist2d(stand.x, stand.z, MELODY_ZONE.x, MELODY_ZONE.z) > MELODY_ZONE.radius + STONE_YARD.useRadius);
    assert.ok(lakeDistance(stand.x, stand.z) > LAKE.shoreWidth + STONE_YARD.useRadius, 'không lẫn bờ câu cá');
    assert.ok(dist2d(stand.x, stand.z, BENA_BANCA.x, BENA_BANCA.z) > BENA_BANCA.actionRadius + STONE_YARD.useRadius);
  });
  // Đe và đống đá không chồng lên vật cản nào khác.
  const mine = [...STONE_YARD.spots.map((s) => ({ x: s.x, z: s.z, r: STONE_YARD.anvilRadius })), STONE_YARD.heap];
  const others = CIRCLES.filter((c) => !mine.some((m) => m.x === c.x && m.z === c.z));
  for (const m of mine) for (const c of others) assert.ok(dist2d(m.x, m.z, c.x, c.z) > m.r + c.r, `chồng vật cản ở ${c.x},${c.z}`);
  assert.equal(stoneSpotAt(0, 0), -1, 'giữa sân không phải chỗ đập');
  const place = PLACES.find((p) => p.key === 'stone');
  assert.equal(stoneSpotAt(place.x, place.z), 1, 'menu đưa tới đe thứ hai');
});

// ---------- Bãi đá chơi thật (bốc giả định trước) ----------

function fixture(rolls = []) {
  const db = new Db(':memory:');
  const events = [];
  const queue = [...rolls];
  const game = new StoneYard({ db, io: { emit: (name, data) => events.push([name, data]) }, config, random: () => queue.shift() ?? 0 });
  let sid = 0;
  const player = (pid, teu, over = {}) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'seed', DATE);
    const { stand } = STONE_YARD.spots[1];
    const sent = [];
    const socket = { emit: (name, data) => sent.push([name, data]) };
    return { pid, sid: ++sid, name: `Khách ${pid[0]}`, x: stand.x, z: stand.z, activity: ACTIVITY.stone, socket, sent, ...over };
  };
  // Bỏ nhịp chống bấm dồn và dời mốc đặt đá để nhát đập rơi đúng pha muốn thử, trong cửa sổ bù trễ.
  const take = (p, kind) => {
    p.lastStoneStart = 0;
    return game.start(p, { kind });
  };
  const strike = (p, grade) => {
    const t = Date.now() - 100;
    p.stone.lastAt = 0;
    p.stone.startAt = t - STONE_KINDS[p.stone.kind].periodMs * (2 + PHASE[grade]);
    return game.hit(p, { t });
  };
  const reasons = (pid) => db.db.prepare('SELECT reason, amount FROM teu_log WHERE player_id=? AND reason LIKE ? ORDER BY id').all(pid, 'stone:%');
  const queueGem = (kind, gem) => queue.push(rollFor(kind, gem));
  return { db, game, events, player, take, strike, reasons, queueGem };
}

test('đá thường: lấy từ kho, ba nhát Chuẩn là vỡ, ra ngọc cộng thẳng TEU kèm thưởng khéo tay', () => {
  const { db, events, player, take, strike, reasons, queueGem } = fixture();
  const a = player(A, 0);
  const got = take(a, THUONG);
  assert.deepEqual([got.ok, got.kind, got.hp, got.maxHp, got.stock], [true, THUONG, 8, 8, STONE.freeMax - 1]);
  assert.ok(got.nextAt > Date.now(), 'kho bắt đầu tích lại');
  assert.deepEqual(events.at(-1), ['stone:place', { sid: a.sid, s: 1, k: THUONG }]);

  assert.deepEqual([strike(a, 'perfect').hp, strike(a, 'perfect').hp], [5, 2]);
  assert.deepEqual(events.at(-1), ['stone:hit', { sid: a.sid, s: 1, k: THUONG, c: 0.75, g: 'perfect' }]);
  queueGem(THUONG, BICH);
  const res = strike(a, 'perfect');
  assert.deepEqual([res.ok, res.broke, res.gem, res.gain, res.bonus, res.net, res.teu, res.auto], [true, true, BICH, 9, 1, 9, 9, false]);
  assert.equal(a.stone, null);
  assert.deepEqual(reasons(A), [{ reason: 'stone:free', amount: 9 }]);
  assert.deepEqual(events.at(-1), ['stone:break', { sid: a.sid, s: 1, k: THUONG, gem: BICH }], 'ngọc thường không báo tên');

  // Có nhát không Chuẩn thì không có thưởng khéo tay.
  take(a, THUONG);
  strike(a, 'weak');
  strike(a, 'good');
  strike(a, 'perfect');
  queueGem(THUONG, THACH_ANH);
  const plain = strike(a, 'good');
  assert.deepEqual([plain.broke, plain.gain, plain.bonus, plain.teu], [true, 1, 0, 10]);
  assert.equal(db.stoneStock.stock(A).stock, STONE.freeMax - 2);
  assert.equal(JSON.stringify(events).includes(A), false, 'tin phát chung không lộ playerId');
  db.close();
});

test('đá quý: mua bằng TEU, vỡ ra ngọc lớn thì cả sân được báo, bảng tuần tính lãi/lỗ ròng', () => {
  const { db, events, player, take, strike, reasons, queueGem } = fixture();
  const a = player(A, 100);
  const got = take(a, NGOC);
  assert.deepEqual([got.ok, got.teu, got.maxHp], [true, 90, 10]);
  assert.equal(db.stone.held(A), 10, 'tiền đá giữ chờ đá vỡ');
  for (let i = 0; i < 3; i++) assert.equal(strike(a, 'perfect').broke, undefined);
  queueGem(NGOC, HONG);
  const win = strike(a, 'perfect');
  assert.deepEqual([win.gem, win.gain, win.bonus, win.net, win.teu], [HONG, 50, 0, 40, 140]);
  assert.deepEqual(reasons(A), [{ reason: 'stone:bet', amount: -10 }, { reason: 'stone:return', amount: 10 }, { reason: 'stone:win', amount: 40 }]);
  assert.equal(db.stone.held(A), 0);
  assert.deepEqual(events.at(-1), ['stone:break', { sid: a.sid, s: 1, k: NGOC, gem: HONG, name: 'Khách a', teu: 50 }]);

  // Linh thạch thô ra đá vụn: mất trắng 30, bảng tuần trừ đúng chừng đó.
  take(a, LINH);
  queueGem(LINH, VUN);
  let last;
  for (let i = 0; i < 4; i++) last = strike(a, 'perfect');
  assert.deepEqual([last.broke, last.gem, last.gain, last.net, last.teu], [true, VUN, 0, -30, 110]);
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 110 }, '100 cấp + 40 lãi − 30 lỗ');
  db.close();
});

test('dữ liệu giả mạo, sai chỗ, bấm dồn, thiếu TEU, hết đá đều bị chặn và không mất đồng nào', () => {
  const { db, game, events, player, take, strike } = fixture();
  const a = player(A, 15);
  for (const bad of [null, undefined, 'x', {}, { kind: '0' }, { kind: 1.5 }, { kind: -1 }, { kind: 3 }, { kind: [0] }, { kind: true }]) {
    a.lastStoneStart = 0;
    assert.equal(game.start(a, bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(take({ ...a, activity: ACTIVITY.slot }, THUONG).ok, false, 'chưa vào bãi đá');
  assert.equal(take({ ...a, x: 0, z: 0 }, THUONG).ok, false, 'đứng xa đe');
  assert.equal(game.hit(a, { t: Date.now() }).ok, false, 'chưa có đá mà đập');
  const poor = take(a, LINH);
  assert.deepEqual([poor.ok, poor.teu], [false, 15], 'thiếu TEU: báo số dư, không trừ');
  assert.deepEqual([db.shop.teu(A), db.stone.held(A), db.stoneStock.stock(A).stock], [15, 0, STONE.freeMax]);
  assert.equal(events.length, 0);

  assert.equal(take(a, NGOC).ok, true);
  const again = game.start(a, { kind: LINH });
  assert.deepEqual([again.ok, again.repeat, again.kind], [true, true, NGOC], 'đang có đá thì trả lại đúng tảng đó, không mua thêm');
  assert.equal(db.shop.teu(A), 5);

  const now = Date.now();
  for (const t of [undefined, null, 'x', `${now}`, NaN, Infinity, now + 10_000, now - 5_000, a.stone.startAt - 1]) {
    a.stone.lastAt = 0;
    assert.equal(game.hit(a, { t }).ok, false, `t=${t}`);
  }
  assert.equal(game.hit(a, null).ok, false);
  assert.equal(a.stone.hp, 10, 'nhát hỏng không làm nứt đá');
  assert.equal(strike(a, 'weak').ok, true);
  const quick = game.hit(a, { t: a.stone.lastAt + 50 });
  assert.deepEqual([quick.ok, quick.error], [false, 'Búa còn đang vung.'], 'nhát dồn nhanh hơn một lần vung búa bị bỏ');
  assert.equal(a.stone.hp, 9);
  assert.equal(game.hit({ ...a, x: 0, z: 0 }, { t: Date.now() }).ok, false, 'đi khỏi đe thì không đập được');

  // Hết đá thường: báo giờ có tảng mới, không mở đá.
  const b = player(B, 0);
  for (let i = 0; i < STONE.freeMax; i++) db.stoneStock.take(B);
  const out = take(b, THUONG);
  assert.equal(out.ok, false);
  assert.match(out.error, /Hết đá thường/);
  assert.equal(out.stock, 0);
  assert.equal(b.stone, undefined);
  db.close();
});

test('rời bãi, đổi hoạt động hay mất kết nối khi đá chưa vỡ: server đập nốt, trả ngọc, báo riêng người chơi', () => {
  const { db, game, events, player, take, strike, queueGem } = fixture();
  const a = player(A, 50);
  take(a, NGOC);
  strike(a, 'good');
  queueGem(NGOC, LAM);
  game.leave(a);
  assert.equal(a.stone, null);
  const [name, res] = a.sent.at(-1);
  assert.equal(name, 'stone:auto');
  assert.deepEqual([res.broke, res.auto, res.gem, res.gain, res.teu], [true, true, LAM, 20, 60]);
  assert.equal(db.stone.held(A), 0);
  assert.equal(events.at(-1)[0], 'stone:break', 'cả sân thấy đá vỡ');
  game.leave(a); // Không có đá thì không làm gì.
  assert.equal(a.sent.length, 1);

  // Đi khỏi bãi: lần quét sau đập nốt; đá thường đập nốt không có thưởng khéo tay.
  take(a, THUONG);
  strike(a, 'perfect');
  queueGem(THUONG, MA_NAO);
  a.x = 0;
  a.z = 0;
  game.sweep(new Map([[a.sid, a]]));
  assert.equal(a.stone, null);
  assert.deepEqual([a.sent.at(-1)[1].gain, a.sent.at(-1)[1].bonus], [3, 0]);

  // Mất kết nối (socket đã null): vẫn trả tiền vào ví.
  const b = player(B, 30, { socket: null });
  take(b, NGOC);
  queueGem(NGOC, BICH);
  game.leave(b);
  assert.equal(db.shop.teu(B), 28);
  assert.deepEqual(game.snapshot(new Map([[a.sid, a], [b.sid, b]])), [], 'không còn đá nào trên đe');
  db.close();
});

test('snapshot cho người mới vào: đá nào nằm trên đe nào, nứt tới đâu', () => {
  const { db, game, player, take, strike } = fixture();
  const a = player(A, 0);
  const b = player(B, 0, { x: STONE_YARD.spots[3].stand.x, z: STONE_YARD.spots[3].stand.z });
  take(a, THUONG);
  strike(a, 'perfect');
  take(b, THUONG);
  assert.deepEqual(game.snapshot(new Map([[a.sid, a], [b.sid, b]])), [
    { sid: a.sid, s: 1, k: THUONG, c: 0.38 },
    { sid: b.sid, s: 3, k: THUONG, c: 0 },
  ]);
  db.close();
});

test('chấm hỏng giữa chừng: hoàn tiền đá ngay, không để treo', () => {
  const { db, game, player, take, strike, queueGem } = fixture();
  const a = player(A, 40);
  take(a, LINH);
  const real = db.stone.settle.bind(db.stone);
  db.stone.settle = () => {
    throw new Error('đĩa đầy');
  };
  queueGem(LINH, LINH_THACH);
  for (let i = 0; i < 3; i++) strike(a, 'perfect');
  assert.throws(() => strike(a, 'perfect'), /đĩa đầy/);
  assert.deepEqual([db.shop.teu(A), db.stone.held(A), a.stone], [40, 0, null]);
  db.stone.settle = real;
  assert.equal(game.hit(a, { t: Date.now() }).ok, false);
  db.close();
});

test('server tắt khi đá quý chưa vỡ: lần khởi động sau hoàn tiền đá, không hoàn lần hai', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-stone-crash-'));
  const file = path.join(dir, 'crash.db');
  const quiet = console.log;
  console.log = () => {};
  try {
    const db = new Db(file);
    db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(A, 50, 'seed', DATE);
    db.stone.stake(A, 30, DATE);
    assert.deepEqual([db.shop.teu(A), db.stone.held(A)], [20, 30]);
    db.close();
    for (let i = 0; i < 2; i++) {
      const again = new Db(file);
      new StoneYard({ db: again, io: { emit() {} }, config });
      assert.deepEqual([again.shop.teu(A), again.stone.held(A)], [50, 0]);
      again.close();
    }
  } finally {
    console.log = quiet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- Qua socket thật ----------

const SOCKET_PORT = 4395; // Khác 3911/39xx (server), 4391 (bầu cua), 4392 (xì dách), 4393 (tài xỉu), 4394 (gạt cần).

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

test('đập đá qua socket: phải đứng ở đe, người khác thấy đá, mất kết nối giữa chừng vẫn được ngọc', { timeout: 20000 }, async () => {
  const pid = 'f'.repeat(32);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-stone-'));
  const cfgFile = path.join(dir, 'config.json');
  const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
  example.bellSchedule = [];
  example.newPlayersPerMinute = 1000;
  fs.writeFileSync(cfgFile, JSON.stringify(example));
  const dbPath = path.join(dir, 'test.db');
  const seed = new Db(dbPath);
  seed.touchPlayer({ id: pid, name: 'Thợ Đá', color: 0, hat: 7, now: Date.now(), isVisit: true });
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
  const waitFor = (s, ev) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`hết giờ chờ ${ev}`)), 3000);
    s.once(ev, (v) => {
      clearTimeout(timer);
      resolve(v);
    });
  });
  try {
    const a = await connect();
    const hello = await call(a, 'hello', { name: 'Thợ Đá', color: 0, hat: 7, playerId: pid });
    assert.equal(hello.ok, true);
    assert.deepEqual(hello.snapshot.stoneStock, { stock: STONE.freeMax, nextAt: 0 });
    assert.deepEqual(hello.snapshot.stones, []);
    const b = await connect();
    assert.equal((await call(b, 'hello', { name: 'Người Xem', color: 0, hat: 7 })).ok, true);

    // Đứng ở cổng: bị chặn.
    assert.equal((await call(a, 'stone:start', { kind: NGOC })).ok, false);

    const { stand } = STONE_YARD.spots[2];
    await call(a, 'move', [stand.x, stand.z, stand.rot, 0, Date.now()]);
    assert.equal((await call(a, 'action:start', { kind: 'stone' })).ok, true);
    const placed = waitFor(b, 'stone:place');
    const got = await call(a, 'stone:start', { kind: NGOC });
    assert.deepEqual([got.ok, got.kind, got.teu, got.stock], [true, NGOC, 30, STONE.freeMax]);
    assert.deepEqual(await placed, { sid: hello.sid, s: 2, k: NGOC });

    const cracked = waitFor(b, 'stone:hit');
    const hit = await call(a, 'stone:hit', { t: Date.now() });
    assert.equal(hit.ok, true);
    assert.ok(hit.hp < 10);
    const seen = await cracked;
    assert.deepEqual([seen.s, seen.g], [2, hit.grade]);
    assert.equal(JSON.stringify(seen).includes(pid), false, 'tin phát chung không lộ playerId');
    for (const bad of [null, 'x', { t: 'x' }, { t: 0 }]) assert.equal((await call(a, 'stone:hit', bad)).ok, false);

    // Mất kết nối khi đá chưa vỡ: server đập nốt, người xem thấy đá vỡ, vào lại thì ví đã có tiền ngọc.
    const broke = waitFor(b, 'stone:break');
    a.disconnect();
    const shattered = await broke;
    assert.equal(shattered.s, 2);
    const gain = STONE_GEMS[shattered.gem].teu;
    const a2 = await connect();
    const again = await call(a2, 'hello', { name: 'Thợ Đá', color: 0, hat: 7, playerId: pid });
    assert.equal(again.snapshot.teu, 30 + gain);
    assert.deepEqual(again.snapshot.stones, []);
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
