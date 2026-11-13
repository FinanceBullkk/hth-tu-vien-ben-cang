// Camera theo sau lưng kiểu spring arm: quỹ đạo yaw/pitch quanh đầu nhân vật, zoom trượt,
// quét cầu 3D để co lại khi tường/mái chắn (co ngay, giãn ra từ từ). Vật thấp/mảnh không chặn.
import * as THREE from 'three';
import { isInsideHall } from '../../../shared/layout.js';
import { cameraProbe } from '../../../shared/camera-colliders.js';

// Ngước lên trời kiểu Genshin/WWM: pitch âm hạ tay đòn, camera trượt sát đất về phía chân.
// Tay đòn dừng hạ ở ORBIT_MIN_PITCH; ngước thêm chỉ nghiêng ống kính lên trời (tối đa MAX_SKY_TILT,
// nhỏ hơn nửa góc nhìn dọc 29° để đầu nhân vật vẫn còn ở mép dưới khung).
const ORBIT_MIN_PITCH = -0.5;
const MAX_SKY_TILT = 0.42;
const MIN_PITCH = ORBIT_MIN_PITCH - MAX_SKY_TILT;
const MAX_PITCH = 1.25;
// Camera luôn cao hơn nền chỗ nhân vật đứng chừng này.
const GROUND_CLEARANCE = 0.3;
// Chuyển cảnh mượt khi rời màn chào hay góc máy minigame về sau lưng, tính bằng giây.
const BLEND_TIME = 0.7;
// Không có chế độ tự vòng camera về sau lưng: đi lại theo khung camera nên yaw tự đổi
// sẽ kéo hướng đi đổi theo, giữ A/D hay đi chéo là camera quay vòng mãi. Chỉ người chơi xoay yaw.
// Camera không bao giờ co gần hơn chừng này dù bị chắn (tránh chui vào đầu nhân vật).
const MIN_ARM = 0.6;
// Tốc độ giãn ra khi hết bị chắn: chậm để không bật qua lại khi quét ngang mép tường.
const RECOVER_RATE = 5;

const damp = (rate, dt) => 1 - Math.exp(-dt * rate);
const smoothstep = (t) => t * t * (3 - 2 * t);

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.3;
    this.targetPitch = 0.3;
    this.distance = 7.5;
    this.meditating = false;
    this.shot = null; // { pos, look, sway? }: góc máy cố định do minigame đặt; sway (mặc định 1) là độ lắc nhẹ.
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
      const sway = this.reducedMotion ? 0 : (this.shot.sway ?? 1);
      this._desired.set(this.shot.pos.x, this.shot.pos.y + Math.sin(this.time * 0.9) * 0.03 * sway, this.shot.pos.z + Math.sin(this.time * 0.6) * 0.1 * sway);
      this.target.set(this.shot.look.x, this.shot.look.y, this.shot.look.z + Math.sin(this.time * 0.43) * 0.25 * sway);
      this.#glide(dt, 4, 4);
      return;
    }

    // Nhịp sen đặt nhân vật và hoa lên nửa trên, tránh bảng phím phía dưới.
    this.target.set(px, py + (this.meditating ? -0.5 : 1.2), pz);
    this.look.lerp(this.target, damp(24, dt));

    const viewPitch = this.meditating ? 0.25 : this.pitch;
    // Tay đòn không hạ quá ORBIT_MIN_PITCH; phần ngước thêm thành độ nghiêng ống kính lên trời.
    const pitch = Math.max(viewPitch, ORBIT_MIN_PITCH);
    const skyTilt = pitch - viewPitch;
    const distance = this.meditating ? 5.2 : this.combat ? 5.5 : isInsideHall(px, pz) ? Math.min(this.distance, 3) : this.distance;
    // Lăn chuột, vào nhà hay vào PK đều trượt tới khoảng cách mới, không nhảy cóc.
    this.zoomDist += (distance - this.zoomDist) * damp(10, dt);
    const cosP = Math.cos(pitch);
    const dirX = Math.sin(this.yaw) * cosP;
    const dirZ = Math.cos(this.yaw) * cosP;
    const dirY = Math.sin(pitch);

    // Spring arm: quét cầu 3D từ điểm xoay ra sau, tường/mái chắn thì tay đòn ngắn lại.
    const safe = Math.max(MIN_ARM, cameraProbe(this.look.x, this.look.y, this.look.z, dirX, dirY, dirZ, this.zoomDist));
    const blocked = safe < this.zoomDist - 1e-3;
    // Co ngay để không bao giờ thấy xuyên tường; giãn ra từ từ khi vừa thoát vật chắn,
    // còn khi không bị chắn thì bám zoomDist (đã mượt sẵn).
    this.currentDist = safe < this.currentDist
      ? safe
      : this.currentDist + (safe - this.currentDist) * damp(blocked ? RECOVER_RATE : 16, dt);

    this.#placeOnArm(py, pitch, skyTilt);

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

  /**
   * Đặt camera ở cuối tay đòn và điểm nhìn _aim.
   * Ngước lên tới lúc tay đòn chạm đất (pitch = contact) thì camera bám mặt đất, tiến đều về phía
   * chân theo pitch tới ORBIT_MIN_PITCH, vẫn nhìn vào đầu nhân vật. Cách cũ kẹp độ cao mà giữ khoảng
   * cách: ngước một chút là nhân vật rơi khỏi khung. Tay đòn co đúng theo tia (chỗ chạm hyperbol)
   * thì lại giật mạnh lúc vừa chạm đất khi zoom xa, nên co theo tỉ lệ giữa hai đầu.
   */
  #placeOnArm(py, pitch, skyTilt) {
    const arm = this.currentDist;
    const groundY = py + GROUND_CLEARANCE;
    const h = this.look.y - groundY;
    const contact = h > 0 && h < arm ? -Math.asin(h / arm) : -Infinity;
    let horiz;
    let camY;
    if (pitch < contact && contact > ORBIT_MIN_PITCH) {
      const t = (pitch - contact) / (ORBIT_MIN_PITCH - contact);
      const start = arm * Math.cos(contact);
      const end = Math.min(start, h / Math.tan(-ORBIT_MIN_PITCH));
      // Co theo tỉ lệ (hình học): góc ngước tăng đều hơn co tuyến tính (tuyến tính dồn gần hết
      // độ ngước vào cuối hành trình), mà không giật như co đúng theo tia.
      horiz = start * Math.pow(end / start, t);
      camY = groundY;
    } else {
      horiz = arm * Math.cos(pitch);
      camY = Math.max(groundY, this.look.y + Math.sin(pitch) * arm);
    }
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    this.pos.set(this.look.x + sinYaw * horiz, camY, this.look.z + cosYaw * horiz);
    // Nhìn về phía đầu nhân vật, nâng thêm skyTilt khi đã ngước quá giới hạn tay đòn.
    const elevation = Math.atan2(this.look.y - camY, horiz) + skyTilt;
    const reach = Math.max(1, horiz);
    this._aim.set(
      this.pos.x - sinYaw * Math.cos(elevation) * reach,
      this.pos.y + Math.sin(elevation) * reach,
      this.pos.z - cosYaw * Math.cos(elevation) * reach,
    );
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
