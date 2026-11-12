// Thầy trụ trì: NPC đứng ở hiên thiền đường, dựng từ Avatar rồi thay áo và thêm kính, chuỗi hạt.
// Chỉ chạy trên từng máy: lời nói không qua server, nên mỗi người nghe một câu riêng.
import * as THREE from 'three';
import { ABBOT, floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';

// Đổi tên hiển thị ở đây.
const ABBOT_NAME = 'Zoeyy Gay';

const GREET_RADIUS = 6;
const GREET_COOLDOWN_S = 60;
const FACE_RADIUS = 8;
const BOW_S = 1.4;
const TAP_RANGE = 30;

const GREETINGS = [
  'Hữu duyên gặp nhau. Thiếu hiệp lên chơi đấy à?',
  'Lên Vân Đài rồi thì để email ở dưới cảng nhé.',
  'Vào Tĩnh Tâm Các ngồi một lát đi, vẫn còn chiếu trống.',
  'Chuông chiều nay thiếu hiệp đã đánh chưa?',
];

const ADVICE = [
  'Tàu nào rồi cũng cập bến, thiếu hiệp ạ.',
  'Hàng chậm thì đợi, lòng đừng chậm theo.',
  'Deadline có cut-off, lòng từ bi thì không.',
  'Uống chén trà đi đã, tờ khai không chạy mất đâu.',
  'Chứng từ sai thì sửa được. Lời nói nặng thì khó sửa hơn.',
  'Luồng đỏ cũng chỉ là một màu thôi con.',
  'Roll-over là chuyện của tàu, đừng để nó cuốn luôn cả ngày của con.',
  'Việc hôm nay làm hết sức, phần còn lại để sóng lo.',
  'Khách chưa trả lời thì mình hít thở. Khách trả lời rồi thì hít thở tiếp.',
  'Thiếu hiệp đã làm tốt hơn mình nghĩ đấy.',
];

const MAT = {
  robe: new THREE.MeshLambertMaterial({ color: 0xcf9430, flatShading: true }),
  sash: new THREE.MeshLambertMaterial({ color: 0x8f4a1e, flatShading: true }),
  skin: new THREE.MeshLambertMaterial({ color: 0xf0c8a0, flatShading: true }),
  frame: new THREE.MeshBasicMaterial({ color: 0x2b2b2e }),
  lens: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }),
  bead: new THREE.MeshLambertMaterial({ color: 0x5a2f1c, flatShading: true }),
};

function lerpAngle(a, b, k) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
}

function addRobe(avatar) {
  avatar.body.material = MAT.robe;
  for (const arm of [avatar.armL, avatar.armR]) {
    arm.children[0].material = MAT.robe;
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), MAT.skin);
    hand.position.y = -0.32;
    arm.add(hand);
  }

  // Vạt áo dài che chân.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.5, 10), MAT.robe);
  skirt.position.y = 0.27;
  skirt.castShadow = true;

  // Cà sa vắt chéo từ vai xuống hông.
  const sashTilt = new THREE.Group();
  sashTilt.position.y = 0.62;
  sashTilt.rotation.z = 0.72;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.04, 5, 18), MAT.sash);
  sash.rotation.x = Math.PI / 2;
  sashTilt.add(sash);

  avatar.rig.add(skirt, sashTilt);
}

/** Kính gọng mảnh, gắn vào đầu nên quay và cúi theo đầu. */
function addGlasses(head) {
  const glasses = new THREE.Group();
  const rim = new THREE.TorusGeometry(0.07, 0.009, 5, 16);
  const lens = new THREE.CircleGeometry(0.07, 16);
  for (const s of [-1, 1]) {
    for (const [geo, mat] of [[rim, MAT.frame], [lens, MAT.lens]]) {
      const part = new THREE.Mesh(geo, mat);
      part.position.set(s * 0.115, 0.035, 0.297);
      part.scale.set(1.2, 0.88, 1); // Tròng hơi chữ nhật.
      glasses.add(part);
    }
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.31), MAT.frame);
    temple.position.set(s * 0.26, 0.04, 0.15);
    temple.rotation.y = -s * 0.36;
    glasses.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.011, 0.011), MAT.frame);
  bridge.position.set(0, 0.05, 0.302);
  glasses.add(bridge);
  head.add(glasses);
}

/** Chuỗi hạt gỗ đeo cổ, thõng xuống trước ngực. */
function addBeads(rig) {
  const COUNT = 22;
  const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.034, 1), MAT.bead, COUNT);
  const m = new THREE.Matrix4();
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    const front = (Math.cos(a) + 1) / 2;
    // Thõng xuống dưới đôi tay đang chắp để nhìn từ trước vẫn thấy.
    m.setPosition(Math.sin(a) * 0.17, 0.87 - front * front * 0.37, Math.cos(a) * (0.16 + front * 0.12));
    beads.setMatrixAt(i, m);
  }
  rig.add(beads);
}

export class Abbot {
  constructor(scene) {
    this.avatar = new Avatar({ name: ABBOT_NAME });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.86;
    this.avatar.rig.scale.set(1.2, 1.06, 1.14); // Dáng đậm người.
    this.avatar.attire.hide();
    this.avatar.hatGroup.rotation.x = -0.2; // Đẩy mép tóc lên cho lộ trán, kính không bị tóc che.
    addRobe(this.avatar);
    addGlasses(this.avatar.head);
    addBeads(this.avatar.rig);

    this.y = floorHeight(ABBOT.x, ABBOT.z);
    this.avatar.root.position.set(ABBOT.x, this.y, ABBOT.z);
    this.avatar.root.rotation.y = ABBOT.rot;
    scene.add(this.avatar.root);

    this.bowT = 0;
    this.greetWait = 0;
    this.near = false;
    this.adviceIndex = Math.floor(Math.random() * ADVICE.length);
    this.greetIndex = Math.floor(Math.random() * GREETINGS.length);
    this._p = new THREE.Vector3();
  }

  /** Lời khuyên lần lượt theo vòng, để bấm liên tiếp không gặp lại câu vừa nghe. */
  advise() {
    this.adviceIndex = (this.adviceIndex + 1) % ADVICE.length;
    this.avatar.say(ADVICE[this.adviceIndex], 6000);
    this.bowT = BOW_S;
    this.greetWait = GREET_COOLDOWN_S;
  }

  atRay(ray) {
    const p = this._p.set(ABBOT.x, this.y + 0.8, ABBOT.z);
    return ray.distanceSqToPoint(p) < 0.5 && ray.origin.distanceTo(p) < TAP_RANGE;
  }

  update(dt, playerX, playerZ, camera) {
    const dx = playerX - ABBOT.x;
    const dz = playerZ - ABBOT.z;
    const dist = Math.hypot(dx, dz);

    // Chào một lần khi người chơi bước lại gần, không chào lại ngay nếu họ đi quanh quẩn.
    this.greetWait = Math.max(0, this.greetWait - dt);
    const near = dist < GREET_RADIUS;
    if (near && !this.near && this.greetWait === 0) {
      this.greetIndex = (this.greetIndex + 1) % GREETINGS.length;
      this.avatar.say(GREETINGS[this.greetIndex], 5000);
      this.bowT = BOW_S;
      this.greetWait = GREET_COOLDOWN_S;
    }
    this.near = near;

    const targetRot = dist < FACE_RADIUS ? Math.atan2(dx, dz) : ABBOT.rot;
    const { root, rig, armL, armR } = this.avatar;
    root.rotation.y = lerpAngle(root.rotation.y, targetRot, Math.min(1, dt * 3));

    this.avatar.update(dt, false, camera.position.distanceTo(root.position));

    // Avatar.update đặt lại góc tay mỗi khung, nên tư thế chắp tay phải ghi đè sau nó.
    armL.rotation.set(-1.12, 0, 0.62);
    armR.rotation.set(-1.12, 0, -0.62);

    this.bowT = Math.max(0, this.bowT - dt);
    rig.rotation.x = Math.sin((this.bowT / BOW_S) * Math.PI) * 0.26;
  }
}
