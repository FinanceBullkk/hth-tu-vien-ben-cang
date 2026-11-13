import * as THREE from 'three';
import { BELL, CASINO, COURT_PATHS, HALL, LAKE, PAGODA, PITCH_ZONE, SITE, TREE } from '../../../shared/layout.js';

// Phố chợ lát đá từ quán trà tới trạm giao thương, ôm cả đoạn phố trước cổng nam Kim Ngân Phường.
const MARKET_PLAZA = { minX: -56, maxX: -23, minZ: 11.5, maxZ: 28.5 };
const rect = ({ minX, maxX, minZ, maxZ }) => [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
import { rng } from './builders.js';

function groundTexture(stone = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = rng(stone ? 5 : 23);
  ctx.fillStyle = stone ? '#b7b5a0' : '#a4b884';
  ctx.fillRect(0, 0, 512, 512);
  if (stone) {
    for (let row = 0; row < 5; row++) {
      for (let col = -1; col < 4; col++) {
        ctx.fillStyle = `hsl(43, 23%, ${70 + random() * 9}%)`;
        ctx.fillRect(col * 170 + row % 2 * 85 + 3, row * 102 + 3, 164, 96);
      }
    }
  }
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = stone ? `rgba(101,119,75,${random() * 0.05})` : `rgba(${i % 2 ? '84,121,69' : '225,211,157'},${random() * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(random() * 512, random() * 512, 2 + random() * 24, 2 + random() * 13, random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function surface(group, points, material, y = 0.018) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(shape);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 5, pos.getY(i) / 5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function clearing(group, x, z, rx, rz, material, seed) {
  const random = rng(seed);
  const points = Array.from({ length: 32 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2;
    const edge = 0.95 + random() * 0.1;
    return [x + Math.cos(angle) * rx * edge, z + Math.sin(angle) * rz * edge];
  });
  surface(group, points, material, 0.012);
}

export function buildCampusGround(group, b) {
  const earth = new THREE.MeshLambertMaterial({ map: groundTexture() });
  const stone = new THREE.MeshLambertMaterial({ map: groundTexture(true), side: THREE.DoubleSide });
  const soil = new THREE.MeshLambertMaterial({ color: '#c9bc9c' });
  surface(group, rect({ minX: SITE.minX - 0.7, maxX: SITE.maxX + 0.9, minZ: SITE.minZ - 0.7, maxZ: SITE.maxZ + 1 }), earth, 0);
  // Sân đạo trường trước thiền đường: để trống, chỉ lát đá; thuôn lại ở đầu nối với trục chính.
  const z0 = HALL.z + 8;
  surface(group, [[-9.7, z0], [9.7, z0], [9.7, z0 + 18], [6.5, z0 + 21], [-6.5, z0 + 21], [-9.7, z0 + 18]], stone);
  surface(group, rect(CASINO), stone);
  surface(group, rect(MARKET_PLAZA), stone);
  clearing(group, BELL.x, BELL.z, 5.5, 5.4, soil, 14);
  clearing(group, TREE.x, TREE.z, 5.6, 5.1, soil, 12);
  clearing(group, PAGODA.x, PAGODA.z, 5.4, 5.5, stone, 19);
  clearing(group, PITCH_ZONE.x - 4, PITCH_ZONE.z, 5.2, 5.8, soil, 17);
  for (const lobe of LAKE.lobes) clearing(group, lobe.x, lobe.z, lobe.r + 0.9, lobe.r + 0.9, soil, 26);

  // ponytail: paths remain flush; true terrain steps must also change shared floorHeight.
  for (const path of COURT_PATHS) {
    const curve = new THREE.CatmullRomCurve3(path.points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const steps = Math.ceil(curve.getLength() * 2);
    const points = curve.getSpacedPoints(steps);
    const positions = [], uvs = [], indices = [];
    let length = 0;
    for (let i = 0; i <= steps; i++) {
      if (i) length += points[i].distanceTo(points[i - 1]);
      const tangent = points[Math.min(i + 1, steps)].clone().sub(points[Math.max(0, i - 1)]).normalize();
      for (const side of [-1, 1]) {
        const half = path.width / 2 * (1 + Math.sin(i * 1.7) * 0.035);
        positions.push(points[i].x - tangent.z * half * side, 0.03, points[i].z + tangent.x * half * side);
        uvs.push((side + 1) / 2 * path.width / 5, length / 5);
      }
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, stone);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  b.box(17.6, 0.3, 3.4, '#d6c8aa', HALL.x, 0.15, HALL.z + HALL.halfD + 1.7);
}
