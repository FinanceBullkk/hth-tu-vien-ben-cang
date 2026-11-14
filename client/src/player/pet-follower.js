// Một thú cưng đi theo chủ: đứng chếch sau lưng, chạy theo khi chủ đi, ngồi thở và vẫy đuôi khi chủ đứng,
// thú bay lơ lửng ngang vai. Cho ăn thì cúi đầu nhai con cá nhỏ. Hiệu ứng thân thiết nằm ở pet-bond-aura.js.
import * as THREE from 'three';
import { floorHeight } from '../../../shared/layout.js';
import { PETS } from '../../../shared/pets.js';
import { buildPet } from '../scene/pet-models.js';
import { disposeMergedMeshes } from '../scene/static-mesh-merge.js';
import { ball, glow, lambert, part, geo } from '../scene/pet-model-kit.js';
import { BondAura } from './pet-bond-aura.js';

const SNAP_DIST = 9; // Chủ dịch chuyển xa (hồi sinh, vào lại) thì thú hiện luôn cạnh chủ.
const MAX_SPEED = 8.5;
const FLY_HEIGHT = 1.45;
const EAT_SECONDS = 1.6;

const angleLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

function fishSnack() {
  const g = new THREE.Group();
  g.add(ball(lambert(0x7fb8d8), [0, 0, 0], 0.05, [0.5, 0.8, 1.4], 8));
  g.add(part(geo.cone(4), lambert(0x5d97b8), [0, 0, -0.08], [0.04, 0.05, 0.015], [Math.PI / 2, 0, 0]));
  g.add(ball(glow(0xffffff, 0.6), [0, 0.02, 0.04], 0.012, [1, 1, 1], 6));
  return g;
}

export class PetFollower {
  constructor(scene, kind, tier = 0) {
    this.scene = scene;
    this.kind = kind;
    this.model = buildPet(kind);
    this.root = this.model.root;
    this.root.visible = false; // hiện ở khung đầu tiên có vị trí chủ
    this.aura = new BondAura(PETS[kind]?.color ?? '#ffffff', this.model.height, this.model.fly);
    this.root.add(this.aura.group);
    this.aura.setTier(tier);
    this.snack = fishSnack();
    this.snack.visible = false;
    this.root.add(this.snack);
    scene.add(this.root);
    this.side = Math.random() < 0.5 ? -1 : 1; // đứng bên trái hay phải chủ
    this.t = Math.random() * 10;
    this.placed = false;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rot = 0;
    this.speed = 0;
    this.moving = false;
    this.stride = 0;
    this.eat = 0;
    this.happy = 0;
  }

  setTier(tier) {
    this.aura.setTier(tier);
  }

  /** Bắt đầu hoạt cảnh ăn cá. */
  feed() {
    this.eat = EAT_SECONDS;
  }

  /** Được vuốt ve: nhảy cẫng một cái, nghiêng đầu. */
  cheer() {
    this.happy = 0.8;
  }

  /** Vị trí giữa thân thú, để bắn tim hay bấm vào. */
  center(out) {
    return out.set(this.x, this.y + this.model.height * 0.6, this.z);
  }

  /**
   * owner: { x, y, z, rot } của chủ trong khung này; visible: chủ ở đủ gần để vẽ chi tiết.
   */
  update(dt, owner, visible) {
    this.root.visible = visible;
    if (!visible) {
      this.placed = false; // xa quá thì khi lại gần đặt lại cạnh chủ, khỏi thấy thú chạy băng qua sân
      return;
    }
    this.t += dt;
    const { model } = this;
    const fwdX = Math.sin(owner.rot);
    const fwdZ = Math.cos(owner.rot);
    const back = model.fly ? 0.35 : 0.62;
    const side = model.fly ? 0.55 : 0.72;
    // Trục phải của chủ là (cos, -sin) với hướng mặt (sin, cos).
    const tx = owner.x + fwdZ * side * this.side - fwdX * back;
    const tz = owner.z - fwdX * side * this.side - fwdZ * back;
    let dx = tx - this.x;
    let dz = tz - this.z;
    let dist = Math.hypot(dx, dz);
    if (!this.placed || dist > SNAP_DIST) {
      this.x = tx;
      this.z = tz;
      this.rot = owner.rot;
      this.y = model.fly ? owner.y + FLY_HEIGHT : floorHeight(tx, tz);
      this.placed = true;
      dx = dz = dist = 0;
    }
    // Chạy nhanh khi xa, chậm dần khi tới gần; có ngưỡng trễ để không giật đi giật lại.
    this.moving = this.moving ? dist > 0.12 : dist > 0.35;
    const want = this.moving ? Math.min(MAX_SPEED, dist * 3.4 + 0.6) : 0;
    this.speed += (want - this.speed) * Math.min(1, dt * 8);
    if (dist > 1e-4) {
      const step = Math.min(dist, this.speed * dt);
      this.x += (dx / dist) * step;
      this.z += (dz / dist) * step;
    }
    const face = this.moving && dist > 0.05 ? Math.atan2(dx, dz) : owner.rot + Math.sin(this.t * 0.4) * 0.35;
    this.rot = angleLerp(this.rot, face, Math.min(1, dt * (this.moving ? 10 : 2.5)));
    const groundY = model.fly ? owner.y + FLY_HEIGHT + Math.sin(this.t * 2) * 0.06 : floorHeight(this.x, this.z);
    this.y += (groundY - this.y) * Math.min(1, dt * 10);
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.rot;
    this.#animate(dt);
  }

  /** Đứng yên tại gốc toạ độ, chỉ chạy cử động chờ: dùng cho ô xem thú trong bảng thú cưng. */
  idle(dt) {
    this.t += dt;
    this.speed = 0;
    this.moving = false;
    this.root.visible = true;
    this.root.position.set(0, this.model.fly ? 0.18 : 0, 0);
    this.#animate(dt);
  }

  #animate(dt) {
    const { model, t } = this;
    const run = Math.min(1, this.speed / 3);
    this.stride += dt * (6 + this.speed * 2.2);
    const body = model.body;
    if (model.fly) {
      const flap = Math.sin(t * (this.moving ? 11 : 6)) * (this.moving ? 0.7 : 0.4);
      model.wings.forEach((w, i) => { w.rotation.z = (i === 0 ? 1 : -1) * flap; });
      body.rotation.x = run * 0.25;
      body.position.y = 0; // đặt lại mỗi khung, để cú nảy khi được vuốt ve không cộng dồn
    } else if (model.hop) {
      body.position.y = this.moving ? Math.abs(Math.sin(this.stride * 0.6)) * 0.09 : 0;
      body.scale.set(1, 1 + Math.sin(t * 2.4) * 0.02, 1);
    } else {
      body.position.y = Math.abs(Math.sin(this.stride)) * 0.035 * run;
      body.rotation.z = Math.sin(this.stride) * 0.08 * run;
      body.scale.set(1, 1 + Math.sin(t * 2.4) * 0.025 * (1 - run), 1);
    }
    if (this.happy > 0) {
      this.happy = Math.max(0, this.happy - dt);
      body.position.y += Math.sin((1 - this.happy / 0.8) * Math.PI) * 0.1;
    }
    if (model.head) {
      model.head.position.y = model.head.userData.baseY ??= model.head.position.y;
      model.head.position.y += body.position.y;
      let nod = Math.sin(t * 0.9) * 0.08;
      if (this.eat > 0) {
        this.eat -= dt;
        nod = 0.35 + Math.sin(this.eat * 14) * 0.25;
      }
      model.head.rotation.x = nod;
      model.head.rotation.z = Math.sin(t * 0.55) * 0.12 * (1 - run) + (this.happy > 0 ? 0.3 : 0);
    }
    if (model.tail) model.tail.rotation.y = Math.sin(t * (this.moving ? 14 : 4)) * (this.moving ? 0.5 : 0.3);
    // Con cá nhỏ trước miệng nhỏ dần trong lúc nhai.
    this.snack.visible = this.eat > 0;
    if (this.eat > 0) {
      const k = this.eat / EAT_SECONDS;
      this.snack.position.set(0, model.fly ? -0.05 : 0.05, model.height * 0.55);
      this.snack.scale.setScalar(Math.max(0.05, k));
      this.snack.rotation.y = t * 3;
    }
    for (const fx of model.fx) fx(t, this.moving);
    this.aura.update(t);
  }

  /** Gỡ khỏi cảnh và giải phóng geometry riêng của thú này (geometry gốc và vật liệu dùng chung thì giữ). */
  dispose() {
    this.root.removeFromParent();
    disposeMergedMeshes(this.root);
    this.aura.dispose();
  }
}
