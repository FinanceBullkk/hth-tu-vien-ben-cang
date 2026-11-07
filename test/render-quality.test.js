import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdaptiveQuality, renderPixelRatio } from '../client/src/scene/render-quality.js';

test('render resolution stays within pixel budget on desktop, HiDPI and resize', () => {
  for (const [width, height, dpr] of [[1280, 720, 1], [1920, 1080, 2], [3840, 2160, 2]]) {
    let previous = Infinity;
    for (const level of [2, 1, 0]) {
      const ratio = renderPixelRatio(width, height, dpr, level);
      assert.ok(ratio <= dpr && ratio <= previous);
      assert.ok(width * height * ratio ** 2 <= 1920 * 1080 + 1);
      previous = ratio;
    }
  }
  assert.equal(renderPixelRatio(1280, 720, 1, 2), 1);
  assert.equal(renderPixelRatio(1280, 720, 2, 2, true), 1);
  assert.equal(renderPixelRatio(1280, 720, 1, 0), 0.75);
});

test('sustained 40 FPS reduces quality before 10 seconds, then stops at minimum', () => {
  const changes = [];
  const quality = new AdaptiveQuality((level) => changes.push(level));
  for (let i = 0; i < 400; i++) quality.update(1 / 40);
  assert.deepEqual(changes, [1]);
  for (let i = 0; i < 800; i++) quality.update(1 / 40);
  assert.deepEqual(changes, [1, 0]);
});

test('startup, isolated hitches, and unfocused tabs do not reduce quality', () => {
  const quality = new AdaptiveQuality(() => assert.fail('unexpected quality change'));
  for (let i = 0; i < 100; i++) quality.update(1 / 30);
  for (let i = 0; i < 600; i++) quality.update(1 / 60);
  quality.update(0.5);
  for (let i = 0; i < 600; i++) quality.update(1 / 60);
  for (let i = 0; i < 100; i++) quality.update(0.5, false);
  quality.update(5); // Tab resume / debugger pause.
  for (let i = 0; i < 600; i++) quality.update(1 / 60);
  assert.equal(quality.level, 2);
});

test('persistent stalls still lower quality instead of resetting measurement forever', () => {
  const changes = [];
  const quality = new AdaptiveQuality((level) => changes.push(level));
  for (let i = 0; i < 40; i++) quality.update(0.5);
  assert.deepEqual(changes, [1, 0]);
});
