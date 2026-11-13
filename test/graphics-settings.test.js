import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GRAPHICS_MODES, LEVEL_LABELS, modeLevel, qualityFeatures, readGraphicsMode,
} from '../client/src/scene/graphics-settings.js';
import { renderPixelRatio } from '../client/src/scene/render-quality.js';

test('saved graphics mode falls back to auto when missing or tampered', () => {
  assert.equal(readGraphicsMode(null), 'auto');
  assert.equal(readGraphicsMode('ultra'), 'ultra');
  assert.equal(readGraphicsMode('ULTRA'), 'auto');
  assert.equal(readGraphicsMode('__proto__'), 'auto');
  assert.equal(readGraphicsMode(3), 'auto');
});

test('each fixed mode maps to one level, auto has none', () => {
  assert.equal(modeLevel('auto'), null);
  assert.deepEqual(['low', 'medium', 'high', 'ultra'].map(modeLevel), [0, 1, 2, 3]);
  assert.equal(modeLevel('nope'), null);
  for (const m of GRAPHICS_MODES) if (m.level !== undefined) assert.ok(LEVEL_LABELS[m.level]);
});

test('features grow with level and can be turned back on', () => {
  assert.deepEqual(qualityFeatures(0), { bloom: false, shadows: false, shadowSize: 1024 });
  assert.deepEqual(qualityFeatures(1), { bloom: false, shadows: true, shadowSize: 1024 });
  assert.deepEqual(qualityFeatures(2), { bloom: true, shadows: true, shadowSize: 2048 });
  assert.deepEqual(qualityFeatures(3), { bloom: true, shadows: true, shadowSize: 4096 });
  // Mobile giữ bóng nhỏ hơn một bậc như trước.
  assert.equal(qualityFeatures(2, true).shadowSize, 1024);
  assert.equal(qualityFeatures(3, true).shadowSize, 2048);
});

test('ultra renders sharper than high but stays within 4K and 2x density', () => {
  for (const [width, height, dpr] of [[1920, 1080, 1], [1920, 1080, 1.25], [1536, 864, 1.25], [2560, 1440, 1], [1920, 1080, 2], [3840, 2160, 2]]) {
    const high = renderPixelRatio(width, height, dpr, 2);
    const ultra = renderPixelRatio(width, height, dpr, 3);
    assert.ok(ultra >= high);
    assert.ok(ultra <= Math.min(dpr, 2));
    assert.ok(width * height * ultra ** 2 <= 3840 * 2160 + 1);
  }
  // Màn 2K, hoặc 4K đặt scaling 150%: Cao chỉ vẽ 3/4 số điểm ảnh mỗi chiều nên mờ, Rất nét vẽ đúng màn hình.
  assert.equal(renderPixelRatio(2560, 1440, 1, 2), 0.75);
  assert.equal(renderPixelRatio(2560, 1440, 1, 3), 1);
  assert.equal(renderPixelRatio(2560, 1440, 1.5, 3), 1.5);
});
