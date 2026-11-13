import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color } from 'three';
import { createBichNgocAura, bichNgocRhythm, BICH_NGOC_CYCLE } from '../client/src/player/vfx/bich-ngoc-aura.js';
import { STALKS } from '../client/src/player/vfx/bich-ngoc-grove.js';
import { BANDS, WIND_SPIN } from '../client/src/player/vfx/bich-ngoc-wind.js';
import { bambooLeafGeometry, mossStoneGeometry, shootGeometry } from '../client/src/player/vfx/bich-ngoc-geometry.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';

const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const HEAD = [0, 1.07], HEAD_R = 0.45;
const fresh = (low = false) => createBichNgocAura(low, { matches: false });

test('Bích Ngọc: rừng trúc, gió xoáy, chuông gió và nền đất có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = fresh();
  assert.equal(aura.points.name, 'bich-ngoc-aura');
  for (const t of [0, 2.5, 3, 5.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
    });
  }
  for (const name of ['bich-ngoc-culms', 'bich-ngoc-leaves', 'bich-ngoc-node-glow', 'bich-ngoc-wind', 'bich-ngoc-wind-bands',
    'bich-ngoc-whirl-leaves', 'bich-ngoc-wind-chime', 'bich-ngoc-chime-jade', 'bich-ngoc-wind-tag', 'bich-ngoc-wind-streaks',
    'bich-ngoc-jade-motes', 'bich-ngoc-moss-carpet', 'bich-ngoc-bamboo-shadow', 'bich-ngoc-moss-stones', 'bich-ngoc-shoots']) {
    assert.ok(one(aura, name), name);
  }
  // Thân trúc và lá có lớp thân (mực, normal blend) và lớp sáng; lá dùng chung ma trận instance.
  for (const name of ['bich-ngoc-culms', 'bich-ngoc-leaves', 'bich-ngoc-whirl-leaves']) {
    const [body, glow] = named(aura, name);
    assert.equal(body.material.uniforms.ink.value, 1);
    assert.equal(glow.material.uniforms.ink.value, 0);
    if (body.isInstancedMesh) assert.equal(body.instanceMatrix, glow.instanceMatrix);
  }
  assert.ok(one(aura, 'bich-ngoc-leaves').count >= 120, 'chùm lá dày');
  assert.ok(one(aura, 'bich-ngoc-whirl-leaves').count >= 40);
  aura.dispose();
});

test('Bích Ngọc: đúng bảng phân vai — không đĩa, vòng chữ, trận đồ, quạt, lưu quang, phiêu đái', () => {
  const aura = fresh();
  aura.points.traverse(o => assert.ok(!/mandala|rune|seal|disc|ring|fan|light-arcs|silk|sash|pond|ripple|moon|gate/.test(o.name), o.name));
  aura.dispose();
});

test('Bích Ngọc: bóng dáng riêng là rừng trúc thẳng đứng cao thấp vây ba phía, không xếp thành vòng tròn', () => {
  assert.ok(STALKS.length >= 8);
  const heights = STALKS.map(s => s.h), radii = STALKS.map(s => Math.hypot(s.x, s.z));
  assert.ok(Math.max(...heights) > 2.5 && Math.min(...heights) < 1.6, 'cao thấp, ngọn cao nhất vượt đầu xa');
  for (const s of STALKS) {
    assert.ok(Math.hypot(...s.lean) / s.h < 0.07, 'thân gần thẳng đứng');
    assert.ok(Math.abs(s.x) >= 0.6, 'không thân nào đứng trước mặt hay ngay sau đầu');
    assert.ok(s.r >= 0.045 || s.h < 1.3, 'thân trúc dày, đậm');
  }
  assert.ok(STALKS.some(s => s.x < -0.5) && STALKS.some(s => s.x > 0.5) && STALKS.some(s => s.z < -0.8), 'vây trái, phải, sau');
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.4, 'gốc trúc so le, không nằm trên một vòng tròn');
  // Khối 3D trải quanh người theo cả bề ngang lẫn chiều sâu (không phải tấm phẳng dựng sau lưng).
  const aura = fresh();
  const geo = one(aura, 'bich-ngoc-culms').geometry; geo.computeBoundingBox();
  const box = geo.boundingBox;
  assert.ok(box.min.x < -1.1 && box.max.x > 1.1 && box.min.z < -0.9 && box.max.z > 0.3 && box.max.y > 2.8);
  aura.dispose();
});

test('Bích Ngọc: vùng quanh đầu để trống — lá trúc, gió và vệt gió không đi ngang mặt', () => {
  const aura = fresh();
  for (const t of [0, 4, 9]) {
    aura.update(t);
    for (const name of ['bich-ngoc-leaves', 'bich-ngoc-wind-streaks']) {
      const mesh = one(aura, name), m = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i++) {
        const x = m[i * 16 + 12], y = m[i * 16 + 13];
        assert.ok(Math.hypot(x - HEAD[0], y - HEAD[1]) > HEAD_R, `${name}#${i} ở (${x.toFixed(2)}, ${y.toFixed(2)})`);
      }
    }
    for (let i = 0; i < aura.wind.count; i++) {
      const p = aura.wind.leafState(i);
      assert.ok(Math.abs(p.x) > 0.5 || p.y < 0.95, `lá cuốn #${i} ở (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
    }
  }
  const band = one(aura, 'bich-ngoc-wind-bands').geometry.attributes.position.array;
  for (let i = 1; i < band.length; i += 3) assert.ok(band[i] < 0.95, 'dải gió nằm dưới vai');
  aura.dispose();
});

test('Bích Ngọc: dải gió là đoạn xoắn hở hai đầu, không khép thành vòng', () => {
  for (const b of BANDS) {
    assert.ok(b.y[1] - b.y[0] > 0.25, 'dải dâng dần theo chiều cao');
    assert.ok(Math.abs(b.r[1] - b.r[0]) > 0.15, 'bán kính đổi dần');
  }
});

test('Bích Ngọc: nhịp thở tuần hoàn khép kín, thở ra thì gió dày hơn', () => {
  for (const k of ['phase', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(bichNgocRhythm(1.7)[k] - bichNgocRhythm(1.7 + BICH_NGOC_CYCLE * 5)[k]) < 1e-9);
  }
  const aura = fresh();
  const shown = t => { aura.update(t); let n = 0; for (let i = 0; i < aura.wind.count; i++) n += aura.wind.leafState(i).size; return n; };
  assert.ok(shown(BICH_NGOC_CYCLE * 0.45) > shown(BICH_NGOC_CYCLE * 0.9) * 1.1);
  const bandOpacity = t => { aura.update(t); return named(aura, 'bich-ngoc-wind-bands')[0].material.uniforms.opacity.value; };
  assert.ok(bandOpacity(BICH_NGOC_CYCLE * 0.45) > bandOpacity(BICH_NGOC_CYCLE * 0.9));
  aura.dispose();
});

test('Bích Ngọc: không có pha tăng tốc — gió quay đều, lá cuốn và lá trúc đi đều suốt nhịp', () => {
  const aura = fresh(), holder = one(aura, 'bich-ngoc-wind');
  const spin = t => { aura.update(t); const a = holder.rotation.y; aura.update(t + 0.1); return holder.rotation.y - a; };
  for (const t of [0, BICH_NGOC_CYCLE * 0.15, BICH_NGOC_CYCLE * 0.45, BICH_NGOC_CYCLE * 0.9]) assert.ok(Math.abs(spin(t) + WIND_SPIN * 0.1) < 1e-9);
  const step = (read, t) => { aura.update(t); const a = read(); aura.update(t + 0.05); const b = read(); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  const whirl = () => { const p = aura.wind.leafState(1); return [p.x, p.y, p.z]; };
  const leaf = () => [...one(aura, 'bich-ngoc-leaves').instanceMatrix.array.slice(12, 15)];
  for (const read of [whirl, leaf]) {
    const calm = step(read, BICH_NGOC_CYCLE * 0.95), peak = step(read, BICH_NGOC_CYCLE * 0.45);
    assert.ok(peak < calm * 1.6 + 1e-4, `đỉnh nhịp ${peak} so với lúc lắng ${calm}`);
  }
  // Trúc chỉ lay nhẹ: lá ở ngọn không bao giờ lệch quá 0.25 m so với chỗ mọc.
  const tips = []; for (let t = 0; t < BICH_NGOC_CYCLE * 2; t += 0.5) tips.push(leaf());
  const mid = tips.reduce((a, p) => a.map((v, i) => v + p[i] / tips.length), [0, 0, 0]);
  assert.ok(tips.every(p => Math.hypot(p[0] - mid[0], p[2] - mid[2]) < 0.25));
  aura.dispose();
});

test('Bích Ngọc: chất lượng thấp bỏ lớp sáng phụ, bóng trúc, đốt sáng, bớt dải gió và lá cuốn', () => {
  const full = fresh(), low = fresh(true);
  const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints) n++; }); return n; };
  assert.ok(draws(full) >= 15 && draws(full) <= 40, 'số lớp vẽ ' + draws(full));
  assert.ok(draws(low) <= draws(full) - 5, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  assert.equal(one(low, 'bich-ngoc-bamboo-shadow'), null);
  assert.equal(one(low, 'bich-ngoc-node-glow'), null);
  assert.equal(named(low, 'bich-ngoc-leaves').length, 1);
  assert.equal(named(low, 'bich-ngoc-wind-bands').length, 1);
  assert.ok(low.wind.count < full.wind.count);
  full.dispose(); low.dispose();
});

test('Bích Ngọc: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = fresh();
  aura.points.material.opacity = 0.45;
  aura.update(1);
  const [body] = named(aura, 'bich-ngoc-culms');
  assert.ok(Math.abs(body.material.uniforms.opacity.value - 0.95 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'bich-ngoc-wind-streaks').material.uniforms.opacity.value - 0.85 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'bich-ngoc-wind-tag').material.opacity - 0.5) < 1e-9);
  aura.dispose();
});

test('Bích Ngọc: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createBichNgocAura(false, motion);
  aura.update(10);
  const culm = one(aura, 'bich-ngoc-culms').material;
  assert.ok(Math.abs(culm.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'bich-ngoc-whirl-leaves').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(culm.uniforms.time.value, 10);
  aura.dispose();
});

test('Bích Ngọc: dispose giải phóng tài nguyên riêng, giữ hình lá, đá, măng, khung billboard và texture dùng chung', () => {
  const aura = fresh();
  const sharedGeo = new Set([bambooLeafGeometry(), mossStoneGeometry(), shootGeometry()]);
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
  assert.ok(shared.size >= 8);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Bích Ngọc: createEffect(6) dùng pháp tướng mới', () => {
  const aura = createEffect(6, false);
  assert.equal(aura.points.name, 'bich-ngoc-aura');
  aura.update(2);
  aura.dispose();
});

test('Bích Ngọc khi ngồi thiền: tòa rừng trúc và đá rêu riêng, không mượn đoá sen', () => {
  const tint = new Color('green'), accent = new Color('white');
  const bamboo = createManifestation(6, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of bamboo.layers.entries()) {
    assert.notEqual(mesh.geometry.attributes.position.count, lotus.layers[i].geometry.attributes.position.count);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  // Tầng 5 có trúc cao hơn đầu người ngồi; tầng 4 hở giữa ngay sau đầu.
  bamboo.layers[1].geometry.computeBoundingBox();
  assert.ok(bamboo.layers[1].geometry.boundingBox.max.y > 1.7);
  bamboo.dispose(); lotus.dispose();
});
