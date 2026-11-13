import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { stringFragment } from './nguyet-bach-shaders.js';
import { solidMaterial, pictureMaterial } from './nguyet-bach-materials.js';
import { nguyetBachInscription } from './nguyet-bach-textures.js';
import { guqinGeometry, stringEnds, huiPoint, stringLift, HUI, STRINGS } from './nguyet-bach-geometry.js';
import { stringOffset } from './nguyet-bach-rhythm.js';

// Cổ cầm dựng đứng sau vai phải nhân vật (phía -x), cao hơn đầu — vật thể chủ đề thứ hai, đối
// trọng bất đối xứng với vầng trăng bên kia. Thân sơn mài đen ánh lam dày có vân đoạn văn và viền
// bạc; mười ba phím huy ngọc trai; bảy dây bạc NGÂN (rung đứng sóng, tần số cố định); mặt sau khắc
// "高山流水" và triện 知音; dải tua ngọc rủ bên đầu đàn lay nhẹ.
export const GUQIN = { x: -0.76, y: 0.05, z: -0.5, len: 2.15, width: 0.34, depth: 0.07, tilt: 0.06, yaw: 0.28 };
const SEG = 20, TASSEL_SEG = 12;

function stripMaterial(colors, color) {
  return new THREE.ShaderMaterial({ uniforms: { edge: { value: color }, core: { value: colors.core }, opacity: { value: 1 } },
    vertexShader: ribbonVertex, fragmentShader: stringFragment, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
}

export function createGuqin(parent, colors, lowQuality) {
  const { len, width, depth } = GUQIN;
  const group = new THREE.Group(); group.name = 'nguyet-bach-guqin';
  group.position.set(GUQIN.x, GUQIN.y, GUQIN.z); group.rotation.set(0, GUQIN.yaw, GUQIN.tilt); parent.add(group);
  const geometries = [], materials = [], meshes = [];
  const own = (g, m) => (geometries.push(g), materials.push(m), [g, m]);

  const bodyGeo = guqinGeometry(len, width, depth); geometries.push(bodyGeo);
  const body = solidMaterial(colors, 1, { crack: 1 }), rim = solidMaterial(colors, 0, { crack: 1 });
  materials.push(body, rim);
  const lacquer = new THREE.Mesh(bodyGeo, body); lacquer.name = 'nguyet-bach-guqin-body'; lacquer.renderOrder = 4; group.add(lacquer);
  if (!lowQuality) { const glow = new THREE.Mesh(bodyGeo, rim); glow.name = 'nguyet-bach-guqin-rim'; glow.renderOrder = 5; group.add(glow); }

  // Phím huy: chấm ngọc trai dẹt trên mép mặt đàn, huy giữa to nhất.
  const [huiGeo, huiMat] = own(new THREE.SphereGeometry(1, 10, 6),
    new THREE.MeshBasicMaterial({ color: colors.core.clone().lerp(colors.gold, 0.45), transparent: true, depthWrite: false, toneMapped: false }));
  const hui = new THREE.InstancedMesh(huiGeo, huiMat, HUI.length); hui.name = 'nguyet-bach-hui'; hui.renderOrder = 6;
  const dummy = new THREE.Object3D();
  HUI.forEach((f, i) => {
    const [x, y] = huiPoint(i, len, width), s = f === 0.5 ? 0.024 : 0.016;
    dummy.position.set(x, y, depth * 1.05); dummy.scale.set(s, s, s * 0.45); dummy.updateMatrix(); hui.setMatrixAt(i, dummy.matrix);
  });
  group.add(hui); meshes.push(hui);

  // Bảy dây: dải mảnh cập nhật mỗi khung theo độ ngân.
  const strips = createRibbonStrips(STRINGS, SEG); geometries.push(strips.geometry);
  const stringMat = stripMaterial(colors, colors.edge); materials.push(stringMat);
  const strings = new THREE.Mesh(strips.geometry, stringMat); strings.name = 'nguyet-bach-strings'; strings.renderOrder = 7; group.add(strings);
  const ends = Array.from({ length: STRINGS }, (_, k) => stringEnds(k, len, width));
  const c = new THREE.Vector3(), side = new THREE.Vector3(1, 0, 0);
  const lift = stringLift(depth);

  // Lạc khoản mặt sau: chỉ thấy khi nhìn từ phía sau (một mặt, quay về -z), vẽ sau thân đàn.
  const [inscGeo, inscMat] = own(new THREE.PlaneGeometry(0.95, 0.95), pictureMaterial(nguyetBachInscription()));
  inscMat.side = THREE.FrontSide;
  const insc = new THREE.Mesh(inscGeo, inscMat); insc.name = 'nguyet-bach-inscription';
  insc.position.set(0, len * 0.5, -depth * 0.8); insc.rotation.y = Math.PI; insc.renderOrder = 6; group.add(insc);

  // Tua ngọc: dây lụa vàng ngà rủ từ vai đầu đàn, cuối treo miếng ngọc.
  let tassel = null;
  if (!lowQuality) {
    const strip = createRibbonStrips(1, TASSEL_SEG); geometries.push(strip.geometry);
    const mat = stripMaterial(colors, colors.gold); materials.push(mat);
    const cord = new THREE.Mesh(strip.geometry, mat); cord.name = 'nguyet-bach-tassel'; cord.renderOrder = 7; group.add(cord);
    const [jadeGeo, jadeMat] = own(new THREE.IcosahedronGeometry(0.032, 0), solidMaterial(colors, 1, { base: colors.pearl }));
    const jade = new THREE.Mesh(jadeGeo, jadeMat); jade.name = 'nguyet-bach-tassel'; jade.renderOrder = 7; group.add(jade);
    tassel = { strip, jade, mat, jadeMat };
  }

  return {
    group,
    update(time, rhythm, f) {
      for (let k = 0; k < STRINGS; k++) {
        const [[x0, y0], [x1, y1]] = ends[k];
        for (let j = 0; j <= SEG; j++) {
          const s = j / SEG;
          c.set(x0 + (x1 - x0) * s + stringOffset(k, s, time, rhythm.hum), y0 + (y1 - y0) * s, lift);
          strips.write(k, j, c, side, 0.011 - k * 0.0007);
        }
      }
      strips.commit();
      stringMat.uniforms.opacity.value = (0.75 + 0.35 * rhythm.hum) * f;
      body.uniforms.opacity.value = 0.95 * f; rim.uniforms.opacity.value = 0.8 * f; rim.uniforms.glow.value = rhythm.hum;
      huiMat.opacity = 0.95 * f; inscMat.opacity = 0.95 * f;
      if (tassel) {
        const sway = 0.06 * Math.sin(time * 0.42) + 0.02 * Math.sin(time * 0.71 + 1);
        for (let j = 0; j <= TASSEL_SEG; j++) {
          const s = j / TASSEL_SEG;
          c.set(-width * 0.42 - 0.03 * s + sway * s * s, len * 0.93 - s * 0.62, depth * 0.3 + sway * s * 0.4);
          tassel.strip.write(0, j, c, side, 0.007);
        }
        tassel.strip.commit();
        tassel.jade.position.set(c.x, c.y - 0.03, c.z); tassel.jade.rotation.set(0.3, time * 0.25, 0.2);
        tassel.mat.uniforms.opacity.value = 0.85 * f; tassel.jadeMat.uniforms.opacity.value = 0.95 * f;
      }
    },
    dispose() { meshes.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
