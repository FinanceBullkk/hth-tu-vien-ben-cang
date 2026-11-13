import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, NormalBlending, Vector3 } from 'three';
import { createLongQuyenAura, longQuyenRhythm, LONG_QUYEN_CYCLE } from '../client/src/player/vfx/long-quyen-aura.js';
import { spinePoint, spineRadius, COIL_END, HEAD_Y, FACE_CLEAR } from '../client/src/player/vfx/long-quyen-spine.js';
import { dragonGeometry } from '../client/src/player/vfx/long-quyen-body-geometry.js';
import { dragonHeadGeometry } from '../client/src/player/vfx/long-quyen-head-geometry.js';
import { sealPlacement } from '../client/src/player/vfx/long-quyen-fist-seal.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const make = (low = false) => createLongQuyenAura(low, { matches: false });
const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const MOVERS = ['long-quyen-tongues', 'long-quyen-embers', 'long-quyen-mane', 'long-quyen-breath', 'long-quyen-crack-embers'];
const instancePos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];
const shown = (mesh, i) => mesh.instanceColor.array[i * 3] > 0.01;
const spine = (n = 400) => Array.from({ length: n + 1 }, (_, i) => ({ s: i / n, p: spinePoint(i / n) }));

test('Long Quyền: thân rồng, đầu, ấn quyền và nền nứt có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = make();
  assert.equal(aura.points.name, 'long-quyen-aura');
  for (const t of [0, 2.5, 7.4, 13.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
    });
  }
  for (const name of ['long-quyen-body', 'long-quyen-body-ink', 'long-quyen-fins', 'long-quyen-fins-ink', 'long-quyen-head',
    'long-quyen-head-glow', 'long-quyen-head-ink', 'long-quyen-horns', 'long-quyen-eyes', 'long-quyen-qi-trail',
    'long-quyen-fist-seal', 'long-quyen-seal-lines', 'long-quyen-seal-halo', 'long-quyen-fist-rings', 'long-quyen-ground-scorch',
    'long-quyen-ground-glow', 'long-quyen-cracks', 'long-quyen-cracks-ink', 'long-quyen-rubble', ...MOVERS]) assert.ok(one(aura, name), name);
  assert.ok(draws(aura) >= 20 && draws(aura) <= 40, 'số lớp vẽ ' + draws(aura));
  aura.dispose();
});

test('Long Quyền: đúng bảng phân vai — không mandala, vòng chữ, kiếm, lưu quang, phiêu đái, cánh, mây, sen hay long châu', () => {
  const aura = make();
  aura.update(1);
  aura.points.traverse(o => assert.ok(!/mandala|rune|glyph|trigram|sword|blade|light-arcs|silk|moon|pond|ripple|petal|wing|feather|cloud|pearl|orb|lotus|disc/.test(o.name), o.name));
  // Không đĩa sau lưng: mọi tấm phẳng hoặc nằm sát đất, hoặc là ấn quyền dựng ở phía TRƯỚC.
  aura.points.traverse(o => {
    if (!o.isMesh || o.geometry.type !== 'PlaneGeometry' || MOVERS.includes(o.name)) return;
    const p = o.getWorldPosition(new Vector3());
    assert.ok(p.y < 0.05 || p.z > 0.8, `${o.name || o.parent.name} ở (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
  });
  aura.dispose();
});

test('Long Quyền: bóng dáng riêng — rồng thân dày xoắn ốc từ chân lên quanh thân rồi vươn ra trước theo tay phải', () => {
  const pts = spine();
  assert.ok(pts[0].p.y < 0.02, 'đuôi trồi lên từ đất');
  // Xoắn ốc: góc quanh trục đứng quét hơn 1,4 vòng trên đoạn xoắn, độ cao tăng dần lên ngang ngực.
  let sweep = 0;
  for (let i = 1; pts[i].s <= COIL_END; i++) {
    let d = Math.atan2(pts[i].p.x, pts[i].p.z) - Math.atan2(pts[i - 1].p.x, pts[i - 1].p.z);
    d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2; sweep += d;
  }
  assert.ok(Math.abs(sweep) > Math.PI * 2 * 1.4, 'quét ' + (sweep / Math.PI / 2).toFixed(2) + ' vòng');
  const coilTop = spinePoint(COIL_END);
  assert.ok(coilTop.y > 0.7 && coilTop.y < 1 && Math.hypot(coilTop.x, coilTop.z) < 0.7, 'xoắn ôm thân lên ngang ngực');
  // Lốc cuộn: chân xoắn rộng gần gấp rưỡi phần ngực; không đoạn nào lên quá ngang vai sau gáy
  // (nhìn chính diện không thành vòng tròn quanh đầu).
  assert.ok(Math.hypot(pts[0].p.x, pts[0].p.z) > 0.85);
  assert.ok(spine().every(q => q.p.y < HEAD_Y - 0.03), 'không dâng lên ngang đầu');
  // Vươn quyền: gáy rồng ở phía trước, bên tay phải (+x), ngang vai; ấn quyền còn xa hơn về phía trước.
  const neck = spinePoint(1), { center, dir } = sealPlacement();
  assert.ok(neck.z > 0.5 && neck.x > 0.3 && neck.y > 0.65 && neck.y < 0.95, `gáy ở ${neck.toArray().map(v => v.toFixed(2))}`);
  assert.ok(dir.z > 0.9 && center.z > neck.z + 0.6);
  // Thân dày: đường kính giữa thân gần 0,17 (không phải sợi khí mảnh).
  assert.ok(spineRadius(0.5) > 0.08 && spineRadius(0.02) < 0.04);
  // Khác Kim Long: thân rồng không bao giờ vắt vòm qua đầu.
  assert.ok(Math.max(...pts.map(q => q.p.y)) < HEAD_Y, 'không vòm qua đầu');
  const aura = make(); aura.update(1);
  const head = one(aura, 'long-quyen-head'), face = new Vector3(0, 0, 1).applyQuaternion(head.quaternion);
  assert.ok(face.z > 0.9, 'đầu rồng hướng theo cú tung quyền');
  aura.dispose();
});

test('Long Quyền: vùng quanh mặt để trống — thân, lửa, tàn lửa và bờm không đè ngang mặt', () => {
  for (const { s, p } of spine()) {
    if (p.z > -0.3) assert.ok(Math.hypot(p.x, p.y - HEAD_Y) - spineRadius(s) > 0.33, `thân tại s=${s.toFixed(3)}`);
  }
  const aura = make();
  for (let t = 0; t < LONG_QUYEN_CYCLE; t += 0.37) {
    aura.update(t);
    for (const name of MOVERS) {
      const mesh = one(aura, name);
      for (let i = 0; i < mesh.count; i++) {
        const [x, y, z] = instancePos(mesh, i);
        if (z > -0.3 && shown(mesh, i)) assert.ok(Math.hypot(x, y - HEAD_Y) > FACE_CLEAR, `${name}#${i} ở (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) lúc ${t}`);
      }
    }
  }
  aura.dispose();
});

test('Long Quyền: cuộn lên — lưỡi lửa trôi dọc thân từ đuôi về đầu, vảy trôi cùng chiều', () => {
  const pts = spine(800), aura = make(), tongues = one(aura, 'long-quyen-tongues');
  const nearest = ([x, y, z]) => pts.reduce((best, q) => {
    const d = Math.hypot(q.p.x - x, q.p.y - y, q.p.z - z); return d < best.d ? { d, s: q.s } : best;
  }, { d: Infinity, s: 0 }).s;
  let rising = 0;
  for (let i = 0; i < tongues.count; i++) {
    aura.update(3); const a = nearest(instancePos(tongues, i));
    aura.update(4); const b = nearest(instancePos(tongues, i));
    if (Math.abs(b - a) < 0.2) { assert.ok(b > a, `lưỡi lửa #${i}: ${a} → ${b}`); rising++; }
  }
  assert.ok(rising > tongues.count * 0.8);
  aura.dispose();
});

test('Long Quyền: nhịp thở tuần hoàn — dải sáng chạy từ đuôi lên đầu, ấn quyền sáng dịu khi dải sáng tới nơi', () => {
  for (const k of ['phase', 'gather', 'release', 'surgePos', 'surgeOn', 'strike']) {
    assert.ok(Math.abs(longQuyenRhythm(2.3)[k] - longQuyenRhythm(2.3 + LONG_QUYEN_CYCLE * 4)[k]) < 1e-9, k);
  }
  const at = p => longQuyenRhythm(p * LONG_QUYEN_CYCLE);
  assert.ok(at(0.3).surgePos < at(0.45).surgePos && at(0.45).surgePos < at(0.6).surgePos);
  assert.ok(at(0.4).surgeOn > 0.99 && at(0.05).surgeOn < 0.01);
  const aura = make(), seal = one(aura, 'long-quyen-fist-seal');
  const lit = p => { aura.update(p * LONG_QUYEN_CYCLE); return one(aura, 'long-quyen-seal-halo').material.opacity; };
  assert.ok(lit(0.7) > lit(0.15) * 1.3);
  aura.update(0.7 * LONG_QUYEN_CYCLE);
  assert.ok(seal.scale.x < 1.06, 'ấn chỉ phồng nhẹ');
  aura.dispose();
});

test('Long Quyền: không có pha tăng tốc — vật trôi là hàm thuần của thời gian, tốc độ chậm đều', () => {
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
      assert.ok(v < 1.2, `${name}#${i} trôi ${v.toFixed(2)} m/s`);
      sum += v; n++;
    });
    return sum / n;
  };
  for (const name of MOVERS) {
    const peak = [], calm = [];
    for (let i = 0; i < 300; i++) {
      const t = i * LONG_QUYEN_CYCLE * 2 / 300, r = longQuyenRhythm(t);
      if (r.release > 0.8 || r.strike > 0.8) peak.push(meanSpeed(name, t)); else if (r.release < 0.1 && r.strike < 0.1) calm.push(meanSpeed(name, t));
    }
    const avg = list => list.reduce((s, v) => s + v, 0) / list.length;
    assert.ok(peak.length > 5 && calm.length > 5);
    assert.ok(avg(peak) < avg(calm) * 1.2, `${name}: đỉnh ${avg(peak)} so với lắng ${avg(calm)}`);
  }
  a.dispose(); b.dispose();
});

test('Long Quyền: chất lượng thấp bỏ lớp mực, long khí, đá vỡ và tàn lửa khe nứt', () => {
  const full = make(), low = make(true);
  assert.ok(draws(low) <= draws(full) - 6, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['long-quyen-body-ink', 'long-quyen-fins-ink', 'long-quyen-head-ink', 'long-quyen-cracks-ink',
    'long-quyen-qi-trail', 'long-quyen-rubble', 'long-quyen-crack-embers']) assert.equal(one(low, name), null, name);
  for (const name of ['long-quyen-body', 'long-quyen-fins', 'long-quyen-head-glow', 'long-quyen-fist-seal', 'long-quyen-cracks']) assert.ok(one(low, name), name);
  assert.ok(one(low, 'long-quyen-tongues').count < one(full, 'long-quyen-tongues').count);
  // Lớp mực của thân là normal blend để đọc được trên nền sáng.
  assert.equal(one(full, 'long-quyen-body-ink').material.blending, NormalBlending);
  full.dispose(); low.dispose();
});

test('Long Quyền: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45;
  aura.update(1);
  assert.ok(Math.abs(one(aura, 'long-quyen-fins-ink').material.uniforms.opacity.value - 0.4) < 1e-9);
  assert.ok(Math.abs(one(aura, 'long-quyen-cracks-ink').material.uniforms.opacity.value - 0.425) < 1e-9);
  assert.ok(Math.abs(one(aura, 'long-quyen-tongues').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Long Quyền: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createLongQuyenAura(false, motion);
  aura.update(10);
  const body = one(aura, 'long-quyen-body').material;
  assert.ok(Math.abs(body.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'long-quyen-body').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(body.uniforms.time.value, 10);
  aura.dispose();
});

test('Long Quyền: dispose giải phóng tài nguyên riêng, giữ hình thân, đầu, khung billboard và texture dùng chung', () => {
  const aura = make();
  const head = dragonHeadGeometry(), body = dragonGeometry(false);
  const sharedGeo = new Set([body.body, body.fins, head.skull, head.horns, head.eyes]);
  for (const name of MOVERS) sharedGeo.add(one(aura, name).geometry);
  const owned = new Set([aura.points.material]), shared = new Set(sharedGeo);
  aura.points.traverse(o => {
    if (o.geometry && !sharedGeo.has(o.geometry)) owned.add(o.geometry);
    if (o.material && o !== aura.points) owned.add(o.material);
    for (const u of Object.values(o.material?.uniforms ?? {})) if (u.value?.isTexture) shared.add(u.value);
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

test('Long Quyền: createEffect(9) dùng pháp tướng mới', () => {
  const aura = createEffect(9, false);
  assert.equal(aura.points.name, 'long-quyen-aura');
  aura.update(2);
  aura.dispose();
});

test('Long Quyền khi ngồi thiền: tòa hỏa long riêng, không mượn tòa sóng Lưu Ly, cánh hay đoá sen', () => {
  const tint = new Color('orangered'), accent = new Color('white');
  const long = createManifestation(9, tint, accent), others = [2, 4, 0].map(e => createManifestation(e, tint, accent));
  for (const [i, mesh] of long.layers.entries()) {
    const pos = mesh.geometry.attributes.position.array;
    for (const other of others) assert.notEqual(pos.length, other.layers[i].geometry.attributes.position.array.length);
    assert.ok([...pos].every(v => Number.isFinite(v) && Math.abs(v) < 4));
    // Không vắt qua đầu người ngồi (đầu ở y ≈ 0.8): trên đỉnh đầu để trống.
    for (let k = 0; k < pos.length; k += 3) {
      if (Math.hypot(pos[k], pos[k + 2]) < 0.3) assert.ok(pos[k + 1] < 0.9, 'trên đầu để trống');
    }
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.max.z > 0.6, 'đầu rồng vươn ra phía trước');
  }
  long.dispose(); others.forEach(m => m.dispose());
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 9);
    assert.equal(aura.uniforms.theme.value, 9);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
