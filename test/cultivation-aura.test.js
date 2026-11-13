import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CultivationAura } from '../client/src/player/cultivation-aura.js';
import { createManifestation } from '../client/src/player/cultivation-manifestation.js';
import { Color } from 'three';

test('aura grows through five tiers, quiets while standing and shares immutable geometry', (t) => {
  const original = globalThis.matchMedia;
  const motion = { matches: false };
  globalThis.matchMedia = () => motion;
  t.after(() => { if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia; });
  const aura = new CultivationAura();
  const low = new CultivationAura(true);
  let size = 0, particles = 0, sharedDisposals = 0;
  for (const [i, qi] of [0, 50, 150, 350, 750].entries()) {
    aura.setQi(qi);
    aura.update(0.5, 1, 5);
    assert.equal(aura.group.visible, true);
    assert.ok(aura.ground.scale.x >= size);
    assert.ok(aura.dustGeometry.drawRange.count > particles);
    assert.equal(aura.manifestation.group.visible, i >= 2);
    assert.equal(aura.manifestation.layers.filter(m => m.visible).length, i === 4 ? 2 : Math.max(0, i - 1));
    assert.equal(aura.ribbon.visible, true);
    assert.equal(aura.secondRibbon.visible, i >= 1);
    assert.ok(aura.positions.every(Number.isFinite));
    size = aura.ground.scale.x;
    particles = aura.dustGeometry.drawRange.count;
  }
  low.setQi(750);
  low.update(0.5, 1, 5);
  assert.ok(low.dustGeometry.drawRange.count < particles);
  assert.equal(low.secondRibbon.visible, false);
  const colors = new Set();
  for (let effect = 1; effect <= 8; effect++) {
    aura.setEffect(effect);
    colors.add(aura.uniforms.tint.value.getHex());
    assert.equal(aura.uniforms.theme.value, effect);
    const color = aura.uniforms.tint.value.getHex();
    aura.setQi(0);
    aura.setQi(750);
    assert.equal(aura.uniforms.tint.value.getHex(), color);
  }
  assert.equal(colors.size, 8);
  aura.setEffect(999);
  assert.equal(aura.effect, 0);
  motion.matches = true;
  aura.update(0.5, 1, 5);
  assert.equal(aura.uniforms.time.value, 0);
  assert.equal(aura.uniforms.burst.value, 0);
  aura.update(0.5, 0, 5);
  assert.ok(aura.ground.scale.x < size);
  assert.equal(aura.manifestation.group.visible || aura.dust.visible || aura.ribbon.visible, false);
  aura.update(0.5, 1, 31);
  assert.equal(aura.group.visible, false);
  for (const mesh of ['ground', 'ribbon']) {
    assert.equal(aura[mesh].geometry, low[mesh].geometry);
    aura[mesh].geometry.addEventListener('dispose', () => sharedDisposals++);
  }
  aura.dispose();
  assert.equal(sharedDisposals, 0);
  low.update(0.5, 1, 5);
  assert.equal(low.group.visible, true);
  low.dispose();
});

test('all manifestations have bounded distinct tier geometry, shared safely across avatars', () => {
  for (let effect = 0; effect <= 8; effect++) {
    const a = createManifestation(effect, new Color('cyan'), new Color('white'));
    const b = createManifestation(effect, new Color('cyan'), new Color('white'));
    let disposed = 0;
    for (const [i, mesh] of a.layers.entries()) {
      assert.equal(mesh.geometry, b.layers[i].geometry);
      mesh.geometry.addEventListener('dispose', () => disposed++);
      const positions = mesh.geometry.attributes.position.array;
      assert.ok(positions.length > 0);
      assert.ok(positions.every(v => Number.isFinite(v) && Math.abs(v) < 4));
    }
    for (let level = 1; level <= 5; level++) {
      a.update(level, 1, 2, 1);
      // Tinh Hà (3) giữ Bắc Đẩu ở tầng 5 nên không bị thay.
      const replaced = level === 5 && [0, 1, 4, 8].includes(effect);
      assert.equal(a.layers.filter(mesh => mesh.visible).length, Math.max(0, level - 2) - Number(replaced));
    }
    a.update(5, 0, 2, 1);
    assert.equal(a.group.visible, false);
    a.update(5, 1, 2, 0);
    assert.equal(a.group.visible, false);
    a.dispose(); b.dispose();
    assert.equal(disposed, 0);
  }
});
