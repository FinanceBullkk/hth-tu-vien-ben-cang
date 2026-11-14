import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Color, Matrix4, NormalBlending, Vector3 } from 'three';
import { createSenKimAura, senKimRhythm, SEN_KIM_CYCLE } from '../client/src/player/vfx/sen-kim-aura.js';
import { TIERS, PETAL_COUNT, HEAD_Y, FACE_CLEAR, TOP_Y, petalBloom, petalPoint, petalTier } from '../client/src/player/vfx/sen-kim-layout.js';
import { petalGeometry, dishGeometry } from '../client/src/player/vfx/sen-kim-petal-geometry.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';
import { EFFECT_NAMES, AVATAR } from '../shared/protocol.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';

const make = (low = false) => createSenKimAura(low, { matches: false });
const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const instancePos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];
const shown = (mesh, i) => !mesh.instanceColor || mesh.instanceColor.array[i * 3] > 0.01;
const MOVERS = ['sen-kim-petals', 'sen-kim-dew', 'sen-kim-pollen', 'sen-kim-stamen-tips'];
// Mọi điểm đang hiện của aura (tâm instance), toạ độ thế giới (group ở gốc).
function points(aura) {
  const out = [];
  for (const name of MOVERS) {
    const mesh = one(aura, name);
    if (!mesh) continue;
    for (let i = 0; i < mesh.count; i++) if (shown(mesh, i)) out.push([name, ...instancePos(mesh, i)]);
  }
  return out;
}
const SOLID = ['sen-kim-petals', 'sen-kim-dish'];

test('Sen kim: đài sen, nhụy, hoạt lộ, bụi vàng có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = make();
  assert.equal(aura.points.name, 'sen-kim-aura');
  for (const t of [0, 2.5, 7.4, 13.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      // Chỉ thân cánh và đế đài ghi depth (đọc khối thật); lớp sáng không ghi.
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, SOLID.includes(o.name), o.name);
    });
  }
  for (const name of ['sen-kim-ground-shadow', 'sen-kim-ground-light', 'sen-kim-dish', 'sen-kim-petals',
    'sen-kim-petals-rim', 'sen-kim-petals-relief', 'sen-kim-stamen-core', 'sen-kim-stamens',
    'sen-kim-stamen-tips', 'sen-kim-dew', 'sen-kim-pollen']) assert.ok(one(aura, name), name);
  // Đài sen thật sự là khối: 26 cánh ba tầng, cánh thân đặc normal blend.
  const petals = one(aura, 'sen-kim-petals');
  assert.equal(petals.count, PETAL_COUNT);
  assert.equal(TIERS.reduce((s, t) => s + t.n, 0), 26);
  assert.equal(petals.material.blending, NormalBlending);
  assert.equal(one(aura, 'sen-kim-petals-relief').instanceMatrix, petals.instanceMatrix);
  assert.equal(one(aura, 'sen-kim-petals-rim').instanceMatrix, petals.instanceMatrix);
  assert.ok(draws(aura) >= 10 && draws(aura) <= 40, 'số lớp vẽ ' + draws(aura));
  aura.dispose();
});

test('Sen kim: đúng bảng phân vai — không mandala, vòng chữ, trận đồ, trụ, vòm, kiếm, lụa, cánh chim hay trăng', () => {
  const aura = make();
  aura.points.traverse(o => assert.ok(
    !/mandala|wheel|disc|rune|seal|glyph|trigram|sword|blade|light-arcs|silk|wing|feather|pillar|moon|eclipse|dome|cylinder/.test(o.name), o.name));
  aura.dispose();
});

test('Sen kim: bóng dáng riêng là đài sen RỘNG và THẤP ôm chân, không gì cao quá vai', () => {
  const aura = make();
  for (const t of [0, 3.3, SEN_KIM_CYCLE * 0.45, 40]) {
    aura.update(t);
    // Hộp bao của cả đài sen (8 góc hình cánh qua ma trận từng instance).
    const petals = one(aura, 'sen-kim-petals'), geo = petalGeometry().boundingBox, dais = new Box3(), m = new Matrix4();
    for (let i = 0; i < PETAL_COUNT; i++) {
      petals.getMatrixAt(i, m);
      for (const x of [geo.min.x, geo.max.x]) for (const y of [geo.min.y, geo.max.y]) for (const z of [geo.min.z, geo.max.z]) {
        dais.expandByPoint(new Vector3(x, y, z).applyMatrix4(m));
      }
    }
    const width = Math.min(dais.max.x - dais.min.x, dais.max.z - dais.min.z), height = dais.max.y - dais.min.y;
    assert.ok(width > 2.0 && height < 0.7, `rộng ${width.toFixed(2)} cao ${height.toFixed(2)}`);
    assert.ok(width / height > 3, 'tỉ lệ ngang/cao ' + (width / height).toFixed(2));
    assert.ok(dais.min.y > -0.05, 'đài sen đặt trên mặt đất');
    // Toàn bộ aura nằm dưới vai: không trụ sáng, không khung dựng sau lưng hay trên đầu.
    for (const [name, , y] of points(aura)) assert.ok(y < TOP_Y, `${name} cao ${y.toFixed(2)}`);
  }
  aura.dispose();
});

test('Sen kim: vùng quanh mặt để trống — cánh, hoạt lộ hay bụi nào không đè ngang mặt', () => {
  const aura = make();
  for (let t = 0; t < SEN_KIM_CYCLE; t += 0.37) {
    aura.update(t);
    for (const [name, x, y, z] of points(aura)) {
      if (z > -0.3) assert.ok(Math.hypot(x, y - HEAD_Y) > FACE_CLEAR, `${name} ở (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) lúc ${t}`);
    }
  }
  // Bồ nhụy nằm hẳn sau lưng, không bao giờ lọt vào vùng mặt.
  const stamens = one(aura, 'sen-kim-stamens').geometry.attributes.position.array;
  for (let i = 0; i < stamens.length; i += 3) assert.ok(stamens[i + 2] < -0.3, 'sợi nhụy phía sau');
  aura.dispose();
});

test('Sen kim: cánh nở lệch nhịp — từng cánh một pha, chu kỳ trọn vẹn', () => {
  for (let t of [2.3, 7.9]) {
    t = t % SEN_KIM_CYCLE;
    const blooms = Array.from({ length: PETAL_COUNT }, (_, i) => petalBloom(i, t));
    assert.ok(new Set(blooms.map(b => b.toFixed(3))).size > 8, 'các cánh lệch pha nhau');
    const { index } = petalTier(12); // cánh đầu tầng giữa
    assert.ok(index === 1);
  }
  for (const i of [0, 13, 25]) {
    assert.ok(Math.abs(petalBloom(i, 2.3) - petalBloom(i, 2.3 + SEN_KIM_CYCLE * 4)) < 1e-9);
  }
  // Cánh tầng ngoài ngả nhiều hơn tầng trong (xòe rộng ôm chân).
  assert.ok(TIERS[0].lean > TIERS[2].lean);
});

test('Sen kim: hoạt lộ bám gân cánh rồi rụng khỏi ngọn, không chạm đất', () => {
  const aura = make();
  aura.update(4.1);
  const dew = one(aura, 'sen-kim-dew');
  const p = new Vector3(), at = v => { petalPoint(3, v, 4.1, p); return p.y; };
  assert.ok(at(1) > 0.25, 'ngọn cánh trên mặt đất');
  assert.ok(at(1.4) < at(1), 'rơi xuống sau khi vượt ngọn');
  assert.ok([...dew.instanceMatrix.array].every(Number.isFinite));
  aura.dispose();
});

test('Sen kim: nhịp thở tuần hoàn, đài toả rộng khi thở ra', () => {
  for (const k of ['phase', 'gather', 'release', 'pulse']) {
    assert.ok(Math.abs(senKimRhythm(2.3)[k] - senKimRhythm(2.3 + SEN_KIM_CYCLE * 4)[k]) < 1e-9);
  }
  const aura = make();
  const radius = t => { aura.update(t); const [x, , z] = instancePos(one(aura, 'sen-kim-petals'), 0); return Math.hypot(x, z); };
  assert.ok(radius(SEN_KIM_CYCLE * 0.15) < radius(SEN_KIM_CYCLE * 0.45), 'cánh khép khi hít, toả khi thở');
  aura.dispose();
});

test('Sen kim: không có pha tăng tốc — mọi thứ là hàm thuần của thời gian', () => {
  const a = make(), b = make();
  for (let t = 0; t < 6; t += 0.25) a.update(t);
  b.update(5.75);
  for (const name of MOVERS) assert.deepEqual([...one(a, name).instanceMatrix.array], [...one(b, name).instanceMatrix.array], name);
  const meanSpeed = (name, t) => {
    const mesh = one(a, name);
    a.update(t); const before = Array.from({ length: mesh.count }, (_, i) => [instancePos(mesh, i), shown(mesh, i)]);
    a.update(t + 0.05);
    let sum = 0, n = 0;
    before.forEach(([p, seen], i) => {
      if (!seen || !shown(mesh, i)) return;
      const q = instancePos(mesh, i), v = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) / 0.05;
      assert.ok(v < 0.6, `${name}#${i} trôi ${v.toFixed(2)} m/s`);
      sum += v; n++;
    });
    return sum / n;
  };
  // Đầu nhụy sáng đứng yên chỉ lấp lánh alpha — không đưa vào đo tốc độ.
  for (const name of ['sen-kim-petals', 'sen-kim-dew', 'sen-kim-pollen']) {
    const peak = [], calm = [];
    for (let i = 0; i < 300; i++) {
      const t = i * SEN_KIM_CYCLE * 2 / 300, pulse = senKimRhythm(t).pulse;
      if (pulse > 0.8) peak.push(meanSpeed(name, t)); else if (pulse < 0.1) calm.push(meanSpeed(name, t));
    }
    const avg = list => list.reduce((s, v) => s + v, 0) / list.length;
    assert.ok(peak.length > 5 && calm.length > 5);
    assert.ok(avg(peak) < avg(calm) * 1.25, `${name}: đỉnh ${avg(peak)} so với lắng ${avg(calm)}`);
  }
  a.dispose(); b.dispose();
});

test('Sen kim: chất lượng thấp bỏ lớp gân nổi, đầu nhụy sáng, giảm hạt', () => {
  const full = make(), low = make(true);
  assert.equal(draws(low), draws(full) - 2, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['sen-kim-petals-relief', 'sen-kim-stamen-tips']) assert.equal(one(low, name), null, name);
  for (const name of ['sen-kim-petals', 'sen-kim-petals-rim', 'sen-kim-dish', 'sen-kim-stamens']) assert.ok(one(low, name), name);
  assert.ok(one(low, 'sen-kim-pollen').count < one(full, 'sen-kim-pollen').count);
  assert.ok(one(low, 'sen-kim-dew').count < one(full, 'sen-kim-dew').count);
  full.dispose(); low.dispose();
});

test('Sen kim: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45; // f = 0.45 / 0.9 (BASE_OPACITY) = 0.5
  aura.update(SEN_KIM_CYCLE * 0.7); // ngoài đỉnh nhịp: gather ≈ 0
  assert.ok(Math.abs(one(aura, 'sen-kim-petals').material.uniforms.opacity.value - 0.96 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'sen-kim-dish').material.uniforms.opacity.value - 0.5) < 1e-9);
  assert.ok(one(aura, 'sen-kim-petals-rim').material.uniforms.opacity.value < 0.55 * 0.5 + 0.001);
  aura.dispose();
});

test('Sen kim: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createSenKimAura(false, motion);
  aura.update(10);
  const dish = one(aura, 'sen-kim-dish').material;
  assert.ok(Math.abs(dish.uniforms.time.value - 10 / 3) < 1e-9);
  assert.ok(one(aura, 'sen-kim-petals').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(dish.uniforms.time.value, 10);
  aura.dispose();
});

test('Sen kim: dispose giải phóng tài nguyên riêng, giữ hình cánh, đế đài, khung billboard và hoa văn dùng chung', () => {
  const aura = make();
  const sharedGeo = new Set([petalGeometry(), petalGeometry(true), dishGeometry(), dishGeometry(true)]);
  const owned = new Set([aura.points.material]), shared = new Set(sharedGeo);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && !sharedGeo.has(o.geometry)) owned.add(o.geometry);
    if (o.material) owned.add(o.material);
    for (const u of Object.values(o.material?.uniforms ?? {})) if (u.value?.isTexture) shared.add(u.value);
    if (o.material?.map) shared.add(o.material.map);
  });
  let disposed = 0, sharedDisposed = 0;
  owned.forEach(o => o.addEventListener('dispose', () => disposed++));
  shared.forEach(o => o.addEventListener('dispose', () => sharedDisposed++));
  assert.ok(shared.size >= 4);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Sen kim: createEffect(1) dùng pháp tướng mới; danh sách hệ không đổi (protocol append-only)', () => {
  const aura = createEffect(1, false);
  assert.equal(aura.points.name, 'sen-kim-aura');
  aura.update(2);
  aura.dispose();
  assert.equal(EFFECT_NAMES[1], 'Sen kim');
  assert.equal(EFFECT_NAMES.length, 13);
  assert.equal(AVATAR.effects, EFFECT_NAMES.length);
  assert.equal(AURA_TITLES.length, AVATAR.effects);
});

test('Sen kim khi ngồi thiền: tòa đài sen riêng hai tầng cánh, không mượn đoá sen chung', () => {
  const tint = new Color('red'), accent = new Color('gold');
  const sen = createManifestation(1, tint, accent), lotus = createManifestation(0, tint, accent), hong = createManifestation(4, tint, accent);
  for (const [i, mesh] of sen.layers.entries()) {
    const pos = mesh.geometry.attributes.position.array;
    assert.notEqual(pos.length, hong.layers[i].geometry.attributes.position.array.length);
    assert.notEqual(pos.length, lotus.layers[i].geometry.attributes.position.array.length);
    // Không có gì dựng cao sau lưng hay trên đầu (đầu người ngồi ở y ≈ 0.8).
    for (let k = 0; k < pos.length; k += 3) assert.ok(Number.isFinite(pos[k]) && pos[k + 1] < 0.6 && Math.abs(pos[k]) < 1.5);
  }
  sen.dispose(); hong.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 1);
    assert.equal(aura.uniforms.theme.value, 1);
    assert.notEqual(aura.uniforms.tint.value.getHexString(), new CultivationAura(false, 0).uniforms.tint.value.getHexString());
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
