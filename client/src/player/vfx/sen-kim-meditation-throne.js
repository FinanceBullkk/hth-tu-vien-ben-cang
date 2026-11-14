import * as THREE from 'three';

// Tòa ngồi thiền của Sen kim (thay vòm sen một tầng của theme 0 đang rơi về), dựng bằng hàm
// add(geo, x, y, z, sx, sy, sz, rx, ry, rz, order) của cultivation-manifestation. Giữ nguyên ý
// hoa sen quay sau lưng của bản gốc, thêm tầng trong so le, chén đài dưới thân và vòng cánh ôm
// hông để khối đọc rõ; đầu người ngồi ở y ≈ 0.8, vòm cánh vẫn vươn cao sau lưng như bản gốc.
//  tầng 3 (stage 0): vòm bảy cánh nhỏ + vòng cánh non ôm hông + túi nhụy;
//  tầng 4 (stage 1): vòm 12 cánh + tầng trong 9 cánh so le + chén đài + vòng cánh hông;
//  tầng 5 (stage 2): vòm cao hơn + hai tầng trong + vòng cánh hông rộng hơn (thay tầng 4).

/** Quạt cánh sen tỏa từ tâm (0, y, z) như hoa sen quay sau lưng; petal là geometry cánh
    đã biến dạng sẵn của cultivation-manifestation. */
function fan(add, petal, n, y, z, sx, sy, lean, offset = 0) {
  for (let i = 0; i < n; i++) add(petal, 0, y, z, sx, sy, 0.8, lean, 0, (i + offset) * Math.PI * 2 / n);
}

/** Vòng cánh ôm thân: mỗi cánh cắm quanh người ở góc a, ngả ra ngoài (rotation 'YXZ'). */
function ring(add, petal, n, r, y, s, lean, offset = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i + offset) * Math.PI * 2 / n;
    add(petal, Math.sin(a) * r, y, Math.cos(a) * r, s, s, s, lean, a, 0, 'YXZ');
  }
}

export function buildSenKimThrone(stage, add, petal) {
  const dish = (r, y) => {
    const torus = new THREE.TorusGeometry(r, 0.03, 6, 40);
    add(torus, 0, y, 0, 1, 1, 0.72, Math.PI / 2, 0, 0); torus.dispose();
  };
  const pod = (x, y, z, s) => {
    const sphere = new THREE.SphereGeometry(0.05, 8, 6);
    add(sphere, x, y, z, s, s * 1.4, s); sphere.dispose();
  };
  if (stage === 0) {
    fan(add, petal, 7, 0.85, -0.55, 0.4, 0.9, -0.2, 0.5);
    ring(add, petal, 8, 0.5, 0.22, 0.26, 1.0, 0.19);
    pod(0, 0.5, -0.72, 1);
    return;
  }
  if (stage === 1) {
    fan(add, petal, 12, 0.95, -0.62, 0.5, 1.35, -0.2);
    fan(add, petal, 9, 0.8, -0.52, 0.38, 0.85, -0.32, 0.5);
    ring(add, petal, 10, 0.56, 0.2, 0.3, 1.05, 0.05);
    dish(0.52, 0.02);
    return;
  }
  fan(add, petal, 12, 1.0, -0.68, 0.52, 1.5, -0.18);
  fan(add, petal, 9, 0.82, -0.56, 0.4, 0.95, -0.3, 0.5);
  fan(add, petal, 5, 0.62, -0.46, 0.3, 0.6, -0.42, 0.25);
  ring(add, petal, 12, 0.62, 0.18, 0.34, 1.1, 0);
  dish(0.62, 0.02);
  pod(0, 0.55, -0.8, 1);
}
