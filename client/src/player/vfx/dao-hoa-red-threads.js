import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { daoHoaKnotSprite } from './dao-hoa-textures.js';

// Chỉ hồng tri kỷ: vài sợi chỉ đỏ buộc trên cành đào, rủ xuống, giữa sợi thắt một đồng tâm kết,
// dưới nút là chùm tua xoè. Đung đưa chậm như gió thoảng (biên độ tăng dần về ngọn), neo theo
// cành nên lắc cùng cành. Mọi chuyển động là hàm thuần của thời gian, tốc độ cố định.
// [cành, nhánh, u trên nhánh, chiều dài] — treo trong lòng cổng phía trên đầu, không rủ ngang mặt.
const THREADS = [[0, 0, 0.6, 0.5], [0, 0, 0.72, 0.62], [0, 0, 0.84, 0.46], [0, 4, 0.6, 0.36]];
const SEG = 16, KNOT = 0.62;

export function createRedThreads(parent, colors, branches, lowQuality) {
  const list = THREADS.slice(0, lowQuality ? 2 : THREADS.length).map(([b, k, u, len], i) => ({ top: branches.anchor(b, k, u), len, ph: i * 1.9 }));
  const strips = createRibbonStrips(list.length, SEG);
  const red = new THREE.Color('#d8344a');
  const material = new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.9, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(strips.geometry, material); mesh.name = 'dao-hoa-red-threads'; mesh.renderOrder = 7; parent.add(mesh);
  const knots = billboardLayer(parent, 'dao-hoa-knots', daoHoaKnotSprite(), list.length, red.clone().lerp(colors.gold, 0.15), THREE.NormalBlending);
  knots.mesh.renderOrder = 8;
  const p = new THREE.Vector3(), side = new THREE.Vector3(1, 0, 0.35).normalize();

  const at = (t, u, time, out) => {
    // Lệch ngang theo gió: sóng chạy từ gốc xuống ngọn, biên độ tăng dần (gốc buộc chặt).
    const sway = 0.07 * u * u * Math.sin(time * 0.7 + t.ph - u * 1.4);
    const drift = 0.03 * u * Math.sin(time * 0.45 + t.ph * 2);
    return out.set(t.top.x + sway, t.top.y - t.len * u, t.top.z + drift);
  };
  return {
    update(time, rhythm, f) {
      list.forEach((th, i) => {
        for (let j = 0; j <= SEG; j++) {
          const u = j / SEG; at(th, u, time, p);
          // Thân chỉ mảnh; dưới nút là chùm tua xoè dần rồi tưa ngọn.
          const w = u < KNOT ? 0.006 : 0.01 + 0.03 * Math.sin(Math.min(1, (u - KNOT) / (1 - KNOT)) * Math.PI * 0.6);
          strips.write(i, j, p, side, w);
        }
        at(th, KNOT, time, p);
        knots.set(i, p.x, p.y, p.z + 0.01, 0.1, 0.1, 0.95, 0.02 * Math.sin(time * 0.6 + th.ph));
      });
      strips.commit(); knots.commit();
      material.opacity = 0.9 * f; knots.material.uniforms.opacity.value = f;
    },
    dispose() { strips.geometry.dispose(); material.dispose(); knots.dispose(); },
  };
}
