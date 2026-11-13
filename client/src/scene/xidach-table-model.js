// Mô hình bàn xì dách kiểu sòng bài: mặt bán nguyệt (cạnh thẳng phía nhà cái), viền gỗ, đệm da bọc cung phía khách,
// mặt dạ in chữ (xidach-felt-texture.js), khay chip của nhà cái có từng chồng chip, hộp bài (shoe) cạnh tay nhà cái,
// váy bàn và chân đế. Mọi toạ độ trong khung nhóm bàn (tâm bàn ở gốc, nhà cái phía +x).
import * as THREE from 'three';
import { chipStackGeometry, chipStackMaterials } from './casino-chip-materials.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';
import { cardBackMaterial } from './card-textures.js';
import { paintXiDachFelt } from './xidach-felt-texture.js';

const WOOD = new THREE.MeshLambertMaterial({ color: 0x5c3520 });
const DARK_WOOD = new THREE.MeshLambertMaterial({ color: 0x3a2114 });
const LEATHER = new THREE.MeshPhongMaterial({ color: 0x2a1710, specular: 0x3a2a20, shininess: 38 });
const SHOE_BODY = new THREE.MeshPhongMaterial({ color: 0x1c1c22, specular: 0x444444, shininess: 60 });
const BRASS = new THREE.MeshPhongMaterial({ color: 0xc9a14a, specular: 0xffe2a0, shininess: 80 });
const TRAY_VALUES = [100, 50, 25, 10, 5, 1, 1, 5];

/** Mặt bán nguyệt: cung tròn bán kính r phía khách, khép bằng dây cung thẳng tại x = chord (phía nhà cái). */
function dShape(r, chord) {
  const t0 = Math.acos(chord / r);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, t0, Math.PI * 2 - t0, false);
  shape.closePath();
  return shape;
}

function place(geometry, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** Hình phẳng (x, y) đặt nằm trên mặt bàn: (x, y) của shape thành (x, -z). */
function lieFlat(mesh) {
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function felt(r, chord, top, paint) {
  const geometry = new THREE.ShapeGeometry(dShape(r - 0.07, chord - 0.03), 64);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + r) / (2 * r), (pos.getY(i) + r) / (2 * r));
  const map = new THREE.CanvasTexture(paint);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mesh = lieFlat(place(geometry, new THREE.MeshLambertMaterial({ map }), 0, top + 0.001, 0, false));
  return mesh;
}

/** Đệm da tròn bọc cung phía khách, hai đầu bịt tròn ở chỗ gặp cạnh thẳng. */
function rail(r, chord, top) {
  const rho = r - 0.035;
  const t0 = Math.acos((chord - 0.02) / rho);
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const t = t0 + ((Math.PI * 2 - 2 * t0) * i) / 64;
    points.push(new THREE.Vector3(Math.cos(t) * rho, top + 0.024, -Math.sin(t) * rho));
  }
  const tube = place(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, 0.042, 12, false), LEATHER, 0, 0, 0);
  const cap = new THREE.SphereGeometry(0.042, 12, 8);
  return [tube, place(cap, LEATHER, ...points[0].toArray()), place(cap, LEATHER, ...points.at(-1).toArray())];
}

/** Khay chip nhà cái: lòng khay gỗ tối, hai hàng chồng chip cao thấp xen kẽ. */
function chipTray({ x, length }, top) {
  const parts = [place(new THREE.BoxGeometry(0.12, 0.012, length), DARK_WOOD, x, top + 0.006, 0, false)];
  const cols = TRAY_VALUES.length;
  const chip = new THREE.CylinderGeometry(0.019, 0.019, 1, 20);
  for (const [row, dx] of [[0, -0.028], [1, 0.028]]) {
    for (let i = 0; i < cols; i++) {
      const count = 3 + ((i * 3 + row * 2) % 4);
      const value = TRAY_VALUES[(i + row * 3) % cols];
      const stack = place(chipStackGeometry(chip, count), chipStackMaterials(value), x + dx, 0, ((i - (cols - 1) / 2) * (length - 0.06)) / (cols - 1));
      stack.scale.y = count * 0.0085;
      stack.position.y = top + 0.012 + stack.scale.y / 2;
      parts.push(stack);
    }
  }
  return parts;
}

/** Hộp bài: thân đen viền đồng, mặt trước hé lá lưng đỏ hướng về phía khách. (x, z) là mép trước. */
function cardShoe({ x, z }, top) {
  const body = place(new THREE.BoxGeometry(0.2, 0.07, 0.14), SHOE_BODY, x + 0.1, top + 0.035, z);
  const trim = place(new THREE.BoxGeometry(0.205, 0.008, 0.145), BRASS, x + 0.1, top + 0.072, z);
  const map = cardBackMaterial().map.clone(); // Chỉ lấy dải giữa mặt lưng cho vừa khung ngang 2:1.
  map.repeat.set(1, 0.36);
  map.offset.set(0, 0.32);
  const peek = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshLambertMaterial({ map }));
  peek.position.set(x - 0.001, top + 0.036, z);
  peek.rotation.y = -Math.PI / 2;
  return [body, trim, peek];
}

/**
 * Dựng toàn bộ bàn.
 * @param {{ top: number, radius: number, chord: number, chipSpots: THREE.Vector3[], emblem: {x: number, z: number},
 *   tray: { x: number, length: number }, shoe: { x: number, z: number } }} o
 * @returns {THREE.Group}
 */
export function buildXiDachTableModel(o) {
  const { top, radius: r, chord } = o;
  const group = new THREE.Group();
  const slab = new THREE.ExtrudeGeometry(dShape(r, chord), {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 48,
  });
  const apron = new THREE.ExtrudeGeometry(dShape(r - 0.08, chord - 0.05), { depth: 0.13, bevelEnabled: false, curveSegments: 32 });
  group.add(
    lieFlat(place(slab, WOOD, 0, top - 0.064, 0)),
    lieFlat(place(apron, DARK_WOOD, 0, top - 0.2, 0)),
    felt(r, chord, top, paint(o)),
    ...rail(r, chord, top),
    place(new THREE.BoxGeometry(0.03, 0.022, 2 * Math.sqrt(r * r - chord * chord) - 0.06), LEATHER, chord - 0.015, top + 0.01, 0),
    ...chipTray(o.tray, top),
    ...cardShoe(o.shoe, top),
    place(new THREE.CylinderGeometry(0.11, 0.17, top - 0.2, 12), DARK_WOOD, 0, (top - 0.2) / 2, 0),
    place(new THREE.CylinderGeometry(0.42, 0.48, 0.05, 24), DARK_WOOD, 0, 0.025, 0),
  );
  // Cả bàn đứng yên (lá bài, chip cược nằm ở nhóm khác): khoảng 60 mảnh còn chừng 15 lần vẽ.
  mergeStaticMeshes(group);
  return group;
}

function paint(o) {
  return paintXiDachFelt({ radius: o.radius, chipSpots: o.chipSpots, emblem: o.emblem });
}
