import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BELL, BRIDGE, HALL, PAGODA, PLACES, POND, TREE, floorHeight, resolveCollision } from '../shared/layout.js';

test('main axis stays clear from the gate through the hall entrance', () => {
  for (const x of [-1, 0, 1]) {
    for (let z = 39; z >= HALL.z + HALL.halfD - 1; z -= 0.2) {
      const result = resolveCollision(x, z);
      assert.ok(Math.hypot(result.x - x, result.z - z) < 1e-6, `blocked at ${x}, ${z}`);
    }
  }
});

test('relocated activities and bridge stay aligned with collision and floor height', () => {
  for (const [key, target] of [['bell', BELL], ['tree', TREE]]) {
    const place = PLACES.find(place => place.key === key);
    assert.ok(Math.hypot(place.x - target.x, place.z - target.z) < target.radius);
    assert.deepEqual(resolveCollision(place.x, place.z), { x: place.x, z: place.z });
  }
  assert.equal(BRIDGE.z, POND.z);
  for (let x = BRIDGE.x1 - 1; x <= BRIDGE.x2 + 1; x += 0.1) {
    const result = resolveCollision(x, BRIDGE.z);
    assert.ok(Math.hypot(result.x - x, result.z - BRIDGE.z) < 1e-6, `bridge blocked at ${x}`);
  }
  assert.equal(floorHeight(POND.x, POND.z), BRIDGE.peak + 0.06);
  assert.equal(floorHeight(BELL.x, BELL.z), 0.2);
  assert.ok(Math.abs(BELL.x - HALL.x) > 8, 'bell roof leaves the central sightline open');
  assert.ok(PAGODA.z < -15, 'pagoda belongs to the northern garden');
});
