// Bố cục dùng chung của Sen kim (effect 1) — Cửu Phẩm Kim Liên. Theo bảng phân vai aura:
//  Bóng dáng: người ĐỨNG TRÊN ĐÀI SEN VÀNG NỞ — đài sen ba tầng sát đất, cánh ngoài cuốn ngược
//    ôm chân, đế đài vàng phía dưới; từ vai trở lên để trống, đọc rõ dáng người.
//  Phía sau: bồ nhụy vàng nhỏ y ngực, thấp sau lưng (không dựng khung, không vòm).
//  Động từ: NỞ LỆCH NHỊP — từng cánh nhịp nở/khép lệch pha nhau, gân cánh có dòng khí chảy
//    chậm từ gốc lên ngọn, hoạt lộ lăn theo gân rồi rụng. Tốc độ cố định, không lóe gắt.
//  Nền đất: hào quang vàng mềm dưới đài + bóng thẫm neo khối.
//  Không có: mandala, vòng chữ triện, trận đồ, trụ sáng, vòm kết giới, phiêu đái, lưu quang
//  (đúng bảng định hướng docs/vfx-reference-direction.md: gân cánh mảnh, sáng chọn lọc viền).

/** Chu kỳ nhịp thở (giây). */
export const SEN_KIM_CYCLE = 11;
/** Tốc độ xoay chậm của cả đài sen (rad/giây, ngược chiều kim đồng hồ nhìn từ trên). */
export const SPIN = 0.045;
/** Tâm đầu nhân vật và vùng chừa trống quanh mặt (giống quy ước Xích Diễm). */
export const HEAD_Y = 1.07, FACE_CLEAR = 0.45;
/** Trần của mọi điểm nhìn thấy — dưới vai để không che người. */
export const TOP_Y = 0.92;

// Ba tầng cánh sen: ngoài xòe rộng cuốn ngược ôm chân, giữa hướng lên so le, trong thấp ôm nhụy.
// lean = góc ngả từ phương thẳng đứng (rad); stag = pha nở lệch nhịp riêng của tầng.
export const TIERS = [
  { n: 12, r: 1.04, y: 0.055, len: 0.6, lean: 1.14, stag: 0, w: 1.5 },
  { n: 9, r: 0.7, y: 0.1, len: 0.46, lean: 0.9, stag: Math.PI / 9, w: 1.15 },
  { n: 5, r: 0.4, y: 0.13, len: 0.32, lean: 0.72, stag: 0.31, w: 0.85 },
];
/** Tổng số cánh của đài (12 + 9 + 5). */
export const PETAL_COUNT = TIERS.reduce((s, t) => s + t.n, 0);

// Bồ nhụy sau lưng: cụm chỉ nhỏ y ngực, đặt sau (z < -0.3) nên không vào vùng chừa mặt.
export const STAMEN = { y: 0.72, z: -0.52, filaments: 5 };

const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

/** Góc quanh đài của cánh toàn cục i tại thời điểm time: tầng giữa lệch nửa bước, tầng trong
    lệch thêm một bước, cả đài xoay chậm đều theo SPIN. */
export function petalAngle(i, time) {
  let rest = i;
  for (const tier of TIERS) {
    if (rest < tier.n) {
      const half = tier.n === TIERS[0].n ? 0 : 0.5;
      return (rest + half) * Math.PI * 2 / tier.n + tier.stag - SPIN * time;
    }
    rest -= tier.n;
  }
  return 0;
}

/** Cấu hình tầng và chỉ số trong tầng của cánh toàn cục i. */
export function petalTier(i) {
  let rest = i;
  for (let t = 0; t < TIERS.length; t++) {
    if (rest < TIERS[t].n) return { tier: TIERS[t], index: t, j: rest };
    rest -= TIERS[t].n;
  }
  return { tier: TIERS[0], index: 0, j: 0 };
}

/** Hệ số nở riêng của từng cánh theo thời gian: mỗi cánh một pha — cánh nở lệch nhịp. */
export function petalBloom(i, time) {
  const { index, j } = petalTier(i);
  const phase = TIERS[index].stag + hash(j * 7 + index * 3 + 1) * 1.1;
  return 0.5 + 0.5 * Math.sin(Math.PI * 2 * time / SEN_KIM_CYCLE - phase);
}

/** Vị trí đặt cánh toàn cục i tại thời điểm time: gốc cánh trên mép tầng, lean nở theo nhịp. */
export function petalPlace(i, time, out = {}) {
  const { tier, index } = petalTier(i);
  const bloom = petalBloom(i, time), a = petalAngle(i, time);
  const r = tier.r * (1 - 0.045 * (1 - bloom));
  out.x = Math.sin(a) * r; out.y = tier.y; out.z = Math.cos(a) * r;
  out.lean = tier.lean * (0.94 + 0.06 * bloom);
  out.scale = 0.93 + 0.07 * bloom;
  out.angle = a;
  return out;
}

/** Điểm trên sống giữa cánh toàn cục i tại tỉ lệ chiều dài v (0 gốc → 1 ngọn), để hoạt lộ
    bám gân. v > 1 là rơi tiếp khỏi ngọn cánh theo hướng ngả. */
export function petalPoint(i, v, time, out) {
  const p = petalPlace(i, time);
  const { tier } = petalTier(i);
  const len = tier.len * p.scale;
  const d = Math.max(0, v);
  const rise = Math.min(1, d) * len;
  // Vểnh đầu cánh chỉ tính trong thân cánh (v ≤ 1); phần rơi tiếp theo chỉ đi xuống.
  const flick = Math.pow(Math.max(0, Math.min(d, 1) - 0.68) / 0.32, 2) * 0.2 * len;
  const fall = Math.max(0, d - 1); // hoạt lộ rơi khỏi ngọn
  const dx = Math.sin(p.angle), dz = Math.cos(p.angle);
  const lean = p.lean;
  out.x = p.x + dx * (Math.sin(lean) * rise) + dx * fall * 0.6;
  out.y = p.y + Math.cos(lean) * rise + flick - fall * fall * 1.6;
  out.z = p.z + dz * (Math.sin(lean) * rise) + dz * fall * 0.6;
  return out;
}
