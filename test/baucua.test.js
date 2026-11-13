// Bầu cua: luật chấm, lưu TEU, bàn chơi theo pha (đồng hồ giả), dữ liệu giả mạo, ngắt giữa ván, và một lượt qua socket thật.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import { BauCua } from '../server/baucua.js';
import { Db } from '../server/db.js';
import { localDate } from '../server/time.js';
import { BAUCUA, BAUCUA_SYMBOLS, matchCounts, settle } from '../shared/baucua.js';
import { BAUCUA_ZONE, PLACES, PLAYER_RADIUS, resolveCollision } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const EPOCH = '2000-01-01'; // Mốc "từ trước tới nay" cho bảng tuần.
const [NAI, BAU, GA, CA, CUA, TOM] = [0, 1, 2, 3, 4, 5];

const bets = (map) => Object.assign(new Array(BAUCUA.symbols).fill(0), map);

test('luật chấm: trùng n viên thì nhận lại cược cộng n lần cược, không trùng thì mất', () => {
  assert.equal(BAUCUA_SYMBOLS.length, 6);
  const dice = [CUA, CUA, GA];
  assert.deepEqual(matchCounts(dice), [0, 0, 1, 0, 2, 0]);
  // Cua trúng 2 viên: 10 × 3 = 30. Cá không trúng: mất 5. Cược 15, nhận 30.
  assert.deepEqual(settle(bets({ [CUA]: 10, [CA]: 5 }), dice), { stake: 15, payout: 30, net: 15, profit: 15, returned: 15 });
  // Ba viên cùng một mặt: cược × 4.
  assert.equal(settle(bets({ [TOM]: 10 }), [TOM, TOM, TOM]).payout, 40);
  // Thua trắng: không nhận gì, lãi bằng 0.
  assert.deepEqual(settle(bets({ [NAI]: 7 }), dice), { stake: 7, payout: 0, net: -7, profit: 0, returned: 0 });
  // Cược trải nhiều mặt mà tổng nhận chưa bù cược: lỗ, nhưng vẫn hoàn phần trúng và không có lãi.
  assert.deepEqual(settle(bets({ [GA]: 10, [NAI]: 10, [CA]: 10 }), dice), { stake: 30, payout: 20, net: -10, profit: 0, returned: 20 });
});

test('nhà cái luôn lợi thế: hoàn vốn kỳ vọng một mặt là 199/216 và không có mặt nào lệch', () => {
  for (let symbol = 0; symbol < BAUCUA.symbols; symbol++) {
    let total = 0;
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) total += settle(bets({ [symbol]: 1 }), [a, b, c]).payout;
    assert.equal(total, 199, `mặt ${symbol}`);
  }
});

test('bàn nằm trong sân: bàn là vật cản, chỗ đứng đi tới được và có trong menu Chơi gì', () => {
  const seat = BAUCUA_ZONE.seat;
  assert.deepEqual(resolveCollision(seat.x, seat.z), { x: seat.x, z: seat.z }, 'chỗ đứng không kẹt vật cản');
  const pushed = resolveCollision(BAUCUA_ZONE.x + 0.3, BAUCUA_ZONE.z);
  assert.ok(Math.hypot(pushed.x - BAUCUA_ZONE.x, pushed.z - BAUCUA_ZONE.z) >= BAUCUA_ZONE.tableRadius + PLAYER_RADIUS - 1e-6, 'không đứng đè lên bàn được');
  const place = PLACES.find((p) => p.key === 'baucua');
  assert.deepEqual([place.x, place.z], [seat.x, seat.z]);
});

// ---------- Bàn chơi (đồng hồ giả) ----------

function fixture({ dice = [CUA, CUA, GA] } = {}) {
  const db = new Db(':memory:');
  const events = [];
  const payouts = [];
  const rolls = [...dice];
  const game = new BauCua({ db, io: { emit: (name, data) => events.push([name, data]) }, config, random: () => rolls.shift() });
  game.onPayout = (pid, result) => payouts.push([pid, result]);
  let sid = 0;
  const wallets = [];
  db.onTeu = (pid, teu) => wallets.push([pid, teu]);
  const player = (pid, teu, over = {}) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'seed', DATE);
    wallets.length = 0;
    return { pid, sid: ++sid, x: BAUCUA_ZONE.seat.x, z: BAUCUA_ZONE.seat.z, activity: ACTIVITY.baucua, lastBaucua: 0, ...over };
  };
  // Bỏ nhịp chống bấm dồn để thử nhiều lần liên tiếp.
  const bet = (p, symbol, amount) => {
    p.lastBaucua = 0;
    return game.bet(p, { symbol, amount });
  };
  return { db, game, events, payouts, wallets, player, bet };
}

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const C = 'c'.repeat(32);

test('một ván đủ pha: đặt cược, xóc, chia tiền, nghỉ; bảng tuần tính lãi/lỗ ròng', () => {
  const { db, game, events, payouts, wallets, player, bet } = fixture();
  const a = player(A, 100);
  const b = player(B, 50);
  const c = player(C, 50);

  assert.equal(game.phase, 'idle');
  const first = bet(a, CUA, 10);
  assert.equal(first.ok, true);
  assert.equal(first.teu, 90, 'tiền cược bị trừ ngay');
  assert.equal(game.phase, 'betting');
  assert.equal(bet(a, CA, 5).teu, 85);
  assert.equal(bet(b, GA, 10).ok, true);
  assert.equal(bet(c, TOM, 10).ok, true);
  assert.deepEqual(game.totals(), { totals: [0, 0, 10, 5, 10, 10], crowd: [0, 0, 1, 1, 1, 1] });
  assert.equal(game.publicState().bettors, 3);
  assert.deepEqual(game.publicState().history, [], 'chưa ván nào xong thì lịch sử trống');

  const endsAt = game.endsAt;
  game.sweep(endsAt - 1);
  assert.equal(game.phase, 'betting', 'chưa hết giờ thì chưa xóc');
  game.sweep(endsAt);
  assert.equal(game.phase, 'rolling');
  assert.deepEqual(game.dice, [CUA, CUA, GA]);
  assert.equal(bet(b, NAI, 1).ok, false, 'đang xóc thì không nhận cược');
  assert.equal(payouts.length, 0, 'chưa chia tiền khi đĩa chưa mở');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'result');
  // A: cược 15, cua ×3 = 30 → ví 85 + 30 = 115. B: gà ×2 = 20 → 40 + 20 = 60. C: tôm hụt → 40.
  assert.deepEqual([A, B, C].map((pid) => db.shop.teu(pid)), [115, 60, 40]);
  const byPid = Object.fromEntries(payouts);
  assert.deepEqual([byPid[A].stake, byPid[A].payout, byPid[A].net], [15, 30, 15]);
  assert.deepEqual([byPid[B].stake, byPid[B].payout, byPid[B].net], [10, 20, 10]);
  assert.deepEqual([byPid[C].stake, byPid[C].payout, byPid[C].net], [10, 0, -10]);
  assert.deepEqual(wallets.map(([pid]) => pid).sort(), [A, B], 'người thua không bị đẩy ví vì không có gì đổi');
  assert.equal(game.bets.size, 0);
  assert.deepEqual([A, B, C].map((pid) => db.baucua.held(pid)), [0, 0, 0], 'chấm xong thì không còn tiền treo');

  // Bảng tuần tính bầu cua theo lãi/lỗ ròng: A = 100 (cấp) + 15; B = 50 + 10; C = 50 - 10.
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 115, 'Khách b': 60, 'Khách c': 40 });

  // Tin phát chung không chứa playerId.
  assert.equal(JSON.stringify(events).includes(A), false);
  assert.deepEqual(events.at(-1)[1].dice, [CUA, CUA, GA]);
  assert.deepEqual(events.at(-1)[1].history, [[CUA, CUA, GA]], 'mở bát thì ván vừa xong vào lịch sử');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'idle');
  assert.deepEqual(game.dice, [CUA, CUA, GA], 'bàn nghỉ vẫn giữ kết quả cũ');
  db.close();
});

test('cược lúc đang hiện kết quả mở ván mới ngay và xoá kết quả cũ', () => {
  const { db, game, player, bet } = fixture({ dice: [NAI, NAI, NAI, BAU, BAU, BAU] });
  const a = player(A, 100);
  bet(a, NAI, 5);
  game.sweep(game.endsAt);
  game.sweep(game.endsAt);
  assert.equal(game.phase, 'result');
  assert.equal(game.round, 1);
  assert.equal(bet(a, BAU, 5).ok, true);
  assert.deepEqual([game.phase, game.round, game.dice], ['betting', 2, null]);
  game.sweep(game.endsAt);
  game.sweep(game.endsAt);
  assert.deepEqual(game.dice, [BAU, BAU, BAU]);
  assert.equal(db.shop.teu(A), 100 - 5 + 20 - 5 + 20);
  db.close();
});

test('cược giả mạo và vượt mức bị từ chối, không trừ một đồng', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 100);
  for (const [symbol, amount] of [[6, 1], [-1, 1], [1.5, 1], ['1', 5], [true, 5], [null, 5], [CUA, 2], [CUA, 100], [CUA, -5], [CUA, '5'], [CUA, 5.5], [CUA, NaN], [CUA, Infinity], [[1], [5]], [{}, {}]]) {
    assert.equal(bet(a, symbol, amount).ok, false, `phải loại ${JSON.stringify([symbol, amount])}`);
  }
  assert.equal(game.bet(a, null).ok, false);
  assert.equal(game.bet(a, 'cua').ok, false);
  assert.equal(game.phase, 'idle', 'cược hỏng không được mở ván');
  assert.equal(db.shop.teu(A), 100);

  // Mặt tối đa 30, ván tối đa 50.
  for (let i = 0; i < 3; i++) assert.equal(bet(a, CUA, 10).ok, true);
  assert.match(bet(a, CUA, 1).error, /tối đa 30/);
  assert.equal(bet(a, GA, 10).ok, true);
  assert.equal(bet(a, GA, 10).ok, true);
  assert.match(bet(a, TOM, 1).error, /tối đa 50/);
  assert.equal(db.shop.teu(A), 50);

  // Thiếu TEU: không trừ, không ghi cược.
  const poor = player(B, 3);
  assert.equal(bet(poor, NAI, 5).ok, false);
  assert.equal(bet(poor, NAI, 1).ok, true);
  assert.equal(bet(poor, NAI, 1).ok, true);
  assert.equal(bet(poor, NAI, 1).ok, true);
  const broke = bet(poor, NAI, 1);
  assert.deepEqual([broke.ok, broke.teu], [false, 0]);
  assert.equal(game.mine(B)[NAI], 3);
  db.close();
});

test('cược lại cả gói: cộng vào cược hiện có, trừ tiền một lần, sai hay vượt mức thì không trừ đồng nào', () => {
  const { db, game, player } = fixture();
  const a = player(A, 100);
  const rebet = (p, data) => {
    p.lastBaucua = 0;
    return game.rebet(p, data);
  };
  for (const bad of [null, {}, { bets: 'x' }, { bets: [1, 2, 3] }, { bets: bets({}) }, { bets: bets({ [CUA]: -1 }) },
    { bets: bets({ [CUA]: 1.5 }) }, { bets: bets({ [CUA]: '5' }) }, { bets: bets({ [CUA]: 31 }) }, { bets: [...bets({ [CUA]: 5 }), 5] }]) {
    assert.equal(rebet(a, bad).ok, false, `phải loại ${JSON.stringify(bad)}`);
  }
  assert.equal(game.phase, 'idle', 'gói hỏng không được mở ván');
  assert.equal(db.shop.teu(A), 100);

  const first = rebet(a, { bets: bets({ [CUA]: 7, [CA]: 3 }) });
  assert.deepEqual([first.ok, first.teu, first.bets], [true, 90, bets({ [CUA]: 7, [CA]: 3 })], 'mệnh giá lẻ vẫn nhận được trong gói');
  assert.equal(game.phase, 'betting', 'cược lại lúc bàn nghỉ mở ván mới');
  // Gấp đôi: gửi lại đúng cược đang có.
  assert.deepEqual(rebet(a, { bets: first.bets }).bets, bets({ [CUA]: 14, [CA]: 6 }));
  assert.match(rebet(a, { bets: bets({ [CUA]: 17 }) }).error, /tối đa 30/, 'vượt mức một mặt thì từ chối cả gói');
  assert.match(rebet(a, { bets: bets({ [NAI]: 20, [GA]: 11 }) }).error, /tối đa 50/);
  assert.equal(db.shop.teu(A), 80);
  assert.deepEqual(game.totals().crowd, [0, 0, 0, 1, 1, 0], 'số người cược từng mặt, không có tên');

  const poor = player(B, 5);
  const broke = rebet(poor, { bets: bets({ [TOM]: 6 }) });
  assert.deepEqual([broke.ok, broke.teu], [false, 5], 'thiếu tiền thì không trừ');
  assert.deepEqual(game.mine(B), bets({}));
  assert.equal(rebet(a, { bets: bets({ [TOM]: 1 }) }).ok, true);
  assert.match(game.rebet(a, { bets: bets({ [TOM]: 1 }) }).error, /Từ từ/, 'cũng bị giãn nhịp như cược thường');

  // Lịch sử giữ tối đa historySize ván, mới nhất trước.
  game.history = Array.from({ length: BAUCUA.historySize }, () => [NAI, NAI, NAI]);
  game.sweep(game.endsAt);
  game.sweep(game.endsAt);
  assert.equal(game.history.length, BAUCUA.historySize);
  assert.deepEqual(game.history[0], [CUA, CUA, GA]);
  db.close();
});

test('phải ở đúng bàn: sai hoạt động, đứng xa hay bấm dồn đều bị chặn', () => {
  const { db, game, player, bet } = fixture();
  const away = player(A, 50, { x: 0, z: 36 });
  const idle = player(B, 50, { activity: ACTIVITY.none });
  assert.equal(bet(away, CUA, 5).ok, false);
  assert.equal(bet(idle, CUA, 5).ok, false);
  assert.equal(game.phase, 'idle');
  assert.equal(db.shop.teu(A) + db.shop.teu(B), 100);

  const near = player(C, 50);
  assert.equal(bet(near, CUA, 5).ok, true);
  assert.match(game.bet(near, { symbol: CUA, amount: 5 }).error, /Từ từ/, 'hai cược liền nhau bị giãn');
  assert.equal(db.shop.teu(C), 45);
  db.close();
});

test('rút cược: hoàn đủ khi còn đang đặt, hết giờ thì không rút được và không bị hoàn hai lần', () => {
  const { db, game, wallets, player, bet } = fixture();
  const a = player(A, 100);
  assert.equal(game.clear(a).ok, false, 'chưa có ván thì không có gì để rút');
  bet(a, CUA, 10);
  bet(a, CA, 5);
  assert.equal(db.shop.teu(A), 85);
  const cleared = game.clear(a);
  assert.deepEqual([cleared.ok, cleared.teu], [true, 100]);
  assert.deepEqual(game.mine(A), [0, 0, 0, 0, 0, 0]);
  assert.equal(game.clear(a).teu, 100, 'rút lần hai không hoàn thêm');
  assert.equal(wallets.length, 0, 'rút cược dùng ack, không phát sự kiện ví');

  bet(a, CUA, 10);
  game.sweep(game.endsAt);
  assert.equal(game.clear(a).ok, false, 'đang xóc thì không rút');
  db.close();
});

test('người chơi mất kết nối giữa ván: cược vẫn được chấm và chia tiền theo playerId', () => {
  const { db, game, payouts, player, bet } = fixture();
  const a = player(A, 100);
  bet(a, CUA, 10);
  // Người chơi đã rời phòng: không còn đối tượng player hay socket nào nữa.
  game.onPayout = (pid, result) => payouts.push([pid, result.net]);
  game.sweep(game.endsAt);
  game.sweep(game.endsAt);
  assert.deepEqual(payouts, [[A, 20]]);
  assert.equal(db.shop.teu(A), 100 - 10 + 30);
  db.close();
});

test('lỗi gửi kết quả cho một người không chặn việc chia tiền cho người khác', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 100);
  const b = player(B, 100);
  bet(a, CUA, 10);
  bet(b, CUA, 10);
  game.onPayout = (pid) => {
    if (pid === A) throw new Error('socket hỏng');
  };
  const original = console.error;
  console.error = () => {};
  try {
    game.sweep(game.endsAt);
    game.sweep(game.endsAt);
  } finally {
    console.error = original;
  }
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [120, 120]);
  assert.equal(game.phase, 'result');
  db.close();
});

test('tắt server giữa ván hoàn cược; sau khi đã chia tiền thì không hoàn thêm', () => {
  const mid = fixture();
  const a = mid.player(A, 100);
  mid.bet(a, CUA, 10);
  mid.bet(a, CA, 5);
  mid.game.stop();
  assert.equal(mid.db.shop.teu(A), 100);
  assert.equal(mid.game.phase, 'idle');
  // Hoàn cược là tiền trả lại, không phải TEU kiếm mới: bảng tuần vẫn chỉ có khoản cấp ban đầu.
  assert.equal(mid.db.weekly(EPOCH).teu[0].teu, 100);
  mid.db.close();

  const done = fixture();
  const b = done.player(B, 100);
  done.bet(b, CUA, 10);
  done.game.sweep(done.game.endsAt);
  done.game.sweep(done.game.endsAt);
  const after = done.db.shop.teu(B);
  done.game.stop();
  assert.equal(done.db.shop.teu(B), after);
  done.db.close();
});

test('hết giờ đặt mà server chưa kịp quét: cược và rút cược đều bị chặn', () => {
  const { db, game, player, bet } = fixture();
  const a = player(A, 100);
  bet(a, CUA, 10);
  game.endsAt = Date.now() - 1; // Đồng hồ đã về 0, sweep 500 ms chưa chạy tới.
  assert.equal(game.phase, 'betting');
  assert.match(bet(a, CA, 5).error, /Hết giờ/);
  assert.equal(game.clear(a).ok, false);
  assert.equal(db.shop.teu(A), 90);
  db.close();
});

test('bảng tuần không mua được hạng bằng cách cược liên tục: thua bao nhiêu trừ bấy nhiêu', () => {
  // Bốn ván: thua, thua, thua, rồi thắng ba viên cùng mặt.
  const { db, game, player, bet } = fixture({ dice: [NAI, NAI, NAI, BAU, BAU, BAU, GA, GA, GA, CUA, CUA, CUA] });
  const a = player(A, 100);
  const loser = player(B, 30);
  for (let round = 0; round < 4; round++) {
    bet(a, CUA, 10);
    if (round < 3) bet(loser, CUA, 10);
    game.sweep(game.endsAt);
    game.sweep(game.endsAt);
  }
  // A: -10 × 3, rồi +30 lãi (10 × 4 − 10) → TEU 100. B thua sạch 30.
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [100, 0]);
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 100 }, 'A hoà vốn thì đứng đúng 100; B lỗ hết thì không có trên bảng');
  db.close();
});

test('server sập giữa ván: lần khởi động sau hoàn đủ cược treo, chạy lại không hoàn lần hai', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-baucua-crash-'));
  const file = path.join(dir, 'crash.db');
  const io = { emit() {} };
  const quiet = console.log;
  console.log = () => {};
  try {
    const db = new Db(file);
    db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(A, 100, 'seed', DATE);
    const game = new BauCua({ db, io, config });
    const a = { pid: A, x: BAUCUA_ZONE.seat.x, z: BAUCUA_ZONE.seat.z, activity: ACTIVITY.baucua, lastBaucua: 0 };
    game.bet(a, { symbol: CUA, amount: 10 });
    a.lastBaucua = 0;
    game.bet(a, { symbol: CA, amount: 5 });
    assert.deepEqual([db.shop.teu(A), db.baucua.held(A)], [85, 15]);
    db.close(); // Sập: không gọi stop(), không chấm ván.

    const again = new Db(file);
    new BauCua({ db: again, io, config });
    assert.deepEqual([again.shop.teu(A), again.baucua.held(A)], [100, 0], 'khởi động lại thì hoàn đủ');
    assert.equal(again.weekly(EPOCH).teu[0].teu, 100, 'cược rồi hoàn không đổi hạng');
    again.close();

    const third = new Db(file);
    new BauCua({ db: third, io, config });
    assert.equal(third.shop.teu(A), 100, 'không hoàn lần hai');
    third.close();
  } finally {
    console.log = quiet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- Qua socket thật ----------

// Khác dải cổng của server.test.js (3911, 3921–39xx): node --test chạy các file song song.
const SOCKET_PORT = 4391;

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

test('bầu cua qua socket: chỉ cược được khi đứng ở bàn, cả phòng thấy tổng cược mà không thấy ai cược', { timeout: 20000 }, async () => {
  const pid = 'd'.repeat(32);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-baucua-'));
  const cfgFile = path.join(dir, 'config.json');
  const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
  example.bellSchedule = [];
  example.newPlayersPerMinute = 1000;
  fs.writeFileSync(cfgFile, JSON.stringify(example));
  const dbPath = path.join(dir, 'test.db');
  const seed = new Db(dbPath);
  seed.touchPlayer({ id: pid, name: 'Khách Cược', color: 0, hat: 7, now: Date.now(), isVisit: true });
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
  const waitFor = (s, ev, ok) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`hết giờ chờ ${ev}`)), 3000);
    s.on(ev, (v) => {
      if (ok(v)) {
        clearTimeout(timer);
        resolve(v);
      }
    });
  });
  try {
    const a = await connect();
    const hello = await call(a, 'hello', { name: 'Khách Cược', color: 0, hat: 7, playerId: pid });
    assert.equal(hello.ok, true);
    assert.equal(hello.snapshot.baucua.phase, 'idle');
    assert.deepEqual(hello.snapshot.baucua.mine, [0, 0, 0, 0, 0, 0]);
    assert.equal(hello.snapshot.teu, 40);

    const b = await connect();
    assert.equal((await call(b, 'hello', { name: 'Người Xem', color: 0, hat: 7 })).ok, true);

    // Chưa vào hoạt động, đứng xa bàn: bị chặn và không mất TEU.
    assert.equal((await call(a, 'baucua:bet', { symbol: CUA, amount: 5 })).ok, false);

    const seat = BAUCUA_ZONE.seat;
    await call(a, 'move', [seat.x, seat.z, seat.rot, 0, Date.now()]);
    assert.equal((await call(a, 'action:start', { kind: 'baucua' })).ok, true);
    const seen = waitFor(b, 'baucua:state', (s) => s.phase === 'betting' && s.totals[CUA] === 5);
    const placed = await call(a, 'baucua:bet', { symbol: CUA, amount: 5 });
    assert.deepEqual([placed.ok, placed.teu, placed.bets[CUA]], [true, 35, 5]);
    const state = await seen;
    assert.equal(state.bettors, 1);
    assert.equal(JSON.stringify(state).includes(pid), false, 'tin phát chung không lộ playerId');

    // Dữ liệu giả không làm hỏng bàn.
    for (const bad of [null, 'cua', { symbol: 'x', amount: 5 }, { symbol: CUA, amount: 1e9 }]) {
      assert.equal((await call(a, 'baucua:bet', bad)).ok, false);
    }
    for (const bad of [null, { bets: 'x' }, { bets: [1e9, 0, 0, 0, 0, 0] }]) {
      assert.equal((await call(a, 'baucua:rebet', bad)).ok, false);
    }
    await new Promise((r) => setTimeout(r, BAUCUA.betIntervalMs));
    const again1 = await call(a, 'baucua:rebet', { bets: [0, 0, 0, 0, 2, 1] });
    assert.deepEqual([again1.ok, again1.teu, again1.bets[CUA]], [true, 32, 7], 'cược lại cả gói qua socket');
    assert.equal((await call(a, 'baucua:clear')).teu, 40, 'rút cược hoàn đủ');

    // Vào lại giữa ván: snapshot trả cược đang đặt.
    await new Promise((r) => setTimeout(r, BAUCUA.betIntervalMs));
    await call(a, 'baucua:bet', { symbol: GA, amount: 10 });
    a.disconnect();
    const a2 = await connect();
    const again = await call(a2, 'hello', { name: 'Khách Cược', color: 0, hat: 7, playerId: pid });
    assert.equal(again.snapshot.baucua.phase, 'betting');
    assert.equal(again.snapshot.baucua.mine[GA], 10);
    assert.equal(again.snapshot.teu, 30);
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
