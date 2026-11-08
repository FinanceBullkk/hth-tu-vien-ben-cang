import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSenKimCultivation } from '../client/src/player/sen-kim-cultivation.js';
import { breakthroughFrame } from '../client/src/player/cultivation-breakthrough.js';
import { energyPoint } from '../client/src/player/sen-kim-energy.js';
import { Vector3 } from 'three';

test('Sen Kim has four distinct server-tier silhouettes with finite geometry and owned resources', () => {
  for (const low of [false, true]) for (let tier = 0; tier < 4; tier++) {
    // Production uses the newer signature aura; retain checks for this standalone renderer.
    const fx = createSenKimCultivation(tier, low), root = fx.group;
    assert.equal(root.userData.tier, tier);
    assert.equal(root.visible, true);
    assert.equal(root.getObjectByName('sen-kim-lotus').count, [8, 16, 16, 24][tier]);
    assert.equal(Boolean(root.getObjectByName('sen-kim-elixir')), tier >= 2);
    assert.equal(Boolean(root.getObjectByName('sen-kim-dharma')), tier === 3);
    for (const time of [0, 2, 8, 1234567]) {
      fx.update(time, true, .5);
      root.updateMatrixWorld(true);
      root.traverse(o => {
        assert.ok(o.matrixWorld.elements.every(Number.isFinite));
        if (o.instanceMatrix) assert.ok([...o.instanceMatrix.array].every(Number.isFinite));
      });
    }
    fx.update(4, false, 0);
    const owned = new Set();
    root.traverse(o => {
      if (o.geometry) owned.add(o.geometry);
      if (o.material) {
        owned.add(o.material);
        if (o.material.uniforms?.fade) assert.equal(o.material.uniforms.fade.value, 0);
        else if (!o.material.isShaderMaterial) assert.equal(o.material.opacity, 0);
      }
    });
    let disposed = 0;
    owned.forEach(o => o.addEventListener('dispose', () => disposed++));
    fx.dispose();
    assert.equal(disposed, owned.size);
  }
});

test('energy converges on dantian in first three realms; ascension rises above the body', () => {
  const p = new Vector3();
  for (let tier = 0; tier < 3; tier++) {
    energyPoint(p, tier, 0, 2, 1);
    const start = p.distanceTo(new Vector3(0, .72, .28));
    energyPoint(p, tier, 1, 2, 1);
    assert.ok(p.distanceTo(new Vector3(0, .72, .28)) < .06);
    assert.ok(start > .5);
  }
  energyPoint(p, 3, 0, 2, 1); const startY = p.y;
  energyPoint(p, 3, 1, 2, 1); assert.ok(p.y - startY > 2);
});

test('breakthrough gathers, compresses, releases once, settles, and respects reduced motion', () => {
  assert.equal(breakthroughFrame(-1, 2).active, false);
  assert.equal(breakthroughFrame(2, 0).active, false);
  assert.ok(breakthroughFrame(1.5, 2).gather > .8);
  assert.ok(breakthroughFrame(3.8, 2).compress > .9);
  assert.ok(breakthroughFrame(4.6, 2).release > .9);
  assert.equal(breakthroughFrame(8, 2).active, false);
  assert.equal(breakthroughFrame(80, 2).release, 0);
  assert.equal(breakthroughFrame(4.6, 2, true).release, 0);
  const fx = createSenKimCultivation(3);
  fx.startBreakthrough(10); fx.update(14.6, true);
  assert.equal(fx.group.userData.breakthrough, true);
  assert.ok(fx.group.userData.lift > 0 && fx.group.userData.lift < .43);
  assert.ok(fx.group.getObjectByName('sen-kim-elixir').position.x === 0);
  fx.update(18, false);
  assert.equal(fx.group.userData.breakthrough, false);
  assert.equal(fx.group.userData.lift, 0);
  fx.update(18, true);
  assert.ok(fx.group.userData.lift > .4);
  fx.dispose();
});

test('Sen Kim sanitizes tier, uses less geometry on low and freezes reduced motion', () => {
  for (const bad of [-1, NaN, Infinity, '3', 1.5]) {
    const fx = createSenKimCultivation(bad);
    assert.equal(fx.group.userData.tier, 0); fx.dispose();
  }
  const high = createSenKimCultivation(3), low = createSenKimCultivation(3, true);
  assert.ok(low.group.getObjectByName('sen-kim-lotus').geometry.attributes.position.count <
    high.group.getObjectByName('sen-kim-lotus').geometry.attributes.position.count);
  high.dispose(); low.dispose();
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const fx = createSenKimCultivation(3);
    fx.update(1);
    const petals = fx.group.getObjectByName('sen-kim-lotus');
    const before = [...petals.instanceMatrix.array];
    fx.update(8);
    assert.deepEqual([...petals.instanceMatrix.array], before);
    fx.dispose();
  } finally {
    if (previous === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previous;
  }
});
