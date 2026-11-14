// Cửa hàng và tủ đồ ở tầng dữ liệu: mua bằng TEU, không âm điểm, di trú đồ cũ, kiểm tra bộ đồ gửi lên.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { Db } from '../server/db.js';
import { Shop } from '../server/shop.js';
import { LOOK_DEFAULT, SHOP_PRICES, SHOP_REQUIREMENTS, canWear, isTradable, meetsRequirement, parseItemId, sanitizeLook } from '../shared/shop.js';
import { FISH } from '../shared/fish.js';
import { AVATAR } from '../shared/protocol.js';

const PID = 'a'.repeat(32);
const DATE = '2026-11-12';
const config = { timezone: 'Asia/Ho_Chi_Minh' };

function freshDb() {
  const db = new Db(':memory:');
  db.touchPlayer({ id: PID, name: 'Khách', color: 0, hat: 7, now: Date.now(), isVisit: true });
  return db;
}

const player = () => ({ pid: PID, lastBuy: 0, lastLook: 0 });

test('danh mục: id hợp lệ, nằm trong phạm vi, giá dương', () => {
  const counts = { color: AVATAR.colors, hair: AVATAR.hairs, hat: AVATAR.hats, attire: AVATAR.attires, weapon: AVATAR.weapons, effect: AVATAR.effects };
  for (const [id, price] of Object.entries(SHOP_PRICES)) {
    const parsed = parseItemId(id);
    assert.ok(parsed, `id sai: ${id}`);
    assert.ok(parsed.index < counts[parsed.slot], `ngoài phạm vi: ${id}`);
    assert.ok(Number.isInteger(price) && price > 0, `giá sai: ${id}`);
  }
  // Mặc định luôn miễn phí để người chưa mua gì vẫn có đồ mặc.
  for (const [slot, index] of Object.entries(LOOK_DEFAULT)) assert.ok(canWear(new Set(), slot, index), `${slot} mặc định phải miễn phí`);
  assert.equal(parseItemId('effect:1e3'), null);
  assert.equal(parseItemId('admin:1'), null);
  assert.equal(parseItemId({}), null);
});

test('sanitizeLook: món chưa sở hữu rớt về mặc định của đúng slot', () => {
  const look = { color: 9, hair: 5, hat: 9, attire: 7, weapon: 3, effect: 11 };
  assert.deepEqual(sanitizeLook(look, new Set()), LOOK_DEFAULT);
  assert.deepEqual(sanitizeLook(look, new Set(['effect:11', 'weapon:3'])), { ...LOOK_DEFAULT, weapon: 3, effect: 11 });
});

test('mua: trừ TEU trong transaction, không âm, mua lại không trừ, bảng tuần không bị trừ', () => {
  const db = freshDb();
  const shop = new Shop({ db, config });
  const seen = [];
  db.onTeu = (pid, teu) => seen.push([pid, teu]);
  db.addTeu(PID, 70, 'fish', DATE);
  assert.deepEqual(seen, [[PID, 70]], 'kiếm được TEU thì đẩy ví');

  const poor = shop.buy(player(), { item: 'effect:11' });
  assert.equal(poor.ok, false);
  assert.match(poor.error, /thiếu 10 TEU/);
  assert.equal(db.shop.teu(PID), 70);
  assert.equal(db.shop.owned(PID).size, 0, 'thiếu tiền thì không được sở hữu');

  const ok = shop.buy(player(), { item: 'effect:9' });
  assert.deepEqual([ok.ok, ok.teu], [true, 10]);
  assert.ok(db.shop.owned(PID).has('effect:9'));

  const again = shop.buy(player(), { item: 'effect:9' });
  assert.deepEqual([again.ok, again.already, again.teu], [true, true, 10]);

  for (const item of ['effect:1', 'effect:99', 'effect:-1', '', null, 'color:0']) {
    assert.equal(shop.buy(player(), { item }).ok, false, `không bán: ${item}`);
  }
  // Bảng tuần chỉ tính TEU kiếm được, không trừ phần đã tiêu.
  assert.equal(db.weekly('2026-11-09').teu[0].teu, 70);
  db.close();
});

test('hào quang chí tôn: có giá, không trao đổi được, điều kiện đọc từ tiến độ', () => {
  assert.deepEqual(Object.keys(SHOP_REQUIREMENTS).sort(), ['effect:13', 'effect:14']);
  for (const [id, req] of Object.entries(SHOP_REQUIREMENTS)) {
    assert.equal(SHOP_PRICES[id], 888, `giá ${id}`);
    assert.equal(isTradable(id), false);
    assert.ok(req.need > 0 && req.label && req.unit);
    assert.equal(meetsRequirement(id, null), false, 'chưa có tiến độ thì chưa đủ');
    assert.equal(meetsRequirement(id, { [req.stat]: req.need }), true);
    assert.equal(meetsRequirement(id, { [req.stat]: '9999abc' }), false, 'số liệu rác không tính');
  }
  assert.equal(SHOP_REQUIREMENTS['effect:14'].need, FISH.length, 'Vua câu cá cần đủ Sổ cá');
  assert.equal(isTradable('effect:11'), true);
  assert.equal(meetsRequirement('effect:11', null), true, 'món thường không có điều kiện');
});

test('hào quang chí tôn: đủ TEU mà chưa đủ thành tích thì không bán; máy gạt không tính; đủ rồi mới trừ TEU', () => {
  const db = freshDb();
  const shop = new Shop({ db, config });
  db.addTeu(PID, 2000, 'fish', DATE);
  assert.deepEqual(shop.status(player()), { ok: true, progress: { tableWins: 0, fishSpecies: 0 } });

  const locked = shop.buy(player(), { item: 'effect:13' });
  assert.equal(locked.ok, false);
  assert.match(locked.error, /Chưa đủ điều kiện.*0\/100/);
  assert.equal(db.shop.teu(PID), 2000, 'chưa đủ điều kiện thì không trừ TEU');
  assert.equal(db.shop.owned(PID).has('effect:13'), false);

  // Ván thắng máy gạt cần, tiền cược, tiền hoàn đều không tính; chỉ "<bàn>:win".
  for (let i = 0; i < 50; i++) db.addTeu(PID, 1, 'slot:win', DATE);
  db.addTeu(PID, 5, 'baucua:return', DATE);
  db.addTeu(PID, -5, 'baucua:bet', DATE);
  for (let i = 0; i < 99; i++) db.addTeu(PID, 1, i % 2 ? 'baucua:win' : 'xidach:win', DATE);
  const almost = shop.buy(player(), { item: 'effect:13' });
  assert.equal(almost.ok, false);
  assert.match(almost.error, /99\/100/);
  assert.equal(almost.progress.tableWins, 99);

  db.addTeu(PID, 1, 'taixiu:win', DATE);
  const before = db.shop.teu(PID);
  const won = shop.buy(player(), { item: 'effect:13' });
  assert.deepEqual([won.ok, won.teu], [true, before - 888]);
  assert.ok(db.shop.owned(PID).has('effect:13'));
  assert.equal(shop.buy(player(), { item: 'effect:13' }).already, true, 'mua lại báo đã có, không trừ');

  // Vua câu cá: thiếu một loài là chưa bán, loài lạ (không có trong FISH) không tính.
  FISH.slice(0, -1).forEach((f, i) => db.fishCatch(PID, f.id, f.minW, 'good', DATE, Date.now() + i));
  db.fishCatch(PID, 'ca_khong_co_that', 1, 'good', DATE);
  const missing = shop.buy(player(), { item: 'effect:14' });
  assert.equal(missing.ok, false);
  assert.match(missing.error, new RegExp(`${FISH.length - 1}/${FISH.length}`));
  db.fishCatch(PID, FISH.at(-1).id, FISH.at(-1).minW, 'good', DATE);
  const king = shop.buy(player(), { item: 'effect:14' });
  assert.equal(king.ok, true);
  assert.deepEqual(shop.status(player()).progress, { tableWins: 100, fishSpecies: FISH.length });

  // Đã có thì mặc được, như mọi món đã mua.
  assert.deepEqual(shop.readLook(PID, { ...LOOK_DEFAULT, effect: 14 }), { look: { ...LOOK_DEFAULT, effect: 14 } });
  db.close();
});

test('mua dồn dập: chặn theo nhịp, không trừ hai lần', () => {
  const db = freshDb();
  const shop = new Shop({ db, config });
  db.addTeu(PID, 200, 'fish', DATE);
  const p = player();
  assert.equal(shop.buy(p, { item: 'hat:9' }).ok, true);
  assert.equal(shop.buy(p, { item: 'hat:8' }).ok, false, 'bấm liên tục bị chặn');
  assert.equal(db.shop.teu(PID), 200 - SHOP_PRICES['hat:9']);
  db.close();
});

test('tủ đồ: chỉ mặc món đã có, dữ liệu rác bị từ chối, lưu vào DB', () => {
  const db = freshDb();
  const shop = new Shop({ db, config });
  const look = { color: 1, hair: 1, hat: 4, attire: 1, weapon: 1, effect: 2 };
  assert.deepEqual(shop.setLook(player(), look).look, look);
  assert.equal(db.playerRow(PID).effect, 2);

  assert.match(shop.setLook(player(), { ...look, effect: 11 }).error, /chưa có/);
  assert.match(shop.setLook(player(), { ...look, weapon: 'kiếm' }).error, /không có thật/);
  assert.match(shop.setLook(player(), { ...look, hat: 99 }).error, /không có thật/);
  assert.match(shop.setLook(player(), null).error, /không có thật/);

  const p = player();
  assert.ok(shop.setLook(p, look).look);
  assert.match(shop.setLook(p, look).error, /chậm lại/, 'thay đồ liên tục bị chặn');
  db.close();
});

test('di trú một lần: màu đã mở và món trả phí đang mặc được giữ, chạy lại không cấp thêm', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-shop-'));
  const file = path.join(dir, 'old.db');
  try {
    // Giả lập DB bản cũ: người chơi đang mặc Kim long + Băng quyền, đã mở màu quý thứ 2 bằng bitmask.
    const old = new Db(file);
    old.touchPlayer({ id: PID, name: 'Người cũ', color: 0, hat: 6, attire: 1, weapon: 3, effect: 11, now: Date.now(), isVisit: true });
    old.close();
    const raw = new Database(file);
    raw.prepare('UPDATE players SET unlocked=2').run();
    raw.prepare('DELETE FROM owned_items').run();
    raw.pragma('user_version = 0');
    raw.close();

    const db = new Db(file);
    assert.deepEqual([...db.shop.owned(PID)].sort(), ['color:5', 'effect:11', 'hat:6', 'weapon:3']);
    // Đổi sang món khác rồi mở lại DB: không di trú lần hai.
    db.shop.saveLook(PID, { color: 0, hair: 0, hat: 7, attire: 0, weapon: 0, effect: 12 });
    db.close();
    const again = new Db(file);
    assert.equal(again.shop.owned(PID).has('effect:12'), false);
    again.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
