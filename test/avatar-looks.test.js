import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AVATAR,
  SHIRT_COLORS,
  HAIR_NAMES,
  HAT_NAMES,
  ATTIRE_NAMES,
  WEAPON_NAMES,
  EFFECT_NAMES,
  PREMIUM_COLORS,
} from '../shared/protocol.js';

// Server clamp theo AVATAR.* còn UI chip hiển thị theo *_NAMES: lệch số là mất đồ hoặc chip ảo.
test('số lượng look khớp với danh sách tên hiển thị', () => {
  assert.equal(AVATAR.colors, SHIRT_COLORS.length);
  assert.equal(AVATAR.hairs, HAIR_NAMES.length);
  assert.equal(AVATAR.hats, HAT_NAMES.length);
  assert.equal(AVATAR.attires, ATTIRE_NAMES.length);
  assert.equal(AVATAR.weapons, WEAPON_NAMES.length);
  assert.equal(AVATAR.effects, EFFECT_NAMES.length);
});

// Tóc và mũ tách slot riêng: 6 id mũ đầu là id cũ trộn tóc, đã lưu trong DB của người chơi —
// đổi tên hay đổi chỗ sẽ làm kiểu tóc cũ mất nghĩa.
test('toc và mũ giữ nguyên id cũ, option mới nối tiếp', () => {
  assert.deepEqual(
    HAT_NAMES.slice(0, 6),
    ['Tóc ngắn', 'Tóc dài', 'Tóc búi', 'Mũ lưỡi trai', 'Nón lá', 'Mũ bảo hộ'],
  );
  assert.deepEqual(
    HAIR_NAMES.slice(0, 3),
    ['Tóc ngắn', 'Tóc dài', 'Tóc búi'],
  );
  assert.deepEqual(
    HAIR_NAMES.slice(3),
    ['Búi trâm ngọc', 'Song loạn', 'Bạch phát'],
  );
  assert.deepEqual(
    HAT_NAMES.slice(6),
    ['Đầu trụi băng mắt', 'Không đội', 'Đạo quan', 'Kim quan', 'Nón lá màn sa'],
  );
});

// Võ tăng bang thân (mắt xích main) ở số 3; 4 bộ quốc gia nối tiếp sau — đổi tên sẽ làm DB mất nghĩa.
test('bộ trang phục quốc gia nối sau Võ tăng, đủ 4 nước: Trung, Hàn, Nhật, Việt', () => {
  assert.equal(ATTIRE_NAMES[3], 'Võ tăng bang thân');
  assert.deepEqual(
    ATTIRE_NAMES.slice(4),
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
