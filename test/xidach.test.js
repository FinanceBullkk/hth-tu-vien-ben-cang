// Xì dách: luật miền Nam (Át linh hoạt, xì bàn, xì dách, ngũ linh, non, quắc), lợi thế nhà cái bằng mô phỏng có hạt giống,
// bàn chơi theo pha với bộ bài sắp sẵn, giấu bài người khác, dữ liệu giả mạo, ngắt kết nối và sập server giữa ván.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import { Db } from '../server/db.js';
import { localDate } from '../server/time.js';
import { HIDDEN_CARD, XiDach } from '../server/xidach.js';
import { XIDACH_ZONE, PLACES, resolveCollision } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { XIDACH, compareHands, dealerShouldHit, handKind, handTotal, isNatural, settleHand, shuffledDeck } from '../shared/xidach.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const EPOCH = '2000-01-01';
// Lá theo hạng, chất bích: A=0, 2=1 … 10=9, J=10, Q=11, K=12. Muốn lá cùng hạng khác chất thì cộng 13.
const C = { A: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, J: 10, Q: 11, K: 12 };
const s2 = (card) => card + 13; // cùng hạng, chất khác

test('tính điểm: Át linh hoạt theo số lá, bài đặc biệt, non và quắc', () => {
  assert.equal(handTotal([C.A, C[5]]), 16, '2 lá: Át tính 11');
  assert.equal(handTotal([C.A, C[5], C.K]), 16, '3 lá: Át tính 1 khi 10 làm quắc');
  assert.equal(handTotal([C.A, C[5], C[4]]), 19, '3 lá: Át tính 10');
  assert.equal(handTotal([C.A, C[2], C[3], C[4]]), 10, '4 lá: Át chỉ tính 1');
  assert.equal(handKind([C.A, s2(C.A)]), 'xiban');
  assert.equal(handKind([C.K, C.A]), 'xidach');
  assert.equal(handKind([C[10], C.A]), 'xidach');
  assert.equal(handKind([C[2], C[3], C[4], C[5], C[6]]), 'ngulinh');
  assert.equal(handKind([C[6], C[7], C[8], s2(C[2]), s2(C[3])]), 'quac', '5 lá quá 21 vẫn là quắc');
  assert.equal(handKind([C[10], C[5]]), 'non');
  assert.equal(handKind([C[10], C[5]], { dealer: true }), 'normal', 'nhà cái không có non');
  assert.equal(handKind([C.K, C.Q, C[5]]), 'quac');
  assert.ok(isNatural('xiban') && isNatural('xidach') && !isNatural('ngulinh'));
});

test('so bài: bằng điểm hoà, quắc cùng nhau hoà, bài đặc biệt ăn x2 hai chiều', () => {
  const r = (p, d) => { const x = compareHands(p, d); return `${x.outcome}${x.mult ? x.mult : ''}`; };
  assert.equal(r([C[10], C[8]], [C.K, C[8]]), 'push', 'bằng 18 thì hoà');
  assert.equal(r([C[10], C[9]], [C.K, C[8]]), 'win1');
  assert.equal(r([C[10], C[7]], [C.K, C[8]]), 'lose1');
  assert.equal(r([C.K, C.Q, C[5]], [C[10], C[6], C[9]]), 'push', 'cả hai quắc thì hoà');
  assert.equal(r([C.K, C.Q, C[5]], [C[10], C[8]]), 'lose1');
  assert.equal(r([C.K, C.Q, C[5]], [C.A, C.K]), 'lose2', 'người quắc gặp cái xì dách mất x2');
  assert.equal(r([C.A, C.K], [C[10], C[9]]), 'win2');
  assert.equal(r([C.A, s2(C.A)], [C.A, C.K]), 'win2', 'xì bàn hơn xì dách');
  assert.equal(r([C.A, C.K], [s2(C.A), C.Q]), 'push', 'cùng xì dách thì hoà');
  assert.equal(r([C[2], C[3], C[4], C[5], C[6]], [C[10], C[9]]), 'win2', 'ngũ linh ăn x2');
  assert.equal(r([C[2], C[3], C[4], C[5], C[6]], [C.A, C.K]), 'lose2');
  assert.equal(r([C[10], C[5]], [C[10], C[6], C[9]]), 'lose1', 'non thua cả khi cái quắc');
  assert.equal(r([C[10], C[8]], [C[10], C[6], C[9]]), 'win1');
});

test('tiền: giữ gấp đôi cược, hoàn phần dư đúng theo kết quả', () => {
  assert.equal(XIDACH.holdMult, 2);
  assert.deepEqual(settleHand(10, [C[10], C[9]], [C.K, C[8]]), { outcome: 'win', mult: 1, returned: 20, profit: 10, net: 10 });
  assert.deepEqual(settleHand(10, [C.A, C.K], [C.K, C[8]]), { outcome: 'win', mult: 2, returned: 20, profit: 20, net: 20 });
  assert.deepEqual(settleHand(10, [C[10], C[8]], [C.K, C[8]]), { outcome: 'push', mult: 0, returned: 20, profit: 0, net: 0 });
  assert.deepEqual(settleHand(10, [C[10], C[7]], [C.K, C[8]]), { outcome: 'lose', mult: 1, returned: 10, profit: 0, net: -10 });
  assert.deepEqual(settleHand(10, [C[10], C[7]], [C.A, C.K]), { outcome: 'lose', mult: 2, returned: 0, profit: 0, net: -20 });
});

test('nhà cái rút dưới 17 và rút tiếp khi 17–18 mềm', () => {
  assert.equal(dealerShouldHit([C[10], C[4]]), true, '14');
  assert.equal(dealerShouldHit([C[10], C[6]]), true, '16');
  assert.equal(dealerShouldHit([C[10], C[7]]), false, '17 cứng');
  assert.equal(dealerShouldHit([C.A, C[6]]), true, '17 mềm');
  assert.equal(dealerShouldHit([C.A, C[7]]), true, '18 mềm');
  assert.equal(dealerShouldHit([C.A, C[8]]), false, '19 mềm');
  assert.equal(dealerShouldHit([C[2], C[2] + 13, C[2] + 26, C[3], C[4]]), false, 'đủ 5 lá thì thôi');
});

/** Bộ sinh số có hạt giống để mô phỏng cho ra đúng một kết quả mỗi lần chạy. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(strategy, rounds, seed) {
  const rnd = seeded(seed);
  const randomInt = (n) => Math.floor(rnd() * n);
  let net = 0;
  for (let i = 0; i < rounds; i++) {
    const deck = shuffledDeck(randomInt);
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    if (!isNatural(handKind(dealer, { dealer: true })) && !isNatural(handKind(player))) {
      while (player.length < XIDACH.maxCards && handTotal(player) <= 21 && strategy(player)) player.push(deck.pop());
    }
    if (!isNatural(handKind(dealer, { dealer: true }))) while (dealerShouldHit(dealer)) dealer.push(deck.pop());
    net += settleHand(1, player, dealer).net;
  }
  return net / rounds;
}

test('nhà cái có lợi thế: người chơi rút tới 16 hay tới 17 đều lỗ về lâu dài', () => {
  assert.ok(simulate((h) => handTotal(h) < 16, 100_000, 7) < -0.01, 'rút cho thoát non rồi dằn');
  assert.ok(simulate((h) => handTotal(h) < 17, 100_000, 11) < 0, 'rút tới 17');
});

test('bàn nằm trong sân: bàn và nhà cái là vật cản, chỗ đứng đi tới được, có trong menu', () => {
  const seat = XIDACH_ZONE.seat;
  assert.deepEqual(resolveCollision(seat.x, seat.z), { x: seat.x, z: seat.z });
  const place = PLACES.find((p) => p.key === 'xidach');
  assert.deepEqual([place.x, place.z], [seat.x, seat.z]);
  const pushed = resolveCollision(XIDACH_ZONE.x - 0.3, XIDACH_ZONE.z);
  assert.ok(Math.hypot(pushed.x - XIDACH_ZONE.x, pushed.z - XIDACH_ZONE.z) > XIDACH_ZONE.tableRadius);
  assert.ok(Math.abs(XIDACH_ZONE.x) > 3, 'không chắn trục chính');
});

// ---------- Bàn chơi (bộ bài sắp sẵn, đồng hồ giả) ----------

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);

/** deals: các lá theo đúng thứ tự sẽ được chia (khách theo ghế, rồi cái, hai vòng; sau đó là lá rút thêm). */
function fixture(deals = []) {
  const db = new Db(':memory:');
  const events = [];
  const hands = [];
  const payouts = [];
  const game = new XiDach({ db, io: { emit: (name, data) => events.push([name, data]) }, config, shuffle: () => [...deals].reverse() });
  game.onHand = (pid, hand) => hands.push([pid, hand]);
  game.onPayout = (pid, res) => payouts.push([pid, res]);
  let sid = 0;
  const player = (pid, teu, over = {}) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'seed', DATE);
    return { pid, sid: ++sid, name: `Khách ${pid[0]}`, x: XIDACH_ZONE.seat.x, z: XIDACH_ZONE.seat.z, activity: ACTIVITY.xidach, lastXidach: 0, ...over };
  };
  const act = (p, fn, data) => {
    p.lastXidach = 0;
    return game[fn](p, data);
  };
  return { db, game, events, hands, payouts, player, act };
}

test('một ván đủ pha: chia, giấu bài, rút/dằn, nhà cái rút, chấm và giữ gấp đôi tiền cược', () => {
  // A: 10, 6 rồi rút 4 = 20. B: K, 7 = 17. Cái: 9, 7 = 16 rồi rút 2 = 18.
  const { db, game, events, hands, payouts, player, act } = fixture([C[10], C.K, C[9], C[6], C[7], s2(C[7]), C[4], C[2]]);
  const a = player(A, 100);
  const b = player(B, 50);
  assert.equal(act(a, 'bet', { amount: 10 }).teu, 80, 'cược 10 giữ 20');
  assert.equal(act(b, 'bet', { amount: 5 }).teu, 40);
  assert.equal(game.phase, 'betting');
  assert.equal(act(a, 'hit').ok, false, 'chưa chia thì chưa rút');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'playing');
  assert.deepEqual(hands.map(([pid, h]) => [pid, h.cards]), [[A, [C[10], C[6]]], [B, [C.K, C[7]]]], 'bài riêng gửi đúng người');
  const playing = events.at(-1)[1];
  assert.deepEqual(playing.dealer, [C[9], HIDDEN_CARD], 'lá thứ hai của cái úp');
  assert.ok(playing.seats.every((s) => s.cards === null && s.count === 2), 'bài khách khác bị giấu');
  assert.equal(JSON.stringify(events).includes(A), false, 'không lộ playerId');

  assert.match(act(b, 'bet', { amount: 1 }).error, /Ván đang chơi/);
  assert.deepEqual(act(a, 'hit').cards, [C[10], C[6], C[4]]);
  assert.equal(act(a, 'stand').ok, true);
  assert.equal(act(b, 'stand').ok, true);
  game.sweep(Date.now());
  assert.equal(game.phase, 'dealer', 'mọi người dằn xong thì cái lật ngay');
  assert.deepEqual(events.at(-1)[1].dealer, [C[9], s2(C[7])]);
  game.sweep(game.nextStepAt);
  assert.deepEqual(game.dealer, [C[9], s2(C[7]), C[2]], 'cái 16 phải rút');
  game.sweep(game.nextStepAt);
  assert.equal(game.phase, 'result');

  // A thắng 20 vs 18: 80 + 20 hoàn + 10 lãi = 110. B thua 17 vs 18: 40 + 5 hoàn = 45.
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [110, 45]);
  assert.deepEqual([db.xidach.held(A), db.xidach.held(B)], [0, 0]);
  assert.deepEqual(Object.fromEntries(payouts.map(([pid, r]) => [pid, r.net])), { [A]: 10, [B]: -5 });
  const result = events.at(-1)[1];
  assert.deepEqual(result.seats.map((s) => [s.total, s.net]), [[20, 10], [17, -5]], 'lúc chấm thì lật hết bài');
  const board = Object.fromEntries(db.weekly(EPOCH).teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(board, { 'Khách a': 110, 'Khách b': 45 }, 'bảng tuần tính lãi/lỗ ròng');

  game.sweep(game.endsAt);
  assert.equal(game.phase, 'idle');
  db.close();
});

test('dưới 16 không được dằn; hết giờ thì coi như dằn và bị non', () => {
  // A: 10, 3 = 13. Cái: 10, 8 = 18.
  const { db, game, player, act } = fixture([C[10], C.K, C[3], C[8]]);
  const a = player(A, 100);
  act(a, 'bet', { amount: 10 });
  game.sweep(game.endsAt);
  assert.match(act(a, 'stand').error, /non/);
  game.sweep(game.endsAt); // Hết 15 giây không làm gì.
  assert.equal(game.phase, 'dealer');
  game.sweep(game.nextStepAt);
  assert.equal(game.phase, 'result');
  assert.equal(db.shop.teu(A), 90, 'non thua đúng tiền cược');
  db.close();
});

test('cái xì dách lật ngay sau khi chia: khách thường mất x2, khách xì dách hoà', () => {
  // A: 10, 9. B: A, K (xì dách). Cái: A, Q (xì dách).
  const { db, game, payouts, player, act } = fixture([C[10], C.A, s2(C.A), C[9], C.K, C.Q]);
  const a = player(A, 100);
  const b = player(B, 100);
  act(a, 'bet', { amount: 10 });
  act(b, 'bet', { amount: 10 });
  game.sweep(game.endsAt);
  assert.equal(game.phase, 'result', 'không có lượt rút');
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [80, 100]);
  assert.deepEqual(payouts.map(([, r]) => r.outcome), ['lose', 'push']);
  db.close();
});

test('khách xì dách tự dằn và ăn x2; khách quắc gặp cái quắc thì hoà', () => {
  // A: A, K (xì dách). B: 10, 6 rồi rút K = quắc. Cái: 10, 6 rồi rút 9 = quắc.
  const { db, game, player, act } = fixture([C.A, C[10], s2(C[10]), C.K, C[6], s2(C[6]), s2(C.K), C[9]]);
  const a = player(A, 100);
  const b = player(B, 100);
  act(a, 'bet', { amount: 10 });
  act(b, 'bet', { amount: 10 });
  game.sweep(game.endsAt);
  assert.equal(act(a, 'hit').ok, false, 'xì dách không rút thêm');
  const bust = act(b, 'hit');
  assert.equal(bust.stood, true, 'quắc thì tự dằn');
  game.sweep(Date.now());
  game.sweep(game.nextStepAt);
  game.sweep(game.nextStepAt);
  assert.equal(game.phase, 'result');
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [120, 100]);
  db.close();
});

test('cược giả mạo, vượt mức, thiếu tiền giữ, sai chỗ, bàn đầy đều bị chặn mà không trừ tiền', () => {
  const { db, game, player, act } = fixture();
  const a = player(A, 100);
  for (const bad of [null, {}, { amount: '5' }, { amount: 2 }, { amount: -5 }, { amount: 5.5 }, { amount: NaN }, { amount: [5] }]) {
    assert.equal(act(a, 'bet', bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(game.phase, 'idle');
  act(a, 'bet', { amount: 10 });
  act(a, 'bet', { amount: 10 });
  assert.match(act(a, 'bet', { amount: 1 }).error, /tối đa 20/);
  assert.equal(db.shop.teu(A), 60);

  const poor = player(B, 9);
  assert.match(act(poor, 'bet', { amount: 5 }).error, /Cần 10 TEU/, 'phải đủ tiền giữ gấp đôi');
  assert.equal(db.shop.teu(B), 9);

  const away = player('c'.repeat(32), 50, { x: 0, z: 36 });
  const idle = player('d'.repeat(32), 50, { activity: ACTIVITY.none });
  assert.equal(act(away, 'bet', { amount: 5 }).ok, false);
  assert.equal(act(idle, 'bet', { amount: 5 }).ok, false);

  for (const ch of ['e', 'f', '1', '2']) assert.equal(act(player(ch.repeat(32), 50), 'bet', { amount: 1 }).ok, true);
  assert.match(act(player('3'.repeat(32), 50), 'bet', { amount: 1 }).error, /đủ 5 người/);
  assert.equal(new Set([...game.seats.values()].map((s) => s.seat)).size, 5, 'mỗi người một ghế');
  db.close();
});

test('rút cược khi còn nhận cược thì hoàn đủ và trả ghế', () => {
  const { db, game, player, act } = fixture();
  const a = player(A, 100);
  act(a, 'bet', { amount: 10 });
  const res = act(a, 'clear');
  assert.deepEqual([res.ok, res.teu, game.seats.size], [true, 100, 0]);
  game.sweep(game.endsAt);
  assert.equal(game.phase, 'idle', 'không còn ai thì không chia');
  db.close();
});

test('khách mất kết nối giữa ván: hết giờ tự dằn, vẫn được chấm và trả tiền theo playerId', () => {
  // A: 10, 9 = 19. Cái: 10, 7 = 17.
  const { db, game, payouts, player, act } = fixture([C[10], C.K, C[9], C[7]]);
  const a = player(A, 100);
  act(a, 'bet', { amount: 10 });
  game.sweep(game.endsAt);
  game.sweep(game.endsAt); // Người chơi đã rời, không ai bấm gì.
  game.sweep(game.nextStepAt);
  assert.deepEqual(payouts.map(([pid, r]) => [pid, r.net]), [[A, 10]]);
  assert.equal(db.shop.teu(A), 110);
  db.close();
});

test('server sập giữa ván: lần khởi động sau hoàn đủ tiền giữ, không hoàn lần hai', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-xidach-crash-'));
  const file = path.join(dir, 'crash.db');
  const io = { emit() {} };
  const quiet = console.log;
  console.log = () => {};
  try {
    const db = new Db(file);
    db.touchPlayer({ id: A, name: 'Khách a', color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(A, 100, 'seed', DATE);
    const game = new XiDach({ db, io, config });
    game.bet({ pid: A, sid: 1, name: 'Khách a', x: XIDACH_ZONE.seat.x, z: XIDACH_ZONE.seat.z, activity: ACTIVITY.xidach, lastXidach: 0 }, { amount: 10 });
    game.sweep(game.endsAt); // Đã chia bài, đang lượt rút.
    assert.deepEqual([db.shop.teu(A), db.xidach.held(A)], [80, 20]);
    db.close();

    const again = new Db(file);
    new XiDach({ db: again, io, config });
    assert.deepEqual([again.shop.teu(A), again.xidach.held(A)], [100, 0]);
    again.close();
    const third = new Db(file);
    new XiDach({ db: third, io, config });
    assert.equal(third.shop.teu(A), 100);
    third.close();
  } finally {
    console.log = quiet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tắt server giữa ván hoàn tiền giữ ngay', () => {
  const { db, game, player, act } = fixture([C[10], C.K, C[9], C[7]]);
  const a = player(A, 100);
  act(a, 'bet', { amount: 10 });
  game.sweep(game.endsAt);
  game.stop();
  assert.deepEqual([db.shop.teu(A), db.xidach.held(A)], [100, 0]);
  db.close();
});

// ---------- Qua socket thật ----------

test('xì dách qua socket: cược ở bàn, cả phòng thấy ghế mà không thấy bài hay playerId, vào lại giữ ghế', { timeout: 20000 }, async () => {
  const PORT = 4392; // Khác dải cổng của server.test.js (3911, 3921–39xx) và baucua.test.js (4391).
  const pid = 'd'.repeat(32);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-xidach-'));
  const cfgFile = path.join(dir, 'config.json');
  const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
  fs.writeFileSync(cfgFile, JSON.stringify({ ...example, bellSchedule: [], newPlayersPerMinute: 1000 }));
  const dbPath = path.join(dir, 'test.db');
  const seed = new Db(dbPath);
  seed.touchPlayer({ id: pid, name: 'Khách Bài', color: 0, hat: 7, now: Date.now(), isVisit: true });
  seed.addTeu(pid, 40, 'seed', DATE);
  seed.close();

  const proc = spawn(process.execPath, ['server/index.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), ADMIN_KEY: 'k'.repeat(32), DB_PATH: dbPath, HTH_CONFIG: cfgFile },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve) => proc.stdout.on('data', (d) => String(d).includes('đang chạy') && resolve()));
  const sockets = [];
  const connect = () => new Promise((resolve, reject) => {
    const s = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
  const call = (s, ev, data) => s.timeout(3000).emitWithAck(ev, data);
  try {
    const a = await connect();
    const hello = await call(a, 'hello', { name: 'Khách Bài', color: 0, hat: 7, playerId: pid });
    assert.equal(hello.snapshot.xidach.phase, 'idle');
    assert.equal(hello.snapshot.xidach.mine, null);
    const b = await connect();
    await call(b, 'hello', { name: 'Người Xem', color: 0, hat: 7 });

    assert.equal((await call(a, 'xidach:bet', { amount: 5 })).ok, false, 'chưa tới bàn');
    const seat = XIDACH_ZONE.seat;
    await call(a, 'move', [seat.x, seat.z, seat.rot, 0, Date.now()]);
    assert.equal((await call(a, 'action:start', { kind: 'xidach' })).ok, true);
    const seen = new Promise((resolve) => b.on('xidach:state', (s) => s.seats.length && resolve(s)));
    const placed = await call(a, 'xidach:bet', { amount: 5 });
    assert.deepEqual([placed.ok, placed.bet, placed.teu], [true, 5, 30], 'cược 5 giữ 10');
    const state = await seen;
    assert.deepEqual(state.seats.map((s) => [s.name, s.bet, s.cards]), [['Khách Bài', 5, null]]);
    assert.equal(JSON.stringify(state).includes(pid), false, 'tin phát chung không lộ playerId');
    for (const bad of [null, { amount: 'x' }, { amount: 1e9 }]) assert.equal((await call(a, 'xidach:bet', bad)).ok, false);
    assert.equal((await call(a, 'xidach:hit')).ok, false, 'chưa chia bài');

    a.disconnect();
    const a2 = await connect();
    const again = await call(a2, 'hello', { name: 'Khách Bài', color: 0, hat: 7, playerId: pid });
    assert.equal(again.snapshot.xidach.mine.bet, 5, 'vào lại vẫn giữ ghế và tiền cược');
    assert.equal(again.snapshot.teu, 30);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await new Promise((resolve) => {
      proc.on('exit', resolve);
      proc.kill();
    });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
