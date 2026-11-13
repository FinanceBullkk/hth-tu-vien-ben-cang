import * as THREE from 'three';
import { hash } from './aura-billboard-layer.js';
import { nguyetBachSoundBlade } from './nguyet-bach-ornament-textures.js';
import { humAt, waveAge } from './nguyet-bach-rhythm.js';
import { GUQIN } from './nguyet-bach-guqin.js';

// Âm nhận: lưỡi sóng âm hình trăng khuyết bật ra từ dây cổ cầm, bay ĐỀU ra phía ngoài (xa nhân vật,
// toả về sau), lớn dần rồi tan; mép lồi đi trước. Lưỡi sinh lúc dây ngân thì sáng, lúc lắng thì mờ —
// tốc độ bay không đổi. Một InstancedMesh cộng màu, độ đậm từng lưỡi ở instanceColor.
export const BLADE_LIFE = 4.8, BLADE_REACH = 1.6;

export function createSoundBlades(parent, colors, lowQuality) {
  const count = lowQuality ? 4 : 8;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: nguyetBachSoundBlade(), transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.name = 'nguyet-bach-sound-blades'; mesh.renderOrder = 8;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3); parent.add(mesh);
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  return {
    mesh,
    update(time, rhythm, f) {
      for (let k = 0; k < count; k++) {
        const u = waveAge(time, k, count, BLADE_LIFE), born = humAt(time - u * BLADE_LIFE);
        const yaw = 0.95 * hash(k + 31), y0 = GUQIN.y + GUQIN.len * (0.25 + 0.55 * hash(k + 32)), d = 0.12 + u * BLADE_REACH;
        dummy.position.set(GUQIN.x - Math.cos(yaw) * d, y0 + 0.18 * u * (hash(k + 33) - 0.5), GUQIN.z - Math.sin(yaw) * d);
        dummy.rotation.set(0, -yaw, Math.PI + 0.25 * (hash(k + 34) - 0.5));
        dummy.scale.set(0.2 + 0.32 * u, 0.5 + 0.7 * u, 1); dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
        const a = born * Math.pow(Math.sin(Math.PI * u), 0.6) * f;
        mesh.setColorAt(k, tint.copy(colors.edge).lerp(colors.core, 0.4).multiplyScalar(a));
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    },
    dispose() { mesh.dispose(); geometry.dispose(); material.dispose(); },
  };
}
