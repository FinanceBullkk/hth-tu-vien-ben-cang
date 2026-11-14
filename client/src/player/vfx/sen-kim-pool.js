import * as THREE from 'three';
import { softGlow } from './sen-kim-textures.js';

// Nền đất của Sen kim: hào quang vàng mềm dưới đài sen + bóng thẫm neo khối đài xuống nền
// sáng. Không trận đồ, không vòng chữ — đài sen tự là trung tâm.
export function createPool(parent, colors, lowQuality) {
  const owned = [];
  const plane = (size, color, blending, name, order, y) => {
    const geo = new THREE.PlaneGeometry(size, size); const mat = new THREE.MeshBasicMaterial({
      map: softGlow(), color, transparent: true, depthWrite: false, blending, toneMapped: false,
    });
    owned.push(geo, mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.renderOrder = order;
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; parent.add(mesh);
    return mesh;
  };
  const shadow = plane(2.0, colors.deep, THREE.NormalBlending, 'sen-kim-ground-shadow', 1, 0.01);
  const light = plane(2.5, colors.gold, THREE.AdditiveBlending, 'sen-kim-ground-light', 2, 0.013);

  return {
    update(time, rhythm, f) {
      shadow.opacity = 0.4 * f;
      light.opacity = (0.16 + 0.08 * rhythm.gather) * f;
    },
    dispose() { owned.forEach(o => o.dispose()); },
  };
}
