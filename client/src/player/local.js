// Người chơi trên máy này: đi lại ngay lập tức, va chạm, gửi vị trí lên server 20 lần/giây.
import { PLAYER_RADIUS, SPAWN, floorHeight, resolveCollision } from '../../../shared/layout.js';
import { MOTION } from '../../../shared/protocol.js';
import { Avatar } from './avatar.js';

const SPEED = 4.3;
const SEND_INTERVAL = 1 / MOTION.sendHz;

export class LocalPlayer {
  constructor(scene, profile, lowQuality = false) {
    this.scene = scene;
    this.x = SPAWN.x;
    this.z = SPAWN.z;
    this.y = 0.04;
    this.rot = 0; // Màn chào quay mặt ra phía camera.
    this.moving = false;
    this.locked = true;
    this.sendTimer = 0;
    this.lastSent = '';
    this.lastSentAnim = 0;
    this.avatar = new Avatar({
      name: profile.name || '',
      color: profile.color,
      hair: profile.hair ?? (profile.hat <= 2 ? profile.hat : 0),
      hat: profile.hat,
      attire: profile.attire ?? 0,
      weapon: profile.weapon ?? 0,
      effect: profile.effect ?? 0,
      lowQuality,
      isLocal: true,
    });
    this.avatar.nameEl.hidden = true;
    this.avatar.root.position.set(this.x, this.y, this.z);
    this.avatar.root.rotation.y = this.rot;
    scene.add(this.avatar.root);
    this._mv = { x: 0, y: 0 };
    this._out = { x: 0, z: 0 };
  }

  placeAt(x, z, rot) {
    this.x = x;
    this.z = z;
    if (Number.isFinite(rot)) this.rot = rot;
    this.avatar.root.position.x = x;
    this.avatar.root.position.z = z;
    if (Number.isFinite(rot)) this.avatar.root.rotation.y = rot;
  }

  update(dt, input, yaw, net) {
    let moving = false;
    if (!this.locked) {
      input.moveVector(this._mv);
      const mx = this._mv.x;
      const my = this._mv.y;
      if (mx !== 0 || my !== 0) {
        // Góc nhìn: tiến tới là hướng từ camera vào người chơi.
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const wx = mx * cos - my * sin;
        const wz = -mx * sin - my * cos;
        const nx = this.x + wx * SPEED * dt;
        const nz = this.z + wz * SPEED * dt;
        resolveCollision(nx, nz, PLAYER_RADIUS, this._out);
        this.x = this._out.x;
        this.z = this._out.z;
        const target = Math.atan2(wx, wz);
        const turn = Math.atan2(Math.sin(target - this.rot), Math.cos(target - this.rot));
        this.rot += turn * (1 - Math.exp(-dt * 12));
        moving = true;
      }
      if (input.pointerLocked && !moving) {
        const facing = yaw + Math.PI;
        const turn = Math.atan2(Math.sin(facing - this.rot), Math.cos(facing - this.rot));
        this.rot += turn * (1 - Math.exp(-dt * 20));
      }
    }
    this.moving = moving;

    const floorY = floorHeight(this.x, this.z);
    this.y += (floorY - this.y) * Math.min(1, dt * 12);
    const root = this.avatar.root;
    root.position.set(this.x, this.y, this.z);
    root.rotation.y = this.rot;
    this.avatar.update(dt, moving, 0);

    this.sendTimer += dt;
    if (net.ready && this.sendTimer >= SEND_INTERVAL) {
      this.sendTimer %= SEND_INTERVAL; // Giữ phần dư để nhịp gửi không trôi theo tốc độ khung hình.
      const anim = moving ? 1 : 0;
      const key = `${this.x.toFixed(2)}|${this.z.toFixed(2)}|${this.rot.toFixed(2)}|${anim}`;
      if (key !== this.lastSent) {
        this.lastSent = key;
        // Gói đổi đi/đứng không được rơi, nếu không người khác thấy mình đi tại chỗ tới gói đủ kế tiếp.
        const sender = anim !== this.lastSentAnim ? net.socket : net.socket.volatile;
        this.lastSentAnim = anim;
        sender.emit('move', [this.x, this.z, this.rot, anim, Math.round(net.now())]);
      }
    }
  }
}
