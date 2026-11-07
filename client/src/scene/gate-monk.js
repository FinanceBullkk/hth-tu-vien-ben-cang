// Sư chú giữ cổng: NPC nhỏ đứng cạnh tam quan, giao câu đố cho ai vừa lên. Dựng từ Avatar như thầy trụ trì.
import * as THREE from 'three';
import { GATE_MONK, floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const MONK_NAME = 'Sư chú Bừng';
const GREET_RADIUS = 5;
const GREET_COOLDOWN_S = 45;
const FACE_RADIUS = 7;
const BOW_S = 1.2;
const TAP_RANGE = 30;

const GREETINGS = [
  'Câu đố miễn phí, đáp án đúng có TEU nhé!',
  'Lên tu viện mà đầu óc vẫn ở cảng à? Đố một câu cho tỉnh.',
  'Trả lời sai hai lần sư chú gợi ý cho.',
  'Mười câu một ngày, muốn đố nữa thì mai quay lại.',
];

const MAT = {
  robe: new THREE.MeshLambertMaterial({ color: 0xd9a441, flatShading: true }),
  sash: new THREE.MeshLambertMaterial({ color: 0x9c5524, flatShading: true }),
  skin: new THREE.MeshLambertMaterial({ color: 0xf2cfa8, flatShading: true }),
  scroll: new THREE.MeshLambertMaterial({ color: 0xf0e2bd, flatShading: true }),
};

function lerpAngle(a, b, k) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
}

/** Khoác áo cà sa lên một Avatar, dùng chung cho các nhà sư NPC. */
export function addRobe(avatar) {
  avatar.body.material = MAT.robe;
  for (const arm of [avatar.armL, avatar.armR]) {
    arm.children[0].material = MAT.robe;
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), MAT.skin);
    hand.position.y = -0.32;
    arm.add(hand);
  }
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.46, 10), MAT.robe);
  skirt.position.y = 0.27;
  skirt.castShadow = true;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.035, 5, 18), MAT.sash);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.6;
  avatar.rig.add(skirt, sash);
}

/** Cuốn giấy nho nhỏ ôm trước ngực — "cầm" cuốn sổ câu đố. */
function addScroll(rig) {
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), MAT.scroll);
  scroll.rotation.set(0, 0, 1.35);
  scroll.position.set(0.16, 0.72, 0.24);
  rig.add(scroll);
}

export class GateMonk {
  constructor(scene) {
    this.avatar = new Avatar({ name: MONK_NAME });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.72;
    this.avatar.rig.scale.set(0.92, 0.86, 0.92); // Dáng nhỏ, trẻ hơn trụ trì.
    this.avatar.attire.hide();
    addRobe(this.avatar);
    addScroll(this.avatar.rig);

    // Biểu tượng lơ lửng trên đầu: cửa vào của trò đố (nguyên tắc WWM "NPC là cửa vào").
    const icon = document.createElement('div');
    icon.className = 'npc-icon';
    icon.textContent = '📜';
    const iconObj = new CSS2DObject(icon);
    iconObj.position.set(0, 2.05, 0);
    this.avatar.root.add(iconObj);

    this.y = floorHeight(GATE_MONK.x, GATE_MONK.z);
    this.avatar.root.position.set(GATE_MONK.x, this.y, GATE_MONK.z);
    this.avatar.root.rotation.y = GATE_MONK.rot;
    scene.add(this.avatar.root);

    this.bowT = 0;
    this.greetWait = 0;
    this.near = false;
    this.greetIndex = Math.floor(Math.random() * GREETINGS.length);
    this.onAsk = null; // gán từ main: mở trò đố
    this._p = new THREE.Vector3();
  }

  atRay(ray) {
    const p = this._p.set(GATE_MONK.x, this.y + 0.8, GATE_MONK.z);
    return ray.distanceSqToPoint(p) < 0.55 && ray.origin.distanceTo(p) < TAP_RANGE;
  }

  update(dt, playerX, playerZ, camera) {
    const dx = playerX - GATE_MONK.x;
    const dz = playerZ - GATE_MONK.z;
    const dist = Math.hypot(dx, dz);

    this.greetWait = Math.max(0, this.greetWait - dt);
    const near = dist < GREET_RADIUS;
    if (near && !this.near && this.greetWait === 0) {
      this.greetIndex = (this.greetIndex + 1) % GREETINGS.length;
      this.avatar.say(GREETINGS[this.greetIndex], 5000);
      this.bowT = BOW_S;
      this.greetWait = GREET_COOLDOWN_S;
    }
    this.near = near;

    const targetRot = dist < FACE_RADIUS ? Math.atan2(dx, dz) : GATE_MONK.rot;
    const { root, rig, armL, armR } = this.avatar;
    root.rotation.y = lerpAngle(root.rotation.y, targetRot, Math.min(1, dt * 3));
    this.avatar.update(dt, false, camera.position.distanceTo(root.position));
    // Một tay ôm cuốn sổ, một tay chắp sau lưng.
    armL.rotation.set(-1.05, 0, 0.5);
    armR.rotation.set(-0.2, 0, -0.12);

    this.bowT = Math.max(0, this.bowT - dt);
    rig.rotation.x = Math.sin((this.bowT / BOW_S) * Math.PI) * 0.22;
  }
}
