import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE } from '../shared/layout.js';
import { SITE_CENTER, ringPlacements } from '../client/src/scene/xianxia-backdrop-layout.js';

test('cảnh xa tiên hiệp chừa phía cảng, lối lên cổng và không mọc trong gò', () => {
  const spots = ringPlacements(60, 95, 400, 7311);
  assert.equal(spots.length, 60, 'đủ chỗ đặt núi');
  for (const s of spots) {
    const a = Math.atan2(s.z - SITE_CENTER.z, s.x - SITE_CENTER.x);
    assert.ok(Math.abs(a) >= Math.PI / 3 - 1e-9, `núi lấn phía cảng tại ${s.x.toFixed(1)},${s.z.toFixed(1)}`);
    assert.ok(!(Math.abs(s.x) < 40 && s.z > SITE.maxZ), 'núi chắn lối lên cổng');
    const inside = s.x > SITE.minX - 20 && s.x < SITE.maxX + 20 && s.z > SITE.minZ - 20 && s.z < SITE.maxZ + 20;
    assert.ok(!inside, 'núi mọc sát hoặc trong gò');
  }
  const xz = (list) => list.map(({ x, z }) => [x, z]);
  assert.deepEqual(xz(ringPlacements(5, 95, 400, 1)), xz(ringPlacements(5, 95, 400, 1)), 'cùng hạt giống thì mọi máy thấy giống nhau');
});
