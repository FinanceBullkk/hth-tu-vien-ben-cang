// Nhân vật chibi: màu áo, kiểu tóc/mũ, trang phục tiên hiệp, vũ khí, hào quang,
// hoạt ảnh đi, ngồi, thỉnh chuông, vẫy tay, tên nổi trên đầu.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ACTIVITY, ACTIVITY_LABEL, SHIRT_COLORS } from '../../../shared/protocol.js';
import { createAttire } from './avatar-attire.js';
import { createWeapon } from './avatar-weapon.js';
import { createInstrument } from './avatar-instrument.js';
import { createEffect } from './avatar-effect.js';
import { applyAvatarTitle } from './avatar-title.js';
import { createCultivation } from './avatar-cultivation.js';
import { CultivationAura } from './cultivation-aura.js';

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
  // Kiểu tóc và mũ tiên hiệp: trâm, dây buộc búi, mai tóc bên, đạo quan, kim quan, màn sa.
  hairpin: new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6),
  cord: new THREE.TorusGeometry(0.09, 0.013, 5, 12),
  sideLock: new THREE.BoxGeometry(0.07, 0.34, 0.07),
  crown: new THREE.CylinderGeometry(0.15, 0.17, 0.13, 10),
  quanBand: new THREE.TorusGeometry(0.165, 0.012, 5, 14),
  quan: new THREE.TorusGeometry(0.3, 0.045, 6, 18),
  wideConical: new THREE.ConeGeometry(0.68, 0.36, 14),
  veil: new THREE.CylinderGeometry(0.66, 0.44, 0.34, 14, 1, true),
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
  jade: new THREE.MeshLambertMaterial({ color: 0x3f9e7d, flatShading: true }),
  hairWhite: new THREE.MeshLambertMaterial({ color: 0xdfe3ea, flatShading: true }),
  red: new THREE.MeshLambertMaterial({ color: 0xc23b22, flatShading: true }),
  ink: new THREE.MeshLambertMaterial({ color: 0x2b3a52, flatShading: true }),
  veil: new THREE.MeshLambertMaterial({ color: 0xf2ead8, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
};

// Vòm mũ to hơn mái tóc bên dưới một chút để hai mặt cong không trùng nhau nhòe hình.
G.capDome = G.hairTop.clone();
G.capDome.scale(1.06, 1.08, 1.06);

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

// Kiểu tóc dựng riêng khỏi mũ để kết hợp tự do (shared/protocol.js: HAIR_NAMES).
function buildHair(hair) {
  const g = new THREE.Group();
  switch (hair) {
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
    case 3: { // Búi trâm ngọc: búi cao cài trâm ngọc, đầu trâm chấm vàng
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.22;
      const pin = mesh(G.hairpin, M.jade, 0.02, 0.33, -0.14);
      pin.rotation.z = Math.PI / 2;
      g.add(top, mesh(G.bun, M.hair, 0, 0.3, -0.14), pin, mesh(G.gem, M.gold, 0.19, 0.33, -0.14, false));
      break;
    }
    case 4: { // Song loạn: hai búi nhỏ hai bên đầu, chân búi buộc chỉ hồng
      const top = mesh(G.hairTop, M.hair);
      top.rotation.x = -0.24;
      for (const s of [-1, 1]) {
        const bun = mesh(G.bun, M.hair, 0.18 * s, 0.26, -0.04);
        bun.scale.setScalar(0.8);
        const cord = mesh(G.cord, M.red, 0.18 * s, 0.19, -0.04);
        cord.rotation.x = Math.PI / 2;
        g.add(bun, cord);
      }
      g.add(top);
      break;
    }
    case 5: { // Bạch phát: tóc dài bạc trắng kèm mai tóc hai bên
      const top = mesh(G.hairTop, M.hairWhite);
      top.rotation.x = -0.28;
      g.add(
        top,
        mesh(G.hairBack, M.hairWhite, 0, -0.14, -0.2),
        mesh(G.sideLock, M.hairWhite, -0.21, -0.02, 0.1),
        mesh(G.sideLock, M.hairWhite, 0.21, -0.02, 0.1),
      );
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

// Kiểu tóc đã có búi giữa đầu: đạo quan khỏi thêm búi đế nữa.
const HAS_BUN = new Set([2, 3]);

function buildHat(hat, color, hair) {
  const g = new THREE.Group();
  switch (hat) {
    case 3: { // Mũ lưỡi trai
      const dome = mesh(G.capDome, M.cap);
      dome.rotation.x = -0.18;
      g.add(dome, mesh(G.visor, M.cap, 0, 0.06, 0.32));
      break;
    }
    case 4: { // Nón lá
      g.add(mesh(G.conical, M.conical, 0, 0.27, 0));
      break;
    }
    case 5: { // Mũ bảo hộ
      const dome = mesh(G.capDome, M.helmet);
      dome.rotation.x = -0.1;
      const brim = mesh(G.brim, M.helmet, 0, 0.04, 0.01);
      brim.rotation.x = Math.PI / 2;
      g.add(dome, brim);
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
    case 8: { // Đạo quan: trụ mực lam có vành vàng, đội trên búi tóc
      if (!HAS_BUN.has(hair)) g.add(mesh(G.bun, hair === 5 ? M.hairWhite : M.hair, 0, 0.3, -0.14));
      const band = mesh(G.quanBand, M.gold, 0, 0.355, -0.14);
      band.rotation.x = Math.PI / 2;
      g.add(mesh(G.crown, M.ink, 0, 0.41, -0.14), band);
      break;
    }
    case 9: { // Kim quan: vành vàng vòng đỉnh đầu, ngọc bích trước trán
      const quan = mesh(G.quan, M.gold, 0, 0.22, 0);
      quan.rotation.x = Math.PI / 2;
      g.add(quan, mesh(G.gem, M.jade, 0, 0.25, 0.3));
      break;
    }
    case 10: { // Nón lá màn sa: vành rộng hơn nón lá, rơi màn mờ che mặt
      g.add(mesh(G.wideConical, M.conical, 0, 0.3, 0), mesh(G.veil, M.veil, 0, -0.05, 0, false));
      break;
    }
    default: break; // Không đội (7) và id cũ: chỉ tóc
  }
  return g;
}

// Ghép tóc + mũ thành một nhóm gắn trên đầu. hat 0-2 là id cũ trộn tóc vào mũ và
// hat 6 tự chứa cả mái (đầu trụi băng mắt): nhóm này bỏ slot tóc để giữ nguyên hình cũ.
function buildLook(hat, hair, color) {
  const g = new THREE.Group();
  const style = hat <= 2 ? hat : hair;
  if (hat !== 6) g.add(buildHair(style));
  if (hat >= 3) g.add(buildHat(hat, color, style));
  return g;
}

export class Avatar {
  constructor({ name, color = 0, hat = 0, hair, attire = 0, weapon = 0, effect = 0, lowQuality = false, isLocal = false }) {
    this.isLocal = isLocal;
    this.name = name;
    // Caller cũ không truyền hair (NPC, client cũ): id hat 0-2 chính là kiểu tóc cũ.
    this.hairIndex = hair ?? (hat <= 2 ? hat : 0);
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
    this.hatGroup = buildLook(hat, this.hairIndex, color);
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
    if (this.aura.points) {
      this.root.add(this.aura.points);
      // Aura tự quản lý fade qua setOpacity(f): đánh dấu qiOwned để fadeOut không nhân
      // bản material của nó — nếu bị clone, các lớp shader giữ uniform cũ và không tan.
      this.aura.points.traverse((o) => { o.userData.qiOwned = true; });
    }
    this.aura.setWeapon?.(weapon);
    this.cultivationTier = 0;
    this.cultivation = createCultivation(effect, 0, lowQuality);
    this.root.add(this.cultivation.points);

    this.halo = new THREE.Mesh(G.halo, M.halo);
    this.halo.position.y = 0.03;
    this.halo.visible = false;
    this.root.add(this.halo);
    this.qi = 0;

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
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'tag-title';
    applyAvatarTitle(this.tagEl, this.titleEl, effect);
    this.tagEl.append(this.bubbleEl, this.titleEl, this.nameEl, this.statusEl);
    this.label = new CSS2DObject(this.tagEl);
    // Neo đáy nhãn vào điểm trên đầu: nhãn luôn mọc lên trời, không trùm xuống
    // che người khi nhìn từ xa — CSS2D mặc định căn giữa nên nửa dưới đè lên đầu.
    this.label.center.set(0.5, 1);
    this.label.position.y = 1.72;
    this.root.add(this.label);

    this.time = Math.random() * 10;
    this.walkAmt = 0;
    this.sitAmt = 0;
    this.waveT = 0;
    this.slashT = 0;
    this.flinchT = 0;
    this.inCombat = false;
    this.activity = ACTIVITY.none;
    this.bubbleTimer = 0;
    this.fading = 0;
    this.yOffset = 0;
  }

  setName(name) {
    this.name = name;
    this.nameEl.textContent = name;
  }

  setQi(qi) {
    if (!Number.isSafeInteger(qi) || qi < 0 || qi === this.qi) return;
    this.qi = qi;
    if (!this.cultivationAura) {
      this.cultivationAura = new CultivationAura(this.lowQuality, this.effectIndex);
      this.root.add(this.cultivationAura.group);
    }
    this.cultivationAura.setQi(qi);
  }

  setLook(color, hat, hair = this.hairIndex, attire = this.attireIndex, weapon = this.weaponIndex, effect = this.effectIndex) {
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
      applyAvatarTitle(this.tagEl, this.titleEl, effect);
      this.cultivationAura?.setEffect(effect);
      if (this.aura.points) {
        this.root.remove(this.aura.points);
        this.aura.dispose();
      }
      this.aura = createEffect(effect, this.lowQuality);
      this.setCultivation(this.cultivationTier);
      if (this.aura.points) {
        if (this.fading > 0) this.aura.beginFade();
        this.root.add(this.aura.points);
        this.aura.points.traverse((o) => { o.userData.qiOwned = true; });
      }
    }
    this.head.remove(this.hatGroup);
    this.hairIndex = hair;
    this.hatGroup = buildLook(hat, hair, color);
    this.head.add(this.hatGroup);
    this.headMesh.material = hat === 6 ? M.skinTan : M.skin;
  }

  setCultivation(tier) {
    this.cultivationTier = Number.isInteger(tier) ? Math.max(0, Math.min(3, tier)) : 0;
    this.root.remove(this.cultivation.points);
    this.cultivation.dispose();
    this.cultivation = createCultivation(this.effectIndex, this.cultivationTier, this.lowQuality);
    this.root.add(this.cultivation.points);
  }

  setActivity(code) {
    if (code === this.activity) return;
    this.activity = code;
    this.renderStatus();
    if (code === ACTIVITY.melody && !this.instrument) {
      this.instrument = createInstrument();
      this.rig.add(this.instrument.group);
    }
    if (this.instrument) this.instrument.group.visible = code === ACTIVITY.melody;
    this.weaponFx.group.visible = code !== ACTIVITY.melody;
    this.halo.visible = false;
    if (code === ACTIVITY.meditate && !this.cultivationAura) {
      this.cultivationAura = new CultivationAura(this.lowQuality, this.effectIndex);
      this.root.add(this.cultivationAura.group);
    }
  }

  setCombatStatus(label) {
    this.combatStatus = label;
    this.renderStatus();
  }

  renderStatus() {
    const label = [ACTIVITY_LABEL[this.activity], this.combatStatus].filter(Boolean).join(' · ');
    this.statusEl.hidden = !label;
    this.statusEl.textContent = label || '';
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

  slash() {
    this.slashT = 0.32;
  }

  flinch() {
    this.flinchT = 0.22;
  }

  setCombat(inCombat) {
    if (this.inCombat === inCombat) return;
    this.inCombat = inCombat;
    if (inCombat) {
      if (!this.combatSword) {
        const g = new THREE.Group();
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 0.65, 0.014),
          new THREE.MeshLambertMaterial({
            color: 0xe8f4ff,
            emissive: 0x5a9be6,
            emissiveIntensity: 0.45,
            flatShading: true,
          })
        );
        blade.position.y = 0.32;
        const guard = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.024, 0.035),
          new THREE.MeshLambertMaterial({ color: 0xdfb14e, flatShading: true })
        );
        guard.position.y = 0.02;
        const grip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.018, 0.14, 6),
          new THREE.MeshLambertMaterial({ color: 0x6e2c22, flatShading: true })
        );
        grip.position.y = -0.06;
        g.add(blade, guard, grip);
        g.position.set(0, -0.22, 0.06);
        g.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
        this.combatSword = g;
      }
      this.armR.add(this.combatSword);
      this.combatSword.visible = true;
      if (this.weaponFx?.group) this.weaponFx.group.visible = false;
    } else {
      if (this.combatSword) {
        this.combatSword.visible = false;
        this.armR.remove(this.combatSword);
      }
      if (this.weaponFx?.group && this.activity !== ACTIVITY.melody) {
        this.weaponFx.group.visible = true;
      }
    }
  }

  /** Bắt đầu mờ dần khi người chơi rời đi. */
  fadeOut() {
    // Aura owns its materials and fading; exclude it from mesh cloning below.
    this.cultivationAura?.group.removeFromParent();
    this.fading = 1;
    this.root.traverse((o) => {
      // Aura owns its materials and fading; skip cloning shader materials (qiOwned) —
      // bản clone giữ uniform cũ khiến các lớp hiệu ứng không tan cùng nhân vật.
      if (o.isMesh && o !== this.halo && !o.userData.qiOwned) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.castShadow = false;
      }
    });
    if (this.aura.points) {
      this.aura.beginFade();
      this.aura.points.castShadow = false;
    }
    if (this.cultivationAura) this.root.add(this.cultivationAura.group);
  }

  update(dt, moving, cameraDist = 0) {
    this.time += dt;
    const t = this.time;
    const sit = this.activity === ACTIVITY.meditate || this.activity === ACTIVITY.melody;

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
    if (this.activity === ACTIVITY.melody) {
      armLx = -1.5; armLz = -0.15;
      armRx = -1.05; armRz = 0.3 + Math.sin(t * 3) * 0.2;
      this.instrument?.update(t);
    }
    if (this.inCombat && !moving && this.slashT <= 0 && this.activity !== ACTIVITY.melody) {
      armRx = -0.75;
      armRz = 0.25;
      armLx = -0.45;
      armLz = -0.2;
    }
    if (this.waveT > 0 && this.activity !== ACTIVITY.melody) {
      this.waveT -= dt;
      armRx = 0;
      armRz = 2.5 + Math.sin(t * 14) * 0.35;
    }
    if (this.slashT > 0 && this.activity !== ACTIVITY.melody) {
      this.slashT -= dt;
      const progress = 1 - Math.max(0, this.slashT / 0.32);
      const p = Math.sin(progress * Math.PI);
      armRx = -2.2 + progress * 1.8;
      armRz = -0.6 + progress * 1.4;
      this.body.rotation.y = p * 0.45;
      this.body.rotation.x = p * 0.2;
    } else {
      this.body.rotation.y = 0;
      this.body.rotation.x = 0;
    }
    if (this.flinchT > 0) {
      this.flinchT -= dt;
      const f = Math.sin((this.flinchT / 0.22) * Math.PI);
      this.body.rotation.x = -f * 0.35;
      this.rig.position.z = -f * 0.15;
    } else if (this.slashT <= 0) {
      this.rig.position.z = 0;
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
    if (this.aura.points) this.aura.points.visible = this.sitAmt < 0.1;
    this.cultivation.update(t, sit, this.fading > 0 ? Math.max(0, this.fading - dt / 0.9) : 1);
    this.cultivation.points.visible = this.sitAmt < 0.1 && this.effectIndex !== 0;
    if (this.aura.points) this.aura.points.visible = this.sitAmt < 0.1;
    this.cultivationAura?.update(dt, this.sitAmt, cameraDist, this.fading > 0 ? Math.max(0, this.fading - dt / 0.9) : 1);

    if (this.halo.visible) {
      const pulse = 1 + Math.sin(t * 1.05) * 0.14;
      this.halo.scale.set(pulse, 1, pulse);
    }

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.bubbleEl.hidden = true;
    }
    // Nhãn mờ dần theo khoảng cách (đậm nguyên đến 16 đơn vị, tan hẳn ở 48) để
    // nhìn người ở xa thì tên không đè lên hào quang phía trên đầu; nhãn cũng
    // tan theo khi người chơi rời đi.
    const tagAlpha = Math.min(
      this.fading > 0 ? this.fading : 1,
      Math.max(0, Math.min(1, (48 - cameraDist) / 32)),
    );
    this.label.visible = tagAlpha > 0;
    this.tagEl.style.opacity = tagAlpha < 1 ? String(tagAlpha) : '';

    if (this.fading > 0) {
      this.fading = Math.max(0, this.fading - dt / 0.9);
      this.root.traverse((o) => {
        if (o.isMesh && o !== this.halo && o.parent !== this.cultivationAura?.group && o.material.transparent && !o.material.isShaderMaterial) o.material.opacity = this.fading;
      });
      if (this.aura.points) this.aura.points.material.opacity = this.fading * 0.9;
    }
  }

  /** Dọn khi người chơi đã rời hẳn; hình học dùng chung nên chỉ huỷ vật liệu đã nhân bản. */
  dispose(scene) {
    this.cultivation.dispose();
    this.cultivationAura?.dispose();
    scene.remove(this.root);
    this.tagEl.remove();
    this.label.removeFromParent();
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.halo && o.material.transparent) o.material.dispose();
    });
    if (this.aura.points) this.aura.dispose();
    if (this.combatSword) {
      this.armR.remove(this.combatSword);
      this.combatSword.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      this.combatSword = null;
    }
  }
}
