import * as THREE from 'three';
import { createEmblemKit } from './aura-emblem-materials.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { solidMaterial, pictureMaterial, glowPictureMaterial } from './nguyet-bach-materials.js';
import { nguyetBachMoonFace, nguyetBachMoonGlow, nguyetBachCloudBand } from './nguyet-bach-textures.js';
import { nguyetBachCorona } from './nguyet-bach-ornament-textures.js';
import { createCrescentBlade } from './nguyet-bach-crescent-blade.js';

// Vầng trăng tròn lớn — bóng dáng chính của Nguyệt Bạch: treo cao, LỆCH HẲN sau vai trái nhân vật
// (phía +x), không đối xứng tâm. Đĩa ngọc 3D dày, mặt trăng vẽ màu thật (Quảng Hàn cung, cây quế,
// biển trăng lam mờ), vành bạc tròn dày; quầng sáng nhiều lớp phía sau; dải mây bạc vắt chéo
// trước nửa dưới trăng (nét sáng + mực) trôi lững lờ; sao li ti lấp lánh quanh trăng (không xếp vòng).
// Ôm mép ngoài là NGUYỆT NHẬN (lưỡi khuyết bạc có gai), sau trăng là quầng NGUYỆT HOA ngũ sắc.
export const MOON = { x: 1.05, y: 2.2, z: -0.78, r: 0.8, depth: 0.13 };

export function createMoon(parent, colors, lowQuality) {
  const group = new THREE.Group(); group.name = 'nguyet-bach-moon';
  group.position.set(MOON.x, MOON.y, MOON.z); parent.add(group);
  const kit = createEmblemKit(colors, lowQuality);
  const mesh = (geo, mat, name, order, z = 0) => {
    kit.geometries.push(geo); kit.own(mat);
    const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = order; m.position.z = z; group.add(m);
    return m;
  };

  const glow = mesh(new THREE.PlaneGeometry(3.4, 3.4), glowPictureMaterial(nguyetBachMoonGlow(), colors.edge), 'nguyet-bach-moon-glow', 1, -0.12);
  // Nguyệt hoa: vành quầng ngũ sắc ở 1.22 bán kính trăng (vành sáng nhất nằm ở 0.77 bán kính texture).
  const coronaSize = 2 * 1.22 * MOON.r / 0.77;
  const corona = mesh(new THREE.PlaneGeometry(coronaSize, coronaSize), glowPictureMaterial(nguyetBachCorona(), colors.core), 'nguyet-bach-moon-corona', 2, -0.1);
  const discGeo = new THREE.CylinderGeometry(MOON.r, MOON.r, MOON.depth, 72, 1); discGeo.rotateX(Math.PI / 2);
  const disc = mesh(discGeo, solidMaterial(colors, 1, { base: colors.pearl }), 'nguyet-bach-moon-disc', 3);
  const faceMat = pictureMaterial(nguyetBachMoonFace()); faceMat.side = THREE.FrontSide;
  const face = mesh(new THREE.CircleGeometry(MOON.r * 0.985, 72), faceMat, 'nguyet-bach-moon-face', 4, MOON.depth / 2 + 0.003);
  // Mặt sau cũng là mặt trăng (nhìn từ phía sau nhân vật), dùng chung hình và vật liệu.
  const back = new THREE.Mesh(face.geometry, faceMat); back.name = 'nguyet-bach-moon-face'; back.renderOrder = 4;
  back.position.z = -MOON.depth / 2 - 0.003; back.rotation.y = Math.PI; group.add(back);
  const rimGeo = new THREE.TorusGeometry(MOON.r + 0.014, 0.045, 12, 96);
  const rim = mesh(rimGeo, solidMaterial(colors, 1, { base: colors.edge.clone().multiplyScalar(0.8) }), 'nguyet-bach-moon-rim', 5, 0.01);
  const rimGlow = lowQuality ? null : mesh(rimGeo.clone(), solidMaterial(colors, 0), 'nguyet-bach-moon-rim', 6, 0.01);

  // Dải mây bạc vắt chéo nửa dưới trăng, phía trước mặt trăng.
  const blade = createCrescentBlade(group, colors, kit, MOON.r, 0.07, lowQuality);
  const cloud = kit.lines(group, kit.plane(3.0), nguyetBachCloudBand(), MOON.depth / 2 + 0.08, 9,
    { opacity: 0.85, goldMix: 0.15, chase: 2, inkScale: 0.85 });
  cloud.name = 'nguyet-bach-cloud-band'; cloud.rotation.z = 0.12;

  // Sao li ti rải ngẫu nhiên phía ngoài trăng (né phía nhân vật: chỉ bên phải và phía trên).
  const starN = lowQuality ? 6 : 16;
  const stars = billboardLayer(parent, 'nguyet-bach-moon-stars', kiemVuStar(), starN, colors.core.clone().lerp(colors.gold, 0.25), THREE.AdditiveBlending);

  return {
    group,
    update(time, rhythm, f) {
      group.position.y = MOON.y + 0.03 * Math.sin(time * 0.38);
      kit.tick(time, rhythm, f);
      cloud.position.x = 0.05 * Math.sin(time * 0.11);
      const shine = 0.85 + 0.15 * rhythm.hum;
      glow.material.opacity = 0.32 * shine * f; corona.material.opacity = 0.6 * shine * f;
      blade.update(rhythm, f);
      disc.material.uniforms.opacity.value = 0.96 * f;
      face.material.opacity = 0.97 * f;
      rim.material.uniforms.opacity.value = 0.95 * f;
      if (rimGlow) { rimGlow.material.uniforms.opacity.value = 0.9 * f; rimGlow.material.uniforms.glow.value = rhythm.hum; }
      for (let i = 0; i < starN; i++) {
        const a = -0.9 + hash(i + 20) * 2.6, r = MOON.r + 0.55 + hash(i + 21) * 0.6;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.4 + hash(i + 22) * 0.6) + i * 2.3), 5);
        const s = 0.05 + 0.07 * tw;
        stars.set(i, MOON.x + Math.sin(a) * r, group.position.y + Math.cos(a) * r, MOON.z + 0.05, s, s, 0.15 + tw * 0.8, hash(i) + time * 0.05);
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
    },
    dispose() { kit.dispose(); stars.dispose(); },
  };
}
