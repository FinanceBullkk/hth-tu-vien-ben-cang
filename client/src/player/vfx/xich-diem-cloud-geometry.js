import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hình cuộn tường vân 3D (mây lành) của Xích Diễm — khối dày vát mép nhìn ngang như mây trong tranh
// tiên hiệp, mặt trước/sau có gờ nổi xoắn ốc. Mặt phẳng XY, đáy ở y ≈ 0, rộng ≈ 1.04, cao ≈ 0.6,
// đùn dày theo z (tâm z = 0). Dùng chung mọi nhân vật và cả tòa ngồi thiền: không dispose.

// Khối mây = hợp các đầu cuộn tròn + một dải đáy dẹt. [cx, cy, bán kính].
const HEADS = [[-0.13, 0.3, 0.25], [0.2, 0.27, 0.17], [0.03, 0.44, 0.13], [-0.38, 0.16, 0.12], [0.4, 0.13, 0.1]];
const BASE = { x: 0, y: 0.09, rx: 0.52, ry: 0.08 };
const ORIGIN = new THREE.Vector2(0, 0.22); // nằm trong đầu cuộn lớn nên viền là hàm theo góc

/** Khoảng cách ra tới mép xa của hình tròn/elip dọc tia (o + t·d), âm nếu không cắt. */
function exitCircle(o, d, [cx, cy, R]) {
  const mx = o.x - cx, my = o.y - cy, b = mx * d.x + my * d.y, disc = b * b - (mx * mx + my * my - R * R);
  return disc < 0 ? -1 : -b + Math.sqrt(disc);
}
function exitEllipse(o, d) {
  const ox = (o.x - BASE.x) / BASE.rx, oy = (o.y - BASE.y) / BASE.ry, dx = d.x / BASE.rx, dy = d.y / BASE.ry;
  const A = dx * dx + dy * dy, B = ox * dx + oy * dy, disc = B * B - A * (ox * ox + oy * oy - 1);
  return disc < 0 ? -1 : (-B + Math.sqrt(disc)) / A;
}

/** Viền khối mây: bắn tia từ ORIGIN, lấy mép xa nhất của hợp các khối — chỗ hai đầu cuộn gặp nhau
    thành khấc lõm như mép mây vẽ. */
function blobShape(n = 144) {
  const pts = [], d = new THREE.Vector2();
  for (let i = 0; i < n; i++) {
    const phi = i / n * Math.PI * 2; d.set(Math.cos(phi), Math.sin(phi));
    const t = Math.max(exitEllipse(ORIGIN, d), ...HEADS.map(h => exitCircle(ORIGIN, d, h)));
    pts.push(new THREE.Vector2(ORIGIN.x + d.x * t, ORIGIN.y + d.y * t));
  }
  return new THREE.Shape(pts);
}

/** Dải nét có bề rộng theo đường tâm center(u) → đa giác khép kín (nửa rộng half(u)). */
function bandShape(center, half, n = 56) {
  const left = [], right = [], a = new THREE.Vector2(), b = new THREE.Vector2();
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = center(u);
    a.copy(center(Math.min(1, u + 0.002))).sub(center(Math.max(0, u - 0.002))).normalize();
    b.set(-a.y, a.x).multiplyScalar(half(u));
    left.push(p.clone().add(b)); right.push(p.clone().sub(b));
  }
  return new THREE.Shape([...left, ...right.reverse()]);
}

/** Gờ xoắn ốc trong đầu cuộn: bắt đầu từ mép, cuộn vào tâm 1.25 vòng, nét thon dần. */
function spiral([cx, cy, R], dir, start) {
  const r0 = R * 0.74, w = Math.max(0.009, R * 0.085);
  return bandShape(u => {
    const th = start + dir * u * Math.PI * 2.5, r = r0 * (1 - 0.82 * u);
    return new THREE.Vector2(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
  }, u => w * (1 - 0.55 * u));
}

let blob = null, relief = null, lite = null;

/** Bản nhẹ cho tòa ngồi thiền (ghép nhiều cuộn vào một geometry + đường viền): ít điểm viền, vát 1 nấc. */
export function cloudLiteGeometry() {
  if (lite) return lite;
  lite = new THREE.ExtrudeGeometry(blobShape(56), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03,
    bevelSize: 0.02, bevelSegments: 1, curveSegments: 2 });
  lite.translate(0, 0, -0.06);
  return lite;
}

/** Khối mây đặc, dày 0.14 + vát mép tròn. */
export function cloudBlobGeometry() {
  if (blob) return blob;
  blob = new THREE.ExtrudeGeometry(blobShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.035,
    bevelSize: 0.025, bevelSegments: 3, curveSegments: 4 });
  blob.translate(0, 0, -0.07); blob.computeBoundingBox(); blob.computeBoundingSphere();
  return blob;
}

/** Gờ nổi hai mặt: ba xoắn ốc ở ba đầu cuộn lớn + đường đuôi mây lượn dọc đáy. */
export function cloudReliefGeometry() {
  if (relief) return relief;
  const shapes = [spiral(HEADS[0], 1, -0.6), spiral(HEADS[1], -1, Math.PI + 0.5), spiral(HEADS[2], 1, -1.2),
    bandShape(u => new THREE.Vector2(-0.44 + 0.88 * u, 0.1 + 0.025 * Math.sin(u * Math.PI * 3)), u => 0.014 * Math.sin(Math.PI * u) + 0.003)];
  const front = new THREE.ExtrudeGeometry(shapes, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008,
    bevelSize: 0.006, bevelSegments: 1, curveSegments: 4 });
  front.translate(0, 0, 0.1);
  const back = front.clone().applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1));
  relief = mergeGeometries([front, back]);
  front.dispose(); back.dispose();
  relief.computeBoundingSphere();
  return relief;
}
