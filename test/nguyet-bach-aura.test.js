import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Vector3 } from 'three';
import { createNguyetBachAura } from '../client/src/player/vfx/nguyet-bach-aura.js';
import { humAt, nguyetBachRhythm, NGUYET_BACH_CYCLE, PLUCK_AT } from '../client/src/player/vfx/nguyet-bach-rhythm.js';
import { MOON } from '../client/src/player/vfx/nguyet-bach-moon.js';
import { HEAD } from '../client/src/player/vfx/nguyet-bach-sound-ripples.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const make = (low = false) => createNguyetBachAura(low, { matches: false });
const PEAK = NGUYET_BACH_CYCLE * (PLUCK_AT + 0.02), CALM = NGUYET_BACH_CYCLE * 0.95;
const fromHead = (x, y) => Math.hypot(x - HEAD.x, y - HEAD.y);
/** Đỉnh của mesh trong toạ độ aura (đã nhân ma trận cha). */
function worldPoints(aura, mesh) {
  aura.points.updateMatrixWorld(true);
  const p = mesh.geometry.attributes.position, v = new Vector3(), out = [];
  for (let i = 0; i < p.count; i++) out.push(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).clone());
  return out;
}

test('Nguyệt Bạch: trăng, cổ cầm, sóng âm và gương nước có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = make();
  assert.equal(aura.points.name, 'nguyet-bach-aura');
  for (const t of [0, 2.5, PEAK, 9.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite));
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
    });
    for (const k of ['age', 'strength']) assert.ok(one(aura, 'nguyet-bach-sound-ripples').material.uniforms[k].value.every(Number.isFinite));
  }
  for (const name of ['nguyet-bach-moon', 'nguyet-bach-moon-disc', 'nguyet-bach-moon-face', 'nguyet-bach-moon-rim', 'nguyet-bach-moon-glow',
    'nguyet-bach-cloud-band', 'nguyet-bach-moon-stars', 'nguyet-bach-guqin', 'nguyet-bach-guqin-body', 'nguyet-bach-guqin-rim', 'nguyet-bach-hui',
    'nguyet-bach-strings', 'nguyet-bach-inscription', 'nguyet-bach-tassel', 'nguyet-bach-sound-ripples', 'nguyet-bach-water-mirror',
    'nguyet-bach-moon-reflection', 'nguyet-bach-moon-rays', 'nguyet-bach-notes', 'nguyet-bach-mist', 'nguyet-bach-moon-dust',
    'nguyet-bach-moon-corona', 'nguyet-bach-crescent-blade', 'nguyet-bach-crescent', 'nguyet-bach-crescent-carving', 'nguyet-bach-sky-strings',
    'nguyet-bach-guqin-inlay', 'nguyet-bach-sound-blades', 'nguyet-bach-rocks', 'nguyet-bach-frost']) {
    assert.ok(one(aura, name), name);
  }
  assert.equal(one(aura, 'nguyet-bach-hui').count, 13);
  // Nốt nhạc có lớp sáng và lớp mực dùng chung atlas.
  const [glow, ink] = named(aura, 'nguyet-bach-notes');
  assert.equal(glow.material.uniforms.map.value, ink.material.uniforms.map.value);
  aura.dispose();
});

test('Nguyệt Bạch: đúng bảng phân vai — không mandala, vòng chữ, trận đồ, lưu quang, phiêu đái, cánh hay lá sen', () => {
  const aura = make();
  aura.points.traverse(o => assert.ok(!/light-arcs|silk|sash|mandala|rune|seal|wing|fan|feather|lotus|koi|pond|petal|sword/.test(o.name), o.name));
  aura.dispose();
});

test('Nguyệt Bạch: bóng dáng riêng — trăng tròn lớn treo cao LỆCH một bên, cổ cầm dựng đứng bên kia', () => {
  const aura = make();
  aura.update(1);
  const moon = one(aura, 'nguyet-bach-moon'), guqin = one(aura, 'nguyet-bach-guqin');
  assert.ok(moon.position.x > 0.6 && moon.position.y > 1.8, 'trăng lệch sau vai trái, cao');
  assert.ok(MOON.r >= 0.55, 'trăng tròn lớn');
  assert.ok(guqin.position.x < -0.5, 'cổ cầm ở phía bên kia');
  // Bất đối xứng: mọi phần của trăng nằm hẳn một bên, không có vật thể trăng phía đối diện.
  for (const m of [...named(aura, 'nguyet-bach-moon-disc'), ...named(aura, 'nguyet-bach-moon-face')]) {
    assert.ok(worldPoints(aura, m).every(p => p.x > 0.15), m.name);
  }
  // Cổ cầm thẳng đứng: cao hơn đầu, hẹp ngang, đứng trên mặt nước.
  const body = worldPoints(aura, one(aura, 'nguyet-bach-guqin-body'));
  const ys = body.map(p => p.y), xs = body.map(p => p.x);
  assert.ok(Math.max(...ys) > 2.0 && Math.min(...ys) < 0.15, 'cao từ mặt nước lên quá đầu');
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.55, 'thân hẹp, dựng đứng');
  assert.ok(Math.max(...xs) < -0.3, 'toàn bộ thân đàn ở một bên');
  // Nguyệt nhận ôm mép ngoài trăng, cả lưỡi nằm phía trăng; dây sáng phóng lên trời phía đàn.
  assert.ok(worldPoints(aura, one(aura, 'nguyet-bach-crescent')).every(p => p.x > 0.2), 'nguyệt nhận một bên');
  const sky = worldPoints(aura, one(aura, 'nguyet-bach-sky-strings'));
  assert.ok(Math.max(...sky.map(p => p.y)) > 3.2 && sky.every(p => p.x < -0.5), 'dây sáng lên trời phía đàn');
  aura.dispose();
});

test('Nguyệt Bạch: âm nhận bay đều ra phía ngoài, xa mặt nhân vật', () => {
  const aura = make();
  const at = t => { aura.update(t); return [...one(aura, 'nguyet-bach-sound-blades').instanceMatrix.array]; };
  for (const t of [1, PEAK, CALM]) {
    const m = at(t);
    for (let k = 0; k < m.length / 16; k++) assert.ok(m[k * 16 + 12] < -0.7, `lưỡi ${k} ở x ${m[k * 16 + 12]}`);
  }
  const move = t => { const a = at(t), b = at(t + 0.1); return Math.hypot(a[12] - b[12], a[14] - b[14]); };
  assert.ok(Math.abs(move(PEAK) - move(CALM)) < 1e-6, 'tốc độ bay không đổi');
  aura.dispose();
});

test('Nguyệt Bạch: vùng quanh đầu để trống — trăng, đàn, dây và nốt nhạc không đi ngang mặt', () => {
  const aura = make();
  for (const t of [0, 4, PEAK, 11]) {
    aura.update(t);
    assert.ok(fromHead(MOON.x, one(aura, 'nguyet-bach-moon').position.y) - MOON.r - 0.04 > 0.45, 'trăng');
    for (const name of ['nguyet-bach-guqin-body', 'nguyet-bach-strings', 'nguyet-bach-sky-strings', 'nguyet-bach-crescent', 'nguyet-bach-rocks']) {
      assert.ok(worldPoints(aura, one(aura, name)).every(p => fromHead(p.x, p.y) > 0.45), name);
    }
    const notes = one(aura, 'nguyet-bach-notes'), m = notes.instanceMatrix.array, c = notes.instanceColor.array;
    for (let i = 0; i < notes.count; i++) {
      if (c[i * 3] > 0.05) assert.ok(fromHead(m[i * 16 + 12], m[i * 16 + 13]) > 0.45, `nốt ${i}`);
    }
    // Sóng âm tắt hẳn quanh mặt (tâm mặt nằm trong vùng che của shader).
    const head = one(aura, 'nguyet-bach-sound-ripples').material.uniforms.head.value;
    assert.ok(Math.hypot(head.x, head.y) > 0.5);
  }
  aura.dispose();
});

test('Nguyệt Bạch: nhịp 16 giây khép kín, một tiếng gảy làm dây ngân rộng và gợn đậm lên', () => {
  for (const t of [0.3, 4.7, PEAK, 15.99]) {
    assert.ok(Math.abs(humAt(t) - humAt(t + NGUYET_BACH_CYCLE * 7)) < 1e-9);
    assert.ok(Math.abs(nguyetBachRhythm(t).pulse - nguyetBachRhythm(t + NGUYET_BACH_CYCLE * 3).pulse) < 1e-9);
  }
  assert.ok(Math.abs(humAt(NGUYET_BACH_CYCLE - 1e-6) - humAt(0)) < 0.01, 'liền mạch qua chu kỳ');
  assert.ok(humAt(PEAK) > humAt(CALM) * 3);
  const aura = make();
  const spread = t => {
    const xs = []; // vị trí giữa dây trầm nhất trong gần một giây — biên độ = khoảng dao động
    for (let k = 0; k < 40; k++) { aura.update(t + k * 0.023); const p = one(aura, 'nguyet-bach-strings').geometry.attributes.position.array; xs.push((p[10 * 6] + p[10 * 6 + 3]) / 2); }
    return Math.max(...xs) - Math.min(...xs);
  };
  assert.ok(spread(PEAK) > spread(CALM) * 2, 'dây ngân rộng hơn sau tiếng gảy');
  aura.dispose();
});

test('Nguyệt Bạch: không có pha tăng tốc — tần số rung, tốc độ lan sóng và tốc độ nốt bay cố định', () => {
  const aura = make();
  // Dây: đếm số lần đổi chiều trong 4 giây lúc ngân mạnh và lúc lắng — như nhau.
  const turns = t0 => {
    let n = 0, prev = 0, last = null;
    for (let t = t0; t < t0 + 4; t += 0.01) {
      aura.update(t);
      const p = one(aura, 'nguyet-bach-strings').geometry.attributes.position.array, x = (p[10 * 6] + p[10 * 6 + 3]) / 2;
      if (last !== null) { const d = Math.sign(x - last); if (prev && d && d !== prev) n++; if (d) prev = d; }
      last = x;
    }
    return n;
  };
  assert.ok(Math.abs(turns(PEAK - 0.5) - turns(CALM - 2)) <= 1);
  // Gợn sóng âm: tuổi tăng đều theo thời gian ở mọi pha.
  const ages = t => { aura.update(t); return [...one(aura, 'nguyet-bach-sound-ripples').material.uniforms.age.value]; };
  const step = t => { const a = ages(t), b = ages(t + 0.1); return (b[0] - a[0] + 1) % 1; };
  assert.ok(Math.abs(step(PEAK) - step(CALM)) < 1e-9);
  // Nốt nhạc: quãng đường đi trong 0.05 s lúc gảy không vượt lúc lắng.
  const at = t => { aura.update(t); return [...one(aura, 'nguyet-bach-notes').instanceMatrix.array.slice(12, 15)]; };
  const move = t => { const a = at(t), b = at(t + 0.05); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  assert.ok(move(PEAK) < move(CALM) * 1.6 + 1e-6);
  aura.dispose();
});

test('Nguyệt Bạch: chất lượng thấp bỏ lớp mực, viền sáng, tua ngọc, tia trăng và sương', () => {
  const full = make(false), low = make(true);
  const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints) n++; }); return n; };
  assert.ok(draws(full) >= 20 && draws(full) <= 40, 'số lớp vẽ ' + draws(full));
  assert.ok(draws(low) <= draws(full) - 6, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['nguyet-bach-guqin-rim', 'nguyet-bach-tassel', 'nguyet-bach-moon-rays', 'nguyet-bach-mist']) assert.equal(one(low, name), null, name);
  assert.equal(named(low, 'nguyet-bach-notes').length, 1);
  assert.equal(named(low, 'nguyet-bach-rocks').length, 1);
  assert.equal(named(low, 'nguyet-bach-crescent').length, 1);
  assert.ok(one(low, 'nguyet-bach-sound-blades').count < one(full, 'nguyet-bach-sound-blades').count);
  assert.ok(one(low, 'nguyet-bach-moon-face') && one(low, 'nguyet-bach-guqin-body') && one(low, 'nguyet-bach-water-mirror'));
  full.dispose(); low.dispose();
});

test('Nguyệt Bạch: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45;
  aura.update(1);
  assert.ok(Math.abs(one(aura, 'nguyet-bach-guqin-body').material.uniforms.opacity.value - 0.95 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'nguyet-bach-moon-face').material.opacity - 0.97 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'nguyet-bach-notes').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Nguyệt Bạch: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createNguyetBachAura(false, motion);
  aura.update(10);
  const ripples = one(aura, 'nguyet-bach-sound-ripples').material;
  assert.ok(Math.abs(ripples.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'nguyet-bach-strings').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(ripples.uniforms.time.value, 10);
  aura.dispose();
});

test('Nguyệt Bạch: dispose giải phóng tài nguyên riêng, giữ texture và khung billboard dùng chung', () => {
  const aura = make();
  const owned = new Set([aura.points.material]), shared = new Set();
  aura.points.traverse(o => {
    // Khung billboard dùng chung chỉ thuộc các lớp billboardLayer (ShaderMaterial có uniform map).
    if (o.isInstancedMesh && o.material.uniforms?.map && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
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

test('Nguyệt Bạch: createEffect(7) dùng pháp tướng mới, bỏ đôi cánh quạt cũ', () => {
  const aura = createEffect(7, false);
  assert.equal(aura.points.name, 'nguyet-bach-aura');
  aura.update(2);
  aura.dispose();
});

test('Nguyệt Bạch khi ngồi thiền: tòa cổ cầm và trăng riêng, lệch một bên; đất có bóng trăng', () => {
  const tint = new Color('white'), accent = new Color('lightblue');
  const moon = createManifestation(7, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of moon.layers.entries()) {
    assert.notEqual(mesh.geometry.attributes.position.count, lotus.layers[i].geometry.attributes.position.count);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  // Tầng 4: trăng hẳn bên phải (+x); tầng 5: đàn dựng hẳn bên trái (−x), cao hơn đầu người ngồi.
  const box = mesh => { mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox; };
  assert.ok(box(moon.layers[1]).min.x > 0.1);
  assert.ok(box(moon.layers[2]).max.x < -0.3 && box(moon.layers[2]).max.y > 1.6);
  moon.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 7);
    assert.equal(aura.uniforms.theme.value, 7);
    assert.ok(aura.material.fragmentShader.includes('theme == 7.0) {'));
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
