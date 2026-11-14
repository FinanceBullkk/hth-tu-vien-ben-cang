import * as THREE from 'three';
import { petalGeometry, dishGeometry } from './sen-kim-petal-geometry.js';
import { petalMaterial, dishMaterial, tickAll } from './sen-kim-materials.js';
import { PETAL_COUNT, petalPlace, petalTier } from './sen-kim-layout.js';

// Đài sen Cửu Phẩm Kim Liên: đế chén vàng + 26 cánh ba tầng (12 ngoài cuốn ngược ôm chân,
// 9 giữa so le, 5 trong thấp ôm nhụy). Mỗi cánh tự nở/khép lệch pha riêng (cánh nở lệch nhịp),
// cả đài xoay chậm đều. Ba lớp vẽ chung một bộ ma trận instance: thân đặc đọc khối, viền
// phát quang chọn lọc ở mép và đỉnh, gân nổi chạy dòng khí.
export function createLotusPlatform(parent, colors, lowQuality) {
  const owned = [], ticks = [];
  const dishMat = dishMaterial(colors); owned.push(dishMat);
  ticks.push({ m: dishMat, base: 1 });
  const dish = new THREE.Mesh(dishGeometry(lowQuality), dishMat);
  dish.name = 'sen-kim-dish'; dish.renderOrder = 2; dish.position.y = 0.02;
  dish.scale.setScalar(1.1); parent.add(dish);

  const bodyMat = petalMaterial(colors, 0); owned.push(bodyMat);
  ticks.push({ m: bodyMat, base: 0.96 });
  const petals = new THREE.InstancedMesh(petalGeometry(lowQuality), bodyMat, PETAL_COUNT);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.name = 'sen-kim-petals'; petals.renderOrder = 3; parent.add(petals);

  // Hai lớp cộng màu dùng lại đúng bộ ma trận của cánh — không tốn lần cập nhật CPU thứ hai.
  const rimMat = petalMaterial(colors, 1); owned.push(rimMat);
  ticks.push({ m: rimMat, base: 0.55, breathe: 0.2 });
  const rim = new THREE.InstancedMesh(petals.geometry, rimMat, PETAL_COUNT);
  rim.instanceMatrix = petals.instanceMatrix;
  rim.name = 'sen-kim-petals-rim'; rim.renderOrder = 9; parent.add(rim);

  let relief = null;
  if (!lowQuality) {
    const reliefMat = petalMaterial(colors, 2); owned.push(reliefMat);
    ticks.push({ m: reliefMat, base: 0.5, breathe: 0.15 });
    relief = new THREE.InstancedMesh(petals.geometry, reliefMat, PETAL_COUNT);
    relief.instanceMatrix = petals.instanceMatrix;
    relief.name = 'sen-kim-petals-relief'; relief.renderOrder = 9; parent.add(relief);
  }

  const dummy = new THREE.Object3D();
  return {
    update(time, rhythm, f) {
      for (let i = 0; i < PETAL_COUNT; i++) {
        const p = petalPlace(i, time);
        const { tier, index } = petalTier(i);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.lean, p.angle, 0, 'YXZ');
        dummy.scale.set(tier.w * p.scale, tier.len * p.scale, tier.w * p.scale);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
      tickAll(ticks, time, rhythm, f);
    },
    dispose() {
      petals.dispose(); rim.dispose(); relief?.dispose();
      owned.forEach(o => o.dispose());
    },
  };
}
