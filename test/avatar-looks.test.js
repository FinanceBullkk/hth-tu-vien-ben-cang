import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AVATAR,
  SHIRT_COLORS,
  HAT_NAMES,
  ATTIRE_NAMES,
  WEAPON_NAMES,
  EFFECT_NAMES,
  PREMIUM_COLORS,
} from '../shared/protocol.js';

// Server clamp theo AVATAR.* còn UI chip hiển thị theo *_NAMES: lệch số là mất đồ hoặc chip ảo.
test('số lượng look khớp với danh sách tên hiển thị', () => {
  assert.equal(AVATAR.colors, SHIRT_COLORS.length);
  assert.equal(AVATAR.hats, HAT_NAMES.length);
  assert.equal(AVATAR.attires, ATTIRE_NAMES.length);
  assert.equal(AVATAR.weapons, WEAPON_NAMES.length);
  assert.equal(AVATAR.effects, EFFECT_NAMES.length);
});

// 4 bộ mới từ 4 nước, nối tiếp 3 bộ cũ — đổi tên sẽ làm DB của người chơi mất nghĩa.
test('bộ trang phục mới đủ 4 nước: Trung, Hàn, Nhật, Việt', () => {
  assert.deepEqual(
    ATTIRE_NAMES.slice(3),
    ['Hán phục vân kiêm', 'Hàn phục đan thanh', 'Hòa phục hồng diệp', 'Áo dài quốc hương'],
  );
});

// 4 màu đầu miễn phí; màu quý phải khai báo đủ tên – giá và nằm trong SHIRT_COLORS
// để welcome.js và rooms.js tính premiumStart theo cùng một mảng.
test('4 màu cơ bản, màu quý khai báo đủ và giữ bit mở khoá cũ', () => {
  assert.equal(SHIRT_COLORS.length - PREMIUM_COLORS.length, 4);
  const hexes = PREMIUM_COLORS.map((p) => p.hex);
  assert.equal(new Set(hexes).size, hexes.length, 'màu quý không được trùng nhau');
  for (const p of PREMIUM_COLORS) {
    assert.ok(SHIRT_COLORS.includes(p.hex), `${p.name} phải nằm trong SHIRT_COLORS`);
    assert.ok(p.name.length > 0, 'màu quý phải có tên');
    assert.ok(Number.isInteger(p.price) && p.price > 0, `${p.name} phải có giá TEU`);
  }
  // Hai màu quý đầu không được đổi chỗ: người đã mở mất đúng màu cũ nếu lệch bit.
  assert.equal(PREMIUM_COLORS[0].name, 'Vàng kim');
  assert.equal(PREMIUM_COLORS[1].name, 'Lam ngọc');
  // Đen ngầu nằm cuối danh sách.
  assert.equal(PREMIUM_COLORS.at(-1).name, 'Huyền hắc');
});
