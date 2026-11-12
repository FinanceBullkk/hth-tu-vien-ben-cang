// Camera theo sau lưng: bám mượt, không xuyên tường, không vượt mái khi đứng trong nhà.
import * as THREE from 'three';
import { ROOF_ZONES, cameraSegmentT, isInsideHall } from '../../../shared/layout.js';

// Cho ngước lên bầu trời (âm: camera hạ dưới vai) và nhìn từ trên cao xuống sâu, kiểu Trove/WWM.
const MIN_PITCH = -1.3;
const MAX_PITCH = 1.25;
// Chuyển cảnh mượt khi rời màn chào hay góc máy minigame về sau lưng, tính bằng giây.
const BLEND_TIME = 0.7;
// Không có chế độ tự vòng camera về sau lưng: đi lại theo khung camera nên yaw tự đổi
// sẽ kéo hướng đi đổi theo, giữ A/D hay đi chéo là camera quay vòng mãi. Chỉ người chơi xoay yaw.
// Mái hạ dần trong khoảng này quanh mép mái, để bước vào hiên camera không rơi thẳng xuống.
const ROOF_MARGIN = 2.5;
const ROOF_SLOPE = 5;

const damp = (rate, dt) => 1 - Math.exp(-dt * rate);
const smoothstep = (t) => t * t * (3 - 2 * t);

/** Độ cao trần camera khi người chơi đứng ở (x, z): mái gần nhất, cao dần ra ngoài mép mái. */
export function roofCeiling(x, z) {
  let cap = Infinity;
  for (const zone of ROOF_ZONES) {
    const dx = Math.max(zone.minX - x, 0, x - zone.maxX);
    const dz = Math.max(zone.minZ - z, 0, z - zone.maxZ);
    if (dx > ROOF_MARGIN || dz > ROOF_MARGIN) continue;
    cap = Math.min(cap, zone.y + Math.hypot(dx, dz) * ROOF_SLOPE);
  }
  return cap;
}

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.3;
    this.targetPitch = 0.3;
    this.distance = 7.5;
    this.meditating = false;
    this.shot = null; // { pos, look }: góc máy cố định do minigame đặt.
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.minDist = 2.2;
    this.maxDist = 16;
    this.zoomDist = 7.5; // Khoảng cách đang trượt dần tới mức zoom mong muốn.
    this.currentDist = 7.5; // Sau khi đã co lại vì tường.
    this.target = new THREE.Vector3(0, 1, 36.5);
    this.look = new THREE.Vector3(0, 1, 36.5);
    this.pos = new THREE.Vector3(0, 3, 44);
    this.shakeAmt = 0;
    this.intro = true;
    this.introOffset = { x: 0, y: 0 };
    this.time = 0;
    this.forward = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._aim = new THREE.Vector3();
    this.combat = false;
    this.mode = null;
    this.blend = 0;
    this.blendPos = new THREE.Vector3();
    this.blendLook = new THREE.Vector3();
    camera.position.copy(this.pos);
  }

  shake(amount) {
    if (this.reducedMotion) return;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  setCombat(on) {
    this.combat = Boolean(on);
    this.camera.fov = on ? 62 : 58;
    this.camera.updateProjectionMatrix();
  }

  update(dt, px, py, pz, look) {
    this.time += dt;
    this.yaw += look.yaw;
    this.targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.targetPitch + look.pitch));
    this.pitch += (this.targetPitch - this.pitch) * damp(20, dt);
    // Zoom theo tỉ lệ: mỗi nấc lăn đổi cùng một phần trăm dù đang gần hay xa.
    if (look.zoom) this.distance = Math.max(this.minDist, Math.min(this.maxDist, this.distance * Math.exp(look.zoom)));

    const mode = this.intro ? 'intro' : this.shot ? 'shot' : 'orbit';
    if (mode === 'orbit' && this.mode && this.mode !== 'orbit' && !this.reducedMotion) {
      // Giữ lại góc máy cũ để trượt dần về sau lưng thay vì cắt cảnh.
      this.blend = 1;
      this.blendPos.copy(this.pos);
      this.blendLook.copy(this.look);
    }
    this.mode = mode;

    if (mode === 'intro') {
      // Màn chào: nhìn chính diện nhân vật, phía sau là cổng tu viện.
      const sway = Math.sin(this.time * 0.25) * 0.5;
      // Giữ camera trên mặt đất, chỉ nghiêng điểm nhìn để nhân vật tránh khỏi thẻ nhập tên.
      this._desired.set(px + this.introOffset.x + sway, py + 1.3, pz + 5.2);
      this.target.set(px + this.introOffset.x, py + 1.05 + this.introOffset.y, pz);
      this.#glide(dt, 3, 4);
      return;
    }

    // Góc máy cố định của minigame (đầu hồ): trôi mượt tới chỗ đặt, lắc nhẹ như người say.
    if (mode === 'shot') {
      const sway = this.reducedMotion ? 0 : 1;
      this._desired.set(this.shot.pos.x, this.shot.pos.y + Math.sin(this.time * 0.9) * 0.03 * sway, this.shot.pos.z + Math.sin(this.time * 0.6) * 0.1 * sway);
      this.target.set(this.shot.look.x, this.shot.look.y, this.shot.look.z + Math.sin(this.time * 0.43) * 0.25 * sway);
      this.#glide(dt, 4, 4);
      return;
    }

    // Nhịp sen đặt nhân vật và hoa lên nửa trên, tránh bảng phím phía dưới.
    this.target.set(px, py + (this.meditating ? -0.5 : 1.2), pz);
    this.look.lerp(this.target, damp(24, dt));

    const pitch = this.meditating ? 0.25 : this.pitch;
    const distance = this.meditating ? 5.2 : this.combat ? 5.5 : isInsideHall(px, pz) ? Math.min(this.distance, 3) : this.distance;
    // Lăn chuột, vào nhà hay vào PK đều trượt tới khoảng cách mới, không nhảy cóc.
    this.zoomDist += (distance - this.zoomDist) * damp(10, dt);
    const cosP = Math.cos(pitch);
    const dirX = Math.sin(this.yaw) * cosP;
    const dirZ = Math.cos(this.yaw) * cosP;
    const dirY = Math.sin(pitch);

    // Rút ngắn khoảng cách nếu có tường chắn giữa người chơi và camera.
    const far = this.zoomDist + 0.5;
    const t = cameraSegmentT(this.target.x, this.target.z, this.target.x + dirX * far, this.target.z + dirZ * far);
    const allowed = Math.max(0.3, t * far - 0.5);
    const wanted = Math.min(this.zoomDist, allowed);
    // Co ngay khi có tường; nội suy lúc co khiến camera xuyên tường rồi bật sang phía khác.
    // Lùi ra chậm khi vừa thoát tường, còn lùi theo zoom thì bám sát vì zoomDist đã mượt.
    this.currentDist = wanted < this.currentDist
      ? wanted
      : this.currentDist + (wanted - this.currentDist) * damp(allowed < this.zoomDist ? 3.5 : 16, dt);

    // Dưới mái: kéo camera lại gần theo đúng tia nhìn để nhân vật vẫn giữa khung,
    // thay vì chỉ hạ thấp (nhìn chúi từ chỗ thấp thì nhân vật trôi ra khỏi màn hình).
    const ceiling = roofCeiling(px, pz);
    let dist = this.currentDist;
    if (dirY > 0.05) dist = Math.min(dist, Math.max(0.8, (ceiling - this.look.y) / dirY));
    const camY = Math.max(0.55, Math.min(this.look.y + dirY * dist, ceiling));
    this.pos.set(this.look.x + dirX * dist, camY, this.look.z + dirZ * dist);
    // Nhìn theo đúng hướng yaw/pitch thay vì lookAt đầu nhân vật: khi camera bị kẹp gần đất,
    // góc máy vẫn giữ độ ngước đã kéo, không bị san phẳng.
    this._aim.set(this.pos.x - dirX * dist, this.pos.y - dirY * dist, this.pos.z - dirZ * dist);

    if (this.blend > 0) {
      this.blend = Math.max(0, this.blend - dt / BLEND_TIME);
      const w = smoothstep(this.blend);
      this.pos.lerp(this.blendPos, w);
      this._aim.lerp(this.blendLook, w);
    }

    this.camera.position.copy(this.pos);
    if (this.shakeAmt > 0.0005) {
      this.shakeAmt *= Math.exp(-dt * 3.2);
      this.camera.position.x += Math.sin(this.time * 47) * this.shakeAmt;
      this.camera.position.y += Math.sin(this.time * 61) * this.shakeAmt * 0.7;
    }
    this.camera.lookAt(this._aim);
    this.camera.getWorldDirection(this.forward);
  }

  /** Trôi pos tới _desired và điểm nhìn tới target (màn chào, góc máy minigame). */
  #glide(dt, posRate, lookRate) {
    this.pos.lerp(this._desired, damp(posRate, dt));
    this.look.lerp(this.target, damp(lookRate, dt));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    this.camera.getWorldDirection(this.forward);
  }
}
