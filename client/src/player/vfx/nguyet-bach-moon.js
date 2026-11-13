import * as THREE from 'three';
import { createEmblemKit } from './aura-emblem-materials.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { solidMaterial, pictureMaterial, glowPictureMaterial } from './nguyet-bach-materials.js';
import { nguyetBachMoonFace, nguyetBachMoonGlow, nguyetBachCloudBand } from './nguyet-bach-textures.js';

// Vầng trăng tròn lớn — bóng dáng chính của Nguyệt Bạch: treo cao, LỆCH HẲN sau vai trái nhân vật
// (phía +x), không đối xứng tâm. Đĩa ngọc 3D dày, mặt trăng vẽ màu thật (Quảng Hàn cung, cây quế,
// biển trăng lam mờ), vành bạc tròn dày; quầng sáng nhiều lớp phía sau; dải mây bạc vắt chéo
// trước nửa dưới trăng (nét sáng + mực) trôi lững lờ; sao li ti lấp lánh quanh trăng (không xếp vòng).
export const MOON = { x: 0.86, y: 2.02, z: -0.72, r: 0.62, depth: 0.1 };

export function createMoon(parent, colors, lowQuality) {
  const group = new THREE.Group(); group.name = 'nguyet-bach-moon';
  group.position.set(MOON.x, MOON.y, MOON.z); parent.add(group);
  const kit = createEmblemKit(colors, lowQuality);
  const mesh = (geo, mat, name, order, z = 0) => {
    kit.geometries.push(geo); kit.own(mat);
    const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = order; m.position.z = z; group.add(m);
    return m;
  };

  const glow = mesh(new THREE.PlaneGeometry(2.6, 2.6), glowPictureMaterial(nguyetBachMoonGlow(), colors.edge), 'nguyet-bach-moon-glow', 1, -0.09);
  const discGeo = new THREE.CylinderGeometry(MOON.r, MOON.r, MOON.depth, 72, 1); discGeo.rotateX(Math.PI / 2);
  const disc = mesh(discGeo, solidMaterial(colors, 1, { base: colors.pearl }), 'nguyet-bach-moon-disc', 3);
  const faceMat = pictureMaterial(nguyetBachMoonFace()); faceMat.side = THREE.FrontSide;
  const face = mesh(new THREE.CircleGeometry(MOON.r * 0.985, 72), faceMat, 'nguyet-bach-moon-face', 4, MOON.depth / 2 + 0.003);
  // Mặt sau cũng là mặt trăng (nhìn từ phía sau nhân vật), dùng chung hình và vật liệu.
  const back = new THREE.Mesh(face.geometry, faceMat); back.name = 'nguyet-bach-moon-face'; back.renderOrder = 4;
  back.position.z = -MOON.depth / 2 - 0.003; back.rotation.y = Math.PI; group.add(back);
  const rimGeo = new THREE.TorusGeometry(MOON.r + 0.012, 0.032, 10, 96);
  const rim = mesh(rimGeo, solidMaterial(colors, 1, { base: colors.edge.clone().multiplyScalar(0.8) }), 'nguyet-bach-moon-rim', 5, 0.01);
  const rimGlow = lowQuality ? null : mesh(rimGeo.clone(), solidMaterial(colors, 0), 'nguyet-bach-moon-rim', 6, 0.01);

  // Dải mây bạc vắt chéo nửa dưới trăng, phía trước mặt trăng.
  const cloud = kit.lines(group, kit.plane(2.3), nguyetBachCloudBand(), MOON.depth / 2 + 0.06, 9,
    { opacity: 0.85, goldMix: 0.15, chase: 2, inkScale: 0.85 });
  cloud.name = 'nguyet-bach-cloud-band'; cloud.rotation.z = 0.12;

  // Sao li ti rải ngẫu nhiên phía ngoài trăng (né phía nhân vật: chỉ bên phải và phía trên).
  const starN = lowQuality ? 5 : 12;
  const stars = billboardLayer(parent, 'nguyet-bach-moon-stars', kiemVuStar(), starN, colors.core.clone().lerp(colors.gold, 0.25), THREE.AdditiveBlending);

  return {
    group,
    update(time, rhythm, f) {
      group.position.y = MOON.y + 0.03 * Math.sin(time * 0.38);
      kit.tick(time, rhythm, f);
      cloud.position.x = 0.05 * Math.sin(time * 0.11);
      const shine = 0.85 + 0.15 * rhythm.hum;
      glow.material.opacity = 0.32 * shine * f;
      disc.material.uniforms.opacity.value = 0.96 * f;
      face.material.opacity = 0.97 * f;
      rim.material.uniforms.opacity.value = 0.95 * f;
      if (rimGlow) { rimGlow.material.uniforms.opacity.value = 0.9 * f; rimGlow.material.uniforms.glow.value = rhythm.hum; }
      for (let i = 0; i < starN; i++) {
        const a = -0.9 + hash(i + 20) * 2.6, r = MOON.r + 0.2 + hash(i + 21) * 0.55;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.4 + hash(i + 22) * 0.6) + i * 2.3), 5);
        const s = 0.05 + 0.07 * tw;
        stars.set(i, MOON.x + Math.sin(a) * r, group.position.y + Math.cos(a) * r, MOON.z + 0.05, s, s, 0.15 + tw * 0.8, hash(i) + time * 0.05);
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
    },
    dispose() { kit.dispose(); stars.dispose(); },
  };
}
