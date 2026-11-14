// Bena Banca: thương lái đứng ở góc đông bắc hồ câu. Tới gần bấm E hoặc bấm vào cô để mở quầy thu mua cá, bán cần câu.
// Chỉ diễn trên từng máy: lời chào, tay chống má, chớp mắt, mèo trên vai vẫy đuôi; mua bán thật đi qua server ở bảng quầy.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BENA_BANCA, floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';
import { dressBenaBanca } from './bena-banca-look.js';
import { createBenaBancaStall } from './bena-banca-stall.js';

export const BENA_NAME = 'Bena Banca';
const GREET_RADIUS = 6.5;
const GREET_COOLDOWN_S = 45;
const FACE_RADIUS = 9;
const TAP_RANGE = 30;
const WAVE_S = 1.6;
const HOP_S = 0.9;

const GREETINGS = [
  'Cá tươi không? Bena thu hết, trả TEU liền tay!',
  'Câu được con nào to thì mang lại đây nha.',
  'Cần tre kéo không nổi cá huyền thoại đâu, ghé xem cần mới nè.',
  'Bé mèo nhà Bena đang chờ cá đó, hihi.',
  'Thính thơm mới về, rắc vào là cá kéo tới liền.',
];

const TALK_LINES = [
  'Bán cá hay sắm cần nào?',
  'Bena trả đúng giá chốt lúc câu, không ép giá đâu nha.',
  'Hôm nay câu được gì rồi?',
];

/** Câu cảm ơn sau khi mua được cá, theo số TEU vừa trả. */
function thanksLine(gained) {
  if (gained >= 100) return `Trời ơi mẻ này đỉnh quá! Gửi bạn ${gained} TEU nè!`;
  if (gained >= 30) return `Cá ngon ghê! ${gained} TEU của bạn đây.`;
  return `Cảm ơn nha, ${gained} TEU nè!`;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function lerpAngle(a, b, k) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
}

export class BenaBanca {
  constructor(scene) {
    this.y = floorHeight(BENA_BANCA.x, BENA_BANCA.z);
    this.stall = createBenaBancaStall();
    scene.add(this.stall);

    this.avatar = new Avatar({ name: BENA_NAME, color: 0, hair: 0, hat: 7 });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.88;
    const look = dressBenaBanca(this.avatar);
    this.cat = look.cat;
    this.eyes = look.eyes;
    const icon = document.createElement('div');
    icon.className = 'npc-icon';
    icon.textContent = '🎣';
    const iconObj = new CSS2DObject(icon);
    iconObj.position.set(0, 2.25, 0);
    this.avatar.root.add(iconObj);
    this.avatar.root.position.set(BENA_BANCA.x, this.y, BENA_BANCA.z);
    this.avatar.root.rotation.y = BENA_BANCA.rot;
    scene.add(this.avatar.root);

    this.t = Math.random() * 10;
    this.greetWait = 0;
    this.near = false;
    this.waveT = 0;
    this.hopT = 0;
    this.blinkIn = 2;
    this.blinkT = 0;
    this._p = new THREE.Vector3();
  }

  say(text, ms = 5000) {
    this.avatar.say(text, ms);
  }

  /** Người chơi bắt chuyện: chào một câu và vẫy tay. Bảng quầy do bên gọi mở. */
  talk() {
    this.say(pick(TALK_LINES), 4000);
    this.waveT = WAVE_S;
    this.greetWait = GREET_COOLDOWN_S;
  }

  /** Vừa mua cá của người chơi: nhún một nhịp, mèo giơ chân, nói lời cảm ơn. */
  cheer(gained) {
    this.say(thanksLine(gained), 4500);
    this.hopT = HOP_S;
    this.waveT = WAVE_S;
  }

  atRay(ray) {
    const p = this._p.set(BENA_BANCA.x, this.y + 0.9, BENA_BANCA.z);
    return ray.distanceSqToPoint(p) < 0.6 && ray.origin.distanceTo(p) < TAP_RANGE;
  }

  update(dt, playerX, playerZ, camera) {
    this.t += dt;
    const dx = playerX - BENA_BANCA.x;
    const dz = playerZ - BENA_BANCA.z;
    const dist = Math.hypot(dx, dz);

    // Chào một lần khi người chơi bước tới, đi quanh quẩn không chào lại ngay.
    this.greetWait = Math.max(0, this.greetWait - dt);
    const near = dist < GREET_RADIUS;
    if (near && !this.near && this.greetWait === 0) {
      this.say(pick(GREETINGS));
      this.waveT = WAVE_S;
      this.greetWait = GREET_COOLDOWN_S;
    }
    this.near = near;

    // Chỉ quay theo khách đứng phía trước (phía hồ), không quay lưng vào giá cần.
    const facing = dist < FACE_RADIUS && dx < 0.4 ? Math.atan2(dx, dz) : BENA_BANCA.rot;
    const { root, rig, head, armL, armR } = this.avatar;
    root.rotation.y = lerpAngle(root.rotation.y, facing, Math.min(1, dt * 3));
    this.avatar.update(dt, false, camera.position.distanceTo(root.position));

    // Avatar.update đặt lại tay mỗi khung, nên tư thế riêng ghi đè sau nó.
    this.waveT = Math.max(0, this.waveT - dt);
    const sway = Math.sin(this.t * 1.3);
    if (this.waveT > 0) armR.rotation.set(-2.7, 0, -0.35 + Math.sin(this.waveT * 12) * 0.28);
    else armR.rotation.set(-2.42 + sway * 0.03, 0, -0.32); // tay chống má
    armL.rotation.set(-0.12, 0, -0.32); // tay bên vai có mèo hơi giang ra làm chỗ đứng
    head.rotation.z = -0.13 + sway * 0.03; // nghiêng đầu tựa vào tay
    head.rotation.y = Math.sin(this.t * 0.45) * 0.12;

    this.hopT = Math.max(0, this.hopT - dt);
    if (this.hopT > 0) rig.position.y += Math.abs(Math.sin((this.hopT / HOP_S) * Math.PI * 2)) * 0.07;

    // Chớp mắt mỗi vài giây.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = 0.13;
      this.blinkIn = 2.4 + Math.random() * 2.6;
    }
    this.blinkT = Math.max(0, this.blinkT - dt);
    for (const eye of this.eyes) eye.scale.y = this.blinkT > 0 ? 0.15 : 1;

    // Mèo: đuôi phe phẩy, đầu nghiêng ngó, chân trước vẫy khi chủ vẫy.
    const { tail, head: catHead, paw } = this.cat;
    tail.rotation.z = Math.sin(this.t * 2.2) * 0.45;
    tail.rotation.x = -0.2 + Math.sin(this.t * 1.1) * 0.15;
    catHead.rotation.z = Math.sin(this.t * 0.8) * 0.18;
    paw.position.y = 0.13 + (this.waveT > 0 ? Math.abs(Math.sin(this.waveT * 10)) * 0.03 : 0);
  }
}
