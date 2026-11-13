// Cảnh câu cá của mọi người: giữ danh sách cần câu, vòng ngắm và nhịp sống của mặt hồ.
import * as THREE from 'three';
import { LAKE_SHADOW } from '../../../shared/fish-lake-shadows.js';
import { LAKE } from '../../../shared/layout.js';
import { CatchShows } from './fishing-catch-show.js';
import { buildLake } from './fishing-lake.js';
import { LakeShadows } from './fishing-lake-shadows.js';
import { makeRodRig, updateRodRig } from './fishing-rod-rig.js';
import { WaterEffects } from './fishing-water-effects.js';

const AIM_IDLE = 0xf0dcae;
const AIM_ON_SHADOW = 0x9be0bd;

export class FishingScene {
  constructor(scene) {
    this.group = new THREE.Group();
    this.lake = buildLake(scene);
    this.shadows = new LakeShadows(scene);
    this.effects = new WaterEffects(this.group);
    this.catches = new CatchShows(this.group, this.effects);
    this.rods = new Map(); // sid -> Group (cần + dây + phao)
    this.nextAmbient = 0;

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
      rig = makeRodRig();
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

  /** Cá của người này vừa cắn: phao quẫy cho tới khi hết lượt, cả phòng đều thấy. rarity: cỡ bóng cá dưới phao. */
  strike(sid, rarity) {
    const rig = this.rods.get(sid);
    if (!rig) return;
    rig.userData.struck = true;
    if (rarity) rig.userData.rarity = rarity;
  }

  /** Lắc cần dụ cá: ngọn cần giật nhẹ, phao gợn sóng. */
  shake(sid) {
    const rig = this.rods.get(sid);
    if (!rig?.userData.cast) return;
    rig.userData.shake = 1;
    this.effects.ripple(rig.userData.bx, rig.userData.bz, 0.6);
  }

  /** Đang giằng co: phao chạy theo cá, cần nghiêng theo tay. Giá trị trong khoảng -0,5..0,5. */
  struggle(sid, fishOffset, needleOffset) {
    const rig = this.rods.get(sid);
    if (rig) rig.userData.fight = { fishOffset, needleOffset };
  }

  /** Cá về tay: vọt khỏi nước ở chỗ phao rồi treo dưới ngọn cần của người đó. */
  showCatch(sid, fishId, rarity) {
    const data = this.rods.get(sid)?.userData;
    if (!data?.cast) return;
    const from = data.bobberAt ?? { x: data.bx, z: data.bz };
    this.catches.play({ fishId, rarity, from, tipOf: () => this.rods.get(sid)?.userData.tip ?? null });
  }

  /** Mặt hồ không bao giờ đứng yên: thỉnh thoảng một vòng sóng nhỏ từ cá ngoi lên. */
  #stirWater(dt, now) {
    this.nextAmbient -= dt;
    if (this.nextAmbient > 0) return;
    this.nextAmbient = 1.4 + Math.random() * 2.2;
    const big = this.shadows.largestFree(now);
    if (big) {
      this.effects.ripple(big.x, big.z, 1.4, 0.55); // Cá lớn làm mặt nước động: dấu hiệu để đi tìm.
      return;
    }
    const lobe = LAKE.lobes[Math.floor(Math.random() * LAKE.lobes.length)];
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * lobe.r * 0.75;
    this.effects.ripple(lobe.x + Math.sin(a) * d, lobe.z + Math.cos(a) * d, 0.8, 0.32);
  }

  update(dt, now) {
    this.shadows.update(now);
    for (const rig of this.rods.values()) if (rig.userData.anchor) updateRodRig(rig, dt, now, this.effects);
    this.#stirWater(dt, now);
    this.catches.update(dt, now);
    this.effects.update(dt);
  }
}
