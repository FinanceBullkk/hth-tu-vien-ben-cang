// Nhân vật chibi: màu áo, kiểu tóc/mũ, trang phục tiên hiệp, vũ khí, hào quang,
// hoạt ảnh đi, ngồi, thỉnh chuông, vẫy tay, tên nổi trên đầu.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ACTIVITY, ACTIVITY_LABEL, SHIRT_COLORS } from '../../../shared/protocol.js';
import { createAttire } from './avatar-attire.js';
import { createWeapon } from './avatar-weapon.js';
import { createEffect } from './avatar-effect.js';

const G = {
  body: new THREE.CylinderGeometry(0.17, 0.25, 0.5, 8),
  head: new THREE.IcosahedronGeometry(0.3, 2),
  eye: new THREE.SphereGeometry(0.038, 6, 5),
  limb: (() => {
    const g = new THREE.CapsuleGeometry(0.065, 0.2, 2, 6);
    g.translate(0, -0.15, 0);
    return g;
  })(),
  hairTop: new THREE.SphereGeometry(0.325, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56),
  bun: new THREE.IcosahedronGeometry(0.13, 1),
  hairBack: new THREE.BoxGeometry(0.46, 0.5, 0.14),
  visor: new THREE.BoxGeometry(0.34, 0.03, 0.2),
  conical: new THREE.ConeGeometry(0.58, 0.34, 12),
  brim: new THREE.TorusGeometry(0.33, 0.035, 5, 14),
  halo: (() => {
    const g = new THREE.RingGeometry(0.5, 0.82, 28);
    g.rotateX(-Math.PI / 2);
    return g;
  })(),
  // Đầu trụi băng mắt: ba vành băng mắt, khoen ngọc, còng tóc, đuôi băng.
  bandRing: new THREE.TorusGeometry(0.3, 0.03, 6, 16),
  emblemRing: new THREE.TorusGeometry(0.075, 0.024, 6, 12),
  gem: new THREE.SphereGeometry(0.05, 8, 6),
  cuff: new THREE.CylinderGeometry(0.055, 0.065, 0.07, 8),
  bandTail: new THREE.BoxGeometry(0.12, 0.28, 0.012),
};

const M = {
  skin: new THREE.MeshLambertMaterial({ color: 0xf0c8a0, flatShading: true }),
  eye: new THREE.MeshBasicMaterial({ color: 0x241a14 }),
  hair: new THREE.MeshLambertMaterial({ color: 0x2a1c16, flatShading: true }),
  pants: new THREE.MeshLambertMaterial({ color: 0x3a3440, flatShading: true }),
  conical: new THREE.MeshLambertMaterial({ color: 0xdcc58c, flatShading: true }),
  helmet: new THREE.MeshLambertMaterial({ color: 0xf2c230, flatShading: true }),
  cap: new THREE.MeshLambertMaterial({ color: 0x2f6d9e, flatShading: true }),
  halo: new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  wrap: new THREE.MeshLambertMaterial({ color: 0xf2e9d6, flatShading: true }),
  hairBrown: new THREE.MeshLambertMaterial({ color: 0x6e4526, flatShading: true }),
  gold: new THREE.MeshLambertMaterial({ color: 0xbca36b, flatShading: true }),
  gem: new THREE.MeshBasicMaterial({ color: 0x35b8c8 }),
  // Da ráng nắng cho đầu trụi và thân trần của võ tăng — đậm hơn da mặt thường.
  skinTan: new THREE.MeshLambertMaterial({ color: 0xd9a06e, flatShading: true }),
};

const shirtCache = new Map();
function shirtMat(i) {
  if (!shirtCache.has(i)) {
    shirtCache.set(i, new THREE.MeshLambertMaterial({ color: SHIRT_COLORS[i] ?? SHIRT_COLORS[0], flatShading: true }));
  }
  return shirtCache.get(i);
}

function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  return m;
}

function buildHat(hat, color) {
  const g = new THREE.Group();
  switch (hat) {
    case 1: { // Tóc dài
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.28;
      g.add(top, mesh(G.hairBack, M.hair, 0, -0.14, -0.2));
      break;
    }
    case 2: { // Tóc búi
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.22;
      g.add(top, mesh(G.bun, M.hair, 0, 0.3, -0.14));
      break;
    }
    case 3: { // Mũ lưỡi trai
      const top = mesh(G.hairTop, M.cap);
      top.rotation.x = -0.18;
      g.add(top, mesh(G.visor, M.cap, 0, 0.06, 0.32));
      break;
    }
    case 4: { // Nón lá
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.25;
      g.add(top, mesh(G.conical, M.conical, 0, 0.27, 0));
      break;
    }
    case 5: { // Mũ bảo hộ
      const top = mesh(G.hairTop, M.helmet);
      top.rotation.x = -0.1;
      const brim = mesh(G.brim, M.helmet, 0, 0.04, 0.01);
      brim.rotation.x = Math.PI / 2;
      g.add(top, brim);
      break;
    }
    case 6: { // Đầu trụi băng mắt: võ tăng mù, băng đỏ viền trắng ôm ngang mắt,
      // ngọc lam viền vàng trước trán, bím tóc nâu cong ra sau gáy.
      const band = (y, mat) => {
        const ring = mesh(G.bandRing, mat, 0, 0.02 + y, 0);
        ring.rotation.x = Math.PI / 2;
        return ring;
      };
      g.add(band(-0.036, shirtMat(color)), band(0, M.wrap), band(0.036, shirtMat(color)));
      g.add(mesh(G.emblemRing, M.gold, 0, 0.02, 0.3));
      g.add(mesh(G.gem, M.gem, 0, 0.02, 0.3, false));
      const crown = mesh(G.bun, M.gold, 0, 0.115, 0.295);
      crown.scale.setScalar(0.45);
      g.add(crown);
      const braid = [
        [0.33, -0.16, 1], [0.32, -0.28, 0.85], [0.24, -0.36, 0.7], [0.13, -0.39, 0.56], [0.02, -0.37, 0.44],
      ];
      for (const [y, z, s] of braid) {
        const seg = mesh(G.bun, M.hairBrown, 0, y, z);
        seg.scale.setScalar(s);
        g.add(seg);
      }
      const cuff = mesh(G.cuff, M.gold, 0, 0.245, -0.1);
      cuff.rotation.x = -0.4;
      g.add(cuff);
      const tuft = mesh(G.conical, M.hairBrown, 0, -0.07, -0.365);
      tuft.rotation.x = Math.PI;
      tuft.scale.setScalar(0.14);
      g.add(tuft);
      const tailL = mesh(G.bandTail, shirtMat(color), -0.08, -0.08, -0.3);
      tailL.rotation.set(-0.35, 0, 0.5);
      const tailR = mesh(G.bandTail, shirtMat(color), 0.08, -0.06, -0.31);
      tailR.rotation.set(-0.3, 0, -0.6);
      g.add(tailL, tailR);
      break;
    }
    default: { // Tóc ngắn
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.26;
      g.add(top);
    }
  }
  return g;
}

export class Avatar {
  constructor({ name, color = 0, hat = 0, attire = 0, weapon = 0, effect = 0, lowQuality = false, isLocal = false }) {
    this.isLocal = isLocal;
    this.name = name;
    this.attireIndex = attire;
    this.weaponIndex = weapon;
    this.effectIndex = effect;
    this.lowQuality = lowQuality;
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);

    this.body = mesh(G.body, shirtMat(color), 0, 0.6);
    this.head = new THREE.Group();
    this.head.position.y = 1.07;
    this.headMesh = mesh(G.head, hat === 6 ? M.skinTan : M.skin);
    this.head.add(this.headMesh);
    this.head.add(mesh(G.eye, M.eye, -0.11, 0.03, 0.27, false), mesh(G.eye, M.eye, 0.11, 0.03, 0.27, false));
    this.hatGroup = buildHat(hat, color);
    this.head.add(this.hatGroup);

    const limb = (x, y, mat) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      pivot.add(mesh(G.limb, mat));
      return pivot;
    };
    this.armL = limb(-0.24, 0.78, shirtMat(color));
    this.armR = limb(0.24, 0.78, shirtMat(color));
    this.legL = limb(-0.1, 0.36, M.pants);
    this.legR = limb(0.1, 0.36, M.pants);
    this.rig.add(this.body, this.head, this.armL, this.armR, this.legL, this.legR);
    this.attire = createAttire(attire, color, this.armL, this.armR, this.body, this.legL, this.legR);
    this.rig.add(this.attire.group);

    // Vũ khí gác sau lưng, nghiêng chéo: gốc group đặt tại lưng, gốc model tại cán.
    this.weaponFx = createWeapon(weapon);
    this.weaponFx.group.position.set(0, 0.62, -0.21);
    this.weaponFx.group.rotation.set(0.12, 0, -0.58);
    this.rig.add(this.weaponFx.group);

    this.aura = createEffect(effect, lowQuality);
    if (this.aura.points) this.root.add(this.aura.points);
    this.aura.setWeapon?.(weapon);

    this.halo = new THREE.Mesh(G.halo, M.halo);
    this.halo.position.y = 0.03;
    this.halo.visible = false;
    this.root.add(this.halo);

    // Nhãn tên dùng HTML để chữ Việt hiện đúng dấu.
    this.tagEl = document.createElement('div');
    this.tagEl.className = 'tag';
    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'tag-bubble';
    this.bubbleEl.hidden = true;
    this.nameEl = document.createElement('div');
    this.nameEl.className = isLocal ? 'tag-name me' : 'tag-name';
    this.nameEl.textContent = name;
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'tag-status';
    this.statusEl.hidden = true;
    this.tagEl.append(this.bubbleEl, this.nameEl, this.statusEl);
    this.label = new CSS2DObject(this.tagEl);
    this.label.position.y = 1.72;
    this.root.add(this.label);

    this.time = Math.random() * 10;
    this.walkAmt = 0;
    this.sitAmt = 0;
    this.waveT = 0;
    this.activity = ACTIVITY.none;
    this.bubbleTimer = 0;
    this.fading = 0;
    this.yOffset = 0;
  }

  setName(name) {
    this.name = name;
    this.nameEl.textContent = name;
  }

  setLook(color, hat, attire = this.attireIndex, weapon = this.weaponIndex, effect = this.effectIndex) {
    const mat = shirtMat(color);
    this.body.material = mat;
    this.armL.children[0].material = mat;
    this.armR.children[0].material = mat;
    if (attire !== this.attireIndex) {
      this.attireIndex = attire;
      for (const extra of this.attire.extras ?? []) extra.removeFromParent();
      this.rig.remove(this.attire.group);
      this.attire = createAttire(attire, color, this.armL, this.armR, this.body, this.legL, this.legR);
      this.rig.add(this.attire.group);
    } else {
      this.attire.setColor(color);
    }
    if (weapon !== this.weaponIndex) {
      this.weaponIndex = weapon;
      this.weaponFx.discard?.();
      this.rig.remove(this.weaponFx.group);
      this.weaponFx = createWeapon(weapon);
      this.weaponFx.group.position.set(0, 0.62, -0.21);
      this.weaponFx.group.rotation.set(0.12, 0, -0.58);
      this.rig.add(this.weaponFx.group);
      this.aura.setWeapon?.(weapon);
    }
    if (effect !== this.effectIndex) {
      this.effectIndex = effect;
      if (this.aura.points) {
        this.root.remove(this.aura.points);
        this.aura.dispose();
      }
      this.aura = createEffect(effect, this.lowQuality);
      if (this.aura.points) {
        if (this.fading > 0) this.aura.beginFade();
        this.root.add(this.aura.points);
      }
    }
    this.head.remove(this.hatGroup);
    this.hatGroup = buildHat(hat, color);
    this.head.add(this.hatGroup);
    this.headMesh.material = hat === 6 ? M.skinTan : M.skin;
  }

  setActivity(code) {
    if (code === this.activity) return;
    this.activity = code;
    const label = ACTIVITY_LABEL[code];
    this.statusEl.hidden = !label;
    this.statusEl.textContent = label || '';
    this.halo.visible = code === ACTIVITY.meditate;
  }

  say(text, ms = 5000) {
    this.bubbleEl.textContent = text;
    this.bubbleEl.hidden = false;
    this.bubbleEl.classList.toggle('emoji', [...text].length <= 2);
    this.bubbleTimer = ms / 1000;
  }

  wave() {
    this.waveT = 1.8;
  }

  /** Bắt đầu mờ dần khi người chơi rời đi. */
  fadeOut() {
    this.fading = 1;
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.halo) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.castShadow = false;
      }
    });
    if (this.aura.points) {
      this.aura.beginFade();
      this.aura.points.castShadow = false;
    }
  }

  update(dt, moving, cameraDist = 0) {
    this.time += dt;
    const t = this.time;
    const sit = this.activity === ACTIVITY.meditate;

    this.walkAmt += ((moving ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 10);
    this.sitAmt += ((sit ? 1 : 0) - this.sitAmt) * Math.min(1, dt * 6);

    const swing = Math.sin(t * 9.5) * 0.75 * this.walkAmt;
    const bob = Math.abs(Math.sin(t * 9.5)) * 0.035 * this.walkAmt;
    const breathe = Math.sin(t * 1.8) * 0.012;

    let armLx = -swing;
    let armRx = swing;
    let armRz = 0;
    let armLz = 0;
    if (this.activity === ACTIVITY.bell) {
      const pull = Math.sin(t * 4) * 0.35;
      armLx = -1.5 + pull;
      armRx = -1.5 + pull;
    } else if (this.activity === ACTIVITY.write) {
      armRx = -1.05 + Math.sin(t * 10) * 0.08;
      armLx = -0.85;
    } else if (this.activity === ACTIVITY.shake) {
      armLx = -1.2 + Math.sin(t * 22) * 0.25;
      armRx = -1.2 + Math.sin(t * 22) * 0.25;
    } else if (this.activity === ACTIVITY.fish) {
      // Một tay giơ giữ cần, tay kia chống hông ngóng phao.
      armRx = -1.4 + Math.sin(t * 1.6) * 0.06;
      armLx = -0.3;
      armLz = -0.5;
    } else if (this.activity === ACTIVITY.pitch) {
      // Một tay giơ mũi tên ngang vai, tay kia buông, người hơi lắc lư.
      armRx = -1.75 + Math.sin(t * 1.7) * 0.1;
      armLx = -0.25;
    }
    if (this.sitAmt > 0.01) {
      armLx = armLx * (1 - this.sitAmt) - 0.55 * this.sitAmt;
      armRx = armRx * (1 - this.sitAmt) - 0.55 * this.sitAmt;
      armLz = -0.15 * this.sitAmt;
      armRz = 0.15 * this.sitAmt;
    }
    if (this.waveT > 0) {
      this.waveT -= dt;
      armRx = 0;
      armRz = 2.5 + Math.sin(t * 14) * 0.35;
    }
    this.armL.rotation.set(armLx, 0, armLz);
    this.armR.rotation.set(armRx, 0, armRz);

    const legSit = -1.45 * this.sitAmt;
    this.legL.rotation.set(swing * (1 - this.sitAmt) + legSit, 0, -0.45 * this.sitAmt);
    this.legR.rotation.set(-swing * (1 - this.sitAmt) + legSit, 0, 0.45 * this.sitAmt);
    this.rig.position.y = bob - 0.27 * this.sitAmt + breathe * (1 + this.sitAmt * 2);
    this.body.scale.y = 1 + breathe * 2;
    this.attire.update?.(t, this.walkAmt, this.sitAmt);
    this.weaponFx.update?.(t, this.walkAmt);
    this.aura.update?.(t, this.walkAmt);

    if (this.halo.visible) {
      const pulse = 1 + Math.sin(t * 1.05) * 0.14;
      this.halo.scale.set(pulse, 1, pulse);
    }

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.bubbleEl.hidden = true;
    }
    this.label.visible = cameraDist < 48;

    if (this.fading > 0) {
      this.fading = Math.max(0, this.fading - dt / 0.9);
      this.root.traverse((o) => {
        if (o.isMesh && o !== this.halo && o.material.transparent) o.material.opacity = this.fading;
      });
      if (this.aura.points) this.aura.points.material.opacity = this.fading * 0.9;
      this.tagEl.style.opacity = String(this.fading);
    }
  }

  /** Dọn khi người chơi đã rời hẳn; hình học dùng chung nên chỉ huỷ vật liệu đã nhân bản. */
  dispose(scene) {
    scene.remove(this.root);
    this.tagEl.remove();
    this.label.removeFromParent();
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.halo && o.material.transparent) o.material.dispose();
    });
    if (this.aura.points) this.aura.dispose();
  }
}
