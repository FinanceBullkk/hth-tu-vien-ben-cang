// Một đe trong bãi đá: tảng đá đang nằm trên đe (nứt dần, rỉ sáng qua vết nứt), búa vung, mảnh đá văng,
// và màn ngọc khi đá vỡ (stone-gem-reveal.js). Chỉ diễn, không biết luật.
import * as THREE from 'three';
import { STONE_GEMS } from '../../../shared/stone.js';
import { StoneGemReveal } from './stone-gem-reveal.js';
import { createHammer, stoneYardAssets } from './stone-yard-models.js';

const ANVIL_TOP = 0.58;
const ROCK_Y = ANVIL_TOP + 0.23;
const HAMMER_REST = 1.3; // Góc nghỉ: đầu búa giơ cao bên phải.
const HAMMER_STRIKE = 0.28; // Góc chạm: đầu búa nện xuống đỉnh đá.
const SWING_DOWN_S = 0.09;
const SWING_UP_S = 0.28;
const CHIP_COUNT = 36;
const GRAVITY = 9.8;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class StoneAnvil {
  /** @param {THREE.Object3D} parent @param {{x:number, z:number}} spot */
  constructor(parent, spot) {
    const a = stoneYardAssets();
    this.a = a;
    this.group = new THREE.Group();
    this.group.position.set(spot.x, 0, spot.z);
    parent.add(this.group);

    this.rock = new THREE.Mesh(a.rocks[0], a.rockMaterials[0]);
    this.rock.castShadow = true;
    this.veinMaterial = new THREE.MeshBasicMaterial({ map: a.crackMap, ...a.additive, opacity: 0 });
    this.veins = new THREE.Mesh(a.rocks[0], this.veinMaterial);
    this.veins.scale.setScalar(1.02);
    this.rock.add(this.veins);
    this.rock.position.y = ROCK_Y;
    this.rock.visible = false;
    this.group.add(this.rock);

    // Búa đứng chếch bên phải phía người đập, chuôi hướng vào tâm đe, để khi giơ lên không che tảng đá trước camera.
    const arm = new THREE.Group();
    arm.position.set(0.32, 0.94, 0.48);
    arm.rotation.y = Math.atan2(0.32, 0.48);
    this.pivot = new THREE.Group();
    this.pivot.rotation.x = HAMMER_REST;
    this.pivot.add(createHammer());
    this.pivot.visible = false;
    arm.add(this.pivot);
    this.group.add(arm);

    this.chips = new THREE.InstancedMesh(a.chip, a.chipMaterial, CHIP_COUNT);
    this.chips.setColorAt(0, _c.set(0xffffff)); // Tạo sẵn màu từng mảnh để shader dựng một lần.
    this.chips.count = 0;
    this.chips.frustumCulled = false;
    this.group.add(this.chips);
    this.parts = []; // { p, v, r, spin, size, life }

    this.reveal = new StoneGemReveal(this.group, a, ANVIL_TOP, ROCK_Y);

    this.kind = 0;
    this.crack = 0;
    this.flash = 0;
    this.shake = 0;
    this.swingT = -1;
    this.time = Math.random() * 10;
  }

  get busy() {
    return this.rock.visible || this.reveal.active || this.parts.length > 0;
  }

  /** Đặt một tảng loại kind lên đe, đã nứt sẵn crack (0..1) nếu vào giữa chừng. */
  place(kind, crack = 0) {
    this.kind = kind;
    this.rock.geometry = this.a.rocks[kind];
    this.veins.geometry = this.a.rocks[kind];
    this.rock.material = this.a.rockMaterials[kind];
    this.veinMaterial.color.copy(this.a.veinColors[kind]);
    this.rock.visible = true;
    this.rock.rotation.y = Math.random() * Math.PI * 2;
    this.pivot.visible = true;
    this.crack = crack;
    this.reveal.hide();
  }

  /** Búa vung xuống; impact gọi ngay khi búa chạm đá (để phát tiếng đúng lúc). */
  swing() {
    this.pivot.visible = true;
    this.swingT = 0;
  }

  /** Nhát đập trúng: đá nứt tới crack, rung, rỉ sáng, văng vài mảnh vụn. grade quyết định độ mạnh. */
  hit(crack, grade = 'good') {
    if (!this.rock.visible) this.place(this.kind, crack);
    const power = grade === 'perfect' ? 1 : grade === 'good' ? 0.7 : 0.4;
    this.crack = Math.max(this.crack, crack);
    this.flash = power;
    this.shake = 0.03 * power;
    this.#burst(Math.round(3 + power * 5), 0.6 + power, 1, this.a.rockMaterials[this.kind].color);
    if (this.swingT < 0) this.swingT = SWING_DOWN_S; // Người khác: chỉ thấy búa nảy lên sau nhát.
  }

  /** Đá vỡ ra ngọc gem: mảnh văng tứ phía, ngọc bay lên giữa quầng sáng; ngọc quý thêm cột sáng và vòng sóng. */
  shatter(kind, gem) {
    this.kind = kind;
    this.rock.visible = false;
    this.#burst(14, 2.2, 2.4, this.a.rockMaterials[kind].color);
    const info = STONE_GEMS[gem] ?? STONE_GEMS[0];
    this.reveal.show(gem, info);
    if (info.tier >= 5) this.#burst(18, 3, 1.4, _c.set(info.color));
  }

  /** Dọn đe ngay (người đập bỏ đi, hoặc snapshot không còn đá ở đây). */
  clear() {
    this.rock.visible = false;
    this.pivot.visible = false;
    this.crack = 0;
  }

  #burst(n, speed, size, color) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= CHIP_COUNT) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      const up = 0.5 + Math.random();
      this.parts.push({
        p: new THREE.Vector3((Math.random() - 0.5) * 0.2, ROCK_Y + 0.05, (Math.random() - 0.5) * 0.2),
        v: new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random() * 0.6), up * speed, Math.sin(a) * speed * (0.4 + Math.random() * 0.6)),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        spin: (Math.random() - 0.5) * 18,
        size: size * (0.6 + Math.random() * 0.7),
        color: color.clone(),
        life: 1.4 + Math.random() * 0.6,
      });
    }
  }

  update(dt) {
    this.time += dt;
    this.#updateSwing(dt);
    if (this.rock.visible) {
      this.flash = Math.max(0, this.flash - dt * 3);
      this.shake = Math.max(0, this.shake - dt * 0.25);
      const pulse = 0.08 * Math.sin(this.time * 5) * this.crack;
      this.veinMaterial.opacity = Math.min(1, this.crack * 1.15 + this.flash * 0.55 + pulse);
      this.rock.position.set((Math.random() - 0.5) * this.shake, ROCK_Y + (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.#updateParts(dt);
    this.reveal.update(dt);
  }

  #updateSwing(dt) {
    if (this.swingT < 0) return;
    this.swingT += dt;
    const t = this.swingT;
    if (t < SWING_DOWN_S) this.pivot.rotation.x = HAMMER_REST + (HAMMER_STRIKE - HAMMER_REST) * (t / SWING_DOWN_S) ** 2;
    else if (t < SWING_DOWN_S + SWING_UP_S) {
      const k = (t - SWING_DOWN_S) / SWING_UP_S;
      this.pivot.rotation.x = HAMMER_STRIKE + (HAMMER_REST - HAMMER_STRIKE) * (1 - (1 - k) ** 2);
    } else {
      this.pivot.rotation.x = HAMMER_REST;
      this.swingT = -1;
      if (!this.rock.visible) this.pivot.visible = false;
    }
  }

  #updateParts(dt) {
    let n = 0;
    this.parts = this.parts.filter((c) => (c.life -= dt) > 0);
    for (const c of this.parts) {
      if (c.p.y > 0.03) {
        c.v.y -= GRAVITY * dt;
        c.p.addScaledVector(c.v, dt);
        c.r.x += c.spin * dt;
        c.r.z += c.spin * 0.7 * dt;
        if (c.p.y < 0.03) {
          c.p.y = 0.03;
          c.v.set(0, 0, 0);
        }
      }
      const fade = Math.min(1, c.life / 0.4);
      _s.setScalar(c.size * fade);
      _m.compose(c.p, _q.setFromEuler(_e.copy(c.r)), _s);
      this.chips.setMatrixAt(n, _m);
      this.chips.setColorAt(n, c.color);
      n++;
    }
    this.chips.count = n;
    this.chips.instanceMatrix.needsUpdate = true;
    if (this.chips.instanceColor) this.chips.instanceColor.needsUpdate = true;
  }
}
