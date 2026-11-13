import * as THREE from 'three';
import { sstep, bell } from './aura-rhythm.js';

// Trục thân rồng Kim Long (effect 11): MỘT VÒM vắt qua đầu, không quấn quanh thân.
// u = 0 chóp đuôi thấp ở vai trái, u = 1 gốc đầu rồng ở vai phải. Thân vồng lên sau đầu (đỉnh
// cao hơn đỉnh đầu ~0.6), hạ xuống vai phải rồi cổ ngoặt ra trước, ngóc đầu vào trong ngậm long châu.
// Toạ độ theo gốc chân nhân vật; đầu nhân vật ở y = HEAD_Y, bán kính 0.3.
export const HEAD_Y = 1.07;
const CONTROL = [
  [-0.9, 0.32, 0.12], [-1.0, 0.56, -0.02], [-0.92, 0.98, -0.2], [-0.74, 1.46, -0.34],
  [-0.42, 1.84, -0.44], [0, 2.0, -0.48], [0.42, 1.86, -0.44], [0.78, 1.52, -0.34],
  [0.98, 1.08, -0.2], [0.98, 0.74, -0.04], [0.97, 0.8, 0.1], [0.92, 1.02, 0.14],
];
const SAMPLES = 240;

// Sóng "lượn uốn": chạy từ đầu về đuôi (pha K·u + Ω·t), tốc độ cố định, không phụ thuộc nhịp thở.
export const WAVE = { K: Math.PI * 2 * 2.4, OMEGA: 0.75 };

/** Biên độ sóng tại u: đuôi vẫy rộng hơn, cổ và đầu gần như đứng yên để giữ long châu. */
export const waveAmp = u => 0.06 * (0.8 + 0.5 * (1 - u)) * (1 - sstep(0.8, 0.96, u)) * sstep(0, 0.04, u + 0.02);

/** Độ dày thân: chóp đuôi mảnh, thân giữa dày, cổ thắt nhẹ trước khi vào đầu. */
export const bodyRadius = u => 0.016 + 0.118 * sstep(0, 0.42, u) - 0.022 * bell(0.88, 0.07, u);

/** Độ lệch sóng tại (u, t): n theo hướng lưng (pháp tuyến ngoài), b theo hướng ngang. */
export function waveAt(u, t) {
  const phase = WAVE.K * u + WAVE.OMEGA * t, a = waveAmp(u);
  return { n: a * Math.sin(phase), b: 0.45 * a * Math.cos(phase) };
}

// Mẫu tĩnh: vị trí, tiếp tuyến T, lưng N (vận chuyển song song, khởi đầu cross(Z, T)), sườn B.
const curve = new THREE.CatmullRomCurve3(CONTROL.map(p => new THREE.Vector3(...p)), false, 'centripetal');
const rest = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const u = i / SAMPLES;
  return { p: curve.getPointAt(u), t: curve.getTangentAt(u).normalize(), n: new THREE.Vector3(), b: new THREE.Vector3() };
});
rest[0].n.crossVectors(new THREE.Vector3(0, 0, 1), rest[0].t).normalize();
for (let i = 1; i <= SAMPLES; i++) {
  const prev = rest[i - 1], cur = rest[i];
  cur.n.copy(prev.n).addScaledVector(cur.t, -prev.n.dot(cur.t)).normalize();
}
rest.forEach(s => s.b.crossVectors(s.t, s.n).normalize());
/** Chiều dài thân (m). */
export const SPINE_LENGTH = curve.getLength();

/** Khung tĩnh tại u (nội suy giữa các mẫu): ghi p, t, n, b vào out. */
export function restFrame(u, out) {
  const x = Math.min(SAMPLES, Math.max(0, u * SAMPLES)), i = Math.min(SAMPLES - 1, Math.floor(x)), k = x - i;
  const a = rest[i], c = rest[i + 1];
  out.p.lerpVectors(a.p, c.p, k); out.t.lerpVectors(a.t, c.t, k).normalize();
  out.n.lerpVectors(a.n, c.n, k).normalize(); out.b.lerpVectors(a.b, c.b, k).normalize();
  return out;
}

/** Khung tại (u, t): khung tĩnh cộng độ lệch sóng vào vị trí. */
export function spineFrame(u, t, out) {
  restFrame(u, out);
  const w = waveAt(u, t);
  out.p.addScaledVector(out.n, w.n).addScaledVector(out.b, w.b);
  return out;
}

export const newFrame = () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() });

/** Điểm điều khiển (bản sao) để tòa ngồi thiền dựng vòm thu nhỏ cùng dáng. */
export const spineControl = () => CONTROL.map(p => [...p]);
