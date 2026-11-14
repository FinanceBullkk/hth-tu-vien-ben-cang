// Ngoại hình Bena Banca, thương lái bên hồ câu: tóc bob đen mái bằng ôm mặt, má hồng vẽ nét sóng,
// bộ pyjama satin đen in bánh bao đào và chữ "HO HO", tay chống má, một bé mèo mướp đội vòng hoa hồng,
// khoác áo choàng xanh than viền kem đứng trên vai trái. Dựng bằng hình khối và texture vẽ canvas, không tải file ngoài.
import * as THREE from 'three';
import { disposeMergedMeshes, mergeStaticMeshes } from './static-mesh-merge.js';
import { buildShoulderCat } from './bena-banca-shoulder-cat.js';
import { blushTexture, pajamaTexture } from './bena-banca-textures.js';

let shared = null;
/** Vật liệu dùng chung; chỉ một Bena nhưng tạo lười để test không cần canvas. */
function materials() {
  if (shared) return shared;
  const pajama = pajamaTexture();
  const legs = pajama.clone();
  legs.repeat.set(1.2, 0.8);
  pajama.repeat.set(2.2, 1);
  shared = {
    pajama: new THREE.MeshPhongMaterial({ map: pajama, shininess: 70, specular: 0x5a5060, flatShading: true }),
    pajamaLegs: new THREE.MeshPhongMaterial({ map: legs, shininess: 70, specular: 0x5a5060, flatShading: true }),
    lapel: new THREE.MeshPhongMaterial({ color: 0x1f1b24, shininess: 90, specular: 0x6a6070, flatShading: true }),
    button: new THREE.MeshLambertMaterial({ color: 0x4a4352 }),
    hair: new THREE.MeshLambertMaterial({ color: 0x17131a, flatShading: true, side: THREE.DoubleSide }),
    hairShine: new THREE.MeshBasicMaterial({ color: 0x6a6070 }),
    skin: new THREE.MeshLambertMaterial({ color: 0xf6d6c2, flatShading: true }),
    blush: new THREE.MeshBasicMaterial({ map: blushTexture(), transparent: true, depthWrite: false }),
    lips: new THREE.MeshBasicMaterial({ color: 0xc8606c }),
    sparkle: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    slipper: new THREE.MeshLambertMaterial({ color: 0xf2b8a8, flatShading: true }),
  };
  return shared;
}

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

/** Điểm trên mặt cầu theo góc kiểu SphereGeometry: phi quanh trục y (π/2 là chính diện +z), theta tính từ đỉnh. */
const onSphere = (r, phi, theta) => new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));

/** Tóc bob đen ngang cằm: vòm đỉnh, vỏ tóc hai bên và gáy chừa khoảng mặt, mái bằng hơi rẽ lệch. */
function buildBobHair(mat) {
  const g = new THREE.Group();
  const FRONT = Math.PI / 2;
  const GAP = 0.95; // nửa khoảng hở cho mặt, tính bằng radian quanh hướng nhìn
  const crown = mesh(new THREE.SphereGeometry(0.335, 18, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), mat.hair);
  crown.rotation.x = -0.1;
  const shell = mesh(new THREE.SphereGeometry(0.35, 22, 9, FRONT + GAP, Math.PI * 2 - GAP * 2, Math.PI * 0.22, Math.PI * 0.52), mat.hair);
  shell.scale.set(1.04, 1, 1.02);
  const bangs = mesh(new THREE.SphereGeometry(0.338, 14, 5, FRONT - GAP - 0.08, GAP * 2 + 0.16, Math.PI * 0.08, Math.PI * 0.32), mat.hair);
  bangs.rotation.y = -0.1; // rẽ ngôi lệch nhẹ về bên tay đang chống má
  g.add(crown, shell, bangs);

  // Mép mái tỉa sợi: chóp nhỏ chĩa xuống dọc viền mái.
  const tipGeo = new THREE.ConeGeometry(0.032, 0.075, 4);
  for (let i = 0; i < 7; i++) {
    const phi = FRONT - 0.1 - GAP + ((i + 0.5) / 7) * GAP * 2;
    const p = onSphere(0.336, phi, Math.PI * 0.4);
    const tip = mesh(tipGeo, mat.hair, p.x, p.y - 0.025, p.z);
    tip.rotation.set(Math.PI - 0.25, 0, (phi - FRONT) * 0.35);
    g.add(tip);
  }
  // Đuôi tóc hai bên má cong vào cằm.
  for (const s of [-1, 1]) {
    const p = onSphere(0.33, FRONT + s * (GAP + 0.05), Math.PI * 0.7);
    const lock = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat.hair, p.x, p.y + 0.02, p.z - 0.02);
    lock.scale.set(0.75, 1.5, 0.75);
    g.add(lock);
  }
  // Vệt bóng tóc trên vòm đầu.
  const shine = mesh(new THREE.TorusGeometry(0.338, 0.013, 3, 18, Math.PI * 0.5), mat.hairShine);
  shine.rotation.set(-0.55, Math.PI / 2, 0);
  shine.position.y = 0.01;
  shine.castShadow = false;
  g.add(shine);
  // Tóc không đổ bóng: mái và vỏ tóc ôm sát sẽ phủ bóng tối lên cả khuôn mặt.
  g.traverse((o) => { o.castShadow = false; });
  mergeStaticMeshes(g);
  return g;
}

/** Má hồng, môi cười mỉm, đốm sáng trong mắt. Gắn vào đầu nên nghiêng theo đầu. */
function addFace(head, mat) {
  const z = new THREE.Vector3(0, 0, 1);
  for (const s of [-1, 1]) {
    const dir = new THREE.Vector3(s * 0.56, -0.2, 0.8).normalize();
    const cheek = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), mat.blush);
    cheek.position.copy(dir).multiplyScalar(0.304);
    cheek.quaternion.setFromUnitVectors(z, dir);
    head.add(cheek);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), mat.sparkle);
    spark.position.set(s * 0.11 + 0.014, 0.047, 0.302);
    head.add(spark);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 4, 10, Math.PI * 0.8), mat.lips);
  smile.position.set(0.012, -0.092, 0.286);
  smile.rotation.set(-0.3, 0, Math.PI * 1.1 + 0.08); // cung úp ngược thành nụ cười, nhếch một bên
  head.add(smile);
}

/** Cổ áo pyjama hai ve, hàng cúc, ống quần cùng vải, dép lê hồng. */
function dressPajama(avatar, mat) {
  avatar.body.material = mat.pajama;
  for (const arm of [avatar.armL, avatar.armR]) {
    arm.children[0].material = mat.pajama;
    const hand = mesh(new THREE.IcosahedronGeometry(0.068, 1), mat.skin, 0, -0.32, 0);
    arm.add(hand);
  }
  for (const leg of [avatar.legL, avatar.legR]) {
    leg.children[0].material = mat.pajamaLegs;
    const slipper = mesh(new THREE.BoxGeometry(0.12, 0.05, 0.2), mat.slipper, 0, -0.33, 0.03);
    leg.add(slipper);
  }
  const collar = new THREE.Group();
  // Vai áo phồng: tròn vai cho dáng pyjama rộng, cũng là chỗ bé mèo đứng.
  for (const s of [-1, 1]) collar.add(mesh(new THREE.SphereGeometry(0.092, 10, 8), mat.pajama, s * 0.27, 0.79, 0));
  for (const s of [-1, 1]) {
    const lapel = mesh(new THREE.BoxGeometry(0.11, 0.17, 0.02), mat.lapel, s * 0.055, 0.76, 0.19);
    lapel.rotation.set(-0.3, s * 0.35, s * 0.5);
    collar.add(lapel);
  }
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    collar.add(mesh(new THREE.SphereGeometry(0.016, 6, 4), mat.button, 0, 0.66 - i * 0.11, 0.205 + t * 0.035));
  }
  mergeStaticMeshes(collar);
  avatar.rig.add(collar);
}

/**
 * Mặc đồ, làm tóc, vẽ mặt và đặt mèo lên vai cho một Avatar mặc định.
 * @returns {{ cat: ReturnType<typeof buildShoulderCat>, eyes: THREE.Object3D[] }}
 */
export function dressBenaBanca(avatar) {
  const mat = materials();
  avatar.attire.hide?.();
  avatar.headMesh.material = mat.skin;
  avatar.head.remove(avatar.hatGroup);
  disposeMergedMeshes(avatar.hatGroup);
  avatar.hatGroup = buildBobHair(mat);
  avatar.head.add(avatar.hatGroup);
  // Mắt mặc định của Avatar là hai khối cầu bán kính 0.038 ngay trên đầu: giữ lại để chớp mắt.
  const eyes = avatar.head.children.filter((o) => o.geometry?.parameters?.radius === 0.038);
  addFace(avatar.head, mat);
  dressPajama(avatar, mat);

  const cat = buildShoulderCat();
  // Đứng trên vai trái, sát mái tóc như ảnh dán; đầu chạm nhẹ vào tóc là đúng dáng dụi vào chủ.
  cat.group.position.set(-0.37, 0.84, -0.02);
  cat.group.rotation.y = 0.35;
  cat.group.scale.setScalar(1.3);
  avatar.rig.add(cat.group);
  return { cat, eyes };
}
