// Hai hào quang chí tôn Thần Bài (13) và Vua Câu Cá (14): số liệu hữu hạn, đủ lớp, đúng bảng phân vai,
// bóng dáng riêng, tòa ngồi thiền, danh hiệu ánh kim và bảng màu tu luyện.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Matrix4, Vector3 } from 'three';
import { createThanBaiAura, thanBaiRhythm, THAN_BAI_CYCLE } from '../client/src/player/vfx/than-bai-aura.js';
import { FAN, RING } from '../client/src/player/vfx/than-bai-cards.js';
import { createVuaCauCaAura } from '../client/src/player/vfx/vua-cau-ca-aura.js';
import { LEAP, leapPoint } from '../client/src/player/vfx/vua-cau-ca-leaping-fish.js';
import { ROD_POINTS } from '../client/src/player/vfx/vua-cau-ca-rod.js';
import { createEffect } from '../client/src/player/avatar-effect.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';
import { AVATAR, EFFECT_NAMES } from '../shared/protocol.js';

const AURAS = [
  { effect: 13, make: low => createThanBaiAura(low, { matches: false }), name: 'than-bai-aura',
    layers: ['than-bai-table-seal', 'than-bai-table-seal-glow', 'than-bai-sunburst', 'than-bai-ace-fan', 'than-bai-card-ring', 'than-bai-chips', 'than-bai-gold-sparks'] },
  { effect: 14, make: low => createVuaCauCaAura(low, { matches: false }), name: 'vua-cau-ca-aura',
    layers: ['vua-cau-ca-sea-seal', 'vua-cau-ca-sea-seal-glow', 'vua-cau-ca-ripples', 'vua-cau-ca-bubbles', 'vua-cau-ca-leaping-fish',
      'vua-cau-ca-splash', 'vua-cau-ca-splash-ripples', 'vua-cau-ca-rod-body', 'vua-cau-ca-rod-glow', 'vua-cau-ca-reel', 'vua-cau-ca-line',
      'vua-cau-ca-hooked-carp', 'vua-cau-ca-drips'] },
];
const one = (aura, name) => { let hit = null; aura.points.traverse(o => { if (o.name === name) hit = o; }); return hit; };
const draws = a => { let n = 0; a.points.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) n++; }); return n; };
const instancePos = (mesh, i) => new Vector3().setFromMatrixPosition(new Matrix4().fromArray(mesh.instanceMatrix.array, i * 16));

for (const { effect, make, name, layers } of AURAS) {
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
      for (const layer of layers) if (!low || !/glow/.test(layer)) assert.ok(one(aura, layer), layer);
      assert.ok(draws(aura) <= (low ? 12 : 16), `số lần vẽ ${draws(aura)}`);
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

test('Thần Bài: quạt Tứ Át sau đầu, cao hơn đầu; vòng bài ngang ngực bao quanh người', () => {
  const aura = createThanBaiAura(false, { matches: false });
  aura.update(2);
  const fan = one(aura, 'than-bai-ace-fan');
  assert.equal(fan.count, 4);
  for (let i = 0; i < 4; i++) {
    const p = instancePos(fan, i);
    assert.ok(p.z < -0.35, 'quạt nằm sau lưng');
    assert.ok(p.y > 1.4, 'quạt cao hơn đầu');
  }
  assert.ok(FAN.y > 1.07);
  const ring = one(aura, 'than-bai-card-ring');
  const angles = [];
  for (let i = 0; i < ring.count; i++) {
    const p = instancePos(ring, i);
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - RING.radius) < 1e-6);
    assert.ok(p.y > 0.5 && p.y < 1.05, 'ngang ngực');
    angles.push(Math.atan2(p.x, p.z));
  }
  // Các lá rải đều quanh người (không dồn một phía).
  const sorted = angles.sort((a, b) => a - b), gaps = sorted.map((a, i) => (sorted[(i + 1) % sorted.length] - a + Math.PI * 2) % (Math.PI * 2));
  assert.ok(Math.max(...gaps) < Math.PI / 2);
  aura.dispose();
});

test('Thần Bài: nhịp thở chỉ đổi độ xoè, chu kỳ đúng', () => {
  assert.equal(THAN_BAI_CYCLE, 9);
  assert.equal(thanBaiRhythm(1).phase.toFixed(6), thanBaiRhythm(10).phase.toFixed(6));
});

test('Vua Câu Cá: cá vọt theo vòng cung khỏi mặt nước rồi lặn, hướng bay tiếp tuyến', () => {
  const seed = { r: LEAP.radius, h: LEAP.height }, p = new Vector3(), dir = new Vector3();
  assert.ok(leapPoint(seed, 0, 0, p).y < 0.1, 'bắt đầu ở mặt nước');
  assert.ok(leapPoint(seed, 0, 1, p).y < 0.1, 'kết thúc ở mặt nước');
  assert.ok(Math.abs(leapPoint(seed, 0, 0.5, p, dir).y - (0.04 + LEAP.height)) < 1e-9, 'đỉnh cung ở giữa');
  assert.ok(Math.abs(dir.y) < 1e-9, 'đỉnh cung bay ngang');
  // Hướng bay vuông góc với bán kính (tiếp tuyến vòng tròn).
  assert.ok(Math.abs(dir.x * p.x + dir.z * p.z) < 1e-9);
});

test('Vua Câu Cá: cần câu vồng qua đầu từ sau hông phải tới trước vai trái, cá treo không che mặt', () => {
  const [base, , , top, tip] = ROD_POINTS;
  assert.ok(base[0] > 0.2 && base[2] < -0.2, 'gốc sau hông phải');
  assert.ok(top[1] > 1.07 + 0.6, 'thân cần cao hơn đầu');
  assert.ok(tip[0] < -0.5 && tip[2] > 0.1, 'ngọn trước vai trái');
  const aura = createVuaCauCaAura(false, { matches: false });
  for (const t of [0.4, 2.2, 5.9]) {
    aura.update(t);
    const carp = instancePos(one(aura, 'vua-cau-ca-hooked-carp'), 0);
    assert.ok(carp.x < -0.45, 'cá treo lệch hẳn sang trái');
    assert.ok(carp.y > 0.5 && carp.y < 1.5, 'cá ngang thân');
  }
  aura.dispose();
});

test('hào quang chí tôn là hai món cuối, có tên và danh hiệu', () => {
  assert.equal(AVATAR.effects, 15);
  assert.deepEqual(EFFECT_NAMES.slice(13), ['Thần bài', 'Vua câu cá']);
  assert.deepEqual(AURA_TITLES.slice(13).map(t => t.title), ['Thần Bài', 'Vua Câu Cá']);
});
