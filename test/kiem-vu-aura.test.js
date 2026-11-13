import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createKiemVuAura, kiemVuRhythm, KIEM_VU_CYCLE } from '../client/src/player/vfx/kiem-vu-aura.js';
import { swordGeometry } from '../client/src/player/vfx/sword-geometry.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

// Chỉ các bộ kiếm (vật liệu có uniform ink); billboard mây/sao cũng là InstancedMesh nhưng không tính.
const instanced = aura => { const list = []; aura.points.traverse(o => { if (o.isInstancedMesh && o.material.uniforms?.ink) list.push(o); }); return list; };
const named = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };

test('Kiếm Vũ: kiếm luân, phi kiếm và trận đồ có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createKiemVuAura(false, { matches: false });
  assert.equal(aura.points.name, 'kiem-vu-aura');
  for (const t of [0, 2.5, 3, 5.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite));
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false);
    });
  }
  for (const name of ['kiem-vu-light-arcs', 'kiem-vu-silk', 'kiem-vu-clouds', 'kiem-vu-stars', 'kiem-vu-streaks', 'kiem-vu-petals']) assert.ok(named(aura, name), name);
  // Billboard: ma trận và độ đậm từng hạt hữu hạn, độ đậm không âm.
  for (const name of ['kiem-vu-clouds', 'kiem-vu-stars', 'kiem-vu-streaks', 'kiem-vu-petals']) {
    const b = named(aura, name);
    assert.ok([...b.instanceMatrix.array].every(Number.isFinite));
    assert.ok([...b.instanceColor.array].every(Number.isFinite));
    assert.ok([...b.instanceColor.array].every((v, i) => i % 3 || v >= 0)); // kênh r = độ đậm
  }
  // 12 kiếm ngoài + 8 kiếm trong + 3 phi kiếm (mỗi bộ có lớp sáng và lớp mực) + 8 kiếm mưa.
  assert.deepEqual(instanced(aura).map(m => m.count).sort((a, b) => a - b), [3, 3, 8, 8, 8, 12, 12]);
  aura.dispose();
});

test('Kiếm Vũ: nhịp thở — mưa kiếm chỉ hiện trong pha trôi xuống, tuần hoàn khép kín', () => {
  const at = (aura, t) => { aura.update(t); let rain; aura.points.traverse(o => { if (o.name === 'kiem-vu-rain') rain = o; }); return rain; };
  const aura = createKiemVuAura(false, { matches: false });
  assert.equal(at(aura, 0).visible, false);
  assert.equal(at(aura, KIEM_VU_CYCLE * 0.3).visible, true);
  assert.equal(at(aura, KIEM_VU_CYCLE * 0.95).visible, false);
  assert.equal(at(aura, KIEM_VU_CYCLE * 1.3).visible, true);
  for (const k of ['phase', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(kiemVuRhythm(1.7)[k] - kiemVuRhythm(1.7 + KIEM_VU_CYCLE * 5)[k]) < 1e-9);
  }
  aura.dispose();
});

test('Kiếm Vũ: chất lượng thấp bớt kiếm và bỏ lớp mực', () => {
  const low = createKiemVuAura(true, { matches: false });
  assert.deepEqual(instanced(low).map(m => m.count).sort((a, b) => a - b), [3, 6, 12]);
  let rain = null; low.points.traverse(o => { if (o.name === 'kiem-vu-rain') rain = o; });
  assert.equal(rain, null);
  low.dispose();
});

test('Kiếm Vũ: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = createKiemVuAura(false, { matches: false });
  aura.points.material.opacity = 0.45;
  aura.update(1);
  const [glow] = instanced(aura).filter(m => m.material.uniforms.ink.value === 0);
  assert.ok(Math.abs(glow.material.uniforms.opacity.value - 0.85 * 0.5) < 1e-9);
  aura.dispose();
});

test('Kiếm Vũ: không có pha tăng tốc — dải lưu quang đi với tốc độ gần như không đổi suốt nhịp', () => {
  const aura = createKiemVuAura(false, { matches: false });
  const head = t => {
    aura.update(t); let m; aura.points.traverse(o => { if (o.name === 'kiem-vu-light-arcs') m = o; });
    return [...m.geometry.attributes.position.array.slice(0, 3)];
  };
  const step = t => { const a = head(t), b = head(t + 0.05); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  const calm = step(KIEM_VU_CYCLE * 0.95), peak = step(KIEM_VU_CYCLE * 0.45);
  assert.ok(peak < calm * 1.6, 'đỉnh nhịp ' + peak + ' so với lúc lắng ' + calm);
  aura.dispose();
});

test('Kiếm Vũ: giảm chuyển động làm chậm chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createKiemVuAura(false, motion);
  aura.update(10);
  const glow = instanced(aura).find(m => m.material.uniforms.ink.value === 0);
  assert.ok(Math.abs(glow.material.uniforms.time.value - 3.5) < 1e-9);
  motion.matches = false;
  aura.update(10);
  assert.equal(glow.material.uniforms.time.value, 10);
  aura.dispose();
});

test('Kiếm Vũ: dispose giải phóng tài nguyên riêng, giữ hình kiếm, khung billboard và hoa văn dùng chung', () => {
  const aura = createKiemVuAura(false, { matches: false });
  const owned = new Set([aura.points.material]), shared = new Set([swordGeometry()]);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && o.geometry !== swordGeometry()) owned.add(o.geometry);
    if (o.material) owned.add(o.material);
    if (o.material?.uniforms?.map) shared.add(o.material.uniforms.map.value);
  });
  let disposed = 0, sharedDisposed = 0;
  owned.forEach(o => o.addEventListener('dispose', () => disposed++));
  shared.forEach(o => o.addEventListener('dispose', () => sharedDisposed++));
  assert.ok(shared.size >= 6);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Kiếm Vũ khi ngồi thiền: tòa kiếm riêng thay cho tòa sen mặc định', () => {
  const tint = new Color('cyan'), accent = new Color('white');
  const kiem = createManifestation(12, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of kiem.layers.entries()) {
    assert.notEqual(mesh.geometry, lotus.layers[i].geometry);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  kiem.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 12);
    assert.equal(aura.effect, 12);
    assert.equal(aura.uniforms.theme.value, 12);
    aura.setEffect(11);
    assert.equal(aura.effect, 0);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
