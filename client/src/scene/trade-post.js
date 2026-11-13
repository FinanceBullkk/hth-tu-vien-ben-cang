// Trạm giao thương: bảng gỗ hai cột có mái ngói nhỏ, biển "GIAO THƯƠNG" hai mặt, giấy dán rao đổi đồ,
// đèn lồng treo và chồng rương hàng bên chân bảng. Đứng gần bấm E hoặc bấm vào bảng để mở giao dịch.
// Dựng bằng hình khối đơn giản như sạp Kim Bảo; toạ độ theo TRADE_POST trong layout.
import * as THREE from 'three';
import { TRADE_POST, floorHeight } from '../../../shared/layout.js';
import { textTexture } from './builders.js';

const TAP_RANGE = 30;
const POST_H = 2.35;

const M = {
  wood: new THREE.MeshLambertMaterial({ color: 0x6b4226, flatShading: true }),
  woodDark: new THREE.MeshLambertMaterial({ color: 0x43281a, flatShading: true }),
  roof: new THREE.MeshLambertMaterial({ color: 0x2f3b3a, flatShading: true }),
  paper: [0xf3e7c9, 0xe9d6b0, 0xf6dfc4].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true })),
  crate: new THREE.MeshLambertMaterial({ color: 0x8a5a33, flatShading: true }),
  lantern: new THREE.MeshBasicMaterial({ color: 0xffb35c }),
};

const box = (w, h, d, mat) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/** Toạ độ cục bộ: gốc ở tâm bảng trên mặt đất, mặt bảng quay về +z. */
function buildPost() {
  const g = new THREE.Group();
  const { board } = TRADE_POST;
  const half = (board.maxX - board.minX) / 2 - 0.08;

  for (const x of [-half, half]) {
    const post = box(0.14, POST_H, 0.14, M.wood);
    post.position.set(x, POST_H / 2, 0);
    g.add(post);
  }
  // Mặt bảng và hai thanh nẹp.
  const plank = box(half * 2, 1.05, 0.06, M.woodDark);
  plank.position.set(0, 1.25, 0);
  g.add(plank);
  for (const y of [0.7, 1.8]) {
    const rail = box(half * 2 + 0.1, 0.08, 0.1, M.wood);
    rail.position.set(0, y, 0);
    g.add(rail);
  }
  // Giấy rao dán lệch nhau ở cả hai mặt.
  [[-0.5, 1.38, 0.05], [-0.05, 1.15, -0.08], [0.45, 1.36, 0.1], [0.2, 0.95, 0.03]].forEach(([x, y, tilt], i) => {
    for (const side of [1, -1]) {
      const note = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), M.paper[i % M.paper.length]);
      note.position.set(x * side, y, 0.035 * side);
      note.rotation.set(0, side > 0 ? 0 : Math.PI, tilt);
      g.add(note);
    }
  });
  // Biển tên hai mặt phía trên.
  const signMat = new THREE.MeshBasicMaterial({ map: textTexture('GIAO THƯƠNG', { w: 512, h: 128, font: 'bold 64px "Palatino Linotype",Georgia,serif' }) });
  for (const side of [1, -1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), signMat);
    sign.position.set(0, 2.05, 0.06 * side);
    sign.rotation.y = side > 0 ? 0 : Math.PI;
    g.add(sign);
  }
  const signBack = box(1.36, 0.38, 0.1, M.wood);
  signBack.position.set(0, 2.05, 0);
  g.add(signBack);
  // Mái ngói nhỏ hai dốc.
  for (const side of [1, -1]) {
    const slope = box(half * 2 + 0.6, 0.06, 0.5, M.roof);
    slope.position.set(0, POST_H + 0.08, 0.2 * side);
    slope.rotation.x = 0.5 * side;
    g.add(slope);
  }
  const ridge = box(half * 2 + 0.7, 0.08, 0.08, M.woodDark);
  ridge.position.set(0, POST_H + 0.2, 0);
  g.add(ridge);
  // Đèn lồng treo mép mái phía trước.
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.lantern);
  lantern.scale.y = 1.25;
  lantern.position.set(half + 0.15, POST_H - 0.35, 0.35);
  g.add(lantern);
  // Chồng rương hàng cạnh chân cột: ý là nơi người ta mang đồ tới đổi.
  [[-half - 0.35, 0.18, 0.25, 0.36], [-half - 0.3, 0.5, 0.2, 0.26]].forEach(([x, y, z, s]) => {
    const crate = box(s, s, s, M.crate);
    crate.position.set(x, y, z);
    crate.rotation.y = 0.3;
    g.add(crate);
  });
  return g;
}

export class TradePost {
  constructor(scene) {
    this.y = floorHeight(TRADE_POST.x, TRADE_POST.z);
    this.root = buildPost();
    this.root.position.set(TRADE_POST.x, this.y, TRADE_POST.z);
    this.root.rotation.y = TRADE_POST.rot;
    scene.add(this.root);
    this._p = new THREE.Vector3();
  }

  /** Tia bấm trúng mặt bảng (tính theo tâm bảng, đủ rộng cho cảm ứng). */
  atRay(ray) {
    const p = this._p.set(TRADE_POST.x, this.y + 1.3, TRADE_POST.z);
    return ray.distanceSqToPoint(p) < 0.7 && ray.origin.distanceTo(p) < TAP_RANGE;
  }
}
