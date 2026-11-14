// Chỗ buôn của Bena Banca bên hồ câu: thùng gỗ ướp đá bày cá, bảng hiệu "Thu mua cá · Bán cần câu" có đèn lồng nhỏ,
// giá dựng bốn cây cần đúng màu bốn bậc cần ở sạp. Toạ độ lấy từ BENA_BANCA trong layout; toàn mảnh tĩnh, gộp lần vẽ.
import * as THREE from 'three';
import { BENA_BANCA, floorHeight } from '../../../shared/layout.js';
import { FISH_RODS } from '../../../shared/fish-gear.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const M = {
  wood: new THREE.MeshLambertMaterial({ color: 0x8a5a34, flatShading: true }),
  woodDark: new THREE.MeshLambertMaterial({ color: 0x55331d, flatShading: true }),
  ice: new THREE.MeshLambertMaterial({ color: 0xdff1f7, flatShading: true }),
  fish: [0xc9d3dc, 0xe8a04a, 0x6f9fc9].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true })),
  lantern: new THREE.MeshBasicMaterial({ color: 0xffb35c }),
  line: new THREE.MeshBasicMaterial({ color: 0xe8e2d4 }),
};

const box = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** Bảng hiệu vẽ canvas: tên quầy trên, việc buôn bán dưới, nền gỗ sáng viền tối. */
function signTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e9d2a8';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#5a3720';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2b1a12';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('BENA BANCA', 128, 54);
  ctx.fillStyle = '#9c3d2c';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('Thu mua cá · Bán cần câu', 128, 92);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Một con cá nằm trên đá: thân bầu dục dẹt và đuôi tam giác. */
function fishOnIce(mat, x, y, z, rot, len) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat);
  body.scale.set(len, len * 0.22, len * 0.32);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(len * 0.16, len * 0.24, 4), mat);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -len * 0.58;
  g.add(body, tail);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  return g;
}

function buildCrate(y) {
  const g = new THREE.Group();
  const { x, z } = BENA_BANCA.crate;
  // Thùng gỗ: bốn vách ván và nẹp góc, mặt trên phủ đá vụn.
  const W = 0.78;
  const D = 0.5;
  const H = 0.42;
  g.add(box(W, H, 0.04, M.wood, x, y + H / 2, z - D / 2), box(W, H, 0.04, M.wood, x, y + H / 2, z + D / 2));
  g.add(box(0.04, H, D, M.wood, x - W / 2, y + H / 2, z), box(0.04, H, D, M.wood, x + W / 2, y + H / 2, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.06, H + 0.02, 0.06, M.woodDark, x + sx * W / 2, y + H / 2, z + sz * D / 2));
  g.add(box(W - 0.04, 0.06, D - 0.04, M.ice, x, y + H - 0.05, z));
  g.add(
    fishOnIce(M.fish[0], x - 0.15, y + H - 0.01, z - 0.08, 0.3, 0.32),
    fishOnIce(M.fish[1], x + 0.14, y + H, z + 0.06, -2.6, 0.36),
    fishOnIce(M.fish[2], x - 0.05, y + H + 0.03, z + 0.12, 2.9, 0.26),
  );

  // Cột bảng hiệu ở góc thùng phía hồ, mặt bảng quay về hướng tây đón khách.
  const px = x + 0.1;
  const pz = z + D / 2 + 0.12;
  g.add(box(0.06, 1.75, 0.06, M.woodDark, px, y + 0.875, pz));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshLambertMaterial({ map: signTexture(), side: THREE.DoubleSide }));
  sign.position.set(px - 0.05, y + 1.5, pz);
  sign.rotation.y = -Math.PI / 2;
  sign.castShadow = true;
  g.add(sign);
  // Đèn lồng treo trên cần ngang chĩa về phía nam, ra ngoài mép bảng để dây treo không che chữ.
  const lz = pz - 0.62;
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.lantern);
  lantern.scale.y = 1.3;
  lantern.position.set(px - 0.05, y + 1.38, lz);
  g.add(lantern, box(0.015, 0.22, 0.015, M.woodDark, px - 0.05, y + 1.61, lz), box(0.03, 0.03, 0.66, M.woodDark, px - 0.02, y + 1.72, pz - 0.31));
  return g;
}

function buildRodRack(y) {
  const g = new THREE.Group();
  const { x, z } = BENA_BANCA.rack;
  // Hai cọc và thanh ngang, xoay theo hướng nhìn của Bena (thanh chạy dọc trục bắc nam).
  for (const dz of [-0.32, 0.32]) g.add(box(0.07, 1.1, 0.07, M.woodDark, x, y + 0.55, z + dz));
  g.add(box(0.06, 0.06, 0.78, M.wood, x, y + 1.02, z));
  // Bốn cây cần dựng nghiêng tựa thanh ngang, mỗi cây một màu bậc cần.
  FISH_RODS.forEach((rod, i) => {
    const mat = new THREE.MeshLambertMaterial({ color: rod.color, flatShading: true });
    const len = 2.1;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, len, 6), mat);
    const dz = -0.27 + i * 0.18;
    r.position.set(x - 0.32, y + len / 2 - 0.02, z + dz);
    r.rotation.z = -0.3;
    r.castShadow = true;
    g.add(r);
    // Cuộn dây ở gốc cần.
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), M.line);
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x - 0.4, y + 0.38, z + dz);
    g.add(reel);
  });
  return g;
}

/** Dựng thùng cá và giá cần, gộp mảnh tĩnh; trả về group để thêm vào cảnh. */
export function createBenaBancaStall() {
  const y = floorHeight(BENA_BANCA.x, BENA_BANCA.z);
  const g = new THREE.Group();
  g.add(buildCrate(y), buildRodRack(y));
  mergeStaticMeshes(g);
  return g;
}
