import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Color, Matrix4, NormalBlending, Vector3 } from 'three';
import { createXichDiemAura, xichDiemRhythm, XICH_DIEM_CYCLE } from '../client/src/player/vfx/xich-diem-aura.js';
import { CLOUDS, DRIFT, HEAD_Y, FACE_CLEAR, RING } from '../client/src/player/vfx/xich-diem-layout.js';
import { cloudBlobGeometry, cloudReliefGeometry, cloudLiteGeometry } from '../client/src/player/vfx/xich-diem-cloud-geometry.js';
import { EMBER_TOP } from '../client/src/player/vfx/xich-diem-puffs.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const make = (low = false) => createXichDiemAura(low, { matches: false });
const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const instancePos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];
const shown = (mesh, i) => !mesh.instanceColor || mesh.instanceColor.array[i * 3] > 0.01;
const MOVERS = ['xich-diem-clouds', 'xich-diem-puffs', 'xich-diem-embers', 'xich-diem-ring-sparks'];
const STRIPS = ['xich-diem-waist-ring', 'xich-diem-waist-crest', 'xich-diem-flame-tongues', 'xich-diem-streamers'];
// Mọi điểm đang hiện của aura (tâm instance + đỉnh dải động), toạ độ thế giới (group ở gốc).
function points(aura) {
  const out = [];
  for (const name of MOVERS) {
    const mesh = one(aura, name);
    for (let i = 0; i < mesh.count; i++) if (shown(mesh, i)) out.push([name, ...instancePos(mesh, i)]);
  }
  for (const name of STRIPS) {
    const p = one(aura, name).geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) out.push([name, p[i], p[i + 1], p[i + 2]]);
  }
  return out;
}

test('Xích Diễm: đài mây, vòng eo, dải lửa và biển mây có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = make();
  assert.equal(aura.points.name, 'xich-diem-aura');
  for (const t of [0, 2.5, 7.4, 13.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      // Chỉ thân mây đặc ghi depth (để các cuộn trong một lần vẽ che nhau đúng thứ tự).
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, o.name === 'xich-diem-clouds', o.name);
    });
  }
  for (const name of ['xich-diem-clouds', 'xich-diem-clouds-glow', 'xich-diem-cloud-relief', 'xich-diem-cloud-halo',
    'xich-diem-puffs', 'xich-diem-puffs-glow', 'xich-diem-embers', 'xich-diem-flame-tongues', 'xich-diem-flame-tongues-ink',
    'xich-diem-streamers', 'xich-diem-streamers-ink', 'xich-diem-waist-ring', 'xich-diem-waist-ring-ink', 'xich-diem-waist-crest',
    'xich-diem-ring-sparks', 'xich-diem-ground-shadow', 'xich-diem-ground-light', 'xich-diem-cloud-sea',
    'xich-diem-cloud-sea-ink', 'xich-diem-cloud-sea-inner']) assert.ok(one(aura, name), name);
  // Khối chính dày, đậm: cuộn mây 3D có bề dày thật, thân đặc normal blend.
  const clouds = one(aura, 'xich-diem-clouds'), box = cloudBlobGeometry().boundingBox;
  assert.ok(clouds.count >= 16 && box.max.z - box.min.z > 0.18);
  assert.equal(clouds.material.blending, NormalBlending);
  assert.equal(one(aura, 'xich-diem-cloud-relief').instanceMatrix, clouds.instanceMatrix);
  assert.ok(draws(aura) >= 18 && draws(aura) <= 40, 'số lớp vẽ ' + draws(aura));
  aura.dispose();
});

test('Xích Diễm: đúng bảng phân vai — không bánh xe, đĩa, trận đồ, chữ, kiếm, lưu quang, phiêu đái, cánh hay sen', () => {
  const aura = make();
  aura.points.traverse(o => assert.ok(!/mandala|wheel|disc|rune|seal|glyph|trigram|sword|blade|light-arcs|silk|wing|feather|lotus|petal|pillar|moon|eclipse/.test(o.name), o.name));
  aura.dispose();
});

test('Xích Diễm: bóng dáng riêng THẤP và RỘNG — đài mây sát đất, không gì cao quá vai', () => {
  const aura = make();
  for (const t of [0, 3.3, XICH_DIEM_CYCLE * 0.45, 40]) {
    aura.update(t);
    // Hộp bao của cả đài mây (8 góc hình cuộn qua ma trận từng instance).
    const clouds = one(aura, 'xich-diem-clouds'), geo = cloudBlobGeometry().boundingBox, bank = new Box3(), m = new Matrix4();
    for (let i = 0; i < CLOUDS.length; i++) {
      clouds.getMatrixAt(i, m);
      for (const x of [geo.min.x, geo.max.x]) for (const y of [geo.min.y, geo.max.y]) for (const z of [geo.min.z, geo.max.z]) {
        bank.expandByPoint(new Vector3(x, y, z).applyMatrix4(m));
      }
    }
    const width = Math.min(bank.max.x - bank.min.x, bank.max.z - bank.min.z), height = bank.max.y - bank.min.y;
    assert.ok(width > 2.6 && height < 0.62, `rộng ${width.toFixed(2)} cao ${height.toFixed(2)}`);
    assert.ok(width / height > 4.5, 'tỉ lệ ngang/cao ' + (width / height).toFixed(2));
    assert.ok(bank.min.y > -0.05, 'đài mây đặt trên mặt đất');
    // Toàn bộ aura nằm dưới vai: không trụ lửa cao, không vật dựng sau lưng hay trên đầu.
    for (const [name, , y] of points(aura)) assert.ok(y < 0.92, `${name} cao ${y.toFixed(2)}`);
  }
  assert.ok(EMBER_TOP < 0.92);
  aura.dispose();
});

test('Xích Diễm: vòng lửa NẰM NGANG quanh eo, lượn sóng nhẹ', () => {
  const aura = make();
  aura.update(5);
  const p = one(aura, 'xich-diem-waist-ring').geometry.attributes.position.array;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    lo = Math.min(lo, p[i + 1]); hi = Math.max(hi, p[i + 1]);
    const r = Math.hypot(p[i], p[i + 2]);
    assert.ok(Math.abs(r - RING.r) < 0.1, 'bám bán kính vòng ' + r.toFixed(2));
  }
  assert.ok(hi - lo < 0.2 && lo > 0.4 && hi < 0.72, `vòng eo từ ${lo.toFixed(2)} tới ${hi.toFixed(2)}`);
  // Sóng lượn chạy quanh vòng: cùng một điểm cao thấp khác nhau theo thời gian.
  const y0 = p[1]; aura.update(8);
  assert.notEqual(one(aura, 'xich-diem-waist-ring').geometry.attributes.position.array[1], y0);
  aura.dispose();
});

test('Xích Diễm: trôi ngang — đài mây và biển mây trôi vòng cùng một tốc độ cố định', () => {
  const aura = make();
  const angle = t => { aura.update(t); const [x, , z] = instancePos(one(aura, 'xich-diem-clouds'), 0); return Math.atan2(x, z); };
  const turn = (a, b) => { let d = angle(b) - angle(a); while (d < -Math.PI) d += Math.PI * 2; while (d > Math.PI) d -= Math.PI * 2; return d; };
  for (const t of [0.5, XICH_DIEM_CYCLE * 0.15, XICH_DIEM_CYCLE * 0.45, 30]) {
    assert.ok(Math.abs(turn(t, t + 1) - DRIFT) < 1e-6, 'trôi vòng đều lúc ' + t);
  }
  // Đài mây chỉ trôi, không bay lên: độ cao cuộn mây chỉ bập bềnh vài cm.
  const heights = [0, 3, 6, 9].map(t => { aura.update(t); return instancePos(one(aura, 'xich-diem-clouds'), 0)[1]; });
  assert.ok(Math.max(...heights) - Math.min(...heights) < 0.05);
  const sea = one(aura, 'xich-diem-cloud-sea').material.uniforms.drift.value;
  assert.ok(Math.abs(sea - DRIFT / (Math.PI * 2)) < 1e-9, 'biển mây trôi khớp đài');
  aura.dispose();
});

test('Xích Diễm: vùng quanh mặt để trống — không mây, lửa hay hạt nào đè ngang mặt', () => {
  const aura = make();
  for (let t = 0; t < XICH_DIEM_CYCLE; t += 0.37) {
    aura.update(t);
    for (const [name, x, y, z] of points(aura)) {
      if (z > -0.3) assert.ok(Math.hypot(x, y - HEAD_Y) > FACE_CLEAR, `${name} ở (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) lúc ${t}`);
    }
  }
  aura.dispose();
});

test('Xích Diễm: nhịp thở tuần hoàn, đài mây toả rộng khi thở ra', () => {
  for (const k of ['phase', 'gather', 'release', 'pulse']) {
    assert.ok(Math.abs(xichDiemRhythm(2.3)[k] - xichDiemRhythm(2.3 + XICH_DIEM_CYCLE * 4)[k]) < 1e-9);
  }
  const aura = make();
  const radius = t => { aura.update(t); const [x, , z] = instancePos(one(aura, 'xich-diem-clouds'), 0); return Math.hypot(x, z); };
  assert.ok(radius(XICH_DIEM_CYCLE * 0.15) < radius(XICH_DIEM_CYCLE * 0.45));
  aura.dispose();
});

test('Xích Diễm: không có pha tăng tốc — vật trôi là hàm thuần của thời gian, tốc độ chậm đều', () => {
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
  for (const name of MOVERS) {
    const peak = [], calm = [];
    for (let i = 0; i < 300; i++) {
      const t = i * XICH_DIEM_CYCLE * 2 / 300, pulse = xichDiemRhythm(t).pulse;
      if (pulse > 0.8) peak.push(meanSpeed(name, t)); else if (pulse < 0.1) calm.push(meanSpeed(name, t));
    }
    const avg = list => list.reduce((s, v) => s + v, 0) / list.length;
    assert.ok(peak.length > 5 && calm.length > 5);
    assert.ok(avg(peak) < avg(calm) * 1.25, `${name}: đỉnh ${avg(peak)} so với lắng ${avg(calm)}`);
  }
  a.dispose(); b.dispose();
});

test('Xích Diễm: chất lượng thấp bỏ lớp mực, quầng phụ và biển mây nhỏ, giữ đài mây', () => {
  const full = make(), low = make(true);
  assert.ok(draws(low) <= draws(full) - 6, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['xich-diem-clouds-glow', 'xich-diem-cloud-halo', 'xich-diem-flame-tongues-ink', 'xich-diem-streamers-ink',
    'xich-diem-waist-ring-ink', 'xich-diem-cloud-sea-ink', 'xich-diem-cloud-sea-inner']) assert.equal(one(low, name), null, name);
  for (const name of ['xich-diem-clouds', 'xich-diem-cloud-relief', 'xich-diem-waist-ring', 'xich-diem-cloud-sea']) assert.ok(one(low, name), name);
  assert.ok(one(low, 'xich-diem-puffs').count < one(full, 'xich-diem-puffs').count);
  full.dispose(); low.dispose();
});

test('Xích Diễm: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45;
  aura.update(XICH_DIEM_CYCLE * 0.7); // ngoài đỉnh nhịp: gather ≈ 0
  assert.ok(Math.abs(one(aura, 'xich-diem-clouds').material.uniforms.opacity.value - 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'xich-diem-cloud-sea').material.uniforms.opacity.value - 0.4) < 0.02);
  assert.ok(one(aura, 'xich-diem-waist-ring').material.uniforms.opacity.value < 0.55);
  aura.dispose();
});

test('Xích Diễm: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createXichDiemAura(false, motion);
  aura.update(10);
  const sea = one(aura, 'xich-diem-cloud-sea').material;
  assert.ok(Math.abs(sea.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'xich-diem-clouds').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(sea.uniforms.time.value, 10);
  aura.dispose();
});

test('Xích Diễm: dispose giải phóng tài nguyên riêng, giữ hình cuộn mây, khung billboard và hoa văn dùng chung', () => {
  const aura = make();
  const sharedGeo = new Set([cloudBlobGeometry(), cloudReliefGeometry()]);
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
  assert.ok(shared.size >= 5);
  aura.dispose();
  assert.equal(disposed, owned.size);
  assert.equal(sharedDisposed, 0);
});

test('Xích Diễm: createEffect(10) dùng pháp tướng mới, 11 là Kim Long', () => {
  const aura = createEffect(10, false);
  assert.equal(aura.points.name, 'xich-diem-aura');
  aura.update(2);
  aura.dispose();
  const kimLong = createEffect(11, false);
  assert.notEqual(kimLong.points.name, 'xich-diem-aura');
  assert.notEqual(kimLong.points.name, 'ribbon-aura');
  kimLong.dispose();
});

test('Xích Diễm khi ngồi thiền: tòa đài mây riêng thấp rộng, không mượn đoá sen hay cánh', () => {
  const tint = new Color('red'), accent = new Color('gold');
  const xich = createManifestation(10, tint, accent), hong = createManifestation(4, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of xich.layers.entries()) {
    const pos = mesh.geometry.attributes.position.array;
    assert.notEqual(pos.length, hong.layers[i].geometry.attributes.position.array.length);
    assert.notEqual(pos.length, lotus.layers[i].geometry.attributes.position.array.length);
    // Không có gì dựng cao sau lưng hay trên đầu (đầu người ngồi ở y ≈ 0.8).
    for (let k = 0; k < pos.length; k += 3) assert.ok(Number.isFinite(pos[k]) && pos[k + 1] < 0.6 && Math.abs(pos[k]) < 1.5);
  }
  // Tầng 5 thay tầng 4 (đài hai tầng đã gồm đài một tầng).
  xich.update(5, 1, 0, 1);
  assert.equal(xich.layers[1].visible, false);
  assert.ok(xich.layers[2].visible);
  assert.ok(cloudLiteGeometry().attributes.position.count < cloudBlobGeometry().attributes.position.count / 3);
  xich.dispose(); hong.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 10);
    assert.equal(aura.uniforms.theme.value, 10);
    assert.notEqual(aura.uniforms.tint.value.getHexString(), new CultivationAura(false, 0).uniforms.tint.value.getHexString());
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
