import * as THREE from 'three';

// Dấu chân của hào quang chí tôn: khi nhân vật bước đi, cứ mỗi nhịp bước để lại một dấu nằm yên trên đất
// (vị trí lưu theo toạ độ thế giới, trái phải xen kẽ theo hướng đi), mỗi khung đổi ngược về toạ độ cục bộ của
// aura (vì aura đi theo nhân vật) rồi giao cho lớp vẽ riêng của từng aura. Dấu quá xa (dịch chuyển tức thời)
// thì bỏ. Đứng yên không sinh dấu mới; dấu cũ vẫn tan hết đời.
const MAX_DIST = 8;

/**
 * @param {THREE.Object3D} group nhóm aura (gắn vào gốc nhân vật)
 * @param {number} count số dấu tối đa cùng lúc
 * @param {{ every?: number, life?: number, stride?: number }} [options] every: giây giữa hai dấu; stride: lệch trái phải
 */
export function createFootprintTrail(group, count, { every = 0.32, life = 3, stride = 0.11 } = {}) {
  const prints = Array.from({ length: count }, () => ({ pos: new THREE.Vector3(), born: -Infinity, yaw: 0, seed: 0 }));
  const inv = new THREE.Matrix4(), here = new THREE.Vector3(), last = new THREE.Vector3(), step = new THREE.Vector3(), local = new THREE.Vector3();
  let next = 0, lastSpawn = -Infinity, made = 0, hasLast = false;

  return {
    /**
     * walk: độ bước (0..1) từ Avatar. visit(i, localPos | null, age 0..1, seed, yaw) cho từng ô dấu;
     * localPos null nghĩa là ô trống (ẩn).
     */
    update(time, walk, visit) {
      group.updateWorldMatrix(true, false);
      group.getWorldPosition(here);
      if (hasLast) step.subVectors(here, last).setY(0);
      if (walk > 0.3 && time - lastSpawn > every && step.lengthSq() > 1e-8) {
        const print = prints[next], side = made % 2 ? 1 : -1, dir = step.clone().normalize();
        print.pos.copy(here).addScaledVector(new THREE.Vector3(-dir.z, 0, dir.x), side * stride);
        print.born = time; print.yaw = Math.atan2(dir.x, dir.z); print.seed = made++;
        next = (next + 1) % count; lastSpawn = time;
      }
      last.copy(here); hasLast = true;
      inv.copy(group.matrixWorld).invert();
      prints.forEach((print, i) => {
        const age = (time - print.born) / life;
        if (!(age >= 0 && age < 1) || print.pos.distanceToSquared(here) > MAX_DIST * MAX_DIST) { visit(i, null, 1, print.seed, 0); return; }
        local.copy(print.pos).applyMatrix4(inv);
        visit(i, local.setY(0.015), age, print.seed, print.yaw);
      });
    },
  };
}
