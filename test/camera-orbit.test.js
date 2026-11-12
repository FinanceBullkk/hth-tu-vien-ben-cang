import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FollowCamera, roofCeiling } from '../client/src/player/camera.js';
import { TouchPinchZoom } from '../client/src/player/touch-pinch-zoom.js';
import { MATS, ROOF_ZONES, SPAWN, cameraSegmentT } from '../shared/layout.js';

const STILL = { yaw: 0, pitch: 0, zoom: 0 };

function withMatchMedia(fn) {
  const old = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    fn();
  } finally {
    globalThis.matchMedia = old;
  }
}

function orbitCamera(point) {
  const follow = new FollowCamera(new THREE.PerspectiveCamera());
  follow.intro = false;
  follow.look.set(point.x, 1.2, point.z);
  return follow;
}

test('camera orbits 360 degrees without jumping or crossing walls', () => withMatchMedia(() => {
  for (const point of [SPAWN, ...MATS]) {
    const follow = orbitCamera(point);
    // Cho khoảng cách trượt xong (trong thiền đường bị giới hạn gần hơn) rồi mới quay.
    for (let i = 0; i < 90; i++) follow.update(1 / 60, point.x, 0, point.z, STILL);
    let previous;
    for (let degree = 0; degree <= 360; degree++) {
      follow.yaw = degree * Math.PI / 180;
      follow.update(1 / 60, point.x, 0, point.z, STILL);
      if (previous) assert.ok(follow.pos.distanceTo(previous) < 0.6, `camera jumped at ${point.x}, ${point.z}, ${degree}°`);
      assert.ok(cameraSegmentT(point.x, point.z, follow.pos.x, follow.pos.z) > 0.99, `camera crossed wall at ${degree}°`);
      previous = follow.pos.clone();
    }
  }
}));

test('zoom glides to the new distance instead of snapping', () => withMatchMedia(() => {
  const follow = orbitCamera(SPAWN);
  follow.update(1 / 60, SPAWN.x, 0, SPAWN.z, STILL);
  follow.update(1 / 60, SPAWN.x, 0, SPAWN.z, { yaw: 0, pitch: 0, zoom: -2 });
  assert.equal(follow.distance, follow.minDist);
  let previous = follow.pos.clone();
  for (let i = 0; i < 90; i++) {
    follow.update(1 / 60, SPAWN.x, 0, SPAWN.z, STILL);
    assert.ok(follow.pos.distanceTo(previous) < 0.9, `zoom snapped on frame ${i}`);
    previous = follow.pos.clone();
  }
  assert.ok(Math.abs(follow.currentDist - follow.minDist) < 0.05, 'zoom settles on the requested distance');
}));

test('leaving a minigame shot blends back behind the player', () => withMatchMedia(() => {
  const follow = orbitCamera(SPAWN);
  follow.shot = { pos: new THREE.Vector3(SPAWN.x + 12, 4, SPAWN.z - 10), look: new THREE.Vector3(SPAWN.x + 14, 0, SPAWN.z - 16) };
  for (let i = 0; i < 120; i++) follow.update(1 / 60, SPAWN.x, 0, SPAWN.z, STILL);
  follow.shot = null;
  let previous = follow.pos.clone();
  for (let i = 0; i < 90; i++) {
    follow.update(1 / 60, SPAWN.x, 0, SPAWN.z, STILL);
    assert.ok(follow.pos.distanceTo(previous) < 1, `camera cut on frame ${i}`);
    previous = follow.pos.clone();
  }
  assert.ok(Math.hypot(follow.pos.x - SPAWN.x, follow.pos.z - SPAWN.z) < 9, 'camera ends behind the player');
}));

test('roof ceiling is the roof inside a zone and rises smoothly outside it', () => {
  const zone = ROOF_ZONES[0];
  const midZ = (zone.minZ + zone.maxZ) / 2;
  assert.equal(roofCeiling((zone.minX + zone.maxX) / 2, midZ), zone.y);
  let previous = roofCeiling(zone.maxX, midZ);
  for (let step = 1; step <= 20; step++) {
    const cap = roofCeiling(zone.maxX + step * 0.1, midZ);
    assert.ok(cap >= previous && cap - previous < 1, `ceiling jumped at ${step}`);
    previous = cap;
  }
  assert.equal(roofCeiling(1000, 1000), Infinity);
});

test('camera never turns by itself while the player walks without touching the mouse', () => withMatchMedia(() => {
  // Đi theo khung camera như LocalPlayer: (mx, my) là phím/cần ảo, hướng đi phụ thuộc yaw.
  for (const [mx, my] of [[-1, 0], [1, 0], [0.7, 0.7], [-0.7, 0.7], [0, 1], [0, -1]]) {
    const follow = orbitCamera(SPAWN);
    follow.yaw = 0.4;
    let x = SPAWN.x;
    let z = SPAWN.z - 10;
    for (let i = 0; i < 600; i++) {
      const sin = Math.sin(follow.yaw);
      const cos = Math.cos(follow.yaw);
      x += (mx * cos - my * sin) * 4.3 / 60;
      z += (-mx * sin - my * cos) * 4.3 / 60;
      follow.update(1 / 60, x, 0, z, STILL);
    }
    assert.equal(follow.yaw, 0.4, `camera turned by itself for input ${mx},${my}`);
  }
}));

test('pinch spreads zoom in and pinches zoom out', () => {
  const pinch = new TouchPinchZoom();
  const ev = (id, x, y) => ({ pointerId: id, pointerType: 'touch', clientX: x, clientY: y });
  assert.equal(pinch.down({ ...ev(1, 100, 100), pointerType: 'mouse' }), false);
  assert.equal(pinch.down(ev(1, 100, 100)), false);
  assert.equal(pinch.move(ev(1, 110, 100)), 0);
  assert.equal(pinch.down(ev(2, 210, 100)), true);
  assert.ok(pinch.move(ev(2, 310, 100)) < 0, 'spreading zooms in');
  assert.ok(pinch.move(ev(2, 160, 100)) > 0, 'pinching zooms out');
  pinch.up(ev(2, 160, 100));
  assert.equal(pinch.active, false);
  assert.equal(pinch.move(ev(1, 120, 100)), 0);
});
