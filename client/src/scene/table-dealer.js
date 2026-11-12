// Nhà cái NPC của các bàn đỏ đen (bầu cua, xì dách): đứng ở mép bàn, quay mặt về phía khách, hô câu hợp cảnh
// và đổi tư thế tay theo việc đang làm. Chỉ diễn theo trạng thái server gửi; không có luật hay số liệu nào ở đây.
import { floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';

export const pickLine = (list) => list[Math.floor(Math.random() * list.length)];

export class TableDealer {
  /**
   * @param {THREE.Scene} scene
   * @param {{ spot: {x:number,z:number,rot:number}, name: string, look: object }} opts
   */
  constructor(scene, { spot, name, look }) {
    this.avatar = new Avatar({ name, ...look });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.85;
    this.avatar.root.position.set(spot.x, floorHeight(spot.x, spot.z), spot.z);
    this.avatar.root.rotation.y = spot.rot;
    scene.add(this.avatar.root);
    this.t = 0;
    this.flourishT = 0;
  }

  say(text, ms = 2500) {
    this.avatar.say(text, ms);
  }

  /** Nhấc tay một nhịp (mở bát, lật bài). */
  flourish(seconds = 0.6) {
    this.flourishT = seconds;
  }

  /** pose: 'idle' tay đặt lên bàn | 'shake' hai tay xóc đĩa | 'deal' tay phải chia bài đều đều. */
  update(dt, camera, pose = 'idle') {
    const { avatar } = this;
    avatar.update(dt, false, camera.position.distanceTo(avatar.root.position));
    this.t += dt;
    this.flourishT = Math.max(0, this.flourishT - dt);
    if (pose === 'shake') {
      const s = Math.sin(this.t * 34) * 0.18;
      avatar.armL.rotation.set(-1.35 + s, 0, 0.35);
      avatar.armR.rotation.set(-1.35 - s, 0, -0.35);
    } else if (this.flourishT > 0) {
      avatar.armL.rotation.set(-0.6, 0, 0.15);
      avatar.armR.rotation.set(-2.2, 0, -0.3);
    } else if (pose === 'deal') {
      avatar.armL.rotation.set(-0.9, 0, 0.2);
      avatar.armR.rotation.set(-1.0 + Math.sin(this.t * 9) * 0.25, 0, -0.25);
    } else {
      avatar.armL.rotation.set(-0.7, 0, 0.15);
      avatar.armR.rotation.set(-0.7, 0, -0.15);
    }
  }
}
