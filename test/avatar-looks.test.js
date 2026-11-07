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

// Id look là số thứ tự lưu trong DB của người chơi: đổi tên hay đổi chỗ sẽ làm đồ cũ mất nghĩa.
test('tóc và mũ giữ nguyên id cũ, option mới nối tiếp', () => {
  // 3 id mũ đầu là id cũ trộn tóc vào mũ, chỉ còn để di trú người chơi cũ.
  assert.deepEqual(HAT_NAMES.slice(0, 3), ['Tóc ngắn', 'Tóc dài', 'Tóc búi']);
  assert.deepEqual(
    HAT_NAMES.slice(3, 7),
    ['Mũ lưỡi trai', 'Nón lá', 'Mũ bảo hộ', 'Đầu trụi băng mắt'],
  );
  assert.deepEqual(HAT_NAMES.slice(7), ['Không đội', 'Đạo quan', 'Kim quan', 'Nón lá màn sa']);
  assert.deepEqual(HAIR_NAMES.slice(0, 3), ['Tóc ngắn', 'Tóc dài', 'Tóc búi']);
  assert.deepEqual(HAIR_NAMES.slice(3), ['Búi trâm ngọc', 'Song loạn', 'Bạch phát']);
});
