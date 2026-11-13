import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { solidMaterial, KIND, SWAY_SPEED, SWAY_BIAS } from './bich-ngoc-materials.js';
import { tag, culmAxis, swayOffset } from './bich-ngoc-geometry.js';
import { STALKS } from './bich-ngoc-grove.js';
import { bichNgocSteleFace, STELE_FACE } from './bich-ngoc-calligraphy-textures.js';

// Đồ của khách giang hồ dừng chân trong rừng trúc:
//  hồ lô rượu sơn vàng nâu thắt dây đỏ, treo trên thân trúc bên trái, đung đưa theo trúc;
//  nón lá (đấu lạp) dựa nghiêng vào tảng đá rêu phía trước bên trái;
//  bia đá khắc 竹林 · 聽風 đứng sau cụm trúc bên phải, rêu bám chân.
const GOURD_HOST = STALKS[0], GOURD_Y = 1.5, GOURD_OUT = [-0.13, 0.04];

/** Geometry tiện (lathe) với part = độ cao chuẩn hoá, across = góc quanh trục. */
function lathe(points, kind, seg = 14) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const pos = g.attributes.position, top = Math.max(...points.map(p => p[1])) || 1;
  g.computeVertexNormals();
  return tag(g, kind, i => [pos.getY(i) / top, (Math.atan2(pos.getZ(i), pos.getX(i)) / (Math.PI * 2) + 1) % 1, 0]);
}
const nonIndexed = g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return n; };

/** Hồ lô: hai bầu, eo thắt dây đỏ, nút gỗ; gốc toạ độ ở điểm treo, hồ lô rủ theo −y. */
export function gourdGeometry() {
  const body = lathe([[0, 0], [0.05, 0.01], [0.075, 0.06], [0.07, 0.11], [0.032, 0.155], [0.05, 0.2], [0.048, 0.235],
    [0.022, 0.27], [0.016, 0.3], [0.018, 0.32], [0, 0.33]], KIND.gourd).translate(0, -0.47, 0);
  const sash = tag(new THREE.TorusGeometry(0.034, 0.007, 6, 16).rotateX(Math.PI / 2).translate(0, -0.315, 0), KIND.cord, () => [0.5, 0, 0]);
  const cord = tag(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 4).translate(0, -0.075, 0), KIND.cord, () => [0.5, 0, 0]);
  const tassel = tag(new THREE.ConeGeometry(0.014, 0.09, 6).translate(0.04, -0.37, 0.02), KIND.cord, () => [0.5, 0, 0]);
  const parts = [body, sash, cord, tassel].map(nonIndexed), merged = mergeGeometries(parts);
  parts.forEach(p => p.dispose());
  return merged;
}

/** Nón lá: chóp nhọn có núm, vành rộng uốn nhẹ. */
export function hatGeometry() {
  return lathe([[0, 0.13], [0.012, 0.135], [0.03, 0.12], [0.12, 0.07], [0.22, 0.025], [0.29, 0.0], [0.3, -0.008]], KIND.straw, 20);
}

/** Bia đá: phiến dựng, đỉnh vòm, đế phẳng; mặt trước hướng +z. */
function steleGeometry() {
  const g = new THREE.BoxGeometry(0.42, 0.86, 0.11, 6, 8, 1), pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.3) pos.setY(i, pos.getY(i) - 0.09 * (pos.getX(i) / 0.21) ** 2);
  g.computeVertexNormals();
  return tag(g.translate(0, 0.43, 0), KIND.stone, i => [pos.getY(i) / 0.86, pos.getX(i), Math.abs(pos.getX(i) * 7 + pos.getY(i) * 3) % 1]);
}
const STELE = { x: 1.48, z: -1.28, ry: -0.6 }, HAT = { x: -0.86, y: 0.27, z: 0.46, rx: 1.25, rz: 0.25, ry: 0.35 };

export function createWandererProps(parent, colors) {
  const geometries = [], materials = [];
  const body = solidMaterial(colors, 1); materials.push(body);
  const place = (g, x, y, z, rx, ry, rz) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  const statics = [place(hatGeometry(), HAT.x, HAT.y, HAT.z, HAT.rx, HAT.ry, HAT.rz), place(steleGeometry(), STELE.x, 0, STELE.z, 0, STELE.ry, 0)].map(nonIndexed);
  const staticGeo = mergeGeometries(statics); statics.forEach(g => g.dispose()); geometries.push(staticGeo);
  const props = new THREE.Mesh(staticGeo, body); props.name = 'bich-ngoc-wanderer-props'; props.renderOrder = 4; parent.add(props);

  const faceGeo = new THREE.PlaneGeometry(...STELE_FACE); geometries.push(faceGeo);
  const faceMat = new THREE.MeshBasicMaterial({ map: bichNgocSteleFace(), transparent: true, depthWrite: false, toneMapped: false });
  materials.push(faceMat);
  const face = new THREE.Mesh(faceGeo, faceMat); face.name = 'bich-ngoc-stele-carving'; face.renderOrder = 5;
  face.position.set(STELE.x + Math.sin(STELE.ry) * 0.058, 0.4, STELE.z + Math.cos(STELE.ry) * 0.058); face.rotation.y = STELE.ry;
  parent.add(face);

  const hang = culmAxis(GOURD_HOST, GOURD_Y).add(new THREE.Vector3(GOURD_OUT[0], 0, GOURD_OUT[1]));
  const gourdGeo = gourdGeometry(); geometries.push(gourdGeo);
  const gourd = new THREE.Mesh(gourdGeo, body); gourd.name = 'bich-ngoc-wine-gourd'; gourd.renderOrder = 5; parent.add(gourd);

  return {
    update(time, rhythm, f) {
      const [dx, dz] = swayOffset(GOURD_HOST, GOURD_Y, time, SWAY_SPEED, SWAY_BIAS);
      gourd.position.set(hang.x + dx, hang.y, hang.z + dz);
      gourd.rotation.set(0.06 * Math.sin(time * 0.8 + 0.5), 0.3 * Math.sin(time * 0.27), 0.09 * Math.sin(time * 0.95));
      body.uniforms.time.value = time; body.uniforms.opacity.value = f; faceMat.opacity = f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
