import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bubbleTexture, rippleTexture, seaSealTexture } from './vua-cau-ca-textures.js';

// Nền đất Vua câu cá: TRẬN BIỂN — mặt nước xanh sâu, vành sóng vảy, tám lưỡi câu vàng, chữ 漁王;
// gợn nước loang đều từ chân như phao vừa nhấp; bọt nước lăn tăn nổi lên quanh người.
// Không có: vòng chữ quanh vành hay bát quái (của các hào quang khác), không có cá chép lượn vòng
// sát đất như Lưu Ly — cá của Vua câu cá VỌT KHỎI MẶT NƯỚC (xem vua-cau-ca-leaping-fish.js).
const SIZE = 3.0, RIPPLES = 3, RIPPLE_LIFE = 3.6;

export function createVuaCauCaGround(parent, colors, lowQuality) {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE), map = seaSealTexture(), seals = [];
  for (const glow of lowQuality ? [0] : [0, 1]) {
    const material = new THREE.MeshBasicMaterial({
      map, color: glow ? colors.aqua : 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = glow ? 'vua-cau-ca-sea-seal-glow' : 'vua-cau-ca-sea-seal';
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.012 + glow * 0.004; mesh.renderOrder = 1 + glow;
    parent.add(mesh);
    seals.push({ mesh, material, glow });
  }
  const ripples = atlasPlaneLayer(parent, 'vua-cau-ca-ripples', rippleTexture(), RIPPLES,
    { tint: colors.foam.clone(), blending: THREE.AdditiveBlending, renderOrder: 3 });
  const bubbleCount = lowQuality ? 9 : 18;
  const bubbles = billboardLayer(parent, 'vua-cau-ca-bubbles', bubbleTexture(), bubbleCount, colors.foam.clone(), THREE.AdditiveBlending);
  const seeds = Array.from({ length: bubbleCount }, (_, i) => ({ a: hash(i + 3) * Math.PI * 2, r: 0.35 + 0.6 * hash(i + 13), off: hash(i + 23), s: 0.03 + 0.04 * hash(i + 33) }));
  const m = new THREE.Matrix4(), flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const p = new THREE.Vector3(), s = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      for (const { mesh, material, glow } of seals) {
        mesh.rotation.z = -time * 0.04;
        material.opacity = (glow ? 0.16 + 0.3 * rhythm.pulse : 0.6) * f;
      }
      for (let i = 0; i < RIPPLES; i++) {
        const u = ((time / RIPPLE_LIFE + i / RIPPLES) % 1 + 1) % 1, size = 0.5 + 2.2 * u;
        ripples.set(i, m.compose(p.set(0, 0.02, 0), flat, s.set(size, size, 1)), Math.pow(1 - u, 1.4) * 0.8 * f);
      }
      ripples.commit();
      seeds.forEach(({ a, r, off, s: size }, i) => {
        const u = ((time / 5 + off) % 1 + 1) % 1, wob = 0.05 * Math.sin(time * 2.2 + i);
        bubbles.set(i, Math.sin(a) * r + wob, 0.05 + u * 1.7, Math.cos(a) * r + wob * 0.6, size, size, Math.sin(Math.PI * u) * 0.8 * f);
      });
      bubbles.commit();
    },
    dispose() { geo.dispose(); seals.forEach(l => l.material.dispose()); ripples.dispose(); bubbles.dispose(); },
  };
}
