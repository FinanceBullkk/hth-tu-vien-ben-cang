// Nhà cái bầu cua: NPC đứng phía tây bàn, quay mặt về phía khách. Hô theo từng pha ván và vung tay khi xóc đĩa.
// Chỉ diễn theo trạng thái server gửi; không có luật hay số liệu nào ở đây.
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';
import { BAUCUA_ZONE, floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';

const NAME = 'Chú Tư nhà cái';
const LINES = {
  betting: ['Đặt đi bà con, tám giây thôi!', 'Bầu cua cá cọp đây!', 'Ai cua ai tôm, đặt lẹ nào!'],
  rolling: ['Xóc nè… xóc nè!', 'Dừng tay! Xóc đây!'],
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class BauCuaDealer {
  constructor(scene) {
    const { dealer } = BAUCUA_ZONE;
    // Áo đỏ (màu 0), khăn đội đầu, áo dài cách tân cho ra dáng nhà cái chợ Tết.
    this.avatar = new Avatar({ name: NAME, color: 0, hair: 2, hat: 4, attire: 7 });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.85;
    this.avatar.root.position.set(dealer.x, floorHeight(dealer.x, dealer.z), dealer.z);
    this.avatar.root.rotation.y = dealer.rot;
    scene.add(this.avatar.root);
    this.shakeT = 0;
    this.revealT = 0;
  }

  /** Đổi pha: hô một câu hợp cảnh. */
  onPhase(phase, dice) {
    if (phase === 'betting') this.avatar.say(pick(LINES.betting), 3000);
    else if (phase === 'rolling') this.avatar.say(pick(LINES.rolling), 1800);
    else if (phase === 'result' && dice) {
      this.avatar.say(`Mở! ${dice.map((d) => BAUCUA_SYMBOLS[d].icon).join(' ')}`, 2800);
      this.revealT = 0.6;
    }
  }

  update(dt, camera, shaking) {
    const { avatar } = this;
    avatar.update(dt, false, camera.position.distanceTo(avatar.root.position));
    this.shakeT = shaking ? this.shakeT + dt : 0;
    this.revealT = Math.max(0, this.revealT - dt);
    if (shaking) {
      // Hai tay nâng đĩa ngang ngực, rung nhanh như đang xóc.
      const s = Math.sin(this.shakeT * 34) * 0.18;
      avatar.armL.rotation.set(-1.35 + s, 0, 0.35);
      avatar.armR.rotation.set(-1.35 - s, 0, -0.35);
    } else if (this.revealT > 0) {
      // Mở bát: tay phải nhấc bát lên cao.
      avatar.armL.rotation.set(-0.6, 0, 0.15);
      avatar.armR.rotation.set(-2.2, 0, -0.3);
    } else {
      avatar.armL.rotation.set(-0.7, 0, 0.15);
      avatar.armR.rotation.set(-0.7, 0, -0.15);
    }
  }
}
