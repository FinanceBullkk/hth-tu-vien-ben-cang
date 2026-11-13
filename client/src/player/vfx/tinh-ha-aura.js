import * as THREE from 'three';
import { createCelestialSphere } from './tinh-ha-celestial-sphere.js';
import { createConstellations } from './tinh-ha-constellations.js';
import { createSphereVeil } from './tinh-ha-sphere-veil.js';
import { createGroundChart } from './tinh-ha-ground-chart.js';
import { createMeteors } from './tinh-ha-meteors.js';
import { createBillboards } from './tinh-ha-billboards.js';
import { breathRhythm, softDot as dot } from './aura-rhythm.js';

// Tinh Hà Lữ Khách (effect 3) — Thiên Cầu bao thân: người lữ khách đứng trong lòng một hồn thiên
// nghi trong suốt. Bóng dáng là quả cầu lồng vòng bao trọn người (không đĩa dựng sau lưng, không
// cánh, không vòm); động từ là QUAY ĐA TRỤC rất chậm:
//  Thiên cầu: ba bộ vòng kim loại khắc độ hở đầu, mỗi bộ quay quanh một trục riêng; trục cực nghiêng,
//    đầu bắc là sao Bắc Cực; ba tinh cầu trôi trên vòng.
//  Vỏ cầu trong suốt mang sáu chòm sao thật (Bắc Đẩu, Thất Hiền, Sâm, Tâm, Chức Nữ, Ngưu Lang),
//    quay theo thiên cầu; nét nối sáng dần theo nhịp như tay người vẽ tinh đồ.
//  Lưu tinh lướt chậm bên ngoài vỏ cầu · tinh vân ôm chân cầu · sao lấp lánh nửa sau · bụi sao bay
//    lên · tinh sa rơi lả tả.
//  Dưới chân: bàn tinh đồ (28 tú, hoàng đạo lệch tâm, chòm sao) + khung sao kim chỉ quay ngược.
//  Mọi nét trên vỏ cầu tự trong suốt khi đi ngang trước mặt (tính theo camera) — chừa trống mặt.
//  Nhịp 14 giây êm như hơi thở; không có pha tăng tốc; mọi thứ là hàm thuần của thời gian.
const BASE_OPACITY = 0.9, HEAD_Y = 1.42;
/** Chu kỳ nhịp (giây). */
export const TINH_HA_CYCLE = 14;
/** Bảng màu: mực chàm đêm, nét lam bạc, lõi bạc trắng, nhấn vàng nhạt. */
export const TINH_HA_COLORS = {
  steel: new THREE.Color('#1f2a78'), edge: new THREE.Color('#6787ff'),
  core: new THREE.Color('#e8eeff'), gold: new THREE.Color('#ffdb94'),
};

/** Nhịp thở của thiên cầu, hàm thuần của thời gian. */
export const tinhHaRhythm = time => breathRhythm(time, TINH_HA_CYCLE);

/** reducedMotion: đối tượng `{ matches }`; mặc định đọc thẳng thiết lập hệ điều hành.
    Giảm chuyển động = chậm ba lần, không tắt hình. */
export function createTinhHaAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const colors = TINH_HA_COLORS;
  const group = new THREE.Group(); group.name = 'tinh-ha-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần.
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });

  // Toạ độ thế giới của đầu, dùng chung cho mọi lớp chừa mặt (cập nhật đầu mỗi khung).
  const head = new THREE.Vector3(0, HEAD_Y, 0);
  // Thứ tự cập nhật: thiên cầu trước để chòm sao đọc khung quay của khung này.
  const sphere = createCelestialSphere(group, colors, lowQuality, head);
  const parts = [sphere,
    createSphereVeil(group, colors, lowQuality, sphere.frames.b, head),
    createConstellations(group, colors, lowQuality, sphere.frames.b, head),
    createGroundChart(group, colors, lowQuality),
    createMeteors(group, colors, lowQuality),
    createBillboards(group, colors, lowQuality)];

  // Hạt sao nhỏ bay lên quanh thân.
  const moteCount = lowQuality ? 10 : 26, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.06, map: dot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = new THREE.Points(moteGeo, moteMat); motes.name = 'tinh-ha-motes'; group.add(motes);
  group.traverse(o => { o.frustumCulled = false; });

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY, rhythm = tinhHaRhythm(time);
      group.localToWorld(head.set(0, HEAD_Y, 0)); // matrixWorld của khung trước, đủ chính xác
      parts.forEach(p => p.update(time, rhythm, f));
      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.045) % 1 + 1) % 1, a = i * 2.39996 + time * 0.09;
        const r = 0.75 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.2, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.5 + 0.3 * rhythm.release) * f;
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity; không có material dùng chung để nhân bản.
    setColor() {},
    setWeapon() {},
    dispose() {
      parts.forEach(p => p.dispose());
      moteGeo.dispose(); moteMat.dispose(); group.material.dispose();
    },
  };
}
