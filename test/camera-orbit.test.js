import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FollowCamera } from '../client/src/player/camera.js';
import { MATS, SPAWN, cameraSegmentT } from '../shared/layout.js';

test('camera orbits 360 degrees without jumping or crossing walls', () => {
  const oldMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    for (const point of [SPAWN, ...MATS]) {
      const follow = new FollowCamera(new THREE.PerspectiveCamera());
      follow.intro = false;
      follow.look.set(point.x, 1.2, point.z);
      let previous;
      for (let degree = 0; degree <= 360; degree++) {
        follow.yaw = degree * Math.PI / 180;
        follow.update(1 / 60, point.x, 0, point.z, { yaw: 0, pitch: 0, zoom: 0 });
        if (previous) assert.ok(follow.pos.distanceTo(previous) < 0.6, `camera jumped at ${point.x}, ${point.z}, ${degree}°`);
        assert.ok(cameraSegmentT(point.x, point.z, follow.pos.x, follow.pos.z) > 0.99, `camera crossed wall at ${degree}°`);
        previous = follow.pos.clone();
      }
    }
  } finally {
    globalThis.matchMedia = oldMatchMedia;
  }
});
