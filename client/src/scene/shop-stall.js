// Sạp Kim Bảo: quầy gỗ mái vải đỏ cạnh lối đi tới quán trà, bà chủ Kim Bảo đứng sau quầy.
// Tới gần bấm E hoặc bấm vào bà chủ để mở cửa hàng. Dựng bằng hình khối đơn giản như các NPC khác.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SHOP, floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const KEEPER_NAME = 'Bà chủ Kim Bảo';
const GREET_RADIUS = 6;
const GREET_COOLDOWN_S = 50;
const FACE_RADIUS = 8;
const TAP_RANGE = 30;

const GREETINGS = [
  'Hàng mới về đây! Hào quang, áo đẹp, đổi bằng TEU cả.',
  'Câu cá, đố chữ, đầu hồ… kiếm TEU rồi ghé Kim Bảo nhé!',
  'Thử đồ không mất tiền, cứ bấm mà ngắm.',
  'Kim long tám chục TEU, đeo lên là cả sân phải nhìn.',
];

const M = {
  wood: new THREE.MeshLambertMaterial({ color: 0x7a4a2a, flatShading: true }),
  woodDark: new THREE.MeshLambertMaterial({ color: 0x4a2c19, flatShading: true }),
  cloth: new THREE.MeshLambertMaterial({ color: 0xa8432a, flatShading: true, side: THREE.DoubleSide }),
  trim: new THREE.MeshLambertMaterial({ color: 0xe0a458, flatShading: true }),
  silk: [0xe8c34a, 0x3aa8a0, 0xd9767f, 0x7d4a9e].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true })),
  jar: new THREE.MeshLambertMaterial({ color: 0x2f4a3c, flatShading: true }),
  lantern: new THREE.MeshBasicMaterial({ color: 0xffb35c }),
};

const box = (w, hgt, d, mat) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

function lerpAngle(a, b, k) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
}

/** Quầy, kệ, mái vải, đèn lồng và hàng bày; toạ độ theo khung của SHOP trong layout. */
function buildStall(y) {
  const g = new THREE.Group();
  const { counter: c, shelf: s } = SHOP;
  const cx = (c.minX + c.maxX) / 2;
  const cz = (c.minZ + c.maxZ) / 2;
  const w = c.maxX - c.minX;

  const top = box(w + 0.1, 0.08, c.maxZ - c.minZ + 0.12, M.woodDark);
  top.position.set(cx, y + 0.98, cz);
  const front = box(w, 0.9, 0.08, M.wood);
  front.position.set(cx, y + 0.47, c.minZ + 0.04);
  const band = box(w + 0.02, 0.07, 0.1, M.trim);
  band.position.set(cx, y + 0.78, c.minZ + 0.02);
  g.add(top, front, band);

  // Kệ sau lưng bà chủ: hai tầng, bày vải lụa và hũ.
  const sx = (s.minX + s.maxX) / 2;
  const sz = (s.minZ + s.maxZ) / 2;
  for (const level of [0.7, 1.3]) {
    const plank = box(s.maxX - s.minX, 0.06, s.maxZ - s.minZ, M.woodDark);
    plank.position.set(sx, y + level, sz);
    g.add(plank);
  }
  M.silk.forEach((mat, i) => {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 8), mat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(s.minX + 0.45 + i * 0.55, y + 0.85, sz);
    g.add(roll);
  });
  for (let i = 0; i < 3; i++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.26, 8), M.jar);
    jar.position.set(s.minX + 0.6 + i * 0.7, y + 1.46, sz);
    g.add(jar);
  }
  // Hàng bày trên quầy: hộp gấm nhỏ.
  [[-0.8, 0], [-0.45, 2], [0.55, 1], [0.9, 3]].forEach(([dx, k]) => {
    const gift = box(0.22, 0.14, 0.2, M.silk[k]);
    gift.position.set(cx + dx, y + 1.09, cz);
    g.add(gift);
  });

  // Bốn cột và mái vải dốc về phía khách.
  const postH = 2.5;
  for (const px of [c.minX + 0.06, c.maxX - 0.06]) {
    for (const pz of [c.minZ + 0.06, s.maxZ - 0.06]) {
      const post = box(0.09, postH, 0.09, M.wood);
      post.position.set(px, y + postH / 2, pz);
      g.add(post);
    }
  }
  const depth = s.maxZ - c.minZ + 0.5;
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, depth), M.cloth);
  roof.rotation.x = -Math.PI / 2 + 0.22; // Mép trước thấp hơn mép sau.
  roof.position.set(cx, y + postH + 0.05, (c.minZ + s.maxZ) / 2);
  roof.castShadow = true;
  const valance = box(w + 0.5, 0.18, 0.03, M.trim);
  valance.position.set(cx, y + postH - 0.3, c.minZ - 0.22);
  g.add(roof, valance);

  // Hai đèn lồng treo ở mép mái, sáng nhẹ về đêm nhờ vật liệu tự phát sáng.
  for (const px of [c.minX + 0.2, c.maxX - 0.2]) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M.lantern);
    lantern.scale.y = 1.25;
    lantern.position.set(px, y + postH - 0.55, c.minZ - 0.15);
    g.add(lantern);
  }
  mergeStaticMeshes(g); // 24 mảnh tĩnh còn 3 lần vẽ.
  return g;
}

export class ShopStall {
  constructor(scene) {
    this.y = floorHeight(SHOP.x, SHOP.z);
    this.stall = buildStall(this.y);
    scene.add(this.stall);

    this.avatar = new Avatar({ name: KEEPER_NAME, color: 4, hair: 3, hat: 7, attire: 4 });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.85;
    const icon = document.createElement('div');
    icon.className = 'npc-icon';
    icon.textContent = '🏮';
    const iconObj = new CSS2DObject(icon);
    iconObj.position.set(0, 2.2, 0);
    this.avatar.root.add(iconObj);
    this.avatar.root.position.set(SHOP.x, this.y, SHOP.z);
    this.avatar.root.rotation.y = SHOP.rot;
    scene.add(this.avatar.root);

    this.greetWait = 0;
    this.near = false;
    this.greetIndex = Math.floor(Math.random() * GREETINGS.length);
    this.wave = 0;
    this._p = new THREE.Vector3();
  }

  atRay(ray) {
    const p = this._p.set(SHOP.x, this.y + 0.9, SHOP.z);
    return ray.distanceSqToPoint(p) < 0.6 && ray.origin.distanceTo(p) < TAP_RANGE;
  }

  update(dt, playerX, playerZ, camera) {
    const dx = playerX - SHOP.x;
    const dz = playerZ - SHOP.z;
    const dist = Math.hypot(dx, dz);

    this.greetWait = Math.max(0, this.greetWait - dt);
    const near = dist < GREET_RADIUS;
    if (near && !this.near && this.greetWait === 0) {
      this.greetIndex = (this.greetIndex + 1) % GREETINGS.length;
      this.avatar.say(GREETINGS[this.greetIndex], 5000);
      this.wave = 1.6;
      this.greetWait = GREET_COOLDOWN_S;
    }
    this.near = near;

    // Chỉ quay về phía khách khi khách đứng trước quầy, không quay lưng vào kệ.
    const facing = dz < 0 && dist < FACE_RADIUS ? Math.atan2(dx, dz) : SHOP.rot;
    const { root, armL, armR } = this.avatar;
    root.rotation.y = lerpAngle(root.rotation.y, facing, Math.min(1, dt * 3));
    this.avatar.update(dt, false, camera.position.distanceTo(root.position));
    // Vẫy chào khách mới tới, rồi hai tay đặt lên quầy.
    this.wave = Math.max(0, this.wave - dt);
    armL.rotation.set(-0.55, 0, 0.12);
    armR.rotation.set(this.wave > 0 ? -2.6 : -0.55, 0, this.wave > 0 ? -0.35 + Math.sin(this.wave * 12) * 0.25 : -0.12);
  }
}
