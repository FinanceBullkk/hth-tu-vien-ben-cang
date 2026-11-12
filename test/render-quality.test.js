import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AdaptiveQuality, ShadowPacer, pinShaderPrograms, renderPixelRatio, startQualityLevel,
} from '../client/src/scene/render-quality.js';

const DAY = 24 * 3600 * 1000;

test('a machine that had to lower quality starts there next time, same GPU only, for a week', () => {
  const now = 100 * DAY;
  const saved = { level: 0, gpu: 'Intel UHD 620', at: now - DAY };
  assert.equal(startQualityLevel(saved, 'Intel UHD 620', now), 0);
  assert.equal(startQualityLevel(saved, 'AMD Radeon RX 6600', now), 2);
  assert.equal(startQualityLevel({ ...saved, at: now - 8 * DAY }, 'Intel UHD 620', now), 2);
  assert.equal(startQualityLevel({ ...saved, at: now + DAY }, 'Intel UHD 620', now), 2); // Đồng hồ máy bị chỉnh lùi.
  assert.equal(startQualityLevel({ ...saved, level: 7 }, 'Intel UHD 620', now), 2);
  assert.equal(startQualityLevel({ ...saved, level: -3 }, 'Intel UHD 620', now), 0);
  assert.equal(startQualityLevel({ ...saved, level: '0' }, 'Intel UHD 620', now), 2);
  assert.equal(startQualityLevel(null, 'Intel UHD 620', now), 2);
});

test('quality that starts lowered keeps lowering from there, never back up', () => {
  const changes = [];
  const quality = new AdaptiveQuality((level) => changes.push(level), 1);
  for (let i = 0; i < 800; i++) quality.update(1 / 40);
  assert.deepEqual(changes, [0]);
  const floor = new AdaptiveQuality(() => assert.fail('already at minimum'), 0);
  for (let i = 0; i < 800; i++) floor.update(1 / 20);
});

test('shader programs survive their last material being disposed', () => {
  // Giống WebGLPrograms của three: dispose vật liệu cuối cùng thì program bị huỷ.
  const programs = [];
  const acquire = () => {
    const p = programs[0] ?? { usedTimes: 0 };
    if (!programs.length) programs.push(p);
    p.usedTimes++;
    return p;
  };
  const release = (p) => {
    if (--p.usedTimes === 0) programs.splice(programs.indexOf(p), 1);
  };
  const renderer = { info: { programs } };
  const slash = acquire();
  pinShaderPrograms(renderer);
  release(slash); // Chiêu PK hết hạn.
  assert.equal(programs.length, 1);
  assert.equal(acquire(), slash); // Ra chiêu lại dùng đúng program cũ, không biên dịch lại.
  pinShaderPrograms(renderer);
  assert.equal(slash.usedTimes, 2); // Ghim một lần thôi.
});

test('pinning stops at a cap so per-player shaders cannot grow without bound', () => {
  const programs = Array.from({ length: 500 }, () => ({ usedTimes: 1 }));
  pinShaderPrograms({ info: { programs } });
  assert.equal(programs.filter((p) => p.usedTimes === 2).length, 400);
});

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

/** Số lần vẽ bóng trong 1 giây ở một tốc độ khung cho trước. */
function shadowUpdates(fps, busy) {
  const pacer = new ShadowPacer();
  let updates = 0;
  let maxGap = 0;
  let gap = 0;
  for (let i = 0; i < fps * 10; i++) {
    gap++;
    if (pacer.update(1 / fps, busy)) {
      updates++;
      maxGap = Math.max(maxGap, gap);
      gap = 0;
    }
  }
  return { perSec: updates / 10, shareOfFrames: updates / (fps * 10), maxGap };
}

test('shadows follow walkers at 20 Hz on a healthy machine and rest when nobody moves', () => {
  const walking = shadowUpdates(60, true);
  assert.ok(walking.perSec >= 19 && walking.perSec <= 20.1, `walking: ${walking.perSec}/s`);
  const idle = shadowUpdates(60, false);
  assert.ok(idle.perSec >= 4.5 && idle.perSec <= 5.1, `idle: ${idle.perSec}/s`);
});

test('a slow machine never spends more than one frame in three on shadows', () => {
  for (const fps of [144, 60, 37, 25, 15]) {
    const { shareOfFrames } = shadowUpdates(fps, true);
    assert.ok(shareOfFrames <= 1 / 3 + 0.01, `${fps} FPS: ${shareOfFrames}`);
  }
});
