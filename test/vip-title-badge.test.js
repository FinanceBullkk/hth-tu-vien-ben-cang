// Huy hiệu danh hiệu chí tôn và khung bảng tên: SVG đúng cấu trúc, chỉ dành cho hai danh hiệu chí tôn,
// không có script hay tài nguyên ngoài, URL dữ liệu an toàn khi đặt trong url("...") của CSS.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleBadgeSvg, nameFrameSvg, nameFrameCss } from '../client/src/player/vip-title-badge.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';

// Kiểm tra thẻ mở/đóng cân bằng (đủ để bắt lỗi ghép chuỗi SVG).
function assertBalanced(svg) {
  const stack = [];
  for (const [, close, name, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (selfClose) continue;
    if (!close) stack.push(name);
    else assert.equal(stack.pop(), name, `thẻ đóng </${name}> lệch`);
  }
  assert.deepEqual(stack, [], 'còn thẻ chưa đóng');
}

const BOARDS = AURA_TITLES.filter(t => t.board);

test('chỉ hai danh hiệu chí tôn có bảng tên riêng', () => {
  assert.deepEqual(BOARDS.map(t => t.board), ['than-bai', 'vua-cau-ca']);
  assert.ok(BOARDS.every(t => t.vip));
});

test('huy hiệu: SVG cân bằng, có chữ danh hiệu, vàng đúc và ngọc; không script, không tải ngoài', () => {
  for (const { board, title } of BOARDS) {
    const svg = titleBadgeSvg(board, title.toUpperCase());
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assertBalanced(svg);
    assert.ok(svg.includes(`>${title.toUpperCase()}</text>`), board);
    assert.match(svg, /feSpecularLighting/);
    assert.match(svg, /url\(#gem\)/);
    assert.doesNotMatch(svg, /<script|href=|\son[a-z]+=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
  }
  assert.match(titleBadgeSvg('than-bai', 'THẦN BÀI'), />A<\/text>/, 'quạt bài có lá A');
  assert.match(titleBadgeSvg('vua-cau-ca', 'VUA CÂU CÁ'), /url\(#fin\)/, 'cá chép có vây ngọc lam');
});

test('khung bảng tên: SVG 120×32 cân bằng, có ngọc hai đầu', () => {
  for (const { board } of BOARDS) {
    const svg = nameFrameSvg(board);
    assert.match(svg, /viewBox="0 0 120 32"/);
    assertBalanced(svg);
    assert.equal(svg.match(/fill="url\(#gem\)"/g).length, 2);
  }
});

test('bảng không tồn tại trả rỗng; URL CSS không phá được url("...")', () => {
  assert.equal(titleBadgeSvg('khong-co', 'X'), '');
  assert.equal(nameFrameSvg('khong-co'), '');
  assert.equal(nameFrameCss('khong-co'), '');
  for (const { board } of BOARDS) {
    const css = nameFrameCss(board);
    assert.match(css, /^url\("data:image\/svg\+xml;charset=utf-8,[^"'\s]+"\)$/);
    assert.equal(nameFrameCss(board), css, 'dùng lại bản đã mã hoá');
  }
});
