// Hoạt cảnh câu cá của mọi người: cần tre, dây, phao, gợn sóng, nước văng và vòng ngắm trên mặt hồ.
import * as THREE from 'three';
import { LAKE_SHADOW } from '../../../shared/fish-lake-shadows.js';
import { LAKE, lakeDistance } from '../../../shared/layout.js';
import { glowTexture } from './builders.js';
import { buildLake } from './fishing-lake.js';
import { LakeShadows } from './fishing-lake-shadows.js';

const RIG_Y = 0.04; // mặt sân
const ROD_TILT = 0.7; // ngọn cần chúc ra phía nước
const ROD_LEN = 2.6;
const HAND = { forward: 0.25, y: 1.05 }; // chỗ tay cầm, tính từ chân người câu
const TIP = { forward: Math.sin(ROD_TILT) * ROD_LEN, y: Math.cos(ROD_TILT) * ROD_LEN };
const CAST_FLIGHT_S = 0.55;
const AIM_IDLE = 0xf0dcae;
const AIM_ON_SHADOW = 0x9be0bd;

export class FishingScene {
  constructor(scene) {
    this.group = new THREE.Group();
    this.lake = buildLake(scene);
    this.shadows = new LakeShadows(scene);
    this.rods = new Map(); // sid -> Group (cần + dây + phao)
    this.ripples = [];
    this.splashes = [];
    this.tex = glowTexture();
    this.nextAmbient = 0;

    this.rodGeo = new THREE.CylinderGeometry(0.012, 0.03, ROD_LEN, 5);
    this.rodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3c, flatShading: true });
    this.lineMat = new THREE.LineBasicMaterial({ color: 0xf5eeda, transparent: true, opacity: 0.55 });
    this.bobberGeo = new THREE.SphereGeometry(0.09, 8, 6);
    this.bobberMat = new THREE.MeshLambertMaterial({ color: 0xd94f35, emissive: 0x7a1f10, flatShading: true });
    this.rippleGeo = new THREE.RingGeometry(0.16, 0.26, 20);

    // Vòng ngắm chỉ máy của người đang câu thấy: bán kính đúng tầm phao bắt được bóng.
    this.aimRing = new THREE.Mesh(
      new THREE.RingGeometry(LAKE_SHADOW.catchRadius - 0.05, LAKE_SHADOW.catchRadius, 48),
      new THREE.MeshBasicMaterial({ color: AIM_IDLE, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.aimRing.rotation.x = -Math.PI / 2;
    this.aimRing.position.y = LAKE.y + 0.03;
    this.aimRing.renderOrder = 2;
    this.aimRing.visible = false;
    scene.add(this.aimRing, this.group);

    this.waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAKE.y);
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.hit = new THREE.Vector3();
  }

  /** Điểm trên mặt phẳng nước dưới vị trí chạm trên màn hình; null khi chạm lên trời. */
  waterPoint(clientX, clientY, camera) {
    this.ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    return this.raycaster.ray.intersectPlane(this.waterPlane, this.hit) ? { x: this.hit.x, z: this.hit.z } : null;
  }

  /** Đặt vòng ngắm. Trả về bóng đang nằm trong vòng, nếu có. null là tắt vòng. */
  setAim(spot, now) {
    this.aimRing.visible = Boolean(spot);
    if (!spot) return null;
    this.aimRing.position.x = spot.bx;
    this.aimRing.position.z = spot.bz;
    const shadow = this.shadows.near(now, spot.bx, spot.bz);
    this.aimRing.material.color.setHex(shadow ? AIM_ON_SHADOW : AIM_IDLE);
    this.aimRing.material.opacity = shadow ? 0.9 : 0.5;
    return shadow;
  }

  /** Bật/tắt bộ cần câu của một người. Có bx, bz là đã quăng; không có thì chỉ cầm cần trên tay. */
  setRod(sid, { x, z, on, bx, bz }) {
    let rig = this.rods.get(sid);
    if (!on) {
      if (rig) {
        this.group.remove(rig);
        rig.getObjectByName('line').geometry.dispose();
        this.rods.delete(sid);
      }
      return;
    }
    if (!rig) {
      rig = this.#makeRig();
      this.group.add(rig);
      this.rods.set(sid, rig);
    }
    const data = rig.userData;
    data.anchor = { x, z };
    // Cần luôn chĩa ra phía phao; chưa quăng thì chĩa về tâm hồ.
    const tx = bx ?? LAKE.x;
    const tz = bz ?? LAKE.z;
    const len = Math.hypot(tx - x, tz - z) || 1;
    data.dirX = (tx - x) / len;
    data.dirZ = (tz - z) / len;
    data.fight = null;
    data.struck = false;
    if (bx == null) {
      data.cast = false;
      return;
    }
    if (!data.cast) data.castT = 0;
    Object.assign(data, { cast: true, bx, bz });
  }

  #makeRig() {
    const rig = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.name = 'pivot';
    const rod = new THREE.Mesh(this.rodGeo, this.rodMat);
    rod.position.set(Math.sin(ROD_TILT) * (ROD_LEN / 2), Math.cos(ROD_TILT) * (ROD_LEN / 2), 0);
    rod.rotation.z = -ROD_TILT;
    pivot.add(rod);
    // Mỗi người một dây riêng: dùng chung geometry thì mọi dây sẽ trùng nhau.
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lineGeo, this.lineMat);
    line.name = 'line';
    line.frustumCulled = false;
    const bobber = new THREE.Mesh(this.bobberGeo, this.bobberMat);
    bobber.name = 'bobber';
    rig.add(pivot, line, bobber);
    Object.assign(rig.userData, { dip: 0, shake: 0, cast: false, castT: 1, fight: null, struck: false, dirX: 1, dirZ: 0 });
    return rig;
  }

  /** Cá của người này vừa cắn: phao quẫy cho tới khi hết lượt, cả phòng đều thấy. */
  strike(sid) {
    const rig = this.rods.get(sid);
    if (rig) rig.userData.struck = true;
  }

  /** Lắc cần dụ cá: ngọn cần giật nhẹ, phao gợn sóng. */
  shake(sid) {
    const rig = this.rods.get(sid);
    if (!rig?.userData.cast) return;
    rig.userData.shake = 1;
    this.ripple(rig.userData.bx, rig.userData.bz, 0.6);
  }

  /** Đang giằng co: phao chạy theo cá, cần nghiêng theo tay. Giá trị trong khoảng -0,5..0,5. */
  struggle(sid, fishOffset, needleOffset) {
    const rig = this.rods.get(sid);
    if (rig) rig.userData.fight = { fishOffset, needleOffset };
  }

  splashAtBobber(sid) {
    const data = this.rods.get(sid)?.userData;
    if (data?.cast) this.splash(data.bx, data.bz);
  }

  ripple(x, z, scale = 1, opacity = 0.7) {
    const mesh = new THREE.Mesh(
      this.rippleGeo,
      new THREE.MeshBasicMaterial({ color: 0xd8ecf2, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, LAKE.y + 0.02, z);
    mesh.userData = { t: 0, scale, opacity };
    this.group.add(mesh);
    this.ripples.push(mesh);
    if (this.ripples.length > 18) this.#drop(this.ripples.shift());
  }

  #drop(obj) {
    this.group.remove(obj);
    obj.material.dispose();
  }

  splash(x, z) {
    this.ripple(x, z, 1.6);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color: 0xcfeaf2, transparent: true, opacity: 0.9, depthWrite: false }));
    sprite.scale.set(0.7, 0.7, 1);
    sprite.position.set(x, LAKE.y + 0.35, z);
    sprite.userData = { t: 0 };
    this.group.add(sprite);
    this.splashes.push(sprite);
  }

  #updateRig(rig, dt, now) {
    const data = rig.userData;
    rig.position.set(data.anchor.x, RIG_Y, data.anchor.z);
    const line = rig.getObjectByName('line');
    const bobber = rig.getObjectByName('bobber');
    const pivot = rig.getObjectByName('pivot');
    line.visible = data.cast;
    bobber.visible = data.cast;

    // Người khác không có số liệu giằng co thật: dựng dao động giả đủ để thấy họ đang vật lộn.
    const fighting = data.fight || data.struck;
    const fishOffset = data.fight?.fishOffset ?? (data.struck ? Math.sin(now * 0.0017) * 0.3 : 0);
    const needleOffset = data.fight?.needleOffset ?? (data.struck ? Math.sin(now * 0.0013) * 0.3 : 0);

    data.shake = Math.max(0, data.shake - dt * 3);
    const baseYaw = Math.atan2(-data.dirZ, data.dirX);
    const wantYaw = baseYaw - needleOffset * 0.9;
    let yawDelta = wantYaw - pivot.rotation.y;
    yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    pivot.rotation.y += yawDelta * Math.min(1, dt * 12);
    pivot.rotation.z = Math.sin(now * 0.03) * data.shake * 0.09 - (fighting ? 0.1 : 0);
    pivot.position.set(data.dirX * HAND.forward, HAND.y, data.dirZ * HAND.forward);
    if (!data.cast) return;

    const tipX = pivot.position.x + TIP.forward * Math.cos(pivot.rotation.y);
    const tipY = HAND.y + TIP.y;
    const tipZ = pivot.position.z - TIP.forward * Math.sin(pivot.rotation.y);

    // Phao chạy ngang theo cá nhưng không bao giờ lên bờ.
    let bx = data.bx;
    let bz = data.bz;
    if (fighting) {
      const sideX = data.bx - data.dirZ * fishOffset * 2.6;
      const sideZ = data.bz + data.dirX * fishOffset * 2.6;
      if (lakeDistance(sideX, sideZ) < -0.3) {
        bx = sideX;
        bz = sideZ;
      }
      if (Math.random() < dt * 2) this.splash(bx, bz);
    }
    data.dip = fighting ? 0.55 + Math.sin(now * 0.02) * 0.3 : Math.max(0, data.dip - dt * 2.4);
    const bobY = LAKE.y + 0.05 + Math.sin(now * 0.002 + bx) * 0.02 - data.dip * 0.06;

    // Phao bay vòng cung từ ngọn cần xuống nước rồi mới đậu.
    let px = bx - data.anchor.x;
    let py = bobY - RIG_Y;
    let pz = bz - data.anchor.z;
    if (data.castT < 1) {
      data.castT = Math.min(1, data.castT + dt / CAST_FLIGHT_S);
      const k = data.castT;
      px = tipX + (px - tipX) * k;
      pz = tipZ + (pz - tipZ) * k;
      py = tipY + (py - tipY) * k + Math.sin(k * Math.PI) * 1.3;
      if (data.castT === 1) this.ripple(bx, bz, 1);
    }
    bobber.position.set(px, py, pz);
    const pos = line.geometry.attributes.position;
    pos.setXYZ(0, tipX, tipY, tipZ);
    pos.setXYZ(1, px, py + 0.09, pz);
    pos.needsUpdate = true;
  }

  update(dt, now) {
    this.shadows.update(now);
    for (const rig of this.rods.values()) if (rig.userData.anchor) this.#updateRig(rig, dt, now);

    // Mặt hồ không bao giờ đứng yên: thỉnh thoảng một vòng sóng nhỏ từ cá ngoi lên.
    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0) {
      this.nextAmbient = 1.4 + Math.random() * 2.2;
      const big = this.shadows.largestFree(now);
      if (big) {
        this.ripple(big.x, big.z, 1.4, 0.55); // Cá lớn làm mặt nước động: dấu hiệu để đi tìm.
      } else {
        const lobe = LAKE.lobes[Math.floor(Math.random() * LAKE.lobes.length)];
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * lobe.r * 0.75;
        this.ripple(lobe.x + Math.sin(a) * d, lobe.z + Math.cos(a) * d, 0.8, 0.32);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.userData.t += dt;
      const t = r.userData.t / 1.8;
      if (t >= 1) { this.#drop(r); this.ripples.splice(i, 1); continue; }
      r.scale.setScalar(1 + t * 3 * r.userData.scale);
      r.material.opacity = r.userData.opacity * (1 - t);
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.userData.t += dt;
      const t = s.userData.t / 0.8;
      if (t >= 1) { this.#drop(s); this.splashes.splice(i, 1); continue; }
      s.position.y += dt * 0.8;
      s.material.opacity = 0.9 * (1 - t);
    }
  }
}
