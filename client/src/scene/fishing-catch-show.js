// Khoảnh khắc kéo cá lên: cá phóng khỏi mặt nước ở chỗ phao, bay về treo lủng lẳng dưới ngọn cần, quẫy một lúc
// rồi thu vào giỏ. Ai đứng quanh hồ cũng thấy, vì chạy theo sự kiện fish:caught phát cho cả phòng.
import * as THREE from 'three';
import { LAKE } from '../../../shared/layout.js';
import { glowTexture } from './builders.js';
import { buildFishModel, fishShowScale } from './fish-model.js';

const LEAP_S = 0.7;
const HANG_S = 2.4;
const STOW_S = 0.35;
const LINE_DROP = 0.95; // dây từ ngọn cần xuống mũi cá: thả dài cho con cá nằm giữa khung hình
const lineMat = new THREE.LineBasicMaterial({ color: 0xf5eeda, transparent: true, opacity: 0.7 });
const ease = (t) => 1 - (1 - t) ** 3;

export class CatchShows {
  constructor(group, effects) {
    Object.assign(this, { group, effects });
    this.shows = [];
    this.glowTex = glowTexture(64, 'rgba(255,226,140,1)', 'rgba(255,200,90,0)');
  }

  /** from: chỗ phao trên mặt nước; tipOf(): toạ độ ngọn cần lúc này (null khi người câu đã đi). */
  play({ fishId, rarity, from, tipOf }) {
    const holder = new THREE.Group();
    const fish = buildFishModel(fishId);
    fish.scale.multiplyScalar(fishShowScale(fishId));
    holder.add(fish);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lineGeo, lineMat);
    line.frustumCulled = false;
    let glow = null;
    if (rarity >= 3) {
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0, depthWrite: false }));
      glow.scale.setScalar(fish.userData.size * 2.2);
      this.group.add(glow);
    }
    this.group.add(holder, line);
    this.effects.splash(from.x, from.z);
    this.effects.ripple(from.x, from.z, 2.2);
    const tip = tipOf() ?? { x: from.x, y: 2.6, z: from.z };
    this.shows.push({ holder, fish, line, glow, from, tipOf, tip, t: 0, size: fish.userData.size * fishShowScale(fishId) });
  }

  #drop(show) {
    this.group.remove(show.holder, show.line);
    show.line.geometry.dispose();
    if (show.glow) {
      this.group.remove(show.glow);
      show.glow.material.dispose();
    }
  }

  update(dt, now) {
    this.shows = this.shows.filter((show) => {
      show.t += dt;
      const { holder, from, t } = show;
      show.tip = show.tipOf() ?? show.tip;
      const tip = show.tip;
      const hook = { x: tip.x, y: tip.y - LINE_DROP, z: tip.z };
      let wiggle = 0;
      if (t < LEAP_S) {
        // Vọt lên theo vòng cung, lộn một vòng giữa không trung.
        const k = ease(t / LEAP_S);
        holder.position.set(from.x + (hook.x - from.x) * k, LAKE.y + (hook.y - LAKE.y) * k + Math.sin(k * Math.PI) * 1.1, from.z + (hook.z - from.z) * k);
        holder.rotation.set(-Math.PI / 2 + (1 - k) * Math.PI * 1.6, 0, 0);
        holder.scale.setScalar(0.5 + 0.5 * k);
        wiggle = Math.sin(t * 30) * 0.5;
      } else {
        const h = t - LEAP_S;
        // Treo dưới ngọn cần, đong đưa và quẫy đuôi yếu dần.
        const swing = Math.sin(h * 3.4) * 0.22 * Math.exp(-h * 0.6);
        holder.position.set(hook.x + Math.sin(swing) * 0.3, hook.y, hook.z);
        holder.rotation.set(-Math.PI / 2, 0, swing);
        wiggle = Math.sin(h * 16) * 0.45 * Math.exp(-h * 0.8) + Math.sin(now * 0.004) * 0.06;
        const stow = Math.max(0, h - HANG_S) / STOW_S;
        holder.scale.setScalar(1 - ease(Math.min(1, stow)));
        if (show.glow) {
          show.glow.position.set(holder.position.x, hook.y - show.size * 0.5, holder.position.z);
          show.glow.material.opacity = Math.min(1, h * 3) * (0.55 + Math.sin(h * 5) * 0.15) * (1 - Math.min(1, stow));
        }
        if (stow >= 1) {
          this.#drop(show);
          return false;
        }
      }
      show.fish.rotation.y = wiggle;
      const pos = show.line.geometry.attributes.position;
      pos.setXYZ(0, tip.x, tip.y, tip.z);
      pos.setXYZ(1, holder.position.x, holder.position.y, holder.position.z);
      pos.needsUpdate = true;
      return true;
    });
  }
}
