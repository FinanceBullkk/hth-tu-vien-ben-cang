// Danh hiệu chí tôn kiểu MMO 2D: chỉ hai danh hiệu chí tôn có kiểu riêng; cấu trúc cánh, chữ hai lớp, sao;
// chữ lấy đúng danh hiệu qua textContent; cánh là SVG hằng số an toàn.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTitleBadge, TITLE_BOARDS } from '../client/src/player/vip-title-badge.js';
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

test('danh hiệu: cánh trái + chữ (viền dưới, chữ màu trên) + cánh phải + sao; board lạ không dựng gì', () => {
  globalThis.document = fakeDocument();
  try {
    assert.equal(createTitleBadge('khong-co', 'X'), null);
    for (const board of TITLE_BOARDS) {
      const root = createTitleBadge(board, 'Thần Bài');
      assert.equal(root.className, 'vtt');
      const [left, word, right, ...stars] = root.children;
      assert.equal(left.className, 'vtt-side l');
      assert.equal(right.className, 'vtt-side r');
      assert.equal(stars.length, 3);
      const [outline, text] = word.children;
      assert.equal(outline.attrs['aria-hidden'], 'true');
      assert.equal(text.className, 'vtt-text');
      assert.equal(text.textContent, 'Thần Bài');
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
