// Trạm giao thương: mời, đặt đề nghị, chốt theo rev, đổi đồ + TEU trong transaction, dữ liệu giả mạo, rời trạm, ngắt kết nối.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Trade } from '../server/trade.js';
import { TRADE_POST } from '../shared/layout.js';
import { LOOK_DEFAULT } from '../shared/shop.js';
import { TRADE, readOffer } from '../shared/trade.js';

const DATE = '2026-11-13';
const config = { timezone: 'Asia/Ho_Chi_Minh' };

function fixture() {
  const db = new Db(':memory:');
  const trade = new Trade({ db, config });
  const players = new Map();
  const looks = [];
  trade.onLook = (p, look) => looks.push([p.sid, look]);
  const make = (sid, name) => {
    const pid = String(sid).repeat(32).slice(0, 32);
    db.touchPlayer({ id: pid, name, color: 0, hat: 7, now: Date.now(), isVisit: true });
    const events = [];
    const p = { sid, pid, name, x: TRADE_POST.x, z: TRADE_POST.z + 1.5, ...LOOK_DEFAULT, socket: { emit: (e, d) => events.push([e, d]) }, events };
    players.set(sid, p);
    return p;
  };
  trade.bind(players);
  const a = make(1, 'An');
  const b = make(2, 'Bình');
  const last = (p, name) => [...p.events].reverse().find(([e]) => e === name)?.[1];
  // Bỏ qua giới hạn nhịp để test chạy liền mạch.
  const offer = (p, data) => {
    p.lastTradeOffer = 0;
    return trade.offer(p, data);
  };
  return { db, trade, players, make, a, b, last, offer, looks };
}

function open(f) {
  assert.equal(f.trade.invite(f.a, { to: f.b.sid }).ok, true);
  assert.deepEqual(f.last(f.b, 'trade:invite'), { from: 1, name: 'An', ttl: TRADE.inviteMs });
  assert.equal(f.trade.respond(f.b, { from: f.a.sid, accept: true }).ok, true);
  assert.ok(f.a.trade && f.a.trade === f.b.trade);
}

test('readOffer: chuẩn hoá và chặn dữ liệu sai hình thức', () => {
  assert.deepEqual(readOffer({ items: ['hat:9', 'effect:11', 'hat:9'], teu: 5 }), { items: ['effect:11', 'hat:9'], teu: 5 });
  assert.deepEqual(readOffer({}), { items: [], teu: 0 });
  for (const bad of [{ items: 'hat:9' }, { items: ['color:0'] }, { items: ['admin:1'] }, { items: [{}] }, { teu: -1 }, { teu: 1.5 }, { teu: 1000 }, { teu: '5' },
    { items: ['hat:6', 'hat:8', 'hat:9', 'hat:10', 'hair:3', 'hair:4', 'hair:5'] }]) {
    assert.ok(readOffer(bad).error, JSON.stringify(bad));
  }
});

test('đổi đồ lấy TEU: chốt đúng rev, chuyển sở hữu và TEU, cởi món đã cho, bảng tuần không tính', () => {
  const f = fixture();
  const { db, trade, a, b } = f;
  db.addTeu(a.pid, 200, 'fish', DATE);
  db.shop.buy(a.pid, 'effect:11', 80, DATE);
  db.addTeu(b.pid, 100, 'fish', DATE);
  a.effect = 11; // An đang mặc Kim long.
  open(f);

  assert.equal(f.offer(a, { items: ['effect:11'] }).ok, true);
  assert.equal(f.offer(b, { teu: 60 }).ok, true);
  const view = f.last(a, 'trade:state');
  assert.deepEqual(view.them, { sid: 2, name: 'Bình', items: [], teu: 60, ready: false });
  assert.equal(JSON.stringify(a.events).includes(b.pid), false, 'không lộ playerId của đối phương');

  // Chốt với rev cũ bị từ chối; chốt một bên chưa đổi gì.
  assert.equal(trade.ready(a, { rev: view.rev - 1 }).ok, false);
  assert.equal(trade.ready(a, { rev: view.rev }).ok, true);
  assert.equal(f.last(b, 'trade:state').them.ready, true);
  // Bình đổi đề nghị: cả hai mất chốt, rev tăng.
  assert.equal(f.offer(b, { teu: 50 }).ok, true);
  const v2 = f.last(b, 'trade:state');
  assert.ok(v2.rev > view.rev);
  assert.equal(v2.them.ready, false);
  assert.equal(trade.ready(b, { rev: v2.rev }).ok, true);
  const done = trade.ready(a, { rev: v2.rev });
  assert.deepEqual(done, { ok: true, done: true });

  assert.ok(!db.shop.owned(a.pid).has('effect:11'));
  assert.ok(db.shop.owned(b.pid).has('effect:11'));
  assert.equal(db.shop.teu(a.pid), 120 + 50);
  assert.equal(db.shop.teu(b.pid), 50);
  assert.equal(a.trade, null);
  assert.equal(b.trade, null);
  const resA = f.last(a, 'trade:done');
  assert.deepEqual([resA.partner, resA.teu, resA.look.effect, resA.got.teu], ['Bình', 170, LOOK_DEFAULT.effect, 50]);
  assert.equal(a.effect, LOOK_DEFAULT.effect, 'cho đi món đang mặc thì rớt về mặc định');
  assert.deepEqual(f.looks.map(([sid]) => sid), [1]);
  assert.equal(db.playerRow(a.pid).effect, LOOK_DEFAULT.effect);
  assert.ok(f.last(b, 'trade:done').owned.includes('effect:11'));
  // Bảng tuần: chỉ TEU kiếm được, không tính TEU chuyển tay.
  const week = Object.fromEntries(db.weekly('2026-11-09').teu.map((r) => [r.name, r.teu]));
  assert.deepEqual(week, { An: 200, 'Bình': 100 });
  db.close();
});

test('dữ liệu giả mạo: món không có, món bên kia đã có, TEU không đủ, chốt khi trống, không ở trạm', () => {
  const f = fixture();
  const { db, trade, a, b, make } = f;
  db.addTeu(a.pid, 30, 'fish', DATE);
  db.shop.buy(a.pid, 'hat:9', 30, DATE);
  db.addTeu(b.pid, 40, 'fish', DATE);
  db.shop.buy(b.pid, 'hair:3', 15, DATE);

  const far = make(3, 'Xa');
  far.x = 0;
  far.z = 0;
  assert.equal(trade.invite(a, { to: far.sid }).ok, false, 'người được mời không ở trạm');
  assert.equal(trade.invite(a, { to: a.sid }).ok, false, 'không tự mời mình');
  assert.equal(trade.invite(a, { to: 999 }).ok, false);
  assert.equal(trade.offer(a, { items: ['hat:9'] }).ok, false, 'chưa có phiên');
  assert.equal(trade.respond(b, { from: a.sid, accept: true }).ok, false, 'không có lời mời');
  open(f);

  assert.match(f.offer(a, { items: ['effect:11'] }).error, /không có/);
  assert.match(f.offer(a, { teu: 1 }).error, /Không đủ TEU/);
  assert.match(f.offer(b, { teu: 26 }).error, /Không đủ TEU/);
  assert.equal(trade.ready(a, { rev: a.trade.rev }).ok, false, 'chưa ai đặt gì');

  // Bình mua Kim quan khi đang giao dịch: An không đặt được nữa vì Bình đã có.
  db.addTeu(b.pid, 35, 'fish', DATE);
  db.shop.buy(b.pid, 'hat:9', 35, DATE);
  assert.match(f.offer(a, { items: ['hat:9'] }).error, /đã có/);

  // Đặt xong rồi tiêu hết TEU trước khi chốt: transaction huỷ cả lượt, không ai mất gì.
  assert.equal(f.offer(b, { items: ['hair:3'], teu: 25 }).ok, true);
  db.shop.buy(b.pid, 'hat:10', 25, DATE);
  const rev = b.trade.rev;
  assert.equal(trade.ready(a, { rev }).ok, true);
  const fail = trade.ready(b, { rev });
  assert.equal(fail.ok, false);
  assert.match(fail.error, /không còn đủ TEU/);
  assert.ok(db.shop.owned(b.pid).has('hair:3'), 'đồ vẫn ở chỗ cũ');
  assert.ok(!db.shop.owned(a.pid).has('hair:3'));
  assert.ok(a.trade, 'phiên còn mở, cả hai mất chốt');
  assert.equal(f.last(a, 'trade:state').them.ready, false);
  assert.ok(f.last(a, 'trade:state').rev > rev);
  db.close();
});

test('từ chối, hết hạn lời mời, rời trạm, hết giờ, ngắt kết nối giữa chừng', () => {
  const f = fixture();
  const { trade, a, b, make } = f;
  assert.equal(trade.invite(a, { to: b.sid }).ok, true);
  assert.equal(trade.respond(b, { from: a.sid, accept: false }).ok, true);
  assert.deepEqual(f.last(a, 'trade:declined'), { sid: 2, name: 'Bình' });
  assert.equal(trade.respond(b, { from: a.sid, accept: true }).ok, false, 'lời mời đã dùng');

  a.lastTradeInvite = 0;
  trade.invite(a, { to: b.sid });
  trade.sweep(Date.now() + TRADE.inviteMs + 1);
  assert.equal(trade.respond(b, { from: a.sid, accept: true }).ok, false, 'lời mời hết hạn');

  // Đang giao dịch: người thứ ba không mời được.
  a.lastTradeInvite = 0;
  open(f);
  const c = make(3, 'Chi');
  assert.match(trade.invite(c, { to: a.sid }).error, /đang giao dịch/);

  // Đi khỏi trạm quá xa: huỷ phiên, báo cả hai.
  a.z = TRADE_POST.z + TRADE_POST.radius + TRADE.leaveMargin + 1;
  trade.sweep();
  assert.equal(a.trade, null);
  assert.match(f.last(b, 'trade:closed').reason, /An đã rời trạm/);

  // Bỏ dở quá lâu: tự huỷ.
  a.z = TRADE_POST.z + 1;
  a.lastTradeInvite = 0;
  open(f);
  trade.sweep(Date.now() + TRADE.idleMs + 1);
  assert.equal(b.trade, null);
  assert.match(f.last(a, 'trade:closed').reason, /hết giờ/);

  // Ngắt kết nối giữa chừng: Room gọi leave, đối phương được báo ngay.
  a.lastTradeInvite = 0;
  open(f);
  trade.leave(b);
  assert.equal(a.trade, null);
  assert.match(f.last(a, 'trade:closed').reason, /Bình đã rời đi/);

  // Huỷ chủ động.
  a.lastTradeInvite = 0;
  open(f);
  assert.equal(trade.cancel(b).ok, true);
  assert.equal(a.trade, null);
  assert.match(f.last(a, 'trade:closed').reason, /Bình đã huỷ/);
  f.db.close();
});
