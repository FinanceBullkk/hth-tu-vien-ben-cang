import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Group, NormalBlending, Quaternion, Vector3 } from 'three';
import { createTinhHaAura, tinhHaRhythm, TINH_HA_CYCLE } from '../client/src/player/vfx/tinh-ha-aura.js';
import { createCelestialSphere, SPIN } from '../client/src/player/vfx/tinh-ha-celestial-sphere.js';
import { lineLit, CONSTELLATION_LINES } from '../client/src/player/vfx/tinh-ha-constellations.js';
import { createMeteors, METEOR_SPEED } from '../client/src/player/vfx/tinh-ha-meteors.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const named = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
const LAYERS = ['tinh-ha-armillary', 'tinh-ha-pole-stars', 'tinh-ha-planets', 'tinh-ha-veil', 'tinh-ha-mansion-stars',
  'tinh-ha-ecliptic-dust', 'tinh-ha-constellation-lines', 'tinh-ha-constellation-stars', 'tinh-ha-ground-chart',
  'tinh-ha-meteors', 'tinh-ha-meteor-heads', 'tinh-ha-nebulae', 'tinh-ha-stars', 'tinh-ha-stardust', 'tinh-ha-star-sand', 'tinh-ha-motes'];
// Các lớp nằm trên vỏ thiên cầu (bao quanh người) — bắt buộc chừa mặt trong shader.
const SHELL = ['tinh-ha-armillary', 'tinh-ha-pole-stars', 'tinh-ha-planets', 'tinh-ha-veil', 'tinh-ha-mansion-stars',
  'tinh-ha-ecliptic-dust', 'tinh-ha-constellation-lines', 'tinh-ha-constellation-stars'];
// Số lớp vẽ (mỗi Mesh, InstancedMesh hay Points là một lần vẽ; material chủ không vẽ).
const drawCount = aura => { let n = 0; aura.points.traverse(o => { if (o.isMesh || o.isPoints) n++; }); return n; };
// Lớp mực: nét (Mesh thường, không phải billboard) vẽ normal blending.
const inkLayers = aura => { let n = 0; aura.points.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.material?.blending === NormalBlending) n++; }); return n; };
const COLORS = { steel: new Color(), edge: new Color(), core: new Color(), gold: new Color() };

test('Tinh Hà: createEffect(3) trả thiên cầu riêng, mọi lớp có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = createEffect(3);
  assert.equal(aura.points.name, 'tinh-ha-aura');
  aura.dispose();
  const own = createTinhHaAura(false, { matches: false });
  for (const name of LAYERS) assert.ok(named(own, name), name);
  for (const t of [0, 2.5, 3, 5.1, 7.7, 13.9, 1234567]) {
    own.update(t);
    own.points.traverse(o => {
      if (o.isInstancedMesh) {
        assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
        assert.ok([...o.instanceColor.array].every((v, i) => Number.isFinite(v) && (i % 3 || v >= 0)), o.name); // r = độ đậm
      } else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== own.points) assert.equal(o.material.depthWrite, false);
    });
  }
  const draws = drawCount(own);
  assert.ok(draws >= 20 && draws <= 40, 'số lớp vẽ ' + draws);
  own.dispose();
});

test('Tinh Hà: thiên cầu bao trọn người — vòng ngoài ôm cả đầu lẫn chân', () => {
  const aura = createTinhHaAura(false, { matches: false });
  aura.update(3);
  const pos = named(aura, 'tinh-ha-armillary').geometry.attributes.position.array;
  let minY = Infinity, maxY = -Infinity, maxR = 0;
  for (let i = 0; i < pos.length; i += 3) {
    minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]); maxR = Math.max(maxR, Math.hypot(pos[i], pos[i + 2]));
  }
  assert.ok(minY < 0.2 && maxY > 2.4 && maxR > 1.3, `cầu y ${minY.toFixed(2)}..${maxY.toFixed(2)}, r ${maxR.toFixed(2)}`);
  aura.dispose();
});

test('Tinh Hà: chừa mặt — mọi lớp trên vỏ cầu mờ theo vị trí đầu, đầu đi theo nhân vật', () => {
  const aura = createTinhHaAura(false, { matches: false });
  aura.points.position.set(4, 0, -2); aura.points.updateMatrixWorld(true);
  aura.update(1);
  for (const name of SHELL) {
    const m = named(aura, name).material;
    assert.ok(m.vertexShader.includes('faceFade'), name + ' không có chừa mặt');
    assert.ok(m.uniforms.head.value.distanceTo(new Vector3(4, 1.42, -2)) < 1e-9, name);
  }
  aura.dispose();
});

test('Tinh Hà: lớp ngoài vỏ cầu (lưu tinh, sao nền) không bao giờ đè lên mặt từ trước và hai góc chéo', () => {
  const aura = createTinhHaAura(false, { matches: false });
  const v = new Vector3();
  const overFace = (x, y, z, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle), rz = -s * x + c * z, rx = c * x + s * z;
    if (rz < 0.2) return false; // sau mặt phẳng mặt thì đầu che
    const k = 7 / (7 - rz);
    return Math.hypot(rx * k, 2.6 + (y - 2.6) * k - 1.4) < 0.32;
  };
  for (let t = 0; t < TINH_HA_CYCLE * 3; t += 0.41) {
    aura.update(t);
    const pos = named(aura, 'tinh-ha-meteors').geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      for (const angle of [0, -0.7, 0.7]) assert.ok(!overFace(pos[i], pos[i + 1], pos[i + 2], angle), `lưu tinh t=${t.toFixed(2)}`);
    }
    const stars = named(aura, 'tinh-ha-stars');
    for (let i = 0; i < stars.count; i++) {
      v.setFromMatrixPosition({ elements: stars.instanceMatrix.array.slice(i * 16, i * 16 + 16) });
      assert.ok(v.z < 0, 'sao nền chỉ ở nửa sau');
    }
  }
  aura.dispose();
});

test('Tinh Hà: quay đa trục — ba bộ vòng quay quanh ba trục khác nhau, tốc độ góc cố định suốt nhịp', () => {
  const sphere = createCelestialSphere(new Group(), COLORS, false, new Vector3());
  const rotationAt = (set, t) => {
    sphere.update(t, tinhHaRhythm(t), 1);
    const q = new Quaternion(); sphere.frames[set].decompose(new Vector3(), q, new Vector3()); return q;
  };
  const angle = q => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  const axes = {};
  for (const set of ['a', 'b', 'c']) {
    const step = t => { const q0 = rotationAt(set, t), q1 = rotationAt(set, t + 1); return q0.invert().premultiply(q1); };
    const calm = step(TINH_HA_CYCLE * 0.95), peak = step(TINH_HA_CYCLE * 0.45);
    assert.ok(Math.abs(angle(calm) - Math.abs(SPIN[set])) < 1e-6, `${set}: ${angle(calm)}`);
    assert.ok(Math.abs(angle(peak) - angle(calm)) < 1e-6, `${set}: tăng tốc ở đỉnh nhịp`);
    axes[set] = new Vector3(peak.x, peak.y, peak.z).normalize();
  }
  for (const [x, y] of [['a', 'b'], ['a', 'c'], ['b', 'c']]) {
    assert.ok(Math.acos(Math.abs(axes[x].dot(axes[y]))) > 0.3, `trục ${x} và ${y} quá gần nhau`);
  }
  sphere.dispose();
});

test('Tinh Hà: nhịp thở 14 giây — chòm sao nối nét lần lượt rồi tan, tuần hoàn khép kín', () => {
  assert.equal(TINH_HA_CYCLE, 14);
  const lit = phase => Array.from({ length: CONSTELLATION_LINES }, (_, k) => lineLit(phase, k));
  assert.ok(lit(0.05).every(v => v === 0));
  const mid = lit(0.4);
  assert.ok(mid[0] === 1 && mid.at(-1) < 1, 'nét đầu xong trước nét cuối');
  for (let k = 1; k < mid.length; k++) assert.ok(mid[k] <= mid[k - 1]);
  assert.ok(lit(0.78).every(v => v === 1));
  const aura = createTinhHaAura(false, { matches: false }), lines = named(aura, 'tinh-ha-constellation-lines');
  aura.update(TINH_HA_CYCLE * 0.5); assert.ok(lines.material.uniforms.glow.value > 0.99);
  aura.update(TINH_HA_CYCLE * 0.99); assert.ok(lines.material.uniforms.glow.value < 0.01, 'nét tan hết trước khi vẽ lại');
  for (const k of ['phase', 'release', 'sweepOn', 'pulse']) {
    assert.ok(Math.abs(tinhHaRhythm(1.7)[k] - tinhHaRhythm(1.7 + TINH_HA_CYCLE * 5)[k]) < 1e-9);
  }
  aura.dispose();
});

test('Tinh Hà: lưu tinh đi tốc độ cố định, không có pha tăng tốc', () => {
  const meteors = createMeteors(new Group(), COLORS, false);
  for (let i = 0; i < 4; i++) {
    for (let t = 0; t < 40; t += 0.7) {
      const d = meteors.headAt(i, t).distanceTo(meteors.headAt(i, t + 0.1));
      assert.ok(Math.abs(d - METEOR_SPEED * 0.1) < 1e-6 || d > 1, `sao băng ${i} t=${t}: ${d}`);
    }
  }
  meteors.dispose();
});

test('Tinh Hà: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = createTinhHaAura(false, { matches: false });
  aura.points.material.opacity = 0.45;
  aura.update(1);
  assert.ok(Math.abs(named(aura, 'tinh-ha-constellation-lines').material.uniforms.opacity.value - 0.95 * 0.5) < 1e-9);
  assert.ok(Math.abs(named(aura, 'tinh-ha-veil').material.uniforms.opacity.value - 0.5) < 1e-9);
  assert.ok(Math.abs(named(aura, 'tinh-ha-stars').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Tinh Hà: chất lượng thấp bớt vòng, sao băng, bụi sao và bỏ lớp mực', () => {
  const high = createTinhHaAura(false, { matches: false }), low = createTinhHaAura(true, { matches: false });
  assert.ok(inkLayers(high) >= 4, 'bản cao có lớp mực');
  assert.equal(inkLayers(low), 0);
  assert.equal(named(low, 'tinh-ha-meteor-heads').count, 2);
  assert.ok(named(low, 'tinh-ha-ecliptic-dust').count < named(high, 'tinh-ha-ecliptic-dust').count);
  const vertices = aura => named(aura, 'tinh-ha-armillary').geometry.attributes.position.count;
  assert.ok(vertices(low) < vertices(high));
  assert.ok(drawCount(low) < drawCount(high));
  high.dispose(); low.dispose();
});

test('Tinh Hà: giảm chuyển động làm chậm chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createTinhHaAura(false, motion), lines = named(aura, 'tinh-ha-constellation-lines');
  aura.update(10);
  assert.ok(Math.abs(lines.material.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(aura.points.visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(lines.material.uniforms.time.value, 10);
  aura.dispose();
});

test('Tinh Hà: dispose giải phóng tài nguyên riêng, giữ khung billboard, chấm sáng và hoa văn dùng chung', () => {
  const aura = createTinhHaAura(false, { matches: false });
  const owned = new Set([aura.points.material]), shared = new Set();
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry) owned.add(o.geometry);
    if (o.material) owned.add(o.material);
    if (o.material?.uniforms?.map) shared.add(o.material.uniforms.map.value);
    if (o.material?.map) shared.add(o.material.map);
  });
  let disposed = 0, sharedDisposed = 0;
  owned.forEach(o => o.addEventListener('dispose', () => disposed++));
  shared.forEach(o => o.addEventListener('dispose', () => sharedDisposed++));
  assert.ok(shared.size >= 6);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Tinh Hà khi ngồi thiền: tòa thiên cầu riêng, Bắc Đẩu giữ lại ở tầng 5, không che mặt', () => {
  const tint = new Color('#a9bfff'), accent = new Color('white');
  const star = createManifestation(3, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of star.layers.entries()) {
    assert.notEqual(mesh.geometry, lotus.layers[i].geometry);
    const pos = mesh.geometry.attributes.position.array;
    assert.ok([...pos].every(v => Number.isFinite(v) && Math.abs(v) < 4));
    // Ngay trước mặt người ngồi (đầu khoảng y 1.0) không có hình nào.
    for (let k = 0; k < pos.length; k += 3) {
      assert.ok(!(pos[k + 2] > 0.2 && Math.abs(pos[k]) < 0.3 && pos[k + 1] > 0.75 && pos[k + 1] < 1.3), `tầng ${i + 3}`);
    }
  }
  star.update(5, 1, 1, 1);
  assert.deepEqual(star.layers.map(m => m.visible), [true, true, true]);
  star.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 3);
    assert.equal(aura.effect, 3);
    assert.equal(aura.uniforms.theme.value, 3);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
