import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, NormalBlending, AdditiveBlending, Vector3 } from 'three';
import { createHuyenDaAura, huyenDaRhythm, HUYEN_DA_CYCLE } from '../client/src/player/vfx/huyen-da-aura.js';
import { ECLIPSE, HEAD_Y } from '../client/src/player/vfx/huyen-da-inward-path.js';
import { featherGeometry } from '../client/src/player/vfx/hong-lien-materials.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';

const make = (low = false) => createHuyenDaAura(low, { matches: false });
const named = (aura, name) => { const hits = []; aura.points.traverse(o => { if (o.name === name) hits.push(o); }); return hits; };
const one = (aura, name) => named(aura, name)[0] ?? null;
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const MOVERS = ['huyen-da-crow-feathers', 'huyen-da-ink-wisps', 'huyen-da-sparks'];
const instancePos = (mesh, i) => [...mesh.instanceMatrix.array.slice(i * 16 + 12, i * 16 + 15)];
// Hạt đang hiện: lông có tỉ lệ > 0, billboard có độ đậm (instanceColor.r) > 0.
const shown = (mesh, i) => (mesh.instanceColor ? mesh.instanceColor.array[i * 3] : Math.hypot(...mesh.instanceMatrix.array.slice(i * 16, i * 16 + 3))) > 0.01;

test('Huyền Dạ: nhật thực, lông quạ, khói mực và xoáy đất có số liệu hữu hạn ở mọi thời điểm', () => {
  const aura = make();
  assert.equal(aura.points.name, 'huyen-da-aura');
  for (const t of [0, 2.5, 7.4, 13.1, 1234567]) {
    aura.update(t);
    aura.points.traverse(o => {
      if (o.isInstancedMesh) assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
      else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
      if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
    });
  }
  for (const name of ['huyen-da-eclipse', 'huyen-da-eclipse-disc', 'huyen-da-eclipse-ring', 'huyen-da-eclipse-ring-glow',
    'huyen-da-corona', 'huyen-da-corona-ink', 'huyen-da-corona-streamers', 'huyen-da-back-vortex', 'huyen-da-diamond-bead',
    'huyen-da-ink-smoke', 'huyen-da-ground-pool', 'huyen-da-ground-vortex', 'huyen-da-ground-swirl', 'huyen-da-ground-rim',
    'huyen-da-ink-pools', ...MOVERS]) assert.ok(one(aura, name), name);
  assert.equal(named(aura, 'huyen-da-crow-feathers').length, 2, 'phiến đen + viền tím chung ma trận');
  const [body, rim] = named(aura, 'huyen-da-crow-feathers');
  assert.equal(body.instanceMatrix, rim.instanceMatrix);
  assert.ok(body.count >= 10 && one(aura, 'huyen-da-sparks').count >= 24);
  assert.ok(draws(aura) >= 18 && draws(aura) <= 40, 'số lớp vẽ ' + draws(aura));
  aura.dispose();
});

test('Huyền Dạ: đúng bảng phân vai — không mandala, vòng chữ, trận đồ, kiếm, lưu quang, phiêu đái, trăng hay mặt nước', () => {
  const aura = make();
  aura.points.traverse(o => assert.ok(!/mandala|rune|seal|glyph|trigram|sword|blade|light-arcs|silk|moon|pond|ripple|petal|wing/.test(o.name), o.name));
  aura.dispose();
});

test('Huyền Dạ: bóng dáng riêng là vầng nhật thực đen 3D nhỏ, đậm, nằm sau đầu', () => {
  const aura = make();
  aura.update(1);
  const disc = one(aura, 'huyen-da-eclipse-disc'), eclipse = one(aura, 'huyen-da-eclipse');
  disc.geometry.computeBoundingBox();
  const box = disc.geometry.boundingBox, radius = (box.max.x - box.min.x) / 2;
  assert.ok((box.max.z - box.min.z) * disc.scale.z > 0.2, 'đĩa có bề dày');
  assert.ok(radius > 0.3 && radius < 0.5, 'nhỏ: bán kính ' + radius);
  assert.ok(eclipse.position.y > HEAD_Y + 0.3 && eclipse.position.z < -0.35, 'sau và cao hơn đầu');
  // Khoảng âm: đĩa là khối đen normal blend gần như đặc, không phải lớp cộng sáng.
  assert.equal(disc.material.blending, NormalBlending);
  assert.equal(disc.material.uniforms.ink.value, 1);
  assert.ok(disc.material.uniforms.deep.value.getHSL({}).l < 0.06);
  // Corona và vành chỉ ôm sát đĩa: khung corona chính không rộng quá hai lần đĩa.
  const corona = one(aura, 'huyen-da-corona');
  corona.geometry.computeBoundingBox();
  assert.ok(corona.geometry.boundingBox.max.x < radius * 2.3);
  assert.ok(corona.material.uniforms.inner.value * corona.geometry.boundingBox.max.x >= radius);
  aura.dispose();
});

test('Huyền Dạ: lớp tối normal blend làm chủ đạo, cộng màu dưới đất chỉ là viền mảnh', () => {
  const aura = make();
  const ground = ['huyen-da-ground-pool', 'huyen-da-ground-vortex', 'huyen-da-ground-swirl', 'huyen-da-ink-pools'];
  for (const name of ground) assert.equal(one(aura, name).material.blending, NormalBlending, name);
  const rim = one(aura, 'huyen-da-ground-rim');
  assert.equal(rim.material.blending, AdditiveBlending);
  assert.equal(rim.material.uniforms.rim.value, 1);
  let dark = 0, light = 0;
  aura.points.traverse(o => { if (o.material && o !== aura.points) (o.material.blending === NormalBlending ? dark++ : light++); });
  assert.ok(dark >= light, `tối ${dark} / sáng ${light}`);
  aura.dispose();
});

test('Huyền Dạ: hút xoáy vào trong — lông quạ và hạt sáng tiến dần về tâm nhật thực rồi tan', () => {
  const aura = make();
  const e = new Vector3(ECLIPSE.x, ECLIPSE.y, ECLIPSE.z);
  const dist = (name, t) => { aura.update(t); return new Vector3(...instancePos(one(aura, name), 0)).distanceTo(e); };
  for (const [name, life] of [['huyen-da-crow-feathers', 13], ['huyen-da-ink-wisps', 14]]) {
    const series = [0.3, 0.45, 0.6, 0.7].map(u => dist(name, u * life));
    for (let i = 1; i < series.length; i++) assert.ok(series[i] < series[i - 1], `${name}: ${series.map(v => v.toFixed(2))}`);
  }
  // Xoáy mực dưới đất và sau đĩa trôi vào tâm: flow dương, không đổi theo thời gian.
  const flows = t => { aura.update(t); return ['huyen-da-ground-vortex', 'huyen-da-back-vortex', 'huyen-da-corona'].map(n => one(aura, n).material.uniforms.flow.value); };
  const a = flows(1), b = flows(HUYEN_DA_CYCLE * 0.45);
  assert.ok(a.every(v => v > 0)); assert.deepEqual(a, b);
  aura.dispose();
});

test('Huyền Dạ: vùng quanh mặt để trống — không lông, khói hay hạt nào đè ngang mặt', () => {
  const aura = make();
  for (let t = 0; t < HUYEN_DA_CYCLE; t += 0.37) {
    aura.update(t);
    for (const name of MOVERS) {
      const mesh = one(aura, name);
      for (let i = 0; i < mesh.count; i++) {
        const [x, y, z] = instancePos(mesh, i);
        if (z > -0.3) assert.ok(Math.hypot(x, y - HEAD_Y) > 0.45, `${name}#${i} ở (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) lúc ${t}`);
      }
    }
    const smoke = one(aura, 'huyen-da-ink-smoke').geometry.attributes.position.array;
    for (let i = 0; i < smoke.length; i += 3) {
      if (smoke[i + 2] > -0.3) assert.ok(Math.hypot(smoke[i], smoke[i + 1] - HEAD_Y) > 0.4, `khói ở (${smoke[i].toFixed(2)}, ${smoke[i + 1].toFixed(2)})`);
    }
  }
  aura.dispose();
});

test('Huyền Dạ: nhịp thở tuần hoàn, corona co lại khi hít vào', () => {
  for (const k of ['phase', 'gather', 'release', 'pulse']) {
    assert.ok(Math.abs(huyenDaRhythm(2.3)[k] - huyenDaRhythm(2.3 + HUYEN_DA_CYCLE * 4)[k]) < 1e-9);
  }
  const aura = make();
  const scale = t => { aura.update(t); return one(aura, 'huyen-da-corona').parent.scale.x; };
  assert.ok(scale(HUYEN_DA_CYCLE * 0.15) < scale(HUYEN_DA_CYCLE * 0.45));
  aura.dispose();
});

test('Huyền Dạ: không có pha tăng tốc — vật trôi là hàm thuần của thời gian, tốc độ chậm đều', () => {
  const a = make(), b = make();
  for (let t = 0; t < 6; t += 0.25) a.update(t);
  b.update(5.75);
  for (const name of MOVERS) assert.deepEqual([...one(a, name).instanceMatrix.array], [...one(b, name).instanceMatrix.array], name);
  // Tốc độ trung bình cả đàn (các hạt lệch pha đều trên đường hút) lúc thở ra (đỉnh nhịp) không
  // vọt lên so với lúc lắng, và không hạt nào trôi nhanh (< 1.2 m/s).
  const meanSpeed = (name, t) => {
    const mesh = one(a, name);
    a.update(t); const before = Array.from({ length: mesh.count }, (_, i) => [instancePos(mesh, i), shown(mesh, i)]);
    a.update(t + 0.05);
    let sum = 0, n = 0;
    before.forEach(([p, seen], i) => {
      if (!seen || !shown(mesh, i)) return; // quay vòng đời lúc đang ẩn
      const q = instancePos(mesh, i), v = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) / 0.05;
      assert.ok(v < 1.2, `${name}#${i} trôi ${v.toFixed(2)} m/s`);
      sum += v; n++;
    });
    return sum / n;
  };
  for (const name of MOVERS) {
    const peak = [], calm = [];
    for (let i = 0; i < 300; i++) {
      const t = i * HUYEN_DA_CYCLE * 2 / 300, pulse = huyenDaRhythm(t).pulse;
      if (pulse > 0.8) peak.push(meanSpeed(name, t)); else if (pulse < 0.1) calm.push(meanSpeed(name, t));
    }
    const avg = list => list.reduce((s, v) => s + v, 0) / list.length;
    assert.ok(peak.length > 5 && calm.length > 5);
    assert.ok(avg(peak) < avg(calm) * 1.2, `${name}: đỉnh ${avg(peak)} so với lắng ${avg(calm)}`);
  }
  a.dispose(); b.dispose();
});

test('Huyền Dạ: chất lượng thấp bỏ lớp mực phụ, viền phụ và vũng mực loang', () => {
  const full = make(), low = make(true);
  assert.ok(draws(low) <= draws(full) - 5, `thấp ${draws(low)} so với đủ ${draws(full)}`);
  for (const name of ['huyen-da-corona-ink', 'huyen-da-corona-streamers', 'huyen-da-back-vortex-glow', 'huyen-da-ink-pools', 'huyen-da-ink-smoke-glow']) {
    assert.equal(one(low, name), null, name);
  }
  assert.equal(named(low, 'huyen-da-crow-feathers').length, 1);
  assert.ok(one(low, 'huyen-da-sparks').count < one(full, 'huyen-da-sparks').count);
  // Lớp tối chủ đạo vẫn giữ ở chất lượng thấp.
  for (const name of ['huyen-da-eclipse-disc', 'huyen-da-back-vortex', 'huyen-da-ground-vortex']) assert.ok(one(low, name), name);
  full.dispose(); low.dispose();
});

test('Huyền Dạ: mờ dần theo opacity Avatar ghi vào material chủ', () => {
  const aura = make();
  aura.points.material.opacity = 0.45;
  aura.update(1);
  assert.ok(Math.abs(one(aura, 'huyen-da-eclipse-disc').material.uniforms.opacity.value - 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'huyen-da-crow-feathers').material.uniforms.opacity.value - 0.95 * 0.5) < 1e-9);
  assert.ok(Math.abs(one(aura, 'huyen-da-sparks').material.uniforms.opacity.value - 0.5) < 1e-9);
  aura.dispose();
});

test('Huyền Dạ: giảm chuyển động làm chậm ba lần chứ không tắt hình, đổi ngay khi bật lại', () => {
  const motion = { matches: true };
  const aura = createHuyenDaAura(false, motion);
  aura.update(10);
  const corona = one(aura, 'huyen-da-corona').material;
  assert.ok(Math.abs(corona.uniforms.time.value - 3.5) < 1e-9);
  assert.ok(one(aura, 'huyen-da-crow-feathers').visible);
  motion.matches = false;
  aura.update(10);
  assert.equal(corona.uniforms.time.value, 10);
  aura.dispose();
});

test('Huyền Dạ: dispose giải phóng tài nguyên riêng, giữ hình lông, khung billboard và hoa văn dùng chung', () => {
  const aura = make();
  const sharedGeo = new Set([featherGeometry()]);
  const owned = new Set([aura.points.material]), shared = new Set(sharedGeo);
  aura.points.traverse(o => {
    if (o.isInstancedMesh && o.geometry.attributes.position.count === 4 && o.name !== 'huyen-da-ink-pools') shared.add(o.geometry);
    else if (o.geometry && !sharedGeo.has(o.geometry) && !o.isSprite) owned.add(o.geometry);
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

test('Huyền Dạ: createEffect(8) dùng pháp tướng mới', () => {
  const aura = createEffect(8, false);
  assert.equal(aura.points.name, 'huyen-da-aura');
  aura.update(2);
  aura.dispose();
});

test('Huyền Dạ khi ngồi thiền: tòa nhật thực riêng, không mượn cánh Hồng Liên hay đoá sen', () => {
  const tint = new Color('purple'), accent = new Color('white');
  const huyen = createManifestation(8, tint, accent), hong = createManifestation(4, tint, accent), lotus = createManifestation(0, tint, accent);
  for (const [i, mesh] of huyen.layers.entries()) {
    const n = mesh.geometry.attributes.position.count;
    assert.notEqual(n, hong.layers[i].geometry.attributes.position.count);
    assert.notEqual(n, lotus.layers[i].geometry.attributes.position.count);
    assert.ok([...mesh.geometry.attributes.position.array].every(v => Number.isFinite(v) && Math.abs(v) < 4));
  }
  // Tầng 4 và 5: lòng vành nhật thực rỗng (khoảng âm).
  for (const i of [1, 2]) {
    const pos = huyen.layers[i].geometry.attributes.position.array;
    for (let k = 0; k < pos.length; k += 3) {
      if (Math.abs(pos[k + 2] + 0.6) < 0.1) assert.ok(Math.hypot(pos[k], pos[k + 1] - 1.12) > 0.25, 'lòng vành rỗng');
    }
  }
  huyen.dispose(); hong.dispose(); lotus.dispose();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const aura = new CultivationAura(false, 8);
    assert.equal(aura.uniforms.theme.value, 8);
    aura.dispose();
  } finally {
    if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
  }
});
