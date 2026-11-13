import * as THREE from 'three';
import { sstep } from './aura-rhythm.js';

// Sống lưng hỏa long của Long Quyền (effect 9): một đường cong CỐ ĐỊNH, tham số s từ 0 (chóp đuôi,
// trồi lên từ khe nứt dưới đất bên trái) tới 1 (gáy rồng, trước vai phải). Đoạn s ≤ COIL_END xoắn ốc
// 1,5 vòng quanh thân từ chân lên ngang ngực; mặt phẳng xoắn nghiêng nên nửa trước thấp (ngang gối,
// hông), nửa sau cao (sau lưng) — không đoạn nào đi ngang mặt. Đoạn cuối vươn thẳng ra phía trước
// theo cánh tay phải như cú tung quyền. Avatar nhìn về +z, tay phải ở +x, đầu người ở y ≈ HEAD_Y.
// Động từ "cuộn lên": hình dáng đứng yên, chỉ có sóng cơ nhẹ chạy từ đuôi lên đầu (spineWave) cùng
// vảy, lửa, tàn lửa trôi theo chiều tăng của s, tốc độ cố định.
export const HEAD_Y = 1.07, FACE_CLEAR = 0.45;
export const COIL_END = 0.72;
const TURNS = 1.5, PI = Math.PI;
// Đoạn vươn quyền: Bézier bậc ba từ cạnh sườn phải (cuối xoắn) tới gáy rồng.
// Đầu người chibi to (bán kính ≈ 0.28) nên gáy rồng lệch ra x ≈ 0.68: sừng và bờm không chạm má.
// Gáy ở ngang vai (y ≈ 0.74) để sừng rồng không nhô lên che cằm khi nhìn chéo từ phía trước.
const B0 = new THREE.Vector3(0.62, 0.94, 0), B1 = new THREE.Vector3(0.64, 0.78, 0.26);
const B2 = new THREE.Vector3(0.68, 0.74, 0.45), B3 = new THREE.Vector3(0.68, 0.74, 0.66);

/** Điểm trên sống lưng (chưa cộng sóng), ghi vào out. Vòng xoắn như lốc cuộn: rộng ở chân (đuôi trồi
    từ khe nứt xa), thu dần vào thân khi lên cao — bóng dáng to, đọc được từ xa; nửa sau chỉ dâng tới
    ngang vai nên nhìn chính diện không thành vòng tròn quanh đầu. */
export function spinePoint(s, out = new THREE.Vector3()) {
  if (s <= COIL_END) {
    const k = Math.max(0, s) / COIL_END, phi = PI / 2 + TURNS * 2 * PI * (1 - k);
    const r = 0.95 - 0.33 * sstep(0, 0.7, k), tilt = 0.22 * sstep(0.15, 0.75, k);
    return out.set(r * Math.sin(phi), -0.06 + 1.0 * Math.pow(k, 1.1) - tilt * Math.cos(phi), r * Math.cos(phi));
  }
  const u = Math.min(1, (s - COIL_END) / (1 - COIL_END)), v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return out.set(a * B0.x + b * B1.x + c * B2.x + d * B3.x, a * B0.y + b * B1.y + c * B2.y + d * B3.y,
    a * B0.z + b * B1.z + c * B2.z + d * B3.z);
}

/** Bán kính thân: chóp đuôi mảnh, thân dày, cổ thon nhẹ trước khi vào đầu. */
export const spineRadius = s => (0.014 + 0.098 * Math.pow(sstep(0, 0.32, s), 0.7)) * (1 - 0.15 * sstep(0.88, 1, s));

const ta = new THREE.Vector3(), tb = new THREE.Vector3(), ref = new THREE.Vector3();
/** Khung Frenet ổn định tại s: t tiếp tuyến (đuôi → đầu), n hướng BỤNG (ôm vào thân người khi xoắn,
    chúc xuống đất khi vươn quyền), b = t × n. Lưng rồng là −n. */
export function spineFrame(s, frame = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }) {
  const e = 0.002;
  spinePoint(s, frame.p);
  spinePoint(Math.min(1, s + e), ta); spinePoint(Math.max(0, s - e), tb);
  frame.t.subVectors(ta, tb).normalize();
  const inward = Math.hypot(frame.p.x, frame.p.z) || 1, w = sstep(0.68, 0.86, s);
  ref.set(-frame.p.x / inward * (1 - w), -w, -frame.p.z / inward * (1 - w));
  frame.n.copy(ref).addScaledVector(frame.t, -ref.dot(frame.t)).normalize();
  frame.b.crossVectors(frame.t, frame.n);
  return frame;
}

// Sóng cơ chạy dọc thân từ đuôi lên (pha s·K − time·W tăng theo s): phồng nhẹ ra ngoài, không đụng
// đầu rồng và chóp đuôi trong đất. Bản GLSL ở dưới phải khớp từng số với bản JS.
export const WAVE = { amp: 0.022, k: 10, w: 0.55 };
export const waveMask = s => sstep(0.04, 0.18, s) * (1 - sstep(0.66, 0.8, s));

/** Cộng sóng cơ vào điểm p (thuộc thân tại tham số s, tâm xoắn c) lúc time. */
export function addSpineWave(p, c, s, time) {
  const w = waveMask(s) * WAVE.amp * Math.sin(s * WAVE.k - time * WAVE.w);
  const len = Math.hypot(c.x, c.z) || 1;
  p.x += c.x / len * w; p.y += w * 0.4; p.z += c.z / len * w;
  return p;
}

export const spineWaveGlsl = `
  attribute vec3 spine;
  uniform float time;
  vec3 spineWave(float s) {
    float m = smoothstep(0.04, 0.18, s) * (1.0 - smoothstep(0.66, 0.8, s));
    float w = m * ${WAVE.amp.toFixed(4)} * sin(s * ${WAVE.k.toFixed(2)} - time * ${WAVE.w.toFixed(3)});
    vec2 rad = spine.xz / max(length(spine.xz), 1e-4);
    return vec3(rad.x * w, w * 0.4, rad.y * w);
  }
`;
