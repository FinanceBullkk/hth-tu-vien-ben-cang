import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createHongLienAura, hongLienRhythm, HONG_LIEN_CYCLE } from '../client/src/player/vfx/hong-lien-aura.js';
import { featherGeometry } from '../client/src/player/vfx/hong-lien-materials.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const named = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
// Bộ lông vũ 3D: InstancedMesh có uniform ink (billboard thì không).
const feathers = aura => { const list = []; aura.points.traverse(o => { if (o.isInstancedMesh && o.material.uniforms?.ink) list.push(o); }); return list; };
const LAYERS = ['hong-lien-wings', 'hong-lien-wing-glow', 'hong-lien-wing-edge', 'hong-lien-wing-flames', 'hong-lien-plumes', 'hong-lien-shed',
  'hong-lien-bloom', 'hong-lien-wisps', 'hong-lien-sparks'];
const pos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];

test('Hồng Liên: cánh, phượng vĩ, lông rụng và sen lửa có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createHongLienAura(false, { matches: false });
  assert.equal(aura.points.name, 'hong-lien-aura');
  for (const t of [0, 2.5, 3, 5.1, 7.7, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) {
        assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
        if (o.instanceColor) assert.ok([...o.instanceColor.array].every((v, i) => Number.isFinite(v) && (i % 3 || v >= 0)), o.name);
      } else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.matrix) assert.ok([...o.matrix.elements].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false);
    });
  }
  for (const name of [...LAYERS, 'hong-lien-plumes-ink', 'hong-lien-wing-echo']) assert.ok(named(aura, name), name);
  // Cánh (7 lông bay + 7 lông giữa + 6 lông phủ) × 2 bên, sáng + mực + hư ảnh; 9 lông rụng sáng + mực.
  assert.deepEqual(feathers(aura).map(m => m.count).sort((a, b) => a - b), [9, 9, 40, 40, 40]);
  // Lưỡi lửa bám ngọn 14 lông bay/lông giữa mỗi bên.
  assert.equal(named(aura, 'hong-lien-wing-flames').count, 28);
  aura.dispose();
});

test('Hồng Liên: bóng dáng riêng theo bảng phân vai — cánh giang ngang, không đĩa/vòng sau lưng', () => {
  const aura = createHongLienAura(false, { matches: false });
  aura.points.traverse(o => assert.ok(!/cloud|wheel|light-arcs|silk|mandala|rim|fan|lotus|lantern|ring/.test(o.name), o.name));
  // Gốc lông bay ngoài cùng nằm xa thân theo chiều ngang (sải cánh), không dồn sau đầu.
  aura.update(0);
  const wings = named(aura, 'hong-lien-wings'), [x, y] = pos(wings, 6);
  assert.ok(Math.abs(x) > 0.9 && y > 1.4 && y < 2.2, `gốc lông bay ở (${x}, ${y})`);
  aura.dispose();
});

test('Hồng Liên: createEffect(4) dùng pháp tướng riêng', () => {
  const effect = createEffect(4);
  assert.equal(effect.points.name, 'hong-lien-aura');
  effect.update(1);
  effect.dispose();
});

test('Hồng Liên: chất lượng thấp bớt lông, bỏ lớp mực và cánh hư ảnh', () => {
  const low = createHongLienAura(true, { matches: false });
  low.update(2);
  assert.deepEqual(feathers(low).map(m => m.count).sort((a, b) => a - b), [4, 16]);
  for (const name of ['hong-lien-plumes-ink', 'hong-lien-wing-echo']) assert.equal(named(low, name), null, name);
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

test('Hồng Liên: vỗ cánh một nhịp mỗi 14 giây, tuần hoàn khép kín', () => {
  assert.equal(HONG_LIEN_CYCLE, 14);
  for (const k of ['phase', 'gather', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(hongLienRhythm(1.7)[k] - hongLienRhythm(1.7 + HONG_LIEN_CYCLE * 5)[k]) < 1e-9);
  }
  const aura = createHongLienAura(false, { matches: false });
  const at = t => { aura.update(t); return pos(named(aura, 'hong-lien-wings'), 6); };
  const up = at(0), down = at(HONG_LIEN_CYCLE / 2), again = at(HONG_LIEN_CYCLE * 3);
  assert.ok(down[1] < up[1] - 0.1, `cánh hạ: ${down[1]} so với ${up[1]}`);
  assert.ok(Math.abs(again[1] - up[1]) < 0.02 && Math.abs(again[0] - up[0]) < 0.02);
  aura.dispose();
});

test('Hồng Liên: không có pha tăng tốc — cánh, lông rụng và sợi lửa đi chậm, trơn suốt nhịp', () => {
  const aura = createHongLienAura(false, { matches: false });
  // Độ hiện của hạt: billboard ở instanceColor.r, lông 3D ở độ dài trục y của ma trận (thu về 0 khi quay vòng).
  const shown = (m, i) => m.instanceColor ? m.instanceColor.array[i * 3] : Math.hypot(...m.instanceMatrix.array.slice(i * 16 + 4, i * 16 + 7));
  const probe = (name, i) => t => { aura.update(t); const m = named(aura, name); return [...pos(m, i), shown(m, i)]; };
  for (const [label, at] of [['đầu cánh', probe('hong-lien-wings', 6)], ['lông rụng', probe('hong-lien-shed', 0)],
    ['sợi lửa', probe('hong-lien-wisps', 0)]]) {
    // Chỉ đo khi hạt đang hiện rõ ở cả hai đầu bước (bỏ khoảnh khắc quay vòng về chỗ xuất phát lúc đã tan).
    const speed = t => { const a = at(t), b = at(t + 0.05); return Math.min(a[3], b[3]) > 0.05 ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 0.05 : null; };
    const samples = Array.from({ length: 112 }, (_, i) => speed(HONG_LIEN_CYCLE * i / 112)).filter(v => v !== null);
    assert.ok(samples.length > 60, label);
    const peak = Math.max(...samples), mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    assert.ok(peak < 0.6, `${label} chậm: ${peak} m/s`);
    // Vận tốc trơn như hình sin (đỉnh/trung bình ≈ 1.57), không có pha vọt lên.
    assert.ok(peak < mean * 2.4 + 0.02, `${label}: đỉnh ${peak} so với trung bình ${mean}`);
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

test('Hồng Liên: dispose giải phóng tài nguyên riêng, giữ hình lông, khung billboard, quầng cánh và hoa văn dùng chung', () => {
  const aura = createHongLienAura(false, { matches: false });
  const shared = new Set([featherGeometry()]), owned = new Set([aura.points.material]);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.name === 'hong-lien-wing-glow') shared.add(o.geometry);
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

test('Hồng Liên khi ngồi thiền: tòa cánh riêng, không đài sen, không dùng chung cánh với Hắc Ám', () => {
  const tint = new Color('red'), accent = new Color('white');
  const hong = createManifestation(4, tint, accent), dark = createManifestation(8, tint, accent);
  for (const [i, mesh] of hong.layers.entries()) {
    assert.notEqual(mesh.geometry, dark.layers[i].geometry);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  // Tầng 5: cánh giang ngang thay cho cánh khép hờ tầng 4; phượng vĩ tầng 3 vẫn trải sau.
  hong.update(5, 1, 1, 1);
  assert.deepEqual(hong.layers.map(m => m.visible), [true, false, true]);
  hong.update(4, 1, 1, 1);
  assert.deepEqual(hong.layers.map(m => m.visible), [true, true, false]);
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
