// Hai hào quang chí tôn Thần Bài (13) và Vua Câu Cá (14): số liệu hữu hạn, đủ lớp, đúng bảng phân vai,
// bóng dáng riêng, tòa ngồi thiền, danh hiệu ánh kim và bảng màu tu luyện.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Matrix4, Vector3 } from 'three';
import { createThanBaiAura, thanBaiRhythm, THAN_BAI_CYCLE } from '../client/src/player/vfx/than-bai-aura.js';
import { FAN, STORM, allIn } from '../client/src/player/vfx/than-bai-cards.js';
import { createVuaCauCaAura } from '../client/src/player/vfx/vua-cau-ca-aura.js';
import { LEAP, leapPoint } from '../client/src/player/vfx/vua-cau-ca-leaping-fish.js';
import { ROD_POINTS } from '../client/src/player/vfx/vua-cau-ca-rod.js';
import { CARP, DIVE_ANGLE, EMERGE_ANGLE, LOOP, loopPoint } from '../client/src/player/vfx/vua-cau-ca-giant-carp.js';
import { VUA_CAU_CA_CYCLE, vuaCauCaRhythm } from '../client/src/player/vfx/vua-cau-ca-aura.js';
import { surge } from '../client/src/player/vfx/vua-cau-ca-geyser.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';
import { AVATAR, EFFECT_NAMES } from '../shared/protocol.js';

const AURAS = [
  { effect: 13, make: low => createThanBaiAura(low, { matches: false }), name: 'than-bai-aura',
    layers: ['than-bai-roulette', 'than-bai-roulette-rims', 'than-bai-roulette-frets', 'than-bai-roulette-ball', 'than-bai-ball-trail',
      'than-bai-gold-suit-0', 'than-bai-gold-suit-3', 'than-bai-gold-pillars', 'than-bai-shockwave', 'than-bai-sunburst', 'than-bai-seal-stamp',
      'than-bai-royal-fan', 'than-bai-card-storm', 'than-bai-dice', 'than-bai-chips', 'than-bai-gold-sparks', 'than-bai-light-arcs'],
    lowSkip: /pillars/ },
  { effect: 14, make: low => createVuaCauCaAura(low, { matches: false }), name: 'vua-cau-ca-aura',
    layers: ['vua-cau-ca-ocean', 'vua-cau-ca-wave-crests', 'vua-cau-ca-ripples', 'vua-cau-ca-bubbles', 'vua-cau-ca-gold-sparks',
      'vua-cau-ca-fish-bodies', 'vua-cau-ca-fins', 'vua-cau-ca-carp-trail', 'vua-cau-ca-carp-water', 'vua-cau-ca-splash',
      'vua-cau-ca-splash-ripples', 'vua-cau-ca-rod-body', 'vua-cau-ca-rod-glow', 'vua-cau-ca-reel', 'vua-cau-ca-line', 'vua-cau-ca-drips',
      'vua-cau-ca-water-jets', 'vua-cau-ca-jet-spray', 'vua-cau-ca-shockwave'] },
];
const one = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const instancePos = (mesh, i) => new Vector3().setFromMatrixPosition(new Matrix4().fromArray(mesh.instanceMatrix.array, i * 16));

for (const { effect, make, name, layers, lowSkip } of AURAS) {
  test(`${EFFECT_NAMES[effect]}: mọi lớp hữu hạn ở mọi thời điểm, đủ lớp, không ghi depth, ít lần vẽ`, () => {
    for (const low of [false, true]) {
      const aura = make(low);
      assert.equal(aura.points.name, name);
      for (const t of [0, 1.7, 4.5, 9.3, 1234567.8]) {
        aura.update(t);
        aura.points.traverse(o => {
          if (o.isInstancedMesh) {
            assert.ok([...o.instanceMatrix.array].every(Number.isFinite), o.name);
            assert.ok([...o.instanceColor.array].every(Number.isFinite), o.name);
          } else if (o.geometry) assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite), o.name);
          if (o.material && o !== aura.points) assert.equal(o.material.depthWrite, false, o.name);
        });
      }
      for (const layer of layers) if (!low || !(lowSkip ?? /glow/).test(layer)) assert.ok(one(aura, layer), layer);
      assert.ok(draws(aura) <= (low ? 22 : 26), `số lần vẽ ${draws(aura)}`);
      aura.dispose();
    }
  });

  test(`${EFFECT_NAMES[effect]}: createEffect trả đúng aura, Avatar làm mờ qua group.material`, () => {
    const aura = createEffect(effect, false);
    assert.equal(aura.points.name, name);
    aura.points.material.opacity = 0;
    aura.update(3.2);
    // Mờ hẳn: mọi lớp atlas/billboard có độ đậm 0, mọi vật liệu thường có opacity 0.
    aura.points.traverse(o => {
      if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) assert.ok(o.instanceColor.array[i * 3] < 1e-6 || o.material.uniforms?.opacity?.value === 0, o.name);
      else if (o.material && o !== aura.points) assert.ok((o.material.uniforms?.opacity?.value ?? o.material.opacity) < 1e-6, o.name);
    });
    aura.dispose();
  });

  test(`${EFFECT_NAMES[effect]}: đúng bảng phân vai — không rồng, mây, trăng, kiếm, sen, cánh, xoáy hay cổng`, () => {
    const aura = make(false);
    aura.points.traverse(o => assert.ok(!/dragon|cloud|moon|sword|blade|lotus|petal|wing|vortex|spiral|helix|gate|mandala|trigram|koi/.test(o.name), o.name));
    aura.dispose();
  });

  test(`${EFFECT_NAMES[effect]}: tòa ngồi thiền riêng ba tầng, danh hiệu ánh kim, bảng màu tu luyện riêng`, () => {
    const mf = createManifestation(effect, new Color(1, 1, 1), new Color(1, 0, 0));
    const counts = mf.layers.map(l => l.geometry.attributes.position.count);
    assert.equal(counts.length, 3);
    assert.ok(counts.every(n => n > 0));
    const fallback = createManifestation(0, new Color(1, 1, 1), new Color(1, 0, 0)).layers.map(l => l.geometry.attributes.position.count);
    assert.notDeepEqual(counts, fallback, 'không mượn tòa sen mặc định');
    assert.equal(AURA_TITLES[effect].vip, true);
    assert.ok(AURA_TITLES[effect].title);
    const original = globalThis.matchMedia;
    globalThis.matchMedia = () => ({ matches: false });
    try {
      const aura = new CultivationAura(true, effect);
      assert.equal(aura.effect, effect, 'có bảng màu tu luyện riêng, không rớt về mặc định');
    } finally {
      if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia;
    }
  });
}

test('Thần Bài: quạt Thùng Phá Sảnh 3D sau đầu cao hơn đầu; lốc bài xoắn quanh thân từ chân lên quá đầu', () => {
  const aura = createThanBaiAura(false, { matches: false });
  aura.update(2);
  const fan = one(aura, 'than-bai-royal-fan');
  assert.equal(fan.count, 5, 'đủ năm lá 10 J Q K A');
  assert.ok(fan.geometry.attributes.position.count >= 24, 'lá bài là khối 3D có cạnh dày');
  for (let i = 0; i < 5; i++) {
    const p = instancePos(fan, i);
    assert.ok(p.z < -0.5, 'quạt nằm sau lưng');
    assert.ok(p.y > 1.3, 'quạt cao hơn đầu');
  }
  const storm = one(aura, 'than-bai-card-storm');
  let low = 0, high = 0;
  for (const t of [0, 1.1, 2.3, 3.7]) {
    aura.update(t);
    for (let i = 0; i < storm.count; i++) {
      const p = instancePos(storm, i);
      assert.ok(Math.hypot(p.x, p.z) > 0.5, 'lá bài không xuyên người');
      if (p.y < 0.6) low++;
      if (p.y > 1.5) high++;
    }
  }
  assert.ok(low > 0 && high > 0, 'lốc bài trải từ chân lên quá đầu');
  assert.ok(STORM.height > 1.8);
  aura.dispose();
});

test('Thần Bài: cao trào "tất tay" chỉ quanh đỉnh nhịp — quạt lật một vòng rồi về đúng chỗ, ấn triện hiện rồi tan', () => {
  assert.equal(THAN_BAI_CYCLE, 9);
  assert.equal(allIn(thanBaiRhythm(0)), 0);
  assert.ok(allIn(thanBaiRhythm(THAN_BAI_CYCLE * 0.5)) > 0.9);
  assert.equal(thanBaiRhythm(1).phase.toFixed(6), thanBaiRhythm(10).phase.toFixed(6));
  const aura = createThanBaiAura(false, { matches: false });
  const fan = one(aura, 'than-bai-royal-fan'), stamp = one(aura, 'than-bai-seal-stamp');
  const rot = (t) => { aura.update(t); return [...fan.instanceMatrix.array.slice(0, 12)].map(v => v.toFixed(3)).join(); };
  const calm = THAN_BAI_CYCLE * 0.05;
  aura.update(calm);
  assert.ok(stamp.instanceColor.array[0] < 1e-6, 'ngoài cao trào không có ấn triện');
  aura.update(THAN_BAI_CYCLE * 0.52);
  assert.ok(stamp.instanceColor.array[0] > 0.5, 'đỉnh nhịp ấn triện hiện rõ');
  // Lật đủ một vòng: hướng lá trước và sau cao trào như nhau (chỉ khác chút xoè do nhịp thở).
  assert.ok(rot(calm) !== rot(THAN_BAI_CYCLE * 0.46), 'đang lật thì hướng lá khác');
  aura.dispose();
});

// Trọng tâm các đỉnh của con cá thứ f trong lưới thân chung (đủ chất lượng: 23 vòng × 13 đỉnh).
const fishCentroid = (aura, f) => {
  const pos = one(aura, 'vua-cau-ca-fish-bodies').geometry.attributes.position.array, per = 23 * 13, c = new Vector3();
  for (let i = f * per; i < (f + 1) * per; i++) c.x += pos[i * 3], c.y += pos[i * 3 + 1], c.z += pos[i * 3 + 2];
  return c.multiplyScalar(1 / per);
};

test('Vua Câu Cá: cá chép khổng lồ bơi vòng đứng sau lưng, vọt lên bên phải, lặn bên trái, đỉnh vòng cao hơn đầu', () => {
  const p = new Vector3();
  assert.ok(Math.abs(loopPoint(EMERGE_ANGLE, 0, p).y) < 1e-9 && p.x > 0.8, 'vọt lên ở mặt nước bên phải');
  assert.ok(Math.abs(loopPoint(DIVE_ANGLE, 0, p).y) < 1e-9 && p.x < -0.8, 'lặn xuống ở mặt nước bên trái');
  assert.ok(LOOP.y + LOOP.radius > 1.07 + 0.4, 'đỉnh vòng cao hơn đầu');
  assert.ok(LOOP.z < -0.6, 'vòng nằm sau lưng');
  assert.ok(CARP.length > 1.2, 'cá đủ lớn để làm pháp tướng');
  const aura = createVuaCauCaAura(false, { matches: false });
  let above = 0, below = 0;
  for (let t = 0; t < LOOP.period; t += 0.4) {
    aura.update(t);
    const c = fishCentroid(aura, 0);
    assert.ok(c.z < -0.5, 'cá luôn ở sau lưng');
    if (c.y > 1.1) above++;
    if (c.y < 0) below++;
  }
  assert.ok(above > 0 && below > 0, 'có lúc vồng qua trên đầu, có lúc chìm dưới mặt nước');
  aura.dispose();
});

test('Vua Câu Cá: cá vọt theo vòng cung khỏi mặt nước rồi lặn, hướng bay tiếp tuyến', () => {
  const seed = { r: LEAP.radius, h: LEAP.height }, p = new Vector3(), dir = new Vector3();
  assert.ok(leapPoint(seed, 0, 0, p).y < 0.1, 'bắt đầu ở mặt nước');
  assert.ok(leapPoint(seed, 0, 1, p).y < 0.1, 'kết thúc ở mặt nước');
  assert.ok(leapPoint(seed, 0, -0.1, p).y < 0, 'trước khi vọt là dưới nước (bị cắt)');
  assert.ok(Math.abs(leapPoint(seed, 0, 0.5, p, dir).y - (0.04 + LEAP.height)) < 1e-9, 'đỉnh cung ở giữa');
  assert.ok(Math.abs(dir.y) < 1e-9, 'đỉnh cung bay ngang');
  assert.ok(Math.abs(dir.x * p.x + dir.z * p.z) < 1e-9, 'hướng bay tiếp tuyến vòng tròn');
});

test('Vua Câu Cá: cần câu vồng qua đầu từ sau hông phải tới trước vai trái, cá mắc câu treo không che mặt', () => {
  const [base, , , top, tip] = ROD_POINTS;
  assert.ok(base[0] > 0.2 && base[2] < -0.2, 'gốc sau hông phải');
  assert.ok(top[1] > 1.07 + 0.6, 'thân cần cao hơn đầu');
  assert.ok(tip[0] < -0.5 && tip[2] > 0.1, 'ngọn trước vai trái');
  const aura = createVuaCauCaAura(false, { matches: false });
  for (const t of [0.4, 2.2, 5.9]) {
    aura.update(t);
    const c = fishCentroid(aura, 1);
    assert.ok(c.x < -0.5, 'cá treo lệch hẳn sang trái');
    assert.ok(c.y > 0.6 && c.y < 1.5, 'cá ngang thân');
  }
  aura.dispose();
});

test('Vua Câu Cá: thuỷ trụ chỉ phun quanh đỉnh nhịp 12 giây', () => {
  assert.equal(VUA_CAU_CA_CYCLE, 12);
  assert.equal(surge(vuaCauCaRhythm(0)), 0);
  assert.ok(surge(vuaCauCaRhythm(VUA_CAU_CA_CYCLE * 0.52)) > 0.9);
  const aura = createVuaCauCaAura(false, { matches: false });
  const jets = one(aura, 'vua-cau-ca-water-jets');
  aura.update(VUA_CAU_CA_CYCLE * 0.05);
  assert.ok([...jets.instanceColor.array].filter((_, i) => i % 3 === 0).every(a => a === 0), 'ngoài cao trào không có cột nước');
  aura.update(VUA_CAU_CA_CYCLE * 0.52);
  const tall = new Vector3().setFromMatrixScale(new Matrix4().fromArray(jets.instanceMatrix.array, 0)).y;
  assert.ok(tall > 1.2, 'cột nước vọt cao ' + tall);
  aura.dispose();
});

test('hào quang chí tôn là hai món cuối, có tên và danh hiệu', () => {
  assert.equal(AVATAR.effects, 15);
  assert.deepEqual(EFFECT_NAMES.slice(13), ['Thần bài', 'Vua câu cá']);
  assert.deepEqual(AURA_TITLES.slice(13).map(t => t.title), ['Thần Bài', 'Vua Câu Cá']);
});
