// Màn ngọc trên một đe khi đá vỡ: viên ngọc bay lên xoay giữa quầng sáng màu ngọc; ngọc càng hiếm càng to, từ Bích ngọc
// có cột sáng mảnh (vẫn nhìn thấy ngọc bên trong), từ Lam ngọc thêm vòng sóng lan trên mặt đe. Chỉ diễn, không biết luật.
import * as THREE from 'three';

const REVEAL_S = 3.4;
const RISE_S = 0.6;
const FADE_S = 0.5;

export class StoneGemReveal {
  /**
   * @param {THREE.Object3D} group nhóm của đe (toạ độ cục bộ, tâm đe ở gốc)
   * @param {ReturnType<import('./stone-yard-models.js').stoneYardAssets>} a hình và vật liệu dùng chung
   * @param {number} baseY mặt đe; @param {number} startY tâm tảng đá (chỗ ngọc bắt đầu bay lên)
   */
  constructor(group, a, baseY, startY) {
    this.a = a;
    this.baseY = baseY;
    this.startY = startY;
    this.gem = new THREE.Mesh(a.gem, a.gemMaterials[0]);
    this.gem.castShadow = true;
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: a.glow, ...a.additive }));
    this.beamMaterial = new THREE.MeshBasicMaterial({ alphaMap: a.beamMap, ...a.additive, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(a.beam, this.beamMaterial);
    this.beam.position.y = baseY;
    this.ringMaterial = new THREE.MeshBasicMaterial({ ...a.additive, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(a.ring, this.ringMaterial);
    this.ring.position.y = baseY + 0.02;
    this.parts = [this.gem, this.halo, this.beam, this.ring];
    for (const o of this.parts) group.add(o);
    this.t = -1;
    this.tier = 0;
    this.hide();
  }

  get active() {
    return this.t >= 0;
  }

  /** Bắt đầu màn ngọc: gem là id ngọc, info là dòng STONE_GEMS tương ứng. */
  show(gem, info) {
    this.tier = info.tier;
    this.gem.material = this.a.gemMaterials[gem] ?? this.a.gemMaterials[0];
    for (const m of [this.halo.material, this.beamMaterial, this.ringMaterial]) m.color.set(info.color);
    this.gem.visible = true;
    this.halo.visible = info.tier > 0;
    this.beam.visible = info.tier >= 3;
    this.ring.visible = info.tier >= 4;
    this.t = 0;
  }

  hide() {
    this.t = -1;
    for (const o of this.parts) o.visible = false;
  }

  update(dt) {
    if (this.t < 0) return;
    this.t += dt;
    const { t, tier } = this;
    const ease = 1 - (1 - Math.min(1, t / RISE_S)) ** 3;
    const out = t > REVEAL_S - FADE_S ? Math.max(0, (REVEAL_S - t) / FADE_S) : 1;
    const big = 1 + tier * 0.12;
    this.gem.position.y = this.startY + ease * 0.55 + Math.sin(t * 2.4) * 0.03;
    this.gem.rotation.y += dt * (2 + tier * 0.5);
    this.gem.scale.setScalar(Math.max(0.01, (0.4 + 0.6 * ease) * big * out));
    this.halo.position.copy(this.gem.position);
    this.halo.scale.setScalar((0.5 + tier * 0.22) * ease * out * (1 + 0.08 * Math.sin(t * 6)));
    this.halo.material.opacity = 0.85 * out;
    // Cột sáng mảnh và trong để vẫn thấy viên ngọc bên trong; ngọc càng hiếm cột càng cao.
    this.beam.scale.set(1, ease * (0.6 + tier * 0.12), 1);
    this.beamMaterial.opacity = 0.42 * out * (0.85 + 0.15 * Math.sin(t * 9));
    const wave = (t % 1.1) / 1.1;
    this.ring.scale.setScalar(1 + wave * (1.5 + tier * 0.5));
    this.ringMaterial.opacity = (1 - wave) * 0.8 * out;
    if (t >= REVEAL_S) this.hide();
  }
}
