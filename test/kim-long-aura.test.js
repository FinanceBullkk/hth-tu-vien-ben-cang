import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, NormalBlending, Vector3 } from 'three';
import { createKimLongAura, kimLongRhythm, KIM_LONG_CYCLE } from '../client/src/player/vfx/kim-long-aura.js';
import { HEAD_Y, WAVE, waveAt, waveAmp, restFrame, newFrame } from '../client/src/player/vfx/kim-long-spine.js';
import { MOON } from '../client/src/player/vfx/kim-long-moon-clouds.js';
import { SEATED_HEAD_Y } from '../client/src/player/vfx/kim-long-meditation-throne.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const make = (low = false) => createKimLongAura(low, { matches: false });
const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const verts = mesh => { const p = mesh.geometry.attributes.position.array, out = []; for (let i = 0; i < p.length; i += 3) out.push([p[i], p[i + 1], p[i + 2]]); return out; };
const instancePos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];
const shown = (mesh, i) => mesh.instanceColor.array[i * 3] > 0.01;
const LAYERS = ['kim-long-body', 'kim-long-body-glow', 'kim-long-dragon-mist', 'kim-long-head', 'kim-long-head-glow', 'kim-long-pearl',
  'kim-long-pearl-halo', 'kim-long-mane', 'kim-long-mane-glow', 'kim-long-fins', 'kim-long-fins-glow', 'kim-long-legs',
  'kim-long-half-moon', 'kim-long-moon-halo', 'kim-long-clouds', 'kim-long-clouds-glow', 'kim-long-flakes',
  'kim-long-cloud-sea', 'kim-long-cloud-sea-glow', 'kim-long-cloud-mounds', 'kim-long-cloud-mounds-glow'];

test('Kim Long: mọi lớp có số liệu hữu hạn ở mọi thời điểm, đủ lớp, 18–40 lớp vẽ', () => {
  const aura = make();
  assert.equal(aura.points.name, 'kim-long-aura');
  for (const t of [0, 2.5, 7.4, 13.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
    });
  }
  for (const name of LAYERS) assert.ok(one(aura, name), name);
  assert.ok(draws(aura) >= 18 && draws(aura) <= 40, 'số lớp vẽ ' + draws(aura));
  aura.dispose();
});

test('Kim Long: đúng bảng phân vai — không mandala, vòng chữ, trận đồ, kiếm, lưu quang, phiêu đái, xoắn ốc hay cổng', () => {
  const aura = make();
  aura.points.traverse(o => assert.ok(!/mandala|rune|seal|glyph|trigram|sword|blade|light-arcs|silk|spiral|helix|gate|petal|wing|full-moon/.test(o.name), o.name));
  aura.dispose();
});

test('Kim Long: bóng dáng riêng là vòm rồng vắt qua đầu từ vai trái sang vai phải, không xoắn ốc', () => {
  const fr = newFrame(), pts = Array.from({ length: 101 }, (_, i) => restFrame(i / 100, fr).p.clone());
  const top = pts.reduce((a, b) => (b.y > a.y ? b : a));
  const topU = pts.indexOf(top) / 100;
  // Đỉnh vòm ở giữa thân, cao hơn đỉnh đầu (HEAD_Y + 0.3) ít nhất nửa mét, nằm sau đầu.
  assert.ok(topU > 0.35 && topU < 0.65, 'đỉnh ở u ' + topU);
  assert.ok(top.y > HEAD_Y + 0.3 + 0.5, 'đỉnh cao ' + top.y);
  assert.ok(top.z < -0.3 && Math.abs(top.x) < 0.2);
  // Hai đầu vòm hạ xuống ngang vai, mỗi đầu một bên.
  assert.ok(pts[0].x < -0.6 && pts[100].x > 0.6, 'đuôi vai trái, đầu vai phải');
  assert.ok(pts[0].y < HEAD_Y && pts[100].y < HEAD_Y + 0.1);
  // Không xoắn ốc: góc quanh trục đứng chỉ quét khoảng nửa vòng (xoắn quanh thân phải ≥ một vòng).
  let sweep = 0;
  for (let i = 1; i < pts.length; i++) {
    let d = Math.atan2(pts[i].z, pts[i].x) - Math.atan2(pts[i - 1].z, pts[i - 1].x);
    if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    sweep += d;
  }
  assert.ok(Math.abs(sweep) < Math.PI * 1.25, 'góc quét ' + sweep);
  // Lên rồi xuống (vòm), không đi lên liên tục như xoắn ốc.
  assert.ok(pts.slice(0, 40).every((p, i) => i === 0 || p.y >= pts[i - 1].y - 1e-6));
  assert.ok(pts.slice(60, 90).every((p, i) => i === 0 || p.y <= pts[60 + i - 1].y + 1e-6));
});

test('Kim Long: thân dày, long châu nằm trong miệng, nửa trăng sau lưng không tròn đầy', () => {
  const aura = make();
  aura.update(3);
  const body = one(aura, 'kim-long-body');
  body.geometry.computeBoundingBox();
  const box = body.geometry.boundingBox;
  assert.ok(box.max.y > 2.05 && box.max.x - box.min.x > 1.8, 'vòm lớn');
  // Bán kính ống ở giữa thân > 0.1 (dày, không phải dải mảnh).
  const pos = body.geometry.attributes.position.array, ring = 17, mid = Math.floor(151 / 2);
  const a = new Vector3(...pos.slice(mid * ring * 3, mid * ring * 3 + 3)), b = new Vector3(...pos.slice((mid * ring + 8) * 3, (mid * ring + 8) * 3 + 3));
  assert.ok(a.distanceTo(b) > 0.2, 'đường kính ' + a.distanceTo(b));
  assert.equal(body.material.blending, NormalBlending, 'thân normal blend, đọc được trên nền sáng');
  // Long châu: cạnh đầu rồng, ngang vai phải, không đè mặt.
  const pearl = one(aura, 'kim-long-pearl').position, head = one(aura, 'kim-long-head');
  const headPos = new Vector3().setFromMatrixPosition(head.matrix);
  assert.ok(pearl.distanceTo(headPos) < 0.6 && pearl.x > 0.35);
  assert.ok(Math.hypot(pearl.x, pearl.y - HEAD_Y) > 0.5);
  // Nửa trăng: sau vòm, phẳng nửa dưới (shader cắt theo p.y), tâm cao hơn đỉnh đầu.
  const moon = one(aura, 'kim-long-half-moon');
  assert.ok(moon.position.z < -0.6 && MOON.y > HEAD_Y + 0.3);
  assert.match(moon.material.fragmentShader, /upper = smoothstep\(/);
  aura.dispose();
});

test('Kim Long: lượn uốn — sóng chạy từ đầu về đuôi với tốc độ cố định, cổ và đầu đứng vững', () => {
  // Đỉnh sóng tại u lúc t dời về phía đuôi (u nhỏ hơn) đúng Ω/K mỗi giây.
  const shift = WAVE.OMEGA / WAVE.K;
  for (const t of [0, 3.3, 40]) for (const u of [0.3, 0.5, 0.7]) {
    const now = waveAt(u, t).n / waveAmp(u), later = waveAt(u - shift, t + 1).n / waveAmp(u - shift);
    assert.ok(Math.abs(now - later) < 1e-6, `pha ${now} / ${later}`);
  }
  assert.ok(shift > 0 && shift < 0.1, 'tốc độ chậm');
  assert.ok(Math.abs(waveAt(1, 2.2).n) < 1e-6 && Math.abs(waveAt(1, 2.2).b) < 1e-6, 'đầu rồng không vẫy');
  // Thân thật sự lượn: vị trí đỉnh vòm đổi theo thời gian.
  const aura = make();
  aura.update(0); const before = [...one(aura, 'kim-long-body').geometry.attributes.position.array];
  aura.update(2); const after = one(aura, 'kim-long-body').geometry.attributes.position.array;
  assert.ok(before.some((v, i) => Math.abs(v - after[i]) > 0.01));
  aura.dispose();
});

test('Kim Long: vùng quanh mặt để trống — không thân, bờm, vảy rụng hay mây nào đè ngang mặt', () => {
  const aura = make();
  const clear = (x, y, z, what, t) => { if (z > -0.3) assert.ok(Math.hypot(x, y - HEAD_Y) > 0.45, `${what} ở (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) lúc ${t}`); };
  for (let t = 0; t < KIM_LONG_CYCLE; t += 0.6) {
    aura.update(t);
    for (const name of ['kim-long-body', 'kim-long-mane', 'kim-long-dragon-mist']) for (const [x, y, z] of verts(one(aura, name))) clear(x, y, z, name, t);
    for (const name of ['kim-long-flakes', 'kim-long-clouds', 'kim-long-cloud-mounds']) {
      const mesh = one(aura, name);
      for (let i = 0; i < mesh.count; i++) if (shown(mesh, i)) clear(...instancePos(mesh, i), name, t);
    }
  }
  aura.dispose();
});

test('Kim Long: nhịp thở tuần hoàn, chỉ đổi độ sáng; không pha tăng tốc', () => {
  for (const k of ['phase', 'gather', 'release', 'pulse']) {
    assert.ok(Math.abs(kimLongRhythm(2.3)[k] - kimLongRhythm(2.3 + KIM_LONG_CYCLE * 4)[k]) < 1e-9);
  }
  const a = make(), b = make();
  for (let t = 0; t < 6; t += 0.25) a.update(t);
  b.update(5.75);
  for (const name of ['kim-long-body', 'kim-long-mane']) {
    assert.deepEqual([...one(a, name).geometry.attributes.position.array], [...one(b, name).geometry.attributes.position.array], name);
  }
  for (const name of ['kim-long-fins', 'kim-long-flakes']) assert.deepEqual([...one(a, name).instanceMatrix.array], [...one(b, name).instanceMatrix.array], name);
  // Tốc độ đỉnh nhịp không vọt so với lúc lắng; thân không đỉnh nào nhanh hơn 0.4 m/s.
  const speed = t => {
    a.update(t); const p = [...one(a, 'kim-long-body').geometry.attributes.position.array];
    a.update(t + 0.05); const q = one(a, 'kim-long-body').geometry.attributes.position.array;
    let max = 0; for (let i = 0; i < p.length; i += 3) max = Math.max(max, Math.hypot(p[i] - q[i], p[i + 1] - q[i + 1], p[i + 2] - q[i + 2]) / 0.05);
    return max;
  };
  const peak = [], calm = [];
  for (let i = 0; i < 120; i++) {
    const t = i * KIM_LONG_CYCLE * 2 / 120, pulse = kimLongRhythm(t).pulse, v = speed(t);
    assert.ok(v < 0.4, `thân lượn ${v.toFixed(2)} m/s`);
    if (pulse > 0.8) peak.push(v); else if (pulse < 0.1) calm.push(v);
  }
  const avg = list => list.reduce((s, v) => s + v, 0) / list.length;
  assert.ok(peak.length > 3 && calm.length > 3 && avg(peak) < avg(calm) * 1.2);
  a.dispose(); b.dispose();
});

test('Kim Long: chất lượng thấp bỏ lớp sáng phụ nhưng giữ rồng, ngọc, trăng và biển mây', () => {
  const full = make(), low = make(true);
  assert.ok(draws(low) <= draws(full) - 6, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['kim-long-body-glow', 'kim-long-head-glow', 'kim-long-mane-glow', 'kim-long-fins-glow', 'kim-long-moon-halo',
    'kim-long-clouds-glow', 'kim-long-cloud-sea-glow', 'kim-long-cloud-mounds-glow']) assert.equal(one(low, name), null, name);
  for (const name of ['kim-long-body', 'kim-long-head', 'kim-long-pearl', 'kim-long-half-moon', 'kim-long-cloud-sea']) assert.ok(one(low, name), name);
  assert.ok(one(low, 'kim-long-flakes').count < one(full, 'kim-long-flakes').count);
  full.dispose(); low.dispose();
});

test('Kim Long: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45;
  aura.update(1);
  assert.ok(Math.abs(one(aura, 'kim-long-body').material.uniforms.opacity.value - 0.97 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'kim-long-pearl').material.uniforms.opacity.value - 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'kim-long-clouds').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Kim Long: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createKimLongAura(false, motion);
  aura.update(9);
  const body = one(aura, 'kim-long-body').material;
  assert.ok(Math.abs(body.uniforms.time.value - 3) < 1e-9);
  assert.ok(one(aura, 'kim-long-body').visible);
  motion.matches = false;
  aura.update(9);
  assert.equal(body.uniforms.time.value, 9);
  aura.dispose();
});

test('Kim Long: dispose giải phóng tài nguyên riêng, giữ texture và khung billboard dùng chung', () => {
  const aura = make();
  const owned = new Set([aura.points.material]), shared = new Set();
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
    else if (o.geometry && !o.isSprite) owned.add(o.geometry);
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

test('Kim Long: createEffect(11) dùng pháp tướng mới, effect 10 không đổi', () => {
  const aura = createEffect(11, false);
  assert.equal(aura.points.name, 'kim-long-aura');
  aura.update(2); aura.dispose();
  const ribbon = createEffect(10, false);
  assert.notEqual(ribbon.points.name, 'kim-long-aura');
  ribbon.dispose();
});

test('Kim Long khi ngồi thiền: tòa riêng (châu, nửa vòm, vòm đầy đủ), chừa trống mặt, theme 11', () => {
  const tint = new Color('gold'), accent = new Color('white');
  const kim = createManifestation(11, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of kim.layers.entries()) {
    const pos = mesh.geometry.attributes.position.array;
    assert.notEqual(pos.length, lotus.layers[i].geometry.attributes.position.array.length);
    assert.ok([...pos].every(v => Number.isFinite(v) && Math.abs(v) < 4));
    for (let k = 0; k < pos.length; k += 3) {
      if (pos[k + 2] > -0.3) assert.ok(Math.hypot(pos[k], pos[k + 1] - SEATED_HEAD_Y) > 0.35, `tầng ${i + 3}: (${pos[k].toFixed(2)}, ${pos[k + 1].toFixed(2)})`);
    }
  }
  // Tầng 5 vắt vòm qua đầu người ngồi.
  const top = Math.max(...kim.layers[2].geometry.attributes.position.array.filter((_, k) => k % 3 === 1));
  assert.ok(top > SEATED_HEAD_Y + 0.6, 'vòm tầng 5 cao ' + top);
  kim.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 11);
    assert.equal(aura.uniforms.theme.value, 11);
    assert.equal(aura.uniforms.tint.value.getHexString(), new Color('#f0ad2e').getHexString());
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
