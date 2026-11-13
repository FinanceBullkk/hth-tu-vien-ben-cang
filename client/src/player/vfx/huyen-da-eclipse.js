import * as THREE from 'three';
import { inkStreaks, coronaRays } from './huyen-da-textures.js';
import { vortexMaterial, obsidianMaterial, vortexPlane, tickAll } from './huyen-da-materials.js';
import { ECLIPSE } from './huyen-da-inward-path.js';
import { softDot } from './aura-rhythm.js';

// Bóng dáng chính của Huyền Dạ: VẦNG NHẬT THỰC ĐEN sau đầu — nhỏ và đậm, không phải mandala.
//  Sau cùng: xoáy mực đen (normal blend) nhánh xoắn trôi vào tâm, mép có vân tím mờ.
//  Đĩa nhật thực: khối hắc diệu thạch 3D dày, đen đặc — khoảng âm.
//  Vành ngọc đen 3D ôm mép đĩa, đường chạm cuộn xoắn sáng tím chạy rất chậm.
//  Corona: tia mảnh như lông vũ toả từ mép đĩa, cuộn xoắn vào tâm; lớp tia dài thưa bên ngoài;
//  lớp mực sau tia để đọc được trên nền sáng; một hạt "nhẫn kim cương" bạc dịu ở mép.
// Nhịp: hít vào thì corona co lại và sáng hơn, thở ra thì nở nhẹ. Tốc độ trôi cố định.
const DISC_R = 0.4;

export function createEclipse(parent, colors, lowQuality) {
  const owned = [], ticks = [];
  const eclipse = new THREE.Group(); eclipse.name = 'huyen-da-eclipse';
  eclipse.position.set(ECLIPSE.x, ECLIPSE.y, ECLIPSE.z); parent.add(eclipse);
  const plane = (size, opts, base, name, order, z, breathe = 0) => {
    const m = vortexMaterial(colors, opts.map, opts);
    ticks.push({ m, base, breathe });
    const mesh = vortexPlane(eclipse, owned, size, m, name, order); mesh.position.z = z;
    return mesh;
  };
  const streaks = inkStreaks(), rays = coronaRays();

  // Xoáy mực sau đĩa — lớp tối chủ đạo, rộng hơn đĩa ba lần.
  plane(2.5, { map: streaks, arms: 4, twist: 1.7, flow: 0.05, inner: 0.3, ink: 1 }, 0.62, 'huyen-da-back-vortex', 4, -0.1);
  if (!lowQuality) plane(2.5, { map: streaks, arms: 4, twist: 1.7, flow: 0.05, inner: 0.3, falloff: 2.2 }, 0.2, 'huyen-da-back-vortex-glow', 5, -0.09);

  // Đĩa đen 3D dày + vành ngọc đen.
  const discGeo = new THREE.SphereGeometry(DISC_R, 48, 24), ringGeo = new THREE.TorusGeometry(DISC_R + 0.03, 0.05, 18, 120);
  const discMat = obsidianMaterial(colors, 1), ringInk = obsidianMaterial(colors, 1), ringGlow = obsidianMaterial(colors, 0, 1);
  owned.push(discGeo, ringGeo, discMat, ringInk, ringGlow);
  ticks.push({ m: discMat, base: 1 }, { m: ringInk, base: 1 }, { m: ringGlow, base: 0.95, breathe: 0.3 });
  const disc = new THREE.Mesh(discGeo, discMat); disc.name = 'huyen-da-eclipse-disc'; disc.scale.z = 0.32; disc.renderOrder = 6;
  const ring = new THREE.Mesh(ringGeo, ringInk); ring.name = 'huyen-da-eclipse-ring'; ring.renderOrder = 6;
  const ringRim = new THREE.Mesh(ringGeo, ringGlow); ringRim.name = 'huyen-da-eclipse-ring-glow'; ringRim.renderOrder = 10;
  eclipse.add(disc, ring, ringRim);

  // Corona: inner = mép đĩa theo tỉ lệ khung.
  const corona = new THREE.Group(); eclipse.add(corona);
  const coronaPlane = (size, opts, base, name, order, z, breathe) => {
    const mesh = plane(size, { map: rays, inner: (DISC_R + 0.04) / (size / 2), ...opts }, base, name, order, z, breathe);
    corona.add(mesh); return mesh;
  };
  coronaPlane(1.7, { arms: 9, twist: 0.35, flow: 0.04, falloff: 3.8, edgeGlow: 0.9 }, 0.95, 'huyen-da-corona', 9, 0.02, 0.35);
  if (!lowQuality) {
    coronaPlane(1.7, { arms: 9, twist: 0.35, flow: 0.04, falloff: 2.8, ink: 1 }, 0.5, 'huyen-da-corona-ink', 7, 0.0, 0);
    coronaPlane(2.2, { arms: 5, twist: 0.9, flow: 0.03, falloff: 2.4 }, 0.3, 'huyen-da-corona-streamers', 8, 0.01, 0.25);
  }

  // Nhẫn kim cương: hạt bạc dịu ở mép trên bên phải, chỉ thở nhẹ, không lóe.
  const beadMat = new THREE.SpriteMaterial({ map: softDot(), color: colors.core, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.8 });
  owned.push(beadMat);
  const bead = new THREE.Sprite(beadMat); bead.name = 'huyen-da-diamond-bead'; bead.renderOrder = 11;
  bead.position.set(Math.sin(0.7) * (DISC_R + 0.04), Math.cos(0.7) * (DISC_R + 0.04), 0.06); bead.scale.setScalar(0.16);
  eclipse.add(bead);

  return {
    group: eclipse,
    update(time, rhythm, f) {
      eclipse.position.y = ECLIPSE.y + 0.03 * Math.sin(time * 0.4);
      corona.scale.setScalar(1 - 0.03 * rhythm.gather + 0.05 * rhythm.release);
      ring.rotation.z = ringRim.rotation.z = -time * 0.05;
      tickAll(ticks, time, rhythm, f);
      beadMat.opacity = (0.55 + 0.25 * rhythm.gather) * f;
      bead.scale.setScalar(0.15 + 0.03 * rhythm.gather);
    },
    dispose() { owned.forEach(o => o.dispose()); },
  };
}
