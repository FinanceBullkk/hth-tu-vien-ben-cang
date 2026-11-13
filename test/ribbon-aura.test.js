import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRibbonAura } from '../client/src/player/vfx/ribbon-aura.js';
import { AVATAR, EFFECT_NAMES } from '../shared/protocol.js';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';

test('new aura IDs append without changing saved legacy choices', () => {
  assert.deepEqual(EFFECT_NAMES.slice(0, 9), ['Không', 'Sen kim', 'Lưu ly', 'Tinh hà', 'Hỏa diễm', 'Đào hoa', 'Bích ngọc', 'Nguyệt bạch', 'Hắc ám']);
  assert.equal(AVATAR.effects, AURA_TITLES.length);
  assert.equal(AVATAR.effects, EFFECT_NAMES.length);
  for (const bad of [0, 8, 11, 12, 9.5, NaN, '9']) assert.throws(() => createRibbonAura(bad), RangeError);
});

test('ribbon geometry, quality, fading and disposal stay valid', () => {
  for (const effect of [9, 10]) {
    const full = createRibbonAura(effect), low = createRibbonAura(effect, true);
    const mesh = full.points.children[0];
    assert.ok(low.points.children[0].geometry.attributes.position.count < mesh.geometry.attributes.position.count);
    const owned = new Set([full.points.material]);
    full.points.traverse(o => { if (o.geometry) owned.add(o.geometry); if (o.material) owned.add(o.material); });
    let disposed = 0;
    owned.forEach(o => o.addEventListener('dispose', () => disposed++));
    for (const t of [0, 1, 1234567]) {
      full.update(t);
      full.points.traverse(child => {
        if (!child.geometry) return;
        assert.ok([...child.geometry.attributes.position.array].every(Number.isFinite));
        assert.equal(child.material.depthWrite, false);
      });
    }
    for (const index of mesh.geometry.index.array) assert.ok(index < mesh.geometry.attributes.position.count);
    full.beginFade();
    full.points.material.opacity = .2;
    full.update(3);
    assert.equal(mesh.material.uniforms.opacity.value, .2);
    assert.equal(low.points.material.opacity, .9);
    full.dispose(); low.dispose();
    assert.equal(disposed, owned.size);
  }
});

test('reduced motion freezes ribbons and motes', () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const aura = createRibbonAura(9);
    aura.update(1);
    const before = [...aura.points.children[1].geometry.attributes.position.array];
    aura.update(10);
    assert.deepEqual([...aura.points.children[1].geometry.attributes.position.array], before);
    assert.equal(aura.points.children[0].material.uniforms.motion.value, 0);
    aura.dispose();
  } finally {
    if (previous === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previous;
  }
});
