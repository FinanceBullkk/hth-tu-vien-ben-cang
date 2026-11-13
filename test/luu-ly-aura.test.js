import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createLuuLyAura, luuLyRhythm, LUU_LY_CYCLE } from '../client/src/player/vfx/luu-ly-aura.js';
import { dropGeometry } from '../client/src/player/vfx/drop-geometry.js';
import { softDot } from '../client/src/player/vfx/aura-rhythm.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

// Giọt lưu ly 3D trên nhánh xoáy (lớp sáng + lớp mực); billboard cũng là InstancedMesh nhưng không tính.
const drops = aura => { const list = []; aura.points.traverse(o => { if (o.isInstancedMesh && o.geometry === dropGeometry()) list.push(o); }); return list; };
const named = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
const BILLBOARDS = ['luu-ly-clouds', 'luu-ly-sparkles', 'luu-ly-drops', 'luu-ly-bubbles', 'luu-ly-shards'];

test('Lưu Ly: thủy luân xoáy, dải thủy quang, song lý và mặt hồ có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createLuuLyAura(false, { matches: false });
  assert.equal(aura.points.name, 'luu-ly-aura');
  for (const t of [0, 2.5, 6, 11.9, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false);
    });
  }
  for (const name of ['luu-ly-wheel', 'luu-ly-drops-3d', 'luu-ly-water-arcs', 'luu-ly-koi', 'luu-ly-koi-ink', 'luu-ly-ripple', ...BILLBOARDS]) {
    assert.ok(named(aura, name), name);
  }
  for (const name of BILLBOARDS) {
    const b = named(aura, name);
    assert.ok([...b.instanceColor.array].every(Number.isFinite));
    assert.ok([...b.instanceColor.array].every((v, i) => i % 3 || v >= 0)); // kênh r = độ đậm
  }
  // 6 nhánh xoáy × 5 giọt, lớp sáng và lớp mực chung ma trận.
  assert.deepEqual(drops(aura).map(m => m.count), [30, 30]);
  aura.dispose();
});

test('Lưu Ly: bóng dáng riêng — giọt trôi theo nhánh xoáy nước, không phải vòng toả tròn đều như Kiếm Vũ', () => {
  const aura = createLuuLyAura(false, { matches: false });
  for (const name of ['luu-ly-silk', 'kiem-vu-silk', 'kiem-vu-light-arcs']) assert.equal(named(aura, name), null, name);
  const [glow] = drops(aura), radius = () => {
    const m = glow.instanceMatrix.array, out = [];
    for (let i = 0; i < glow.count; i++) out.push(Math.hypot(m[i * 16 + 12], m[i * 16 + 13]));
    return out;
  };
  aura.update(3);
  const before = radius();
  // Giọt nằm ở nhiều bán kính khác nhau (nhánh xoáy), không cùng một vòng.
  assert.ok(new Set(before.map(r => r.toFixed(2))).size >= 5);
  assert.ok(Math.min(...before) > 0.15 && Math.max(...before) < 1.1);
  // Giọt trôi đều ra ngoài: sau 1 giây phần lớn giọt ở xa tâm hơn.
  aura.update(4);
  const after = radius(), outward = after.filter((r, i) => r > before[i]).length;
  assert.ok(outward >= glow.count * 0.7, `${outward}/${glow.count} giọt trôi ra`);
  aura.dispose();
});

test('Lưu Ly: song lý bơi quanh trận, ở ngoài thân và lượn thấp', () => {
  const aura = createLuuLyAura(false, { matches: false });
  aura.update(7);
  const pos = named(aura, 'luu-ly-koi').geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    if (pos[i] === 0 && pos[i + 1] === 0 && pos[i + 2] === 0) continue;
    assert.ok(Math.hypot(pos[i], pos[i + 2]) > 0.75, 'cá không bơi xuyên người');
    assert.ok(pos[i + 1] > 0 && pos[i + 1] < 0.45, 'cá lượn thấp quanh trận, dưới đầu gối');
  }
  aura.dispose();
});

test('Lưu Ly: chất lượng thấp bớt giọt, bỏ lớp mực', () => {
  const low = createLuuLyAura(true, { matches: false });
  assert.deepEqual(drops(low).map(m => m.count), [18]);
  assert.equal(named(low, 'luu-ly-koi-ink'), null);
  let ink = 0; low.points.traverse(o => { if (o.material?.uniforms?.ink?.value === 1) ink++; });
  assert.equal(ink, 0);
  low.dispose();
});

test('Lưu Ly: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = createLuuLyAura(false, { matches: false });
  aura.points.material.opacity = 0.45;
  aura.update(1);
  const glow = drops(aura).find(m => m.material.uniforms.ink.value === 0);
  assert.ok(Math.abs(glow.material.uniforms.opacity.value - 0.9 * 0.5) < 1e-9);
  assert.ok(Math.abs(named(aura, 'luu-ly-clouds').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Lưu Ly: nhịp thở tuần hoàn khép kín và không có pha tăng tốc', () => {
  for (const k of ['phase', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(luuLyRhythm(1.7)[k] - luuLyRhythm(1.7 + LUU_LY_CYCLE * 5)[k]) < 1e-9);
  }
  const aura = createLuuLyAura(false, { matches: false });
  // Đầu dải thủy quang và song lý đi gần như đều tốc độ, kể cả ở đỉnh nhịp thở ra.
  const speed = (name, t) => {
    const at = time => { aura.update(time); return [...named(aura, name).geometry.attributes.position.array.slice(0, 3)]; };
    const a = at(t), b = at(t + 0.05);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };
  for (const name of ['luu-ly-water-arcs', 'luu-ly-koi']) {
    const calm = speed(name, LUU_LY_CYCLE * 0.95), peak = speed(name, LUU_LY_CYCLE * 0.45);
    assert.ok(peak < calm * 1.6, `${name}: đỉnh nhịp ${peak} so với lúc lắng ${calm}`);
  }
  aura.dispose();
});

test('Lưu Ly: giảm chuyển động làm chậm chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createLuuLyAura(false, motion);
  aura.update(10);
  const glow = drops(aura).find(m => m.material.uniforms.ink.value === 0);
  assert.ok(Math.abs(glow.material.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(aura.points.visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(glow.material.uniforms.time.value, 10);
  aura.dispose();
});

test('Lưu Ly: dispose giải phóng tài nguyên riêng, giữ giọt 3D, khung billboard và hoa văn dùng chung', () => {
  const aura = createLuuLyAura(false, { matches: false });
  const owned = new Set([aura.points.material]), shared = new Set([dropGeometry(), softDot()]);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && o.geometry !== dropGeometry()) owned.add(o.geometry);
    if (o.material) owned.add(o.material);
    if (o.material?.uniforms?.map) shared.add(o.material.uniforms.map.value);
    if (o.material?.map) shared.add(o.material.map);
  });
  let disposed = 0, sharedDisposed = 0;
  owned.forEach(o => o.addEventListener('dispose', () => disposed++));
  shared.forEach(o => o.addEventListener('dispose', () => sharedDisposed++));
  assert.ok(shared.size >= 8);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Lưu Ly khi ngồi thiền: tòa sóng riêng thay cho rồng nước cũ, đất có gợn nước', () => {
  const tint = new Color('cyan'), accent = new Color('white');
  const water = createManifestation(2, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of water.layers.entries()) {
    assert.notEqual(mesh.geometry, lotus.layers[i].geometry);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  water.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 2);
    assert.equal(aura.uniforms.theme.value, 2);
    assert.ok(aura.material.fragmentShader.includes('theme == 2.0) for'));
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
