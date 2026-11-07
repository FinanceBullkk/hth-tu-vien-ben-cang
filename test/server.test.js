// Kiểm thử server thật qua socket: vào phòng, chat, lời ước, lọc từ, chuông, restart giữ dữ liệu.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { io } from 'socket.io-client';
import { WordFilter } from '../server/filter.js';
import { WindowCounter, clientIp } from '../server/limits.js';
import { localDate, zonedToTs } from '../server/time.js';
import { fightGreen } from '../shared/fish.js';
import { noteTargetAt, rhythmPattern } from '../shared/rhythm.js';
import {
  ABBOT, BELL, BOUNDS, BOXES, CIRCLES, CONTAINERS, MATS, PLAYER_RADIUS, POND, SPAWN, TEA, TREE, clampToWalkable, inBox, resolveCollision,
} from '../shared/layout.js';

const PORT = 3911;
const URL_BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = 'k'.repeat(32);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-test-'));
const cfg = path.join(dir, 'config.json');
const example = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
example.bellSchedule = [];
example.newPlayersPerMinute = 1000; // Bộ test vào phòng liên tục từ cùng một IP.
example.maxConnectionsPerIp = 1000;
fs.writeFileSync(cfg, JSON.stringify(example));

/** Chạy một server riêng với cấu hình và IP giả lập như đang đứng sau Funnel. */
let extraPort = PORT + 10;
async function withServer(overrides, fn) {
  const port = extraPort++;
  const file = path.join(dir, `cfg-${port}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...example, ...overrides }));
  const proc = await startServer({ PORT: String(port), HTH_CONFIG: file, DB_PATH: path.join(dir, `db-${port}.db`), TRUST_PROXY: '1' });
  const open = [];
  const connectAs = (ip) => new Promise((resolve, reject) => {
    const s = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { 'x-forwarded-for': ip } });
    open.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
  try {
    await fn({ connectAs, base: `http://127.0.0.1:${port}`, file });
  } finally {
    open.forEach((s) => s.disconnect());
    await stopServer(proc);
  }
}

let serverProc;
const sockets = [];

function startServer(env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['server/index.js'], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, PORT: String(PORT), ADMIN_KEY: ADMIN, DB_PATH: path.join(dir, 'test.db'), HTH_CONFIG: cfg, ...env },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    proc.stdout.on('data', (d) => {
      if (String(d).includes('đang chạy')) resolve(proc);
    });
    proc.on('error', reject);
  });
}

function stopServer(proc) {
  return new Promise((resolve) => {
    proc.on('exit', resolve);
    proc.kill();
  });
}

function connect() {
  const s = io(URL_BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(s);
  return new Promise((resolve) => s.on('connect', () => resolve(s)));
}

const call = (s, ev, data) => s.timeout(3000).emitWithAck(ev, data);
const once = (s, ev) => new Promise((resolve) => s.once(ev, resolve));
// Chờ lần phát đầu tiên thoả điều kiện. Dùng khi một bản phát cũ có thể tới muộn: các socket
// khác nhau không giữ thứ tự với nhau, nên ack trên socket này có thể về trước sự kiện của socket kia.
const until = (s, ev, ok, ms = 3000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { s.off(ev, h); reject(new Error(`hết ${ms}ms chờ ${ev}`)); }, ms);
  const h = (v) => { if (ok(v)) { clearTimeout(timer); s.off(ev, h); resolve(v); } };
  s.on(ev, h);
});

async function join(name, playerId) {
  const s = await connect();
  const res = await call(s, 'hello', { name, color: 1, hat: 2, playerId });
  return { s, res };
}

function admin(pathname, method = 'GET', body) {
  return fetch(`${URL_BASE}/admin/api${pathname}`, {
    method,
    headers: { 'x-admin-key': ADMIN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

before(async () => {
  serverProc = await startServer();
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  if (serverProc) await stopServer(serverProc);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('bộ lọc chặn từ thô nhưng không chặn nhầm tiếng Việt', () => {
  const f = new WordFilter(example.bannedWords);
  for (const bad of ['đm', 'DM', 'd.m', 'v c l', 'vcl', 'địt', 'dmmm', 'đụụụ', 'lồn', 'fuck', 'sh1t', 'dit me', 'Đĩ']) {
    assert.equal(f.isBad(bad), true, `phải chặn: ${bad}`);
  }
  for (const ok of ['lớn', 'lon bia', 'các bạn', 'cá', 'admin', 'đi', 'mẹ tôi', 'Chúc cả nhà bình an', 'con chó nhà em', 'cảng Hải Phòng', 'd i']) {
    assert.equal(f.isBad(ok), false, `không được chặn: ${ok}`);
  }
});

test('va chạm: không kẹt, không xuyên, luôn trong ranh giới', () => {
  const r = 0.4;
  const out = { x: 0, z: 0 };
  for (let i = 0; i < 4000; i++) {
    const x = -35 + Math.random() * 70;
    const z = -35 + Math.random() * 80;
    resolveCollision(x, z, r, out);
    const [cx, cz] = clampToWalkable(out.x, out.z);
    assert.ok(Math.abs(cx - out.x) < 1e-6 && Math.abs(cz - out.z) < 1e-6, 'phải nằm trong vùng đi được');
    for (const b of BOXES) {
      const inside = out.x > b.minX + 0.01 && out.x < b.maxX - 0.01 && out.z > b.minZ + 0.01 && out.z < b.maxZ - 0.01;
      assert.equal(inside, false, `không được nằm trong hộp tại ${out.x},${out.z}`);
    }
  }
  assert.ok(CIRCLES.length > 10);
});

test('đi hết sân: từ điểm vào tới được mọi hoạt động, không chui vào hộp nào', () => {
  // Duyệt loang bằng đúng hàm va chạm của game, bước nhỏ như một khung hình đi bộ.
  const STEP = 0.25;
  const key = (x, z) => `${Math.round(x / STEP)}|${Math.round(z / STEP)}`;
  const seen = new Set([key(SPAWN.x, SPAWN.z)]);
  const queue = [[SPAWN.x, SPAWN.z]];
  const out = { x: 0, z: 0 };
  const reached = [];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  while (queue.length) {
    const [x, z] = queue.pop();
    reached.push([x, z]);
    for (const [dx, dz] of DIRS) {
      resolveCollision(x + dx * STEP, z + dz * STEP, PLAYER_RADIUS, out);
      const k = key(out.x, out.z);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push([out.x, out.z]);
      }
    }
  }
  for (const [x, z] of reached) {
    for (const b of BOXES) {
      assert.equal(x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ, false, `lọt vào hộp tại ${x},${z}`);
    }
    assert.ok(z <= BOUNDS.maxZ && x <= BOUNDS.maxX, 'không ai ra được khỏi sân');
  }
  const near = (tx, tz, radius) => reached.some(([x, z]) => Math.hypot(x - tx, z - tz) < radius);
  assert.ok(near(BELL.x, BELL.z, BELL.radius), 'tới được gác chuông');
  assert.ok(near(TREE.x, TREE.z, TREE.radius), 'tới được cây bồ đề');
  assert.ok(near(POND.x, POND.z, POND.actionRadius), 'tới được hồ sen');
  assert.ok(near(TEA.x, TEA.z, TEA.radius), 'tới được quán trà');
  assert.ok(near(ABBOT.x, ABBOT.z, ABBOT.actionRadius), 'tới được chỗ thầy trụ trì');
  assert.ok(near(0, -14, 1), 'thầy trụ trì không chắn cửa thiền đường');
  assert.ok(reached.some(([x, z]) => inBox(x, z, CONTAINERS, CONTAINERS.actionMargin)), 'tới được container');
  MATS.forEach((m, i) => assert.ok(near(m.x, m.z, 2.1), `tới được chiếu ${i}`));
  assert.ok(near(-25, 25, 1) && near(25, -25, 1), 'tới được các góc sân');
});

test('hai người vào phòng thấy nhau, trùng tên tự thêm số', async () => {
  const a = await join('Lan');
  assert.equal(a.res.ok, true);
  assert.match(a.res.playerId, /^[a-f0-9]{32}$/);
  const joined = once(a.s, 'player:join');
  const b = await join('Lan');
  assert.equal(b.res.name, 'Lan (2)');
  const seen = await joined;
  assert.equal(seen.name, 'Lan (2)');
  assert.equal(seen.playerId, undefined, 'không được lộ playerId cho người khác');
  assert.equal(b.res.snapshot.players.length >= 1, true);
  assert.equal(b.res.snapshot.players[0].playerId, undefined);
  assert.equal(a.res.snapshot.radio.videoId, undefined);
  assert.equal(a.res.snapshot.radio.durationSec, 1758);
  assert.equal(a.res.snapshot.radio.startedAt, b.res.snapshot.radio.startedAt, 'cùng mốc nhạc cho cả phòng');

  // Vị trí được phát lại và bị kẹp trong ranh giới.
  a.s.emit('move', [9999, 9999, 0, 1]);
  const state = await new Promise((resolve) => {
    b.s.on('state', function h(m) {
      const row = m.p.find((r) => r[0] === a.res.sid);
      if (row && row[1] !== 0) {
        b.s.off('state', h);
        resolve(row);
      }
    });
  });
  assert.ok(state[1] <= 30 && state[2] <= 40, 'server phải kẹp vị trí');
  a.s.disconnect();
  b.s.disconnect();
});

/** Đợi gói state kế tiếp có hàng của sid, thoả điều kiện. */
function nextRow(socket, sid, match = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('state', handler);
      reject(new Error('không thấy gói state mong đợi'));
    }, 3000);
    function handler(m) {
      const row = m.p.find((r) => r[0] === sid);
      if (row && match(row)) {
        clearTimeout(timer);
        socket.off('state', handler);
        resolve({ row, t: m.t });
      }
    }
    socket.on('state', handler);
  });
}

test('vị trí phát 20 lần/giây và kèm tuổi mẫu theo mốc client, mốc giả bị kẹp', async () => {
  const a = await join('Tuoi');
  const b = await join('Xem');
  const sid = a.res.sid;
  await new Promise((r) => setTimeout(r, 400)); // Mốc không được lùi quá lúc vào phòng.

  // Mốc hợp lệ cách đây 200 ms: tuổi phản ánh đúng lúc lấy mẫu, không phải lúc tick.
  a.s.emit('move', [1, 1, 0, 1, Date.now() - 200]);
  let { row } = await nextRow(b.s, sid, (r) => r[1] === 1);
  assert.ok(row[6] >= 200 && row[6] < 800, `tuổi ${row[6]}`);

  // Mốc ở tương lai bị kẹp về hiện tại.
  a.s.emit('move', [2, 1, 0, 1, Date.now() + 60_000]);
  ({ row } = await nextRow(b.s, sid, (r) => r[1] === 2));
  assert.ok(row[6] >= 0 && row[6] < 500, `tuổi ${row[6]}`);

  // Mốc rất cũ không được làm thời gian lùi: vẫn giữ mốc đã có.
  a.s.emit('move', [3, 1, 0, 1, 1]);
  ({ row } = await nextRow(b.s, sid, (r) => r[1] === 3));
  assert.ok(row[6] >= 0 && row[6] < 1000, `tuổi ${row[6]}`);

  // Mốc rác và client cũ không gửi mốc: vẫn đi được, lấy giờ server.
  for (const [i, stamp] of [['abc'], [null], [{}], [Number.NaN], [Number.POSITIVE_INFINITY]].entries()) {
    const x = 4 + i;
    a.s.emit('move', [x, 1, 0, 1, stamp[0]]);
    ({ row } = await nextRow(b.s, sid, (r) => r[1] === x));
    assert.ok(Number.isFinite(row[6]) && row[6] >= 0 && row[6] < 1000, `tuổi ${row[6]}`);
  }
  a.s.emit('move', [10, 1, 0, 0]);
  ({ row } = await nextRow(b.s, sid, (r) => r[1] === 10));
  assert.ok(row[6] >= 0 && row[6] < 500, `tuổi ${row[6]}`);

  // Đi liên tục ở nhịp client thật: phần lớn gói phát đi đều có mẫu mới, không còn nhịp 10 Hz cũ.
  let seen = 0;
  const count = (m) => { if (m.p.some((r) => r[0] === sid)) seen++; };
  b.s.on('state', count);
  const t0 = Date.now();
  let x = 11;
  const sender = setInterval(() => {
    x += 0.05;
    a.s.emit('move', [x, 1, 0, 1, Date.now()]);
  }, 50);
  await new Promise((r) => setTimeout(r, 2000));
  clearInterval(sender);
  b.s.off('state', count);
  const rate = seen / ((Date.now() - t0) / 1000);
  assert.ok(rate >= 14 && rate <= 21, `nhận ${rate.toFixed(1)} gói/giây`);

  // Ngắt khi đang đi: server vẫn phục vụ người còn lại, gói state của họ vẫn tới.
  a.s.emit('move', [x, 1, 0, 1, Date.now()]);
  a.s.disconnect();
  b.s.emit('move', [2, 2, 0, 0, Date.now()]);
  assert.ok((await nextRow(b.s, b.res.sid, (r) => r[1] === 2)).row);
  b.s.disconnect();
});

test('ngoại hình: nhận đủ bộ skin mới, người khác nhìn thấy, giá trị ngoài phạm vi bị kẹp', async () => {
  const a = await connect();
  const res = await call(a, 'hello', {
    name: 'Võ Sư', color: 0, hair: 3, hat: 6, attire: 3, weapon: 3, effect: 9, playerId: 'b'.repeat(32),
  });
  assert.equal(res.ok, true);
  assert.equal(res.snapshot.me.hair, 3);
  assert.equal(res.snapshot.me.hat, 6);
  assert.equal(res.snapshot.me.attire, 3);
  assert.equal(res.snapshot.me.weapon, 3);
  assert.equal(res.snapshot.me.effect, 9);

  // Người vào sau nhìn thấy đúng ngoại hình qua snapshot.
  const b = await join('Khán Giả');
  const row = b.res.snapshot.players.find((p) => p.sid === res.sid);
  assert.equal(row.hair, 3);
  assert.equal(row.hat, 6);
  assert.equal(row.attire, 3);
  assert.equal(row.weapon, 3);
  assert.equal(row.effect, 9);

  // Giá trị rác ngoài phạm vi bị kẹp về mặc định, không vỡ server (kết nối mới vì
  // mỗi kết nối chỉ vào phòng một lần; trùng playerId để nối tiếp người chơi cũ).
  const junkSock = await connect();
  const junk = await call(junkSock, 'hello', {
    name: 'Võ Sư', hair: 99, hat: 99, attire: -5, weapon: 'kiếm', effect: 1e9, playerId: 'b'.repeat(32),
  });
  assert.equal(junk.ok, true);
  assert.equal(junk.snapshot.me.hair, 0);
  assert.equal(junk.snapshot.me.hat, 0);
  assert.equal(junk.snapshot.me.attire, 0);
  assert.equal(junk.snapshot.me.weapon, 0);
  assert.equal(junk.snapshot.me.effect, 0);
  a.disconnect();
  junkSock.disconnect();
  b.s.disconnect();
});

test('slot tóc: chọn riêng, client cũ không gửi hair thì di trú từ id mũ cũ', async () => {
  // Client bản cũ không có slot tóc: id hat 0-2 là kiểu tóc, id mũ thật thì tóc về mặc định.
  const legacyBun = await connect();
  const resBun = await call(legacyBun, 'hello', { name: 'Tóc Cũ', color: 0, hat: 2, playerId: 'd'.repeat(32) });
  assert.equal(resBun.snapshot.me.hair, 2);
  const legacyHat = await connect();
  const resHat = await call(legacyHat, 'hello', { name: 'Mũ Cũ', color: 0, hat: 5, playerId: 'c'.repeat(32) });
  assert.equal(resHat.snapshot.me.hair, 0);

  // Client mới gửi hair: chọn riêng tóc + mũ, vào lại với look mới thì nhận look mới.
  const fresh = await connect();
  const resNew = await call(fresh, 'hello', { name: 'Tóc Mới', color: 0, hair: 5, hat: 7, playerId: 'd'.repeat(32) });
  assert.equal(resNew.snapshot.me.hair, 5);
  assert.equal(resNew.snapshot.me.hat, 7);
  legacyBun.disconnect();
  legacyHat.disconnect();
  fresh.disconnect();
});

test('chat: phát cho mọi người, chặn từ thô, giới hạn 2 giây, cắt 80 ký tự', async () => {
  const a = await join('Minh');
  const b = await join('Hoa');
  const heard = once(b.s, 'chat');
  const t0 = Date.now();
  const res = await call(a.s, 'chat', { text: `xin chào <b>cả nhà</b> ${'a'.repeat(200)}` });
  assert.equal(res.ok, true);
  const msg = await heard;
  assert.ok(Date.now() - t0 < 500, 'chat phải tới trong dưới 0,5 giây');
  assert.equal([...msg.text].length, 80);
  const tooFast = await call(a.s, 'chat', { text: 'nữa nè' });
  assert.equal(tooFast.ok, false);
  const bad = await call(b.s, 'chat', { text: 'đm' });
  assert.equal(bad.ok, false);
  a.s.disconnect();
  b.s.disconnect();
});

test('lời ước: tạo, hiện cho người khác, tim, giới hạn 3/ngày, xoá, admin ẩn, sau restart vẫn còn', async () => {
  const a = await join('An');
  const b = await join('Bình');
  const news = once(b.s, 'wish:new');
  const created = await call(a.s, 'wish:create', { text: 'Mong cả nhà bình an', place: 'tree' });
  assert.equal(created.ok, true);
  assert.equal(created.remaining, 2);
  const w = await news;
  assert.equal(w.author, 'An');
  assert.equal(w.player_id, undefined);
  assert.equal(w.playerId, undefined);

  const selfLike = await call(a.s, 'wish:like', { id: created.id });
  assert.equal(selfLike.ok, false);
  assert.equal((await call(b.s, 'wish:like', { id: created.id })).likes, 1);
  assert.equal((await call(b.s, 'wish:like', { id: created.id })).likes, 1, 'mỗi người 1 tim');

  assert.equal((await call(a.s, 'wish:create', { text: 'đm', place: 'tree' })).ok, false);
  assert.equal((await call(a.s, 'wish:create', { text: 'hai', place: 'nowhere' })).ok, false);
  assert.equal((await call(a.s, 'wish:create', { text: 'hai', place: 'pond' })).ok, true);
  const third = await call(a.s, 'wish:create', { text: 'ba', place: 'container' });
  assert.equal(third.ok, true);
  assert.equal((await call(a.s, 'wish:create', { text: 'bốn', place: 'tree' })).ok, false);

  // Người khác không xoá được, chính chủ thì được.
  assert.equal((await call(b.s, 'wish:delete', { id: third.id })).ok, false);
  const removed = once(b.s, 'wish:removed');
  assert.equal((await call(a.s, 'wish:delete', { id: third.id })).ok, true);
  assert.equal((await removed).id, third.id);

  // Admin ẩn: biến mất ngay trên mọi máy.
  const hidden = once(b.s, 'wish:removed');
  const res = await admin(`/wishes/${created.id + 1}/hidden`, 'POST', { hidden: true });
  assert.equal(res.status, 200);
  assert.equal((await hidden).id, created.id + 1);

  // Sổ cá nhân chỉ đọc được bằng playerId của mình.
  const book = await (await fetch(`${URL_BASE}/api/me`, { headers: { 'x-player-id': a.res.playerId } })).json();
  assert.equal(book.wishes.length, 2);
  assert.equal(book.visits, 1);
  assert.equal((await fetch(`${URL_BASE}/api/me`)).status, 404);

  // Restart server: dữ liệu không mất.
  const pid = a.res.playerId;
  const radioStartedAt = a.res.snapshot.radio.startedAt;
  a.s.disconnect();
  b.s.disconnect();
  await stopServer(serverProc);
  serverProc = await startServer();
  const again = await join('An', pid);
  assert.equal(again.res.playerId, pid);
  assert.equal(again.res.snapshot.radio.startedAt, radioStartedAt, 'restart vẫn giữ mốc nhạc');
  const texts = again.res.snapshot.wishes.map((x) => x.text);
  assert.ok(texts.includes('Mong cả nhà bình an'), 'lời ước phải còn sau restart');
  const liked = again.res.snapshot.wishes.find((x) => x.id === created.id);
  assert.equal(liked.mine, true);
  assert.equal(liked.likes, 1);
  again.s.disconnect();
});

test('quẻ vận đơn: một quẻ mỗi ngày, thiếu quyền thì không chạy', async () => {
  const a = await join('Tâm');
  const first = await call(a.s, 'fortune:draw');
  assert.equal(first.ok, true);
  assert.match(first.bl, /^HTH-\d{4}-\d{4}$/);
  const second = await call(a.s, 'fortune:draw');
  assert.equal(second.already, true);
  assert.equal(second.text, first.text);
  const stranger = await connect();
  assert.equal((await call(stranger, 'fortune:draw')).ok, false, 'chưa hello thì không được rút');
  stranger.disconnect();
  a.s.disconnect();
});

test('nhịp chuông: đứng gần mới chơi, chặn kết thúc sớm và huỷ lượt sạch', async () => {
  const a = await join('Chuông');
  const b = await join('Nghe');
  assert.equal((await call(a.s, 'rhythm:start', { kind: 'bell' })).ok, false, 'đứng ở cổng thì chưa chơi được');
  a.s.emit('move', [BELL.x, BELL.z + 2.5, 0, 0]);
  await new Promise((r) => setTimeout(r, 60));
  const started = await call(a.s, 'rhythm:start', { kind: 'bell' });
  assert.equal(started.ok, true);
  assert.equal((await call(a.s, 'rhythm:finish', { id: started.game.id })).saved, false);
  await new Promise((r) => setTimeout(r, Math.max(0, noteTargetAt(started.game.at, 0, 0) - Date.now())));
  const strike = { id: started.game.id, round: 0, idx: 0, note: rhythmPattern(started.game.at, 0, 'bell')[0] };
  const heard = once(b.s, 'bell:ring');
  const judged = await call(a.s, 'rhythm:hit', strike);
  assert.equal(judged.ok, true);
  assert.notEqual(judged.grade, 'miss', 'chốt ngay nhịp chuẩn phải phát chuông');
  const ring = await heard;
  assert.ok(ring.quality > 0);
  assert.equal(ring.beat, 1);
  const again = await call(a.s, 'rhythm:hit', strike);
  assert.equal(again.repeat, true);
  await call(a.s, 'action:stop');
  assert.equal((await call(a.s, 'rhythm:hit', strike)).ok, false);
  a.s.disconnect();
  b.s.disconnect();
});

test('thiền: giữ chỗ chiếu, nhịp chung, chat bị chặn khi ngồi', async () => {
  const a = await join('Thiền A');
  const b = await join('Thiền B');
  // Đi vào gần chiếu số 0 ở phía nam vòng tròn.
  a.s.emit('move', [0, -15.5, 0, 0]);
  b.s.emit('move', [0, -15.5, 0, 0]);
  await new Promise((r) => setTimeout(r, 60));
  const r1 = await call(a.s, 'action:start', { kind: 'meditate', mat: 0 });
  assert.equal(r1.ok, true);
  const taken = await call(b.s, 'action:start', { kind: 'meditate', mat: 0 });
  assert.equal(taken.ok, false);
  const sync = once(a.s, 'meditation:sync');
  const r2 = await call(b.s, 'action:start', { kind: 'meditate', mat: 1 });
  assert.equal(r2.ok, true);
  assert.equal(r2.epoch, r1.epoch, 'người vào sau phải theo nhịp của người đầu');
  assert.deepEqual((await sync).mates, ['Thiền B']);
  assert.equal((await call(a.s, 'chat', { text: 'ê' })).ok, false);
  const game = await call(a.s, 'rhythm:start', { kind: 'meditate' });
  assert.equal(game.ok, true);
  const early = await call(a.s, 'rhythm:finish', { id: game.game.id, score: 100 });
  assert.equal(early.saved, false, 'ngồi chưa đủ năm hơi thở thì không lưu buổi');
  a.s.disconnect();
  b.s.disconnect();
});

test('câu cá qua socket thật: quăng, cắn, giữ kim theo vùng xanh, kéo lên được ghi sổ', { timeout: 40000 }, async () => {
  const a = await join('Người câu');
  const b = await join('Người xem');
  a.s.emit('move', [19, 16.7, 0, 0]);
  await new Promise((r) => setTimeout(r, 80));

  const bobber = once(b.s, 'fish:bobber');
  const bitten = once(a.s, 'fish:bite');
  const cast = await call(a.s, 'fish:cast', { tx: 19, tz: 21, bait: 'bot' });
  assert.equal(cast.ok, true);
  assert.equal((await bobber).sid, a.res.sid, 'người khác thấy phao');
  const bite = await bitten;
  assert.equal((await call(a.s, 'fish:reel')).ok, false, 'chưa đầy vòng thì chưa kéo được');

  // Như client: đi theo vùng xanh, gửi vị trí kim đều đặn cho tới khi server báo đầy.
  let pulled;
  for (let i = 0; i < 300; i++) {
    const elapsed = Date.now() - bite.startAt;
    pulled = await call(a.s, 'fish:pull', { x: fightGreen(elapsed + 100, bite.seed, bite.rarity, bite.assist) });
    if (pulled.ready || pulled.escaped) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(pulled.ready, true, 'bám vùng xanh thì đầy vòng');

  const caught = once(b.s, 'fish:caught');
  const rodOff = once(b.s, 'fish:rodoff');
  const res = await call(a.s, 'fish:reel');
  assert.equal(res.ok, true);
  assert.equal(res.fish.rarity, bite.rarity);
  assert.ok(res.teu >= 1);
  assert.equal((await caught).name, res.fish.name);
  assert.equal((await rodOff).sid, a.res.sid);
  assert.equal((await call(a.s, 'fish:pull', { x: 0.5 })).ok, false, 'kéo xong là hết lượt');
  a.s.disconnect();
  b.s.disconnect();
});

test('sự kiện chuông: đếm ngược, chạm trong sân, kết quả đếm người', async () => {
  const a = await join('Sự kiện A');
  a.s.emit('move', [BELL.x, BELL.z + 6, 0, 0]);
  await new Promise((r) => setTimeout(r, 60));
  const announce = once(a.s, 'bell:event');
  const res = await (await admin('/ring-now', 'POST', { message: 'Test chuông' })).json();
  assert.equal(res.ok, true);
  const e = await announce;
  assert.equal(e.phase, 'announce');
  assert.equal(e.message, 'Test chuông');
  assert.equal(e.hitAt - e.at, 5000);
  await new Promise((r) => a.s.once('bell:event', r)); // Pha open, đúng giờ server.
  await new Promise((r) => setTimeout(r, Math.max(0, e.hitAt - Date.now())));
  const tap = await call(a.s, 'bell:tap');
  assert.equal(tap.ok, true);
  assert.equal(tap.onBeat, true);
  const result = await once(a.s, 'bell:event');
  assert.equal(result.phase, 'result');
  assert.equal(result.count, 1);
  assert.ok(result.intensity > 0);
  a.s.disconnect();
});

test('admin: sai khoá bị chặn, từ lọc có hiệu lực ngay, kích được người chơi, chống XSS ở dữ liệu thô', async () => {
  assert.equal((await fetch(`${URL_BASE}/admin?key=sai`)).status, 403);
  assert.equal((await fetch(`${URL_BASE}/admin?key=${ADMIN}`)).status, 200);
  assert.equal((await fetch(`${URL_BASE}/admin/api/state`)).status, 403);

  const a = await join('Ngoan');
  const state = await (await admin('/state')).json();
  assert.ok(state.stats.online >= 1);
  const banned = [...state.bannedWords, 'từkhóatest'];
  assert.equal((await admin('/banned-words', 'PUT', { bannedWords: banned })).status, 200);
  assert.equal((await call(a.s, 'chat', { text: 'từkhóatest' })).ok, false);
  assert.equal((await admin('/schedule', 'PUT', { bellSchedule: [{ time: '25:00', repeat: 'daily' }] })).status, 400);
  assert.equal((await admin('/schedule', 'PUT', { bellSchedule: [{ time: '9:05', repeat: 'daily', message: 'x' }] })).status, 200);

  const kicked = once(a.s, 'kicked');
  const me = (await (await admin('/state')).json()).online.find((p) => p.name === 'Ngoan');
  assert.equal((await (await admin('/kick', 'POST', { playerId: me.playerId })).json()).ok, true);
  await kicked;
  const back = await join('Ngoan', a.res.playerId);
  assert.equal(back.res.ok, false, 'vừa bị kích thì chưa vào lại ngay');
  back.s.disconnect();
});

test('vẫy tay và emoji tới đúng người, chặn dữ liệu rác', async () => {
  const a = await join('Vẫy');
  const b = await join('Được vẫy');
  const waved = once(b.s, 'wave');
  assert.equal((await call(a.s, 'wave', { to: b.res.sid })).ok, true);
  const w = await waved;
  assert.deepEqual([w.from, w.to, w.name], [a.res.sid, b.res.sid, 'Vẫy']);
  assert.equal((await call(a.s, 'wave', { to: a.res.sid })).ok, false, 'không tự vẫy mình');
  assert.equal((await call(b.s, 'wave', { to: 99999 })).ok, false);

  const em = once(b.s, 'emoji');
  assert.equal((await call(a.s, 'emoji', { i: 2 })).ok, true);
  assert.equal((await em).i, 2);
  assert.equal((await call(b.s, 'emoji', { i: 99 })).ok, false);

  // Dữ liệu rác không được làm sập server.
  for (const junk of [null, 'x', 42, [], ['a', 'b', 'c', 'd'], [NaN, NaN, NaN, 0], { __proto__: null }]) {
    a.s.emit('move', junk);
    a.s.emit('chat', junk);
    a.s.emit('wish:create', junk);
    a.s.emit('action:start', junk);
  }
  assert.ok((await call(a.s, 'time:sync')).now > 0, 'server vẫn trả lời sau dữ liệu rác');
  a.s.disconnect();
  b.s.disconnect();
});

test('mở tab thứ hai: tab cũ nhường chỗ, không tạo người chơi trùng', async () => {
  const a = await join('Hai tab');
  const replaced = once(a.s, 'session:replaced');
  const b = await join('Hai tab', a.res.playerId);
  await replaced;
  assert.equal(b.res.sid, a.res.sid);
  assert.equal(b.res.name, 'Hai tab', 'không bị thêm số (2) vì cùng một người');
  b.s.disconnect();
});

test('voice: admitted near peers only; cleanup on tab replacement, disconnect and kick', async () => {
  const a = await join('Voice A');
  const b = await join('Voice B');
  const stranger = await connect();
  const enabled = (s) => call(s, 'voice:enable', { enabled: true });
  assert.equal((await enabled(stranger)).ok, false);
  assert.equal((await call(stranger, 'voice:signal', { to: a.res.sid })).ok, false);
  assert.equal((await enabled(a.s)).peers.length, 0);
  const near = once(a.s, 'voice:peers');
  const res = await enabled(b.s);
  const peers = await near;
  assert.equal(peers[0].sid, b.res.sid);
  const payload = { to: b.res.sid, token: peers[0].token, description: { type: 'offer', sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' } };
  const signal = once(b.s, 'voice:signal');
  assert.equal((await call(a.s, 'voice:signal', payload)).ok, true);
  assert.equal((await signal).from, a.res.sid);
  assert.equal(res.peers[0].token, peers[0].token);
  const noPeers = (p) => p.length === 0;
  const revoked = until(b.s, 'voice:peers', noPeers);
  const replacement = await join('Voice A tab 2', a.res.playerId);
  assert.deepEqual(await revoked, [], 'replaced session immediately loses voice');
  assert.equal((await call(replacement.s, 'voice:signal', payload)).ok, false);
  const again = await enabled(replacement.s);
  assert.equal(again.peers.length, 1);
  assert.notEqual(again.peers[0].token, peers[0].token);
  const disconnected = until(b.s, 'voice:peers', noPeers);
  replacement.s.disconnect();
  assert.deepEqual(await disconnected, []);
  const c = await join('Voice C');
  await enabled(c.s);
  const kicked = until(b.s, 'voice:peers', noPeers);
  await admin('/kick', 'POST', { playerId: c.res.playerId });
  assert.deepEqual(await kicked, []);
  b.s.disconnect(); stranger.disconnect();
});

test('đếm theo cửa sổ và lấy IP thật sau proxy', () => {
  const c = new WindowCounter(1000);
  assert.equal(c.take('a', 2, 0), true);
  assert.equal(c.take('a', 2, 10), true);
  assert.equal(c.take('a', 2, 20), false, 'vượt giới hạn trong cửa sổ');
  assert.equal(c.take('b', 2, 20), true, 'IP khác đếm riêng');
  assert.equal(c.take('a', 2, 1000), true, 'hết cửa sổ thì đếm lại');
  c.sweep(5000);
  assert.equal(c.map.size, 0, 'dọn mục đã hết hạn');

  const hs = { address: '127.0.0.1', headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } };
  assert.equal(clientIp(hs, true), '203.0.113.9', 'chỉ tin giá trị cuối do proxy ghi');
  assert.equal(clientIp(hs, false), '127.0.0.1', 'không bật trustProxy thì bỏ qua header giả');
  assert.equal(clientIp({ address: '127.0.0.1', headers: {} }, true), '127.0.0.1');
});

test('giới hạn khi mở ra internet: theo IP, phòng đầy, tổng lời ước', async () => {
  // Server riêng với giới hạn nhỏ, chạy như sau Funnel.
  const cfg2 = path.join(dir, 'limits.json');
  fs.writeFileSync(cfg2, JSON.stringify({ ...example, newPlayersPerMinute: 2, maxPlayers: 3, wishesPerDayTotal: 1 }));
  const port2 = PORT + 1;
  const proc = await startServer({ PORT: String(port2), HTH_CONFIG: cfg2, DB_PATH: path.join(dir, 'limits.db'), TRUST_PROXY: '1' });
  const open = [];
  const enter = async (ip, name, playerId) => {
    const s = io(`http://127.0.0.1:${port2}`, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { 'x-forwarded-for': ip } });
    open.push(s);
    await new Promise((resolve) => s.on('connect', resolve));
    return { s, res: await call(s, 'hello', { name, color: 0, hat: 0, playerId }) };
  };
  try {
    const a = await enter('203.0.113.1', 'A1');
    assert.equal(a.res.ok, true);
    assert.equal((await enter('203.0.113.1', 'A2')).res.ok, true);
    const blocked = await enter('203.0.113.1', 'A3');
    assert.equal(blocked.res.ok, false, 'IP thứ nhất đã hết lượt');
    // Tự sửa phần đầu header không qua được giới hạn.
    assert.equal((await enter('1.2.3.4, 203.0.113.1', 'A4')).res.ok, false);

    assert.equal((await enter('203.0.113.2', 'B1')).res.ok, true, 'IP khác vẫn vào được');
    const full = await enter('203.0.113.3', 'C1');
    assert.equal(full.res.ok, false);
    assert.match(full.res.error, /đông/, 'phòng đầy');

    // Người đang online kết nối lại không bị chặn dù phòng đầy và IP hết lượt.
    const again = await enter('203.0.113.1', 'A1', a.res.playerId);
    assert.equal(again.res.ok, true);
    assert.equal(again.res.resumed, true);

    assert.equal((await call(again.s, 'wish:create', { text: 'Một', place: 'tree' })).ok, true);
    const second = await call(again.s, 'wish:create', { text: 'Hai', place: 'tree' });
    assert.equal(second.ok, false, 'hết tổng lời ước trong ngày');
  } finally {
    open.forEach((s) => s.disconnect());
    await stopServer(proc);
  }
});

test('hello lặp trên một kết nối không tạo được người chơi ma, không khoá được phòng', async () => {
  await withServer({ maxPlayers: 5 }, async ({ connectAs }) => {
    const attacker = await connectAs('198.51.100.1');
    const first = await call(attacker, 'hello', { name: 'Kẻ phá' });
    assert.equal(first.ok, true);
    for (let i = 0; i < 20; i++) {
      assert.equal((await call(attacker, 'hello', { name: `Ma ${i}` })).ok, false);
    }
    const victim = await connectAs('203.0.113.7');
    const res = await call(victim, 'hello', { name: 'Nhân viên thật' });
    assert.equal(res.ok, true, 'phòng không bị lấp');
    assert.equal(res.snapshot.online, 2);
  });
});

test('một IP không chiếm hết kết nối, kết nối rảnh bị ngắt', async () => {
  await withServer({ maxConnectionsPerIp: 3, helloTimeoutMs: 700 }, async ({ connectAs }) => {
    const idle = [];
    for (let i = 0; i < 3; i++) idle.push(await connectAs('198.51.100.2'));
    await assert.rejects(connectAs('198.51.100.2'), 'kết nối thứ tư từ cùng IP phải bị từ chối');
    // Tự sửa phần đầu header không lách được: chỉ giá trị cuối do proxy ghi mới tính.
    await assert.rejects(connectAs('1.2.3.4, 198.51.100.2'));
    const other = await connectAs('203.0.113.8');
    assert.ok(other.connected, 'IP khác vẫn vào được');

    // Không hello thì bị ngắt, và chỗ được trả lại.
    await new Promise((r) => setTimeout(r, 1200));
    assert.equal(idle.some((s) => s.connected), false, 'kết nối rảnh đã bị ngắt');
    await new Promise((r) => setTimeout(r, 100));
    const again = await connectAs('198.51.100.2');
    assert.ok(again.connected, 'hết kết nối rảnh thì IP lại vào được');
  });
});

test('dội sự kiện: phần vượt bị bỏ, dội quá mạnh thì bị ngắt, tin phát lại bị giới hạn', async () => {
  await withServer({}, async ({ connectAs }) => {
    const a = await connectAs('198.51.100.3');
    assert.equal((await call(a, 'hello', { name: 'Dội' })).ok, true);
    a.emit('move', [0, -15.5, 0, 0]);
    await new Promise((r) => setTimeout(r, 100));
    const viewer = await connectAs('198.51.100.4');
    assert.equal((await call(viewer, 'hello', { name: 'Xem' })).ok, true);
    let got = 0;
    viewer.on('meditation:mats', () => got++);
    for (let round = 0; round < 15; round++) {
      a.emit('action:start', { kind: 'meditate', mat: 0 });
      a.emit('action:stop');
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(got <= 12, `ngồi xuống/đứng lên liên tục chỉ được phát hạn chế, nhận ${got} tin`);
    assert.ok(a.connected, 'tốc độ thường thì không bị ngắt');

    const closed = new Promise((r) => a.once('disconnect', r));
    for (let i = 0; i < 400; i++) a.emit('time:sync');
    await closed;
    assert.equal(a.connected, false, 'dội quá mạnh bị ngắt');
    assert.ok((await call(viewer, 'time:sync')).now > 0, 'người khác không bị ảnh hưởng');
  });
});

test('tạo rồi xoá liên tục không làm hết chỗ lời ước của cả công ty', async () => {
  await withServer({ wishesPerDayTotal: 2, wishesPerIpPerDay: 4 }, async ({ connectAs }) => {
    const a = await connectAs('198.51.100.40');
    await call(a, 'hello', { name: 'Xoá hoài' });
    for (let i = 0; i < 4; i++) {
      const w = await call(a, 'wish:create', { text: `lần ${i}`, place: 'tree' });
      assert.equal(w.ok, true);
      assert.equal((await call(a, 'wish:delete', { id: w.id })).ok, true);
    }
    assert.equal((await call(a, 'wish:create', { text: 'nữa', place: 'tree' })).ok, false, 'hết lượt của IP này');
    const b = await connectAs('203.0.113.40');
    await call(b, 'hello', { name: 'Người thật' });
    assert.equal((await call(b, 'wish:create', { text: 'Bình an', place: 'tree' })).ok, true, 'người khác vẫn ước được');
  });
});

test('đổi HH:MM theo múi giờ Việt Nam ra đúng thời điểm', () => {
  // 17:30 ngày 06/11/2026 giờ Việt Nam (UTC+7) là 10:30 UTC.
  assert.equal(zonedToTs('2026-11-06', '17:30', 'Asia/Ho_Chi_Minh'), Date.UTC(2026, 10, 6, 10, 30));
  // 00:30 giờ Việt Nam vẫn thuộc ngày mới dù UTC còn ở ngày trước.
  assert.equal(localDate(Date.UTC(2026, 10, 5, 17, 30), 'Asia/Ho_Chi_Minh'), '2026-11-06');
});

test('lịch chuông: tới gần giờ hẹn thì tự thông báo, đúng mốc thời gian', async () => {
  const a = await join('Chờ chuông');
  // Hẹn phút kế tiếp: đã nằm trong cửa sổ 2 phút nên phải thông báo ngay ở nhịp kiểm tra sau.
  const tz = 'Asia/Ho_Chi_Minh';
  const next = Date.now() + 60_000;
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(next);
  const announced = once(a.s, 'bell:event');
  const res = await admin('/schedule', 'PUT', { bellSchedule: [{ time: hm, repeat: 'daily', message: '{time} cả nhà cùng thỉnh chuông' }] });
  assert.equal(res.status, 200);
  const e = await announced;
  assert.equal(e.phase, 'announce');
  assert.equal(e.at, zonedToTs(localDate(next, tz), hm, tz));
  assert.equal(e.message, `${hm} cả nhà cùng thỉnh chuông`);
  assert.ok(e.at > Date.now() && e.at - Date.now() <= 120_000);
  // Người vào muộn vẫn nhận được đếm ngược trong snapshot.
  const late = await join('Vào muộn');
  assert.equal(late.res.snapshot.bellEvent.at, e.at);
  a.s.disconnect();
  late.s.disconnect();
});

test('kết nối lại trong 10 giây giữ nguyên người chơi, không tính thêm lượt', async () => {
  const a = await join('Mạng yếu');
  const before = a.res.snapshot.visitsToday;
  const sid = a.res.sid;
  const pid = a.res.playerId;
  a.s.disconnect();
  await new Promise((r) => setTimeout(r, 200));
  const again = await join('Mạng yếu', pid);
  assert.equal(again.res.resumed, true);
  assert.equal(again.res.sid, sid);
  assert.equal(again.res.name, 'Mạng yếu');
  assert.equal(again.res.snapshot.visitsToday, before);
  again.s.disconnect();
});
