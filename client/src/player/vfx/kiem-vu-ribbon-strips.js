import * as THREE from 'three';

// Bộ dải động: nhiều dải (strip) trong một geometry, mỗi dải seg+1 cặp đỉnh, cập nhật từ CPU
// mỗi khung. uv.x = vị trí dọc dải (0 đầu → 1 đuôi), uv.y = ngang; seed = số lệch vân từng dải.
export function createRibbonStrips(count, seg) {
  const pos = new Float32Array(count * (seg + 1) * 6), uv = [], seed = [], idx = [];
  for (let k = 0; k < count; k++) for (let j = 0; j <= seg; j++) {
    uv.push(j / seg, 0, j / seg, 1); seed.push(k * 1.37, k * 1.37);
    const n = (k * (seg + 1) + j) * 2;
    if (j < seg) idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  geometry.setIndex(idx);
  return {
    geometry,
    /** Đặt cặp đỉnh j của dải k: tâm c, hướng ngang s (đơn vị), nửa bề rộng w. */
    write(k, j, c, s, w) {
      const b = (k * (seg + 1) + j) * 6;
      pos[b] = c.x - s.x * w; pos[b + 1] = c.y - s.y * w; pos[b + 2] = c.z - s.z * w;
      pos[b + 3] = c.x + s.x * w; pos[b + 4] = c.y + s.y * w; pos[b + 5] = c.z + s.z * w;
    },
    /** Ẩn dải k (gom về một điểm) khi không dùng, ví dụ sợi tơ ở chất lượng thấp. */
    collapse(k) { pos.fill(0, k * (seg + 1) * 6, (k + 1) * (seg + 1) * 6); },
    commit() { geometry.attributes.position.needsUpdate = true; },
  };
}
