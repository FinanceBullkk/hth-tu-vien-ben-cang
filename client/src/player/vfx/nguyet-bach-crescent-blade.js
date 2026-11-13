import * as THREE from 'three';
import { solidMaterial } from './nguyet-bach-materials.js';
import { nguyetBachCrescentCarving } from './nguyet-bach-ornament-textures.js';

// Nguyệt nhận: lưỡi trăng khuyết thép bạc 3D ôm mép NGOÀI vầng trăng (phía xa nhân vật), mép lồi mọc
// bảy gai sắc vuốt ngược như lông vũ thép, dài nhất ở giữa, ngắn dần về hai đầu — một khối liền, không phải
// vòng vật thể toả tròn. Mép trong là cung tròn lệch tâm nên không bao giờ che mặt trăng.
// Mặt trước khắc gân và mây cuộn (nét sáng + mực).
const TIP = 1.83, SPIKES = 7, SWEEP = 0.45;

/** Thông số lưỡi theo bán kính trăng r: bán kính ngoài ro, vòng trong bán kính ri lệch tâm d. */
export function crescentSpec(r) {
  const ro = r + 0.32, d = 0.3, ri = Math.hypot(ro * Math.cos(TIP) + d, ro * Math.sin(TIP));
  return { ro, ri, d, spike: 0.36 };
}

/** Bán kính mép trong theo hướng th (từ tâm trăng). */
const innerRadius = ({ ri, d }, th) => -d * Math.cos(th) + Math.sqrt(ri * ri - d * d * Math.sin(th) ** 2);

/** Hình lưỡi khuyết có gai, đối xứng quanh trục +x, hai mũi ở góc ±TIP. */
export function crescentGeometry(spec, depth) {
  const { ro, spike } = spec, shape = new THREE.Shape(), n = 220, gap = (2 * TIP - 0.5) / (SPIKES - 1);
  const rise = th => {
    let h = 0;
    for (let i = 0; i < SPIKES; i++) {
      const c = -TIP + 0.25 + i * gap, k = 1 - Math.abs(th - c) / (gap * 0.5);
      if (k > 0) h = Math.max(h, spike * k ** 2.2 * (1 - 0.7 * (c / TIP) ** 2));
    }
    return h;
  };
  for (let i = 0; i <= n; i++) {
    // Gai vuốt ngược theo chiều kim: ngọn gai lệch góc tỉ lệ với độ cao (vẫn đơn điệu, không tự cắt).
    const th0 = -TIP + 2 * TIP * i / n, h = rise(th0), th = th0 + SWEEP * h, r = ro + h;
    if (i) shape.lineTo(Math.cos(th) * r, Math.sin(th) * r); else shape.moveTo(Math.cos(th) * r, Math.sin(th) * r);
  }
  for (let i = n; i >= 0; i--) {
    const th = -TIP + 2 * TIP * i / n, r = innerRadius(spec, th);
    shape.lineTo(Math.cos(th) * r, Math.sin(th) * r);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4,
    bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Dựng nguyệt nhận vào nhóm trăng (toạ độ tâm trăng), nghiêng `tilt` rad. Dùng chung emblem kit của trăng. */
export function createCrescentBlade(moonGroup, colors, kit, r, depth, lowQuality, tilt = 0.32) {
  const spec = crescentSpec(r), holder = new THREE.Group(); holder.name = 'nguyet-bach-crescent-blade';
  holder.rotation.z = tilt; holder.position.z = -0.02; moonGroup.add(holder);
  const geo = crescentGeometry(spec, depth); kit.geometries.push(geo);
  const body = kit.own(solidMaterial(colors, 1, { base: colors.steel.clone().lerp(colors.edge, 0.3) }));
  const blade = new THREE.Mesh(geo, body); blade.name = 'nguyet-bach-crescent'; blade.renderOrder = 3; holder.add(blade);
  const glow = lowQuality ? null : kit.own(solidMaterial(colors, 0));
  if (glow) { const rim = new THREE.Mesh(geo, glow); rim.name = 'nguyet-bach-crescent'; rim.renderOrder = 4; holder.add(rim); }
  const size = 2 * (spec.ro + spec.spike + 0.05);
  const carving = kit.lines(holder, kit.plane(size), nguyetBachCrescentCarving(spec.ro, spec.ri, spec.d, size), depth * 0.95, 6,
    { opacity: 0.9, goldMix: 0.5, chase: 2, inkScale: 0.9 });
  carving.name = 'nguyet-bach-crescent-carving';
  return {
    spec, holder,
    update(rhythm, f) {
      body.uniforms.opacity.value = 0.95 * f;
      if (glow) { glow.uniforms.opacity.value = 0.95 * f; glow.uniforms.glow.value = 0.4 + 0.6 * rhythm.hum; }
    },
  };
}
