// Dãy máy gạt cần trong hành lang phía tây: dựng các máy theo SLOT_ZONE, biển tên nổi trên dãy,
// nhận lượt quay (của mình hoặc người khác) và diễn trên đúng máy. Không giữ luật hay tiền.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SLOT_ZONE, floorHeight } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { SlotMachine } from './slot-machine-model.js';

const LABEL_SHOW_DISTANCE = 20;
const ACTIVE_DISTANCE = 30; // Xa hơn thì thôi cập nhật đèn chạy (vẫn diễn nốt lượt quay đang dở).

export class SlotMachines {
  constructor(scene) {
    this.machines = SLOT_ZONE.machines.map((spec) => new SlotMachine(scene, spec));
    // Biển tên treo trên giữa dãy, phía trước máy một chút để không lẫn vào bảng hiệu.
    const mid = SLOT_ZONE.machines[Math.floor(SLOT_ZONE.machines.length / 2)];
    this.labelSub = h('small', {}, 'bấm E để chơi');
    this.label = new CSS2DObject(h('div', { class: 'casino-label slot-label' }, h('b', {}, 'Gạt cần'), this.labelSub));
    this.label.position.set(mid.x + 0.25, floorHeight(mid.x, mid.z) + 2.35, mid.z);
    scene.add(this.label);
    this.center = new THREE.Vector3(mid.x, 1, mid.z);
    this.hits = this.machines.map((m) => m.hitBox);
  }

  /**
   * Máy i quay về ba hình reels; mult > 0 thì khi cuộn cuối dừng sẽ ăn mừng.
   * onStop(reel) gọi mỗi lần một cuộn dừng (activity dùng để phát tiếng chốt cuộn).
   */
  spin(i, reels, mult = 0, onStop = null) {
    const m = this.machines[i];
    if (!m) return;
    m.spin(reels);
    m.reels.onStop = (reel) => {
      onStop?.(reel);
      if (reel === reels.length - 1 && mult > 0) m.celebrate(mult);
    };
  }

  /** Cần máy i kéo xuống (ngay lúc bấm, trước khi server trả kết quả). */
  pull(i) {
    this.machines[i]?.pull();
  }

  /** Tia chuột trúng máy nào (chỉ xét máy only nếu có), -1 nếu trượt. */
  pick(raycaster, only = -1) {
    const targets = only >= 0 ? [this.hits[only]] : this.hits;
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? this.hits.indexOf(hit.object) : -1;
  }

  isSpinning(i) {
    return Boolean(this.machines[i]?.reels.spinning);
  }

  setHot(i) {
    this.machines.forEach((m, k) => m.setHot(k === i));
  }

  update(dt, camera) {
    const dist = camera.position.distanceTo(this.center);
    this.label.visible = dist < LABEL_SHOW_DISTANCE;
    for (const m of this.machines) {
      if (dist < ACTIVE_DISTANCE || m.reels.spinning) m.update(dt);
    }
  }
}
