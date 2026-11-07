// Hiệu ứng mặt hồ dùng chung cho mọi người câu: vòng sóng lan và nước văng. Vật liệu dọn ngay khi tắt.
import * as THREE from 'three';
import { LAKE } from '../../../shared/layout.js';
import { glowTexture } from './builders.js';

const MAX_RIPPLES = 18;
const RIPPLE_LIFE_S = 1.8;
const SPLASH_LIFE_S = 0.8;

export class WaterEffects {
  constructor(group) {
    this.group = group;
    this.ripples = [];
    this.splashes = [];
    this.tex = glowTexture();
    this.rippleGeo = new THREE.RingGeometry(0.16, 0.26, 20);
  }

  ripple(x, z, scale = 1, opacity = 0.7) {
    const mesh = new THREE.Mesh(
      this.rippleGeo,
      new THREE.MeshBasicMaterial({ color: 0xd8ecf2, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, LAKE.y + 0.02, z);
    mesh.userData = { t: 0, scale, opacity };
    this.group.add(mesh);
    this.ripples.push(mesh);
    if (this.ripples.length > MAX_RIPPLES) this.#drop(this.ripples.shift());
  }

  splash(x, z) {
    this.ripple(x, z, 1.6);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color: 0xcfeaf2, transparent: true, opacity: 0.9, depthWrite: false }));
    sprite.scale.set(0.7, 0.7, 1);
    sprite.position.set(x, LAKE.y + 0.35, z);
    sprite.userData = { t: 0 };
    this.group.add(sprite);
    this.splashes.push(sprite);
  }

  #drop(obj) {
    this.group.remove(obj);
    obj.material.dispose();
  }

  update(dt) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.userData.t += dt;
      const t = r.userData.t / RIPPLE_LIFE_S;
      if (t >= 1) { this.#drop(r); this.ripples.splice(i, 1); continue; }
      r.scale.setScalar(1 + t * 3 * r.userData.scale);
      r.material.opacity = r.userData.opacity * (1 - t);
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.userData.t += dt;
      const t = s.userData.t / SPLASH_LIFE_S;
      if (t >= 1) { this.#drop(s); this.splashes.splice(i, 1); continue; }
      s.position.y += dt * 0.8;
      s.material.opacity = 0.9 * (1 - t);
    }
  }
}
