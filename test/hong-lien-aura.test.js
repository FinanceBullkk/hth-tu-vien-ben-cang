import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createHongLienAura, hongLienRhythm, HONG_LIEN_CYCLE } from '../client/src/player/vfx/hong-lien-aura.js';
import { featherGeometry, petalGeometry } from '../client/src/player/vfx/hong-lien-materials.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const named = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
// Bộ lông/cánh sen 3D: InstancedMesh có uniform kind (billboard thì không).
const feathers = aura => { const list = []; aura.points.traverse(o => { if (o.isInstancedMesh && o.material.uniforms?.kind) list.push(o); }); return list; };
const LAYERS = ['hong-lien-wings', 'hong-lien-lotus', 'hong-lien-plumes', 'hong-lien-fan', 'hong-lien-bloom',
  'hong-lien-spiral', 'hong-lien-lanterns', 'hong-lien-feathers', 'hong-lien-wisps', 'hong-lien-sparks'];

test('Hồng Liên: cánh, phượng vĩ, đài sen và các lớp bay bổng có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createHongLienAura(false, { matches: false });
  assert.equal(aura.points.name, 'hong-lien-aura');
  for (const t of [0, 2.5, 3, 5.1, 7.7, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) {
        assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
        if (o.instanceColor) assert.ok([...o.instanceColor.array].every((v, i) => Number.isFinite(v) && (i % 3 || v >= 0)), o.name);
      } else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false);
    });
  }
  for (const name of [...LAYERS, 'hong-lien-plumes-ink']) assert.ok(named(aura, name), name);
  // Cánh (7 + 7 + 6) × 2 bên; đài sen 8 + 8; 10 lông xoắn; 5 hoa đăng × 6 cánh; mỗi bộ có lớp sáng và mực.
  assert.deepEqual(feathers(aura).map(m => m.count).sort((a, b) => a - b), [10, 10, 16, 16, 30, 30, 40, 40]);
  aura.dispose();
});

test('Hồng Liên: dáng riêng — không bánh xe, mây (Xích Diễm), không dải lưu quang hay phiêu đái dùng chung', () => {
  const aura = createHongLienAura(false, { matches: false });
  aura.points.traverse(o => assert.ok(!/cloud|wheel|light-arcs|silk|mandala|rim/.test(o.name), o.name));
  aura.dispose();
});

test('Hồng Liên: createEffect(4) dùng pháp tướng riêng', () => {
  const effect = createEffect(4);
  assert.equal(effect.points.name, 'hong-lien-aura');
  effect.update(1);
  effect.dispose();
});

test('Hồng Liên: chất lượng thấp bớt lông và hoa đăng, bỏ lớp mực và tầng sen ngoài', () => {
  const low = createHongLienAura(true, { matches: false });
  low.update(2);
  assert.deepEqual(feathers(low).map(m => m.count).sort((a, b) => a - b), [5, 8, 16, 18]);
  assert.equal(named(low, 'hong-lien-plumes-ink'), null);
  for (const name of LAYERS) assert.ok(named(low, name), name);
  low.dispose();
});

test('Hồng Liên: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = createHongLienAura(false, { matches: false });
  aura.update(HONG_LIEN_CYCLE * 0.95);
  const wing = named(aura, 'hong-lien-wings').material.uniforms.opacity, before = wing.value;
  aura.points.material.opacity = 0.45;
  aura.update(HONG_LIEN_CYCLE * 0.95);
  assert.ok(Math.abs(wing.value - before * 0.5) < 1e-9);
  aura.dispose();
});

test('Hồng Liên: nhịp 12 giây tuần hoàn khép kín, cánh xoè ra ở pha thở ra', () => {
  for (const k of ['phase', 'gather', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(hongLienRhythm(1.7)[k] - hongLienRhythm(1.7 + HONG_LIEN_CYCLE * 5)[k]) < 1e-9);
  }
  const aura = createHongLienAura(false, { matches: false });
  // Đầu lông bay ngoài cùng (instance 6) — khoảng cách ngang tới trục thân lớn hơn khi thở ra.
  const reach = t => { aura.update(t); const e = named(aura, 'hong-lien-wings').instanceMatrix.array; return Math.abs(e[6 * 16 + 12]); };
  assert.ok(reach(HONG_LIEN_CYCLE * 0.45) > reach(HONG_LIEN_CYCLE * 0.15));
  aura.dispose();
});

test('Hồng Liên: không có pha tăng tốc — lông xoắn, lông rơi và đầu cánh đi đều suốt nhịp', () => {
  const aura = createHongLienAura(false, { matches: false });
  const probe = (name, at) => t => { aura.update(t); const m = named(aura, name); return at(m); };
  const spiral = probe('hong-lien-spiral', m => [...m.instanceMatrix.array.slice(12, 15)]);
  const feather = probe('hong-lien-feathers', m => [...m.instanceMatrix.array.slice(12, 15)]);
  const wingTip = probe('hong-lien-wings', m => [...m.instanceMatrix.array.slice(6 * 16 + 12, 6 * 16 + 15)]);
  for (const [label, at, limit] of [['lông xoắn', spiral, 1.6], ['lông rơi', feather, 1.6], ['đầu cánh', wingTip, 2.5]]) {
    // Tốc độ lớn nhất trong cả chu kỳ không vượt quá vài lần tốc độ lúc lắng (và luôn nhỏ tuyệt đối).
    const speed = t => { const a = at(t), b = at(t + 0.05); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 0.05; };
    const calm = speed(HONG_LIEN_CYCLE * 0.95);
    let peak = 0;
    for (let i = 0; i < 48; i++) peak = Math.max(peak, speed(HONG_LIEN_CYCLE * i / 48));
    assert.ok(peak < Math.max(calm * limit, 0.05), `${label}: đỉnh ${peak} so với lúc lắng ${calm}`);
    assert.ok(peak < 1.2, `${label} chậm: ${peak} m/s`);
  }
  aura.dispose();
});

test('Hồng Liên: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createHongLienAura(false, motion);
  aura.update(10);
  const wing = named(aura, 'hong-lien-wings');
  assert.ok(Math.abs(wing.material.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(wing.visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(wing.material.uniforms.time.value, 10);
  aura.dispose();
});

test('Hồng Liên: dispose giải phóng tài nguyên riêng, giữ hình lông/cánh sen, khung billboard và hoa văn dùng chung', () => {
  const aura = createHongLienAura(false, { matches: false });
  const shared = new Set([featherGeometry(), petalGeometry()]), owned = new Set([aura.points.material]);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && !shared.has(o.geometry)) owned.add(o.geometry);
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

test('Hồng Liên khi ngồi thiền: tòa riêng, không dùng chung cánh với Hắc Ám, giữ đài sen dưới đôi cánh', () => {
  const tint = new Color('red'), accent = new Color('white');
  const hong = createManifestation(4, tint, accent), dark = createManifestation(8, tint, accent);
  for (const [i, mesh] of hong.layers.entries()) {
    assert.notEqual(mesh.geometry, dark.layers[i].geometry);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  hong.update(5, 1, 1, 1);
  assert.ok(hong.layers.every(m => m.visible), 'tầng 5 giữ cả búp sen, đài sen và đôi cánh');
  hong.dispose(); dark.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 4);
    assert.equal(aura.uniforms.theme.value, 4);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
