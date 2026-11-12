import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FollowCamera } from '../client/src/player/camera.js';
import { TouchPinchZoom } from '../client/src/player/touch-pinch-zoom.js';
import { PointerLockLookFilter } from '../client/src/player/pointer-lock-look-filter.js';
import { CAMERA_COLLIDERS, cameraProbe } from '../shared/camera-colliders.js';
import { BRIDGE, GALLERIES, MATS, SPAWN, floorHeight } from '../shared/layout.js';

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
  follow.look.set(point.x, floorHeight(point.x, point.z) + 1.2, point.z);
  return follow;
}

/** Camera không nằm trong vật cản và đường từ đầu nhân vật tới camera không xuyên vật cản nào. */
function assertClearView(follow, where) {
  const { pos, look } = follow;
  for (const b of CAMERA_COLLIDERS) {
    const inside = pos.x > b.minX && pos.x < b.maxX && pos.y > b.minY && pos.y < b.maxY && pos.z > b.minZ && pos.z < b.maxZ;
    assert.ok(!inside, `camera inside a collider at ${where}`);
  }
  const d = pos.clone().sub(look);
  const len = d.length();
  d.divideScalar(len);
  assert.ok(cameraProbe(look.x, look.y, look.z, d.x, d.y, d.z, len, 0) >= len - 1e-6, `camera behind a wall at ${where}`);
}

/** Đứng yên ở (x, z), đặt yaw/pitch rồi chạy đủ lâu để camera ổn định. */
function settle(follow, x, z, yaw, pitch, frames = 120) {
  const y = floorHeight(x, z);
  follow.yaw = yaw;
  follow.pitch = pitch;
  follow.targetPitch = pitch;
  for (let i = 0; i < frames; i++) follow.update(1 / 60, x, y, z, STILL);
}

test('low bridge rails do not pull the camera in while orbiting on the bridge', () => withMatchMedia(() => {
  const x = (BRIDGE.x1 + BRIDGE.x2) / 2;
  const follow = orbitCamera({ x, z: BRIDGE.z });
  // 4 m: vẫn ở trong khoảng hồ sen, không chạm mái hành lang gần đó.
  follow.distance = follow.zoomDist = follow.currentDist = 4;
  settle(follow, x, BRIDGE.z, 0, 0.3);
  for (let degree = 0; degree <= 360; degree += 5) {
    settle(follow, x, BRIDGE.z, degree * Math.PI / 180, 0.3, 2);
    assert.ok(follow.currentDist > follow.distance - 0.05, `camera snagged on the rail at ${degree}°: ${follow.currentDist}`);
  }
}));

test('the low yard wall only blocks the camera when it is behind the wall', () => withMatchMedia(() => {
  // Đứng sát tường rào nam trong sân, camera phía nam (yaw 0 = phía +z, sau tường).
  const high = orbitCamera({ x: -12, z: 27.6 });
  settle(high, -12, 27.6, 0, 0.6);
  assert.ok(high.currentDist > high.distance - 0.05, `camera above the wall was pulled in to ${high.currentDist}`);
  const low = orbitCamera({ x: -12, z: 27.6 });
  settle(low, -12, 27.6, 0, -0.1);
  assert.ok(low.currentDist < 3, `camera behind the wall stayed at ${low.currentDist}`);
  assertClearView(low, 'low behind yard wall');
}));

test('under a gallery roof the camera stays below the roof and keeps the player centred', () => withMatchMedia(() => {
  const g = GALLERIES[0];
  const follow = orbitCamera(g);
  settle(follow, g.x, g.z, 0, 1.1);
  assert.ok(follow.pos.y < g.roof, `camera went through the roof: ${follow.pos.y}`);
  assertClearView(follow, 'under gallery');
  follow.camera.updateMatrixWorld();
  const head = new THREE.Vector3(g.x, floorHeight(g.x, g.z) + 1.2, g.z).project(follow.camera);
  assert.ok(Math.abs(head.x) < 0.05 && Math.abs(head.y) < 0.05, 'player stays in the middle of the frame');
}));

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
      assertClearView(follow, `${point.x}, ${point.z}, ${degree}°`);
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

test('pitching from above down to the ground and up to the sky keeps the player in frame', () => withMatchMedia(() => {
  for (const zoom of [2.2, 7.5, 16]) {
    const follow = new FollowCamera(new THREE.PerspectiveCamera(58, 16 / 9, 0.15, 2600));
    follow.intro = false;
    follow.distance = follow.zoomDist = follow.currentDist = zoom;
    const x = SPAWN.x;
    const z = 20;
    const y = floorHeight(x, z);
    follow.look.set(x, y + 1.2, z);
    settle(follow, x, z, 0, 0.6, 60);
    let previous = follow.pos.clone();
    // Kéo chuột ngước dần như người chơi, mỗi khung một chút, tới hết cỡ.
    for (let i = 0; i < 160; i++) {
      follow.update(1 / 60, x, y, z, { yaw: 0, pitch: -0.012, zoom: 0 });
      follow.camera.updateMatrixWorld();
      const head = new THREE.Vector3(x, y + 1.2, z).project(follow.camera);
      assert.ok(head.y > -0.95 && head.y < 0.95 && Math.abs(head.x) < 0.05, `zoom ${zoom}: player left the frame at pitch ${follow.pitch.toFixed(2)} (ndc ${head.y.toFixed(2)})`);
      assert.ok(follow.pos.y >= y + 0.29, `zoom ${zoom}: camera under the ground at pitch ${follow.pitch.toFixed(2)}`);
      assert.ok(Math.hypot(follow.pos.x - x, follow.pos.z - z) > 0.8, `zoom ${zoom}: camera inside the player at pitch ${follow.pitch.toFixed(2)}`);
      // Trượt sát đất về phía chân là một cú zoom: tính theo tỉ lệ khoảng cách, không theo mét.
      assert.ok(follow.pos.distanceTo(previous) < 0.07 * zoom, `zoom ${zoom}: camera jumped at pitch ${follow.pitch.toFixed(2)}`);
      previous = follow.pos.clone();
    }
    assert.ok(follow.forward.y > Math.sin(0.85), `zoom ${zoom}: can look up at the sky (forward.y ${follow.forward.y.toFixed(2)})`);
  }
}));

test('pointer-lock look filter drops the browser jumps that spin the camera', () => {
  const filter = new PointerLockLookFilter();
  assert.equal(filter.accept(5, 2), true);
  filter.locked();
  assert.equal(filter.accept(3, 1), false, 'first event after locking is skipped');
  assert.equal(filter.accept(900, 0), false, 'second event after locking is skipped');
  assert.equal(filter.accept(12, -4), true);
  assert.equal(filter.accept(-640, 3), false, 'a sudden huge jump mid-drag is dropped');
  assert.equal(filter.accept(0, 400), false);
  assert.equal(filter.accept(NaN, 0), false);
  assert.equal(filter.accept(-140, 90), true, 'a fast real flick still turns the camera');
});
