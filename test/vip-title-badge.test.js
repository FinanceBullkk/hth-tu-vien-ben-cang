// Danh hiệu chí tôn kiểu Võ Lâm Chi Mộng: chỉ hai danh hiệu chí tôn có kiểu riêng; cấu trúc cánh, chữ hai lớp,
// sao, hiệu phụ có ô ấn; chữ lấy qua textContent; cánh là SVG hằng số an toàn.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTitleBadge, TITLE_BOARDS } from '../client/src/player/vip-title-badge.js';
import { sideOrnamentSvg } from '../client/src/player/vip-title-side-ornaments.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';

// DOM giả tối thiểu: đủ cho createElement, className, textContent, innerHTML, setAttribute, append.
function fakeDocument() {
  const make = tag => ({
    tag, className: '', textContent: '', innerHTML: '', attrs: {}, props: {}, children: [],
    style: { setProperty(k, v) { this.owner.props[k] = v; } },
    setAttribute(k, v) { this.attrs[k] = v; },
    append(...nodes) { this.children.push(...nodes); },
  });
  return { createElement(tag) { const node = make(tag); node.style.owner = node; return node; } };
}

test('chỉ hai danh hiệu chí tôn có kiểu riêng', () => {
  assert.deepEqual(AURA_TITLES.filter(t => t.board).map(t => t.board), TITLE_BOARDS);
  assert.ok(AURA_TITLES.filter(t => t.board).every(t => t.vip));
});

test('danh hiệu kiểu Võ Lâm Chi Mộng: cánh + chữ hai lớp + sao, rồi hiệu phụ có ô ấn; board lạ không dựng gì', () => {
  globalThis.document = fakeDocument();
  try {
    assert.equal(createTitleBadge('khong-co', 'X'), null);
    for (const board of TITLE_BOARDS) {
      const root = createTitleBadge(board, 'Thần Bài');
      assert.equal(root.className, 'vtt');
      const [art, epithet] = root.children;
      const [left, word, right, ...stars] = art.children;
      assert.equal(left.className, 'vtt-side l');
      assert.equal(right.className, 'vtt-side r');
      assert.equal(stars.length, 3);
      const [outline, text] = word.children;
      assert.equal(outline.attrs['aria-hidden'], 'true');
      assert.equal(text.className, 'vtt-text');
      assert.equal(text.textContent, 'Thần Bài');
      // Hiệu phụ: ô ấn chữ ngắn treo trái + dòng chữ.
      const [seal, line] = epithet.children;
      assert.equal(seal.className, 'vtt-seal');
      assert.ok(seal.textContent.length > 0 && seal.textContent.length <= 3);
      assert.ok(line.textContent.length > 0);
      // Cánh là SVG hằng số: không script, không tải ngoài; bên phải lật gương.
      for (const side of [left, right]) {
        assert.match(side.innerHTML, /^<svg class="vtt-wing"/);
        assert.doesNotMatch(side.innerHTML, /<script|href=|\son[a-z]+=|https?:/i);
      }
      assert.doesNotMatch(left.innerHTML, /scale\(-1 1\)/);
      assert.match(right.innerHTML, /scale\(-1 1\)/);
    }
  } finally {
    delete globalThis.document;
  }
});

test('trang trí hai bên kiểu khí kiếm hiệp đúng chủ đề, không viền đen dày kiểu đồ chơi', () => {
  const bai = sideOrnamentSvg('than-bai', false);
  assert.match(bai, /url\(#vtto-qi\)/, 'dải khí vàng');
  assert.equal((bai.match(/fill="url\(#vtto-cardglass\)"/g) ?? []).length, 3, 'ba lá bài nét vàng');
  const ca = sideOrnamentSvg('vua-cau-ca', false);
  assert.match(ca, /url\(#vtto-water\)/, 'dải nước');
  assert.match(ca, /class="vtto-bob"/, 'linh ngư nhấp nhô');
  for (const svg of [bai, ca]) assert.ok(!/stroke-width="[3-9]/.test(svg), 'không có viền dày');
  assert.equal(sideOrnamentSvg('khong-co', false), '');
});
