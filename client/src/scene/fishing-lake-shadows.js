// Vẽ bóng cá lượn dưới mặt hồ. Vị trí đến từ shared/fish-lake-shadows.js nên mọi máy trùng khớp.
import * as THREE from 'three';
import { LAKE_SHADOW, SHADOW_SIZES, shadowNear, shadowsAt } from '../../../shared/fish-lake-shadows.js';
import { LAKE } from '../../../shared/layout.js';

/** Dáng cá dẹt nhìn từ trên xuống, đầu hướng +z. Dùng cho bóng cá dưới hồ và cá đang giằng co dưới phao. */
export function fishShapeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0.2, 0.3, 0.2, -0.1, 0.03, -0.28);
  s.lineTo(0.14, -0.5);
  s.lineTo(-0.14, -0.5);
  s.lineTo(-0.03, -0.28);
  s.bezierCurveTo(-0.2, -0.1, -0.2, 0.3, 0, 0.5);
  const geometry = new THREE.ShapeGeometry(s);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export class LakeShadows {
  constructor(scene) {
    this.taken = new Set();
    const geometry = fishShapeGeometry();
    this.meshes = Array.from({ length: LAKE_SHADOW.lanes }, () => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x06141a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      mesh.position.y = LAKE.y + 0.015;
      mesh.renderOrder = 1;
      scene.add(mesh);
      return mesh;
    });
  }

  setTaken(ids = []) {
    this.taken = new Set(ids);
  }

  markTaken(id) {
    this.taken.add(id);
    if (this.taken.size > 40) this.taken = new Set([...this.taken].slice(-20));
  }

  /** Bóng còn trống trong tầm phao, để vòng ngắm đổi màu và gợi ý trên HUD. */
  near(now, x, z) {
    return shadowNear(now, x, z, this.taken);
  }

  update(now) {
    shadowsAt(now).forEach((shadow, i) => {
      const mesh = this.meshes[i];
      const free = !this.taken.has(shadow.id);
      mesh.visible = free && shadow.alpha > 0.01;
      if (!mesh.visible) return;
      const wiggle = Math.sin(now * 0.004 + i) * 0.12;
      mesh.position.x = shadow.x;
      mesh.position.z = shadow.z;
      mesh.rotation.y = shadow.heading + wiggle;
      mesh.scale.setScalar(SHADOW_SIZES[shadow.size].scale);
      mesh.material.opacity = 0.82 * shadow.alpha;
    });
  }

  /** Bóng lớn còn trống, để mặt nước gợn lên chỉ chỗ cho người tinh mắt. */
  largestFree(now) {
    return shadowsAt(now).find((s) => s.size === 'l' && s.alpha > 0.5 && !this.taken.has(s.id)) ?? null;
  }
}
