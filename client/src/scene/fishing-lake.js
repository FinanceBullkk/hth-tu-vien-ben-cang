// Hồ câu trong sân: mặt nước đậm dần vào giữa, kè đá theo bờ cong, lau sậy, sen và bảng tên.
import * as THREE from 'three';
import { LAKE, lakeEdgeRadius } from '../../../shared/layout.js';
import { Batch, flatMaterial, rng, textTexture } from './builders.js';

const OUTLINE_POINTS = 96;
const DEEP = new THREE.Color(0x173f50);
const MID = new THREE.Color(0x24606f);
const SHALLOW = new THREE.Color(0x4a8f8c);

const edgePoint = (angle, k = 1) => {
  const r = lakeEdgeRadius(angle) * k;
  return [LAKE.x + Math.sin(angle) * r, LAKE.z + Math.cos(angle) * r];
};

/** Mặt nước dạng quạt nhiều vòng để tô màu chuyển từ bờ nông vào lòng sâu. */
function buildWater() {
  const rings = [[0, DEEP], [0.55, DEEP], [0.85, MID], [1, SHALLOW]];
  const positions = [];
  const colors = [];
  const index = [];
  for (const [k, color] of rings) {
    for (let i = 0; i < OUTLINE_POINTS; i++) {
      const [x, z] = edgePoint((i / OUTLINE_POINTS) * Math.PI * 2, k);
      positions.push(x, 0, z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < OUTLINE_POINTS; i++) {
      const a = ring * OUTLINE_POINTS + i;
      const b = ring * OUTLINE_POINTS + ((i + 1) % OUTLINE_POINTS);
      const c = a + OUTLINE_POINTS;
      const d = b + OUTLINE_POINTS;
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const water = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.84, side: THREE.DoubleSide, emissive: 0x0e3a4a }));
  water.position.y = LAKE.y;
  water.receiveShadow = true;
  return water;
}

/** Lòng hồ tối màu bên dưới để cá koi nổi lên và không lộ nền sân qua lớp nước trong. */
function buildBed() {
  const shape = new THREE.Shape();
  for (let i = 0; i < OUTLINE_POINTS; i++) {
    const [x, z] = edgePoint((i / OUTLINE_POINTS) * Math.PI * 2);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  const bed = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: 0x12303a, side: THREE.DoubleSide }));
  bed.rotation.x = Math.PI / 2; // Shape nằm trên XY: lật xuống để trục y của hình thành trục z của sân
  bed.position.y = 0.035;
  return bed;
}

function addShore(b) {
  const rand = rng(415);
  const stones = ['#8d8674', '#a39c88', '#77715f'];
  for (let i = 0; i < 74; i++) {
    const a = (i / 74) * Math.PI * 2 + rand() * 0.02;
    const [x, z] = edgePoint(a);
    const s = 0.3 + rand() * 0.3;
    b.add(new THREE.DodecahedronGeometry(s, 0), stones[i % 3], { x, y: 0.1, z, sy: 0.6, ry: rand() * 3, jitter: 0.08 });
  }
  // Vài bụi lau sậy ở các góc bờ, để giữa bờ bắc và nam trống cho người đứng câu.
  for (const center of [1.25, 2.1, 4.35, 5.25]) {
    for (let i = 0; i < 9; i++) {
      const [x, z] = edgePoint(center + (rand() - 0.5) * 0.34, 0.9 + rand() * 0.1);
      const h = 0.8 + rand() * 0.7;
      b.cyl(0.012, 0.03, h, i % 2 ? '#7c9450' : '#677f42', x, h / 2 + 0.05, z, { seg: 4, rz: (rand() - 0.5) * 0.25 });
      if (i % 3 === 0) b.cyl(0.035, 0.035, 0.2, '#6a4a2c', x, h, z, { seg: 5 });
    }
  }
  // Sen gom thành hai đám gần bờ đông và tây, chừa lòng hồ cho bóng cá.
  for (const center of [1.55, 4.75]) {
    for (let i = 0; i < 9; i++) {
      const [x, z] = edgePoint(center + (rand() - 0.5) * 0.7, 0.62 + rand() * 0.26);
      b.cyl(0.34 + rand() * 0.2, 0.34, 0.02, '#4f8a46', x, LAKE.y + 0.02, z, { seg: 8, jitter: 0.1 });
      if (i % 3 === 0) {
        b.add(new THREE.ConeGeometry(0.16, 0.24, 6), '#e88fa8', { x, y: LAKE.y + 0.16, z, jitter: 0.1 });
        b.add(new THREE.ConeGeometry(0.09, 0.18, 5), '#f7c9d4', { x, y: LAKE.y + 0.23, z });
      }
    }
  }
  // Cột bảng tên trên bờ bắc.
  const { sign } = LAKE;
  b.cyl(0.05, 0.07, 1.55, '#4a3a28', sign.x, 0.78, sign.z);
  b.box(1.24, 0.56, 0.06, '#5a4630', sign.x, 1.55, sign.z);
}

export function buildLake(scene) {
  const group = new THREE.Group();
  const b = new Batch(415);
  addShore(b);
  group.add(buildBed(), buildWater(), b.build(flatMaterial()));
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.42),
    new THREE.MeshBasicMaterial({ map: textTexture('HỒ CÂU', { w: 256, h: 96, font: 'bold 52px "Palatino Linotype",Georgia,serif' }), transparent: true }),
  );
  // Bảng quay về phía sân để người từ lối đi chính nhìn thấy.
  label.position.set(LAKE.sign.x, 1.55, LAKE.sign.z - 0.04);
  label.rotation.y = Math.PI;
  group.add(label);
  scene.add(group);
  return group;
}
