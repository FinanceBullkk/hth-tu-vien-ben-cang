// Cửa hàng và tủ đồ ở tầng dữ liệu: mua bằng TEU, không âm điểm, di trú đồ cũ, kiểm tra bộ đồ gửi lên.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { Db } from '../server/db.js';
import { Shop } from '../server/shop.js';
import { LOOK_DEFAULT, SHOP_PRICES, canWear, parseItemId, sanitizeLook } from '../shared/shop.js';
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
