import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createQiAura, beginQiFrame, qiBloom } from '../client/src/player/vfx/qi-aura.js';

const camera = new THREE.PerspectiveCamera(48, 16 / 9, .1, 100);
camera.position.set(0, 2, 6); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
function step(aura, t, moving = 0) { beginQiFrame(camera); aura.update(t, moving); }

test('qi lifecycle has quiet intervals and finite envelopes', () => {
  for (const fire of [true, false]) for (const phase of [0, .33, .9]) {
    const samples = Array.from({ length: 1200 }, (_, i) => qiBloom(i / 30, phase, fire));
    assert.ok(samples.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(samples.some(v => v > .9));
    assert.ok(samples.filter(v => v < .05).length > samples.length / 3);
  }
  assert.throws(() => createQiAura(8), RangeError);
});

test('trail keeps world history, resets on teleport; fade disposes each owned resource once', () => {
  for (const effect of [2, 4]) {
    const aura = createQiAura(effect), root = new THREE.Group(); root.add(aura.points);
    const streams = aura.points.getObjectByName('qi-streams'), u = streams.material.uniforms;
    let released = 0;
    aura.points.children.forEach(o => { o.geometry.addEventListener('dispose', () => released++); o.material.addEventListener('dispose', () => released++); });
    for (let i = 0; i < 90; i++) { root.position.x = i / 90; step(aura, i / 60, 1); }
    assert.ok(u.tail.value[15].x < -.2, 'tail must lag the moving parent');
    root.rotation.y = Math.PI / 2; step(aura, 1.51, 1);
    assert.ok(Math.abs(u.tail.value[15].z) > .2, 'world trail survives parent turning');
    root.position.x = -4; step(aura, 1.53, 1);
    assert.ok(u.tail.value.every(p => p.length() < 1e-6), 'teleport must not draw a long streak');
    const material = streams.material; aura.beginFade(); aura.beginFade();
    for (let i = 0; i < 60; i++) step(aura, 1.55 + i / 60);
    assert.equal(streams.material, material, 'aura fade must not clone shader materials');
    assert.equal(u.fade.value, 0);
    aura.dispose(); aura.dispose(); assert.equal(released, 6); assert.equal(root.children.length, 0);
  }
});

test('quality budget, culling and reduced motion affect whole aura', () => {
  const all = Array.from({ length: 60 }, (_, i) => createQiAura(i % 2 ? 2 : 4));
  beginQiFrame(camera);
  all.forEach(a => a.update(1));
  assert.equal(all.reduce((n, a) => n + a.points.children.filter(o => o.visible).length, 0), 76);
  beginQiFrame(camera, 0); all.forEach(a => a.update(2));
  assert.equal(all.reduce((n, a) => n + a.points.children.filter(o => o.visible).length, 0), 60);
  const root = new THREE.Group(); root.add(all[0].points); root.position.x = 100;
  step(all[0], 3); assert.equal(all[0].points.visible, false); all.forEach(a => a.dispose());
  const previous = globalThis.matchMedia, media = { matches: false };
  globalThis.matchMedia = () => media;
  try {
    const aura = createQiAura(4); step(aura, 0); step(aura, .1);
    media.matches = true; step(aura, .2); const u = aura.points.children[0].material.uniforms;
    assert.equal(u.time.value, 0); assert.equal(u.bloom.value, 0); assert.equal(u.moving.value, 0);
    assert.deepEqual(aura.points.children.map(o => o.visible), [false, true, false]); aura.dispose();
  } finally { if (previous) globalThis.matchMedia = previous; else delete globalThis.matchMedia; }
});
