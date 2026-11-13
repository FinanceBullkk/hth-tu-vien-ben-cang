import * as THREE from 'three';
import { cloudSeaTile, softGlow } from './xich-diem-textures.js';
import { seaMaterial, tickAll } from './xich-diem-materials.js';
import { DRIFT } from './xich-diem-layout.js';

// Nền đất của Xích Diễm: CHÍNH LÀ MÂY LỬA — không trận đồ, không vòng chữ, không bát quái.
//  Bóng đỏ thẫm dưới đài (normal blend, neo khối mây xuống nền sáng) · ánh lửa hắt cam ·
//  biển mây tường vân (bản mực + bản sáng) trôi vòng khớp đài mây, mép là chuỗi múi mây cuộn ·
//  biển mây nhỏ bên trong trôi chậm hơn (lớp phụ).
export function createCloudSea(parent, colors, lowQuality) {
  const owned = [], ticks = [];
  const plane = (size, mat, name, order, y) => {
    const geo = new THREE.PlaneGeometry(size, size); owned.push(geo, mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.renderOrder = order;
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; parent.add(mesh);
    return mesh;
  };
  const pool = (color, blending, opacity) => new THREE.MeshBasicMaterial({ map: softGlow(), color, transparent: true,
    opacity, depthWrite: false, blending, toneMapped: false });
  const shadow = pool(colors.deep, THREE.NormalBlending, 0.45), light = pool(colors.ember, THREE.AdditiveBlending, 0.35);
  plane(3.0, shadow, 'xich-diem-ground-shadow', 1, 0.01);
  plane(3.6, light, 'xich-diem-ground-light', 2, 0.013);
  const sea = (size, opts, base, name, order, breathe) => {
    const m = seaMaterial(colors, cloudSeaTile(), opts); ticks.push({ m, base, breathe });
    plane(size, m, name, order, 0.016 + order * 0.002);
  };
  const turns = DRIFT / (Math.PI * 2);
  if (!lowQuality) sea(3.8, { drift: turns, arms: 6, ink: 1 }, 0.75, 'xich-diem-cloud-sea-ink', 3, 0);
  sea(3.8, { drift: turns, arms: 6 }, 0.8, 'xich-diem-cloud-sea', 4, 0.2);
  if (!lowQuality) sea(2.2, { drift: turns * 0.6, arms: 4, lobes: 6, inner: 0.25 }, 0.5, 'xich-diem-cloud-sea-inner', 5, 0.25);

  return {
    update(time, rhythm, f) {
      tickAll(ticks, time, rhythm, f);
      shadow.opacity = 0.45 * f;
      light.opacity = (0.3 + 0.1 * rhythm.gather) * f;
    },
    dispose() { owned.forEach(o => o.dispose()); },
  };
}
