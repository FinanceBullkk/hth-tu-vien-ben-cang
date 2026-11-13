import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CatmullRomCurve3, Vector3 } from 'three';
import {
  BAUCUA_ZONE, BELL, BRIDGE, CASINO, CASINO_HALL, CASINO_POLES, GATE_LIONS, SLOT_ZONE, MATS, TERRACE, COQUAY_ZONE, COURT_PATHS, GALLERIES, HALL, PAGODA, PLACES, POND, TAIXIU_ZONE, TREASURE_BASIN, TREE,
  XIDACH_ZONE, floorHeight, resolveCollision,
} from '../shared/layout.js';

test('main axis stays clear from the gate through the hall entrance', () => {
  for (const x of [-1, 0, 1]) {
    for (let z = 39; z >= HALL.z + HALL.halfD - 1; z -= 0.2) {
      const result = resolveCollision(x, z);
      assert.ok(Math.hypot(result.x - x, result.z - z) < 1e-6, `blocked at ${x}, ${z}`);
    }
  }
});

test('garden paths and covered galleries remain walkable with the new planting', () => {
  for (const [index, path] of COURT_PATHS.entries()) {
    const curve = new CatmullRomCurve3(path.points.map(([x, z]) => new Vector3(x, 0, z)));
    for (const p of curve.getSpacedPoints(300)) {
      const result = resolveCollision(p.x, p.z);
      assert.ok(Math.hypot(result.x - p.x, result.z - p.z) < 0.02, `path ${index} blocked at ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    }
  }
  for (const g of GALLERIES) {
    for (let z = g.z - g.d / 2 + 0.2; z < g.z + g.d / 2; z += 0.2) {
      assert.deepEqual(resolveCollision(g.x, z), { x: g.x, z });
      assert.equal(floorHeight(g.x, z), g.floor);
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

test('Kim Ngân Phường: hai cổng đi qua được, bàn không chồng nhau và nằm gọn trong tường', () => {
  const { gateEast, gateSouth } = CASINO;
  for (let x = CASINO.maxX - 2; x <= CASINO.maxX + 2; x += 0.1) {
    const result = resolveCollision(x, gateEast.z);
    assert.ok(Math.hypot(result.x - x, result.z - gateEast.z) < 1e-6, `cổng đông chặn tại ${x}`);
  }
  for (let z = CASINO.maxZ - 2; z <= CASINO.maxZ + 2; z += 0.1) {
    const result = resolveCollision(gateSouth.x, z);
    assert.ok(Math.hypot(result.x - gateSouth.x, result.z - z) < 1e-6, `cổng nam chặn tại ${z}`);
  }
  const tables = [BAUCUA_ZONE, XIDACH_ZONE, TAIXIU_ZONE, COQUAY_ZONE];
  tables.forEach((a, i) => {
    assert.ok(a.x - a.radius > CASINO.minX && a.x + a.radius < CASINO.maxX, 'bàn nằm trong tường đông tây');
    assert.ok(a.z - a.radius > CASINO.minZ && a.z + a.radius < CASINO.maxZ, 'bàn nằm trong tường nam bắc');
    assert.ok(Math.hypot(a.x - TREASURE_BASIN.x, a.z - TREASURE_BASIN.z) > a.radius + TREASURE_BASIN.r, 'bàn không đè Tụ Bảo Bồn');
    for (const b of tables.slice(i + 1)) {
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.radius + b.radius + 4, 'hai bàn cách nhau ít nhất 4 m');
    }
    // Khách đứng phía lối giữa, nhà cái đứng mép ngoài.
    assert.ok(Math.abs(a.seat.x - CASINO.aisleX) < Math.abs(a.dealer.x - CASINO.aisleX));
  });
});

test('đài cẩm thạch: bậc lên dốc đều, lan can chặn mép đài, chiếu thiền nằm trên mặt đài', () => {
  const { y, frontZ, stairFootZ, halfW, backZ } = TERRACE;
  let previous = floorHeight(0, stairFootZ + 0.5);
  for (let z = stairFootZ + 0.4; z >= frontZ - 0.4; z -= 0.1) {
    const now = floorHeight(0, z);
    assert.ok(now >= previous - 1e-9 && now - previous < 0.06, `bậc giật cao tại z=${z.toFixed(2)}`);
    previous = now;
  }
  assert.equal(floorHeight(0, frontZ - 0.5), y);
  for (const m of MATS) assert.equal(floorHeight(m.x, m.z), y, 'chiếu nằm trên mặt đài');
  // Đi ngang từ sân vào cạnh đài thì bị lan can đẩy ra, không leo tắt lên đài.
  for (const z of [backZ + 2, (backZ + frontZ) / 2, frontZ - 1]) {
    const west = resolveCollision(HALL.x - halfW - 0.3, z);
    assert.ok(west.x < HALL.x - halfW, `lọt qua lan can tây tại z=${z}`);
    const east = resolveCollision(HALL.x + halfW + 0.3, z);
    assert.ok(east.x > HALL.x + halfW, `lọt qua lan can đông tại z=${z}`);
  }
  // Bước từ hai bên bậc vào giữa bậc cũng bị chặn.
  const side = resolveCollision(HALL.x + TERRACE.stairHalf + 0.6, (frontZ + stairFootZ) / 2);
  assert.ok(side.x > HALL.x + TERRACE.stairHalf, 'lọt qua lan can bậc');
  for (const lion of GATE_LIONS) assert.ok(Math.abs(lion.x) - lion.r > 1.9, 'sư tử chừa lối giữa thềm');
});

test('Kim Ngân Lâu và cột đèn không lấn bàn, Tụ Bảo Bồn, máy gạt cần hay cổng', () => {
  const hall = {
    minX: CASINO_HALL.x - CASINO_HALL.halfW, maxX: CASINO_HALL.x + CASINO_HALL.halfW,
    minZ: CASINO_HALL.z - CASINO_HALL.halfD, maxZ: CASINO_HALL.z + CASINO_HALL.halfD,
  };
  assert.ok(hall.minZ > CASINO.minZ && hall.maxX < CASINO.maxX && hall.minX > CASINO.minX, 'lầu nằm trong tường sòng');
  for (const t of [BAUCUA_ZONE, XIDACH_ZONE, TAIXIU_ZONE, COQUAY_ZONE]) {
    assert.ok(t.z - t.radius > hall.maxZ + 2, 'chừa ít nhất 2 m giữa vùng bàn và thềm lầu');
  }
  assert.ok(TREASURE_BASIN.z - TREASURE_BASIN.r > hall.maxZ + 2, 'Tụ Bảo Bồn cách thềm lầu');
  for (const m of SLOT_ZONE.machines) assert.ok(m.x < hall.minX - 4, 'máy gạt cần cách lầu');
  for (const p of CASINO_POLES) {
    assert.ok(Math.abs(p.z - CASINO.gateEast.z) > CASINO.gateEast.half + 1, 'cột đèn không chắn cổng đông');
    for (const m of SLOT_ZONE.machines) assert.ok(Math.hypot(p.x - m.stand.x, p.z - m.stand.z) > 2, 'cột đèn không chắn máy');
  }
});
