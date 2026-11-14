// Bộ công cụ dựng thú cưng bằng code: vật liệu dùng chung, mảnh hình cầu/hộp/nón, mắt long lanh, nhóm cử động.
// Mỗi thú gồm vài nhóm (thân, đầu, đuôi, cánh), mỗi nhóm gộp còn một hai lần vẽ để ba chục người dắt thú vẫn nhẹ.
import * as THREE from 'three';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const mats = new Map();

/** Vật liệu Lambert phẳng dùng chung theo màu (gộp được vì không texture). */
export function lambert(color) {
  const key = `l${color}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return mats.get(key);
}

/** Vật liệu phát sáng cộng màu: bloom bắt được, không ghi độ sâu để không che vật phía sau. */
export function glow(color, opacity = 0.85) {
  const key = `g${color}:${opacity}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
  }
  return mats.get(key);
}

/** Màu đặc không chịu ánh sáng (mắt, đốm sáng). */
export function solid(color) {
  const key = `b${color}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color }));
  return mats.get(key);
}

const geos = new Map();
const cached = (key, make) => {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
};

export const geo = {
  ball: (seg = 10) => cached(`ball${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(6, seg - 3))),
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cone: (seg = 6) => cached(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg)),
  cyl: (seg = 8) => cached(`cyl${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg)),
  torus: (arc = Math.PI * 2) => cached(`torus${arc}`, () => new THREE.TorusGeometry(1, 0.12, 6, 20, arc)),
  ring: () => cached('ring', () => new THREE.RingGeometry(0.72, 1, 40)),
  disc: () => cached('disc', () => new THREE.CircleGeometry(1, 32)),
};

/**
 * Một mảnh: geometry đơn vị co giãn theo s = [sx, sy, sz] (hoặc một số), đặt ở p = [x, y, z], xoay r = [rx, ry, rz].
 */
export function part(geometry, material, p = [0, 0, 0], s = 1, r = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(p[0], p[1], p[2]);
  if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]);
  else m.scale.setScalar(s);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  return m;
}

/** Hình cầu bán kính r (có thể kéo dẹt bằng mảng ba hệ số). */
export const ball = (mat, p, r, stretch = [1, 1, 1], seg = 10) =>
  part(geo.ball(seg), mat, p, [r * stretch[0], r * stretch[1], r * stretch[2]]);

/** Đôi mắt đen to kiểu chibi có chấm sáng; x là nửa khoảng cách hai mắt. */
export function eyes(group, { x, y, z, r = 0.03, color = 0x1a1a22 }) {
  for (const s of [-1, 1]) {
    group.add(ball(solid(color), [s * x, y, z], r, [1, 1.15, 0.6], 8));
    group.add(ball(solid(0xffffff), [s * x + r * 0.35, y + r * 0.4, z + r * 0.5], r * 0.32, [1, 1, 1], 6));
  }
}

/** Má hồng hai bên. */
export function blush(group, { x, y, z, r = 0.022 }) {
  for (const s of [-1, 1]) group.add(ball(lambert(0xf4a0ae), [s * x, y, z], r, [1, 0.6, 0.4], 6));
}

/** Nhóm cử động có gốc quay tại p; build(group) thêm mảnh, rồi gộp mảnh tĩnh bên trong. */
export function pivot(parent, p, build) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  build(g);
  mergeStaticMeshes(g);
  parent.add(g);
  return g;
}

/** Bật đổ bóng cho các mảnh Lambert (mảnh phát sáng không đổ bóng). */
export function castShadows(root) {
  root.traverse((o) => {
    if (o.isMesh && o.material?.type === 'MeshLambertMaterial') o.castShadow = true;
  });
}

/**
 * Khung chung của một thú: root đặt dưới đất, body là nhóm nảy khi đi. Trả về đối tượng mà các hàm dựng
 * điền thêm head, tail, wings, fx (hàm cử động riêng (t, moving) => void) và height (chiều cao để đặt tim, hào quang).
 */
export function petFrame() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, head: null, tail: null, wings: [], fx: [], height: 0.5, fly: false };
}
