import * as THREE from 'three';

// Hình học cổ cầm (kiểu Trọng Ni) dùng chung cho aura và tòa ngồi thiền. Toạ độ cục bộ của đàn:
// y dọc thân từ đuôi (0) lên đầu (len), x ngang thân, mặt dây hướng +z.
// Bảy dây căng từ long ngân (đuôi) tới nhạc sơn (gần đầu); mười ba phím huy chia dây theo các
// tỉ lệ bồi âm thật 1/8 … 7/8, huy giữa (1/2) to nhất.
export const HUI = [1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4, 4 / 5, 5 / 6, 7 / 8];
export const STRINGS = 7;
const TAIL = 0.05, BRIDGE = 0.885;

/** Nửa bề rộng thân tại tỉ lệ dọc v (0 đuôi → 1 đầu): eo lưng, cổ thắt dưới đầu, đầu bo tròn. */
export function halfWidth(v, width) {
  const body = 0.36 + 0.14 * v;
  const waist = 0.035 * Math.exp(-(((v - 0.4) / 0.035) ** 2));
  const neck = 0.09 * Math.exp(-(((v - 0.82) / 0.025) ** 2));
  const tip = v > 0.94 ? Math.sqrt(Math.max(0, 1 - ((v - 0.94) / 0.06) ** 2)) : 1;
  const tail = v < 0.03 ? 0.85 + 0.15 * (v / 0.03) : 1;
  return width * (body - waist - neck) * tip * tail;
}

/** Thân đàn: tấm đùn dày có vát mép, mặt trước cong vồng nhẹ như mặt cầm thật. */
export function guqinGeometry(len, width, depth) {
  const shape = new THREE.Shape(), n = 48, side = [];
  for (let i = 0; i <= n; i++) { const v = i / n; side.push([halfWidth(v, width), v * len]); }
  shape.moveTo(-side[0][0], 0);
  side.forEach(([w, y]) => shape.lineTo(w, y));
  [...side].reverse().forEach(([w, y]) => shape.lineTo(-w, y));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.25,
    bevelSize: width * 0.035, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z > 0) {
      const w = halfWidth(Math.min(1, Math.max(0, pos.getY(i) / len)), width) || 1e-3;
      pos.setZ(i, z + depth * 0.45 * Math.max(0, 1 - (pos.getX(i) / w) ** 2));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Hai đầu dây k (0..6): [x, y] ở long ngân và nhạc sơn; dây xoè rộng dần về phía đầu đàn. */
export function stringEnds(k, len, width) {
  const t = (k - (STRINGS - 1) / 2) / ((STRINGS - 1) / 2);
  return [[t * width * 0.2, TAIL * len], [t * width * 0.3, BRIDGE * len]];
}

/** Vị trí phím huy i trên mép thân (phía -x), đo từ nhạc sơn xuống. */
export function huiPoint(i, len, width) {
  const y = (BRIDGE - HUI[i] * (BRIDGE - TAIL)) * len;
  return [-(halfWidth(y / len, width) - width * 0.07), y];
}

/** Độ cao mặt dây so với tâm thân (z), để dây nằm trên mặt cong. */
export const stringLift = depth => depth * 1.4;
