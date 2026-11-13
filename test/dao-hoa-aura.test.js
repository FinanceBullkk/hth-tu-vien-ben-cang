import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createDaoHoaAura, daoHoaRhythm, DAO_HOA_CYCLE } from '../client/src/player/vfx/dao-hoa-aura.js';
import { blossomGeometry, budGeometry, leafGeometry } from '../client/src/player/vfx/dao-hoa-geometry.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const BILLBOARDS = ['dao-hoa-clouds', 'dao-hoa-stars', 'dao-hoa-petal-stream', 'dao-hoa-petals', 'dao-hoa-falling-blossoms', 'dao-hoa-falling-leaves', 'dao-hoa-knots'];

test('Đào Hoa: nguyệt môn, cành đào và cánh rơi có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  assert.equal(aura.points.name, 'dao-hoa-aura');
  for (const t of [0, 2.5, 3, 5.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite));
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false);
    });
  }
  for (const name of ['dao-hoa-gate', 'dao-hoa-garden-view', 'dao-hoa-plaque', 'dao-hoa-red-threads', 'dao-hoa-blossoms', 'dao-hoa-buds', 'dao-hoa-leaves', ...BILLBOARDS]) {
    assert.ok(one(aura, name), name);
  }
  for (const name of BILLBOARDS) {
    const b = one(aura, name);
    assert.ok([...b.instanceColor.array].every(Number.isFinite));
    assert.ok([...b.instanceColor.array].every((v, i) => i % 3 || v >= 0)); // kênh r = độ đậm
  }
  // Hoa, nụ, lá đều có lớp thân (mực) và lớp sáng dùng chung ma trận instance.
  for (const name of ['dao-hoa-blossoms', 'dao-hoa-buds', 'dao-hoa-leaves']) {
    const [body, glow] = named(aura, name);
    assert.equal(body.material.uniforms.ink.value, 1);
    assert.equal(glow.material.uniforms.ink.value, 0);
    assert.equal(body.instanceMatrix, glow.instanceMatrix);
  }
  assert.ok(one(aura, 'dao-hoa-blossoms').count >= 20);
  assert.ok(one(aura, 'dao-hoa-petals').count >= 30);
  aura.dispose();
});

test('Đào Hoa: không dùng khuôn chung của các aura khác (lưu quang, phiêu đái lụa)', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  aura.points.traverse(o => assert.ok(!/light-arcs|silk|streaks|mandala|rune/.test(o.name), o.name));
  aura.dispose();
});

test('Đào Hoa: vùng quanh đầu để trống — cành và hoa không đi ngang mặt nhân vật', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  for (const t of [0, 4, 9]) {
    aura.update(t);
    for (const name of ['dao-hoa-blossoms', 'dao-hoa-buds', 'dao-hoa-leaves']) {
      const mesh = one(aura, name), m = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i++) {
        const x = m[i * 16 + 12], y = m[i * 16 + 13];
        assert.ok(Math.hypot(x, y - 1.07) > 0.45, `${name}#${i} ở (${x.toFixed(2)}, ${y.toFixed(2)})`);
      }
    }
  }
  aura.dispose();
});

test('Đào Hoa: nhịp thở tuần hoàn khép kín, hoa hé nở khi thở ra', () => {
  for (const k of ['phase', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(daoHoaRhythm(1.7)[k] - daoHoaRhythm(1.7 + DAO_HOA_CYCLE * 5)[k]) < 1e-9);
  }
  const aura = createDaoHoaAura(false, { matches: false });
  const size = t => { aura.update(t); const m = one(aura, 'dao-hoa-blossoms').instanceMatrix.array; return Math.hypot(m[0], m[1], m[2]); };
  assert.ok(size(DAO_HOA_CYCLE * 0.45) > size(DAO_HOA_CYCLE * 0.15));
  aura.dispose();
});

test('Đào Hoa: chất lượng thấp bỏ lớp mực hoa văn, lớp sáng phụ và lá rơi', () => {
  const full = createDaoHoaAura(false, { matches: false }), low = createDaoHoaAura(true, { matches: false });
  const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints) n++; }); return n; };
  assert.ok(draws(full) <= 40, 'số lớp vẽ ' + draws(full));
  assert.ok(draws(low) <= draws(full) - 6, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  assert.equal(named(low, 'dao-hoa-buds').length, 1);
  assert.equal(one(low, 'dao-hoa-falling-leaves'), null);
  assert.ok(one(low, 'dao-hoa-petals').count < one(full, 'dao-hoa-petals').count);
  full.dispose(); low.dispose();
});

test('Đào Hoa: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  aura.points.material.opacity = 0.45;
  aura.update(1);
  const [body] = named(aura, 'dao-hoa-blossoms');
  assert.ok(Math.abs(body.material.uniforms.opacity.value - 0.95 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'dao-hoa-petals').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Đào Hoa: không có pha tăng tốc — chỉ hồng, cánh rơi và lốc cánh đi gần như đều suốt nhịp', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  const at = (name, t, read) => { aura.update(t); return read(one(aura, name)); };
  const threadTip = m => [...m.geometry.attributes.position.array.slice(16 * 6, 16 * 6 + 3)];
  const petal = m => [...m.instanceMatrix.array.slice(12, 15)];
  for (const [name, read] of [['dao-hoa-red-threads', threadTip], ['dao-hoa-petals', petal], ['dao-hoa-petal-stream', petal]]) {
    const step = t => { const a = at(name, t, read), b = at(name, t + 0.05, read); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
    const calm = step(DAO_HOA_CYCLE * 0.95), peak = step(DAO_HOA_CYCLE * 0.45);
    assert.ok(peak < calm * 1.6, `${name}: đỉnh nhịp ${peak} so với lúc lắng ${calm}`);
  }
  aura.dispose();
});

test('Đào Hoa: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createDaoHoaAura(false, motion);
  aura.update(10);
  let lines = null; aura.points.traverse(o => { if (!lines && o.material?.uniforms?.chase) lines = o.material; });
  assert.ok(Math.abs(lines.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'dao-hoa-petals').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(lines.uniforms.time.value, 10);
  aura.dispose();
});

test('Đào Hoa: dispose giải phóng tài nguyên riêng, giữ hình hoa, khung billboard và hoa văn dùng chung', () => {
  const aura = createDaoHoaAura(false, { matches: false });
  const sharedGeo = new Set([blossomGeometry(), budGeometry(), leafGeometry()]);
  const owned = new Set([aura.points.material]), shared = new Set(sharedGeo);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && !sharedGeo.has(o.geometry)) owned.add(o.geometry);
    if (o.material) owned.add(o.material);
    if (o.material?.uniforms?.map) shared.add(o.material.uniforms.map.value);
    if (o.material?.map) shared.add(o.material.map);
  });
  let disposed = 0, sharedDisposed = 0;
  owned.forEach(o => o.addEventListener('dispose', () => disposed++));
  shared.forEach(o => o.addEventListener('dispose', () => sharedDisposed++));
  assert.ok(shared.size >= 10);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Đào Hoa: createEffect(5) dùng pháp tướng mới', () => {
  const aura = createEffect(5, false);
  assert.equal(aura.points.name, 'dao-hoa-aura');
  aura.update(2);
  aura.dispose();
});

test('Đào Hoa khi ngồi thiền: tòa cành đào riêng, không mượn đoá sen', () => {
  const tint = new Color('pink'), accent = new Color('white');
  const dao = createManifestation(5, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of dao.layers.entries()) {
    assert.notEqual(mesh.geometry.attributes.position.count, lotus.layers[i].geometry.attributes.position.count);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  dao.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 5);
    assert.equal(aura.uniforms.theme.value, 5);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
