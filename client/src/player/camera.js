// Camera theo sau lưng: bám mượt, không xuyên tường, không vượt mái khi đứng trong nhà.
import * as THREE from 'three';
import { ROOF_ZONES, cameraSegmentT, inBox, isInsideHall } from '../../../shared/layout.js';

// Cho ngước lên bầu trời (âm: camera hạ dưới vai) và nhìn từ trên cao xuống sâu, kiểu Trove/WWM.
const MIN_PITCH = -1.3;
const MAX_PITCH = 1.25;

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
    this.minDist = 3.2;
    this.maxDist = 16;
    this.currentDist = 7.5;
    this.target = new THREE.Vector3(0, 1, 36.5);
    this.look = new THREE.Vector3(0, 1, 36.5);
    this.pos = new THREE.Vector3(0, 3, 44);
    this.shakeAmt = 0;
    this.intro = true;
    this.introOffset = { x: 0, y: 0 };
    this.time = 0;
    this.forward = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this.combat = false;
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
    this.pitch += (this.targetPitch - this.pitch) * (1 - Math.exp(-dt * 20));
    this.distance = Math.max(this.minDist, Math.min(this.maxDist, this.distance + look.zoom));

    if (this.intro) {
      // Màn chào: nhìn chính diện nhân vật, phía sau là cổng tu viện.
      const sway = Math.sin(this.time * 0.25) * 0.5;
      // Giữ camera trên mặt đất, chỉ nghiêng điểm nhìn để nhân vật tránh khỏi thẻ nhập tên.
      this._desired.set(px + this.introOffset.x + sway, py + 1.3, pz + 5.2);
      this.pos.lerp(this._desired, 1 - Math.exp(-dt * 3));
      this.target.set(px + this.introOffset.x, py + 1.05 + this.introOffset.y, pz);
      this.look.lerp(this.target, 1 - Math.exp(-dt * 4));
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.look);
      this.camera.getWorldDirection(this.forward);
      return;
    }

    // Góc máy cố định của minigame (đầu hồ): trôi mượt tới chỗ đặt, lắc nhẹ như người say.
    if (this.shot) {
      const sway = this.reducedMotion ? 0 : 1;
      this._desired.set(this.shot.pos.x, this.shot.pos.y + Math.sin(this.time * 0.9) * 0.03 * sway, this.shot.pos.z + Math.sin(this.time * 0.6) * 0.1 * sway);
      this.pos.lerp(this._desired, 1 - Math.exp(-dt * 4));
      this.target.set(this.shot.look.x, this.shot.look.y, this.shot.look.z + Math.sin(this.time * 0.43) * 0.25 * sway);
      this.look.lerp(this.target, 1 - Math.exp(-dt * 4));
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.look);
      this.camera.getWorldDirection(this.forward);
      return;
    }

    // Nhịp sen đặt nhân vật và hoa lên nửa trên, tránh bảng phím phía dưới.
    this.target.set(px, py + (this.meditating ? -0.5 : 1.2), pz);
    this.look.lerp(this.target, 1 - Math.exp(-dt * 24));

    const pitch = this.meditating ? 0.25 : this.pitch;
    const distance = this.meditating ? 5.2 : this.combat ? 5.5 : isInsideHall(px, pz) ? Math.min(this.distance, 3) : this.distance;
    const cosP = Math.cos(pitch);
    const dirX = Math.sin(this.yaw) * cosP;
    const dirZ = Math.cos(this.yaw) * cosP;
    const dirY = Math.sin(pitch);

    // Rút ngắn khoảng cách nếu có tường chắn giữa người chơi và camera.
    const far = distance + 0.5;
    const t = cameraSegmentT(this.target.x, this.target.z, this.target.x + dirX * far, this.target.z + dirZ * far);
    const allowed = Math.max(0.3, t * far - 0.5);
    const wanted = Math.min(distance, allowed);
    // Co ngay khi có tường; nội suy lúc co khiến camera xuyên tường rồi bật sang phía khác.
    this.currentDist = wanted < this.currentDist
      ? wanted
      : this.currentDist + (wanted - this.currentDist) * (1 - Math.exp(-dt * 3.5));

    let camY = this.look.y + dirY * this.currentDist;
    for (const zone of ROOF_ZONES) {
      if (inBox(px, pz, zone)) {
        camY = Math.min(camY, zone.y);
        break;
      }
    }
    camY = Math.max(0.55, camY);

    this.pos.set(this.look.x + dirX * this.currentDist, camY, this.look.z + dirZ * this.currentDist);
    this.camera.position.copy(this.pos);

    if (this.shakeAmt > 0.0005) {
      this.shakeAmt *= Math.exp(-dt * 3.2);
      this.camera.position.x += Math.sin(this.time * 47) * this.shakeAmt;
      this.camera.position.y += Math.sin(this.time * 61) * this.shakeAmt * 0.7;
    }
    // Nhìn theo đúng hướng yaw/pitch thay vì lookAt đầu nhân vật: khi camera bị kẹp gần đất
    // hay dưới mái, góc máy vẫn giữ độ ngước/chúi đã kéo, không bị san phẳng.
    this.camera.lookAt(this.pos.x - dirX, this.pos.y - dirY, this.pos.z - dirZ);
    this.camera.getWorldDirection(this.forward);
  }
}
