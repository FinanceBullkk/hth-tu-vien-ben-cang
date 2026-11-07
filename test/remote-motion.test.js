// Phát lại chuyển động người khác: mô phỏng mạng có trễ và dao động, chạy như vòng khung hình thật.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RemoteMotion, slewOffset } from '../client/src/net/remote-motion.js';

const SPEED = 4.3;
const FRAME_MS = 1000 / 60;

/** Bộ sinh số cố định để test không chập chờn. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Một người đi thẳng, gửi mẫu `sendHz`/giây, tới máy này sau `latency` ± `jitter` ms.
 * Trả về mức đứng hình và độ dao động tốc độ của nhân vật nhìn thấy, bỏ giây đầu để bộ đo ổn định.
 */
function simulate({ latency = 80, jitter = 15, sendHz = 20, seconds = 12, drop = 0, seed = 7 }) {
  const random = rng(seed);
  const interval = 1000 / sendHz;
  const start = 1_000_000;
  const motion = new RemoteMotion(0, 0, 0, 1, start);
  const inbox = [];
  let nextSend = start;
  let lastArrive = 0;
  let px = null;
  let frozen = 0;
  let frames = 0;
  const speeds = [];
  for (let now = start; now < start + seconds * 1000; now += FRAME_MS) {
    while (nextSend <= now) {
      if (random() >= drop) {
        // Giao thức có thứ tự: gói sau không thể vượt gói trước.
        const arrive = Math.max(lastArrive, nextSend + latency + (random() * 2 - 1) * jitter);
        lastArrive = arrive;
        inbox.push({ t: nextSend, x: ((nextSend - start) / 1000) * SPEED, arrive });
      }
      nextSend += interval;
    }
    while (inbox.length && inbox[0].arrive <= now) {
      const m = inbox.shift();
      motion.push(m.t, m.x, 0, 0, 1, now);
    }
    motion.update(FRAME_MS / 1000, now);
    if (px !== null && now > start + 1000) {
      const d = motion.x - px;
      frames++;
      if (d < 0.0005) frozen++;
      speeds.push((d / FRAME_MS) * 1000);
    }
    px = motion.x;
  }
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const sd = Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length);
  return { frozenPct: (frozen / frames) * 100, cvPct: (sd / mean) * 100, mean, delay: motion.delay };
}

test('qua tunnel có trễ và dao động, nhân vật không đứng hình và đi đều', () => {
  for (const latency of [20, 80, 160]) {
    const r = simulate({ latency, jitter: 20 });
    assert.ok(r.frozenPct < 1, `trễ ${latency}: đứng hình ${r.frozenPct.toFixed(1)}%`);
    assert.ok(r.cvPct < 25, `trễ ${latency}: tốc độ dao động ${r.cvPct.toFixed(1)}%`);
    assert.ok(Math.abs(r.mean - SPEED) < 0.25, `trễ ${latency}: tốc độ trung bình ${r.mean.toFixed(2)}`);
    assert.ok(r.delay > latency, `trễ phát lại ${r.delay.toFixed(0)} phải lớn hơn độ trễ mạng ${latency}`);
  }
});

test('rơi 10% gói vẫn không khựng rõ', () => {
  const r = simulate({ latency: 60, jitter: 15, drop: 0.1 });
  assert.ok(r.frozenPct < 3, `đứng hình ${r.frozenPct.toFixed(1)}%`);
  assert.ok(r.cvPct < 40, `tốc độ dao động ${r.cvPct.toFixed(1)}%`);
});

test('trễ phát lại luôn nằm trong giới hạn, kể cả mạng rất tệ', () => {
  const r = simulate({ latency: 2000, jitter: 400, seconds: 30 });
  assert.ok(r.delay <= 600, `trễ ${r.delay.toFixed(0)} vượt trần`);
});

/** Chạy n khung, trả về vị trí cuối. */
function run(motion, from, ms) {
  let now = from;
  for (; now < from + ms; now += FRAME_MS) motion.update(FRAME_MS / 1000, now);
  return now;
}

test('dừng lại: tới đúng chỗ dừng, hết hoạt ảnh đi', () => {
  const start = 1000;
  const m = new RemoteMotion(0, 0, 0, 1, start);
  let t = start;
  let x = 0;
  for (let i = 0; i < 20; i++) {
    t += 50;
    x += 0.215;
    m.push(t, x, 0, 0, 1, t + 60);
  }
  t += 50;
  m.push(t, x, 0, 0, 0, t + 60);
  run(m, start + 60, 2000);
  assert.ok(Math.abs(m.x - x) < 0.01, `dừng tại ${m.x}, phải ở ${x}`);
  assert.equal(m.anim, 0);
});

test('mất mẫu giữa đường: không bay xa và thôi hoạt ảnh đi', () => {
  const m = new RemoteMotion(0, 0, 0, 1, 1000);
  m.push(1050, 0.2, 0, 0, 1, 1100);
  m.push(1100, 0.4, 0, 0, 1, 1150);
  run(m, 1150, 3000);
  assert.ok(m.x < 0.4 + 4.3 * 0.2, `đoán trước quá xa: ${m.x}`);
  assert.equal(m.anim, 0, 'không có mẫu mới thì không được đi tại chỗ mãi');
});

test('đứng yên lâu rồi mới đi: không trượt dài từ vị trí cũ', () => {
  const m = new RemoteMotion(0, 0, 0, 0, 1000);
  let now = run(m, 1000, 5000);
  m.push(now - 40, 0.2, 0, 0, 1, now);
  // Ngay sau mẫu đầu, vị trí phải còn gần chỗ cũ chứ không nội suy dàn đều suốt 5 giây trước đó.
  now = run(m, now, 16);
  assert.ok(m.x < 0.25);
  now = run(m, now, 400);
  assert.ok(Math.abs(m.x - 0.2) < 0.05, `phải tới mẫu mới, đang ở ${m.x}`);
});

test('dịch chuyển tức thời (menu địa điểm) nhảy thẳng, không lướt qua nửa bản đồ', () => {
  const m = new RemoteMotion(0, 0, 0, 0, 1000);
  m.push(1100, 40, 30, 0, 0, 1150);
  let now = 1150;
  let seenBetween = false;
  for (let i = 0; i < 40; i++) {
    m.update(FRAME_MS / 1000, now);
    now += FRAME_MS;
    if (m.x > 2 && m.x < 38) seenBetween = true;
  }
  assert.equal(seenBetween, false);
  assert.ok(Math.abs(m.x - 40) < 0.1);
});

test('mẫu cũ bị bỏ qua; đồng hồ lùi hẳn sau khi kết nối lại thì làm lại từ đầu', () => {
  const m = new RemoteMotion(0, 0, 0, 0, 10_000);
  m.push(10_100, 1, 0, 0, 1, 10_150);
  m.push(10_050, 99, 0, 0, 1, 10_160);
  assert.equal(m.buf.at(-1).x, 1, 'mẫu đến muộn không được chèn');
  m.push(5000, 7, 7, 0, 0, 5000);
  assert.equal(m.buf.length, 1);
  assert.equal(m.buf[0].x, 7);
  run(m, 5000, 500);
  assert.ok(Math.abs(m.x - 7) < 0.1 && Math.abs(m.z - 7) < 0.1);
});

test('đồng hồ server: lệch ít thì trôi dần, lệch nhiều thì nhảy thẳng', () => {
  assert.equal(slewOffset(0, 100, 1000), 50);
  assert.equal(slewOffset(0, 100, 10_000), 100);
  assert.equal(slewOffset(0, -100, 1000), -50);
  assert.equal(slewOffset(0, 5000, 16), 5000);
  assert.equal(slewOffset(100, 100, 16), 100);
});
