// Nét vẽ riêng của Đào Hoa, chồng lên bút chung của aura-canvas-kit (p = pen):
// bông đào khía tim, lá non, nét bút lông khô hở đầu.
// Hệ toạ độ như bút chung: tâm (0,0), góc 0 hướng lên, tăng theo chiều kim đồng hồ.

/** Giả ngẫu nhiên tất định — hoa văn giống hệt nhau mỗi lần vẽ. */
const rand = n => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
const polar = (r, a) => [Math.sin(a) * r, -Math.cos(a) * r];

/** Đường viền một cánh đào dài s hướng lên, chóp khía tim. */
export function petalPath(c, s) {
  c.moveTo(0, -0.1 * s);
  c.bezierCurveTo(-0.5 * s, -0.32 * s, -0.58 * s, -0.95 * s, -0.2 * s, -1.0 * s);
  c.quadraticCurveTo(-0.06 * s, -1.0 * s, 0, -0.88 * s);
  c.quadraticCurveTo(0.06 * s, -1.0 * s, 0.2 * s, -1.0 * s);
  c.bezierCurveTo(0.58 * s, -0.95 * s, 0.5 * s, -0.32 * s, 0, -0.1 * s);
}

export function daoHoaMotifs(p) {
  const { c, stroke } = p;
  const place = (x, y, rot, fn) => { c.save(); c.translate(x, y); c.rotate(rot); fn(); c.restore(); };

  /** Bông đào năm cánh tại (x, y), bán kính s; nhụy tỏa tia có đầu chấm. */
  const blossom = (x, y, s, width = 1.2, alpha = 0.9, rot = 0, stamens = true) => place(x, y, rot, () => {
    for (let i = 0; i < 5; i++) place(0, 0, i * Math.PI * 2 / 5, () => stroke(() => petalPath(c, s), width, alpha));
    if (!stamens) return;
    for (let i = 0; i < 10; i++) place(0, 0, (i + 0.5) * Math.PI / 5, () => {
      stroke(() => { c.moveTo(0, -s * 0.14); c.lineTo(0, -s * 0.36); }, width * 0.5, alpha * 0.8);
      stroke(() => c.arc(0, -s * 0.4, Math.max(1.5, s * 0.035), 0, Math.PI * 2), width * 0.6, alpha);
    });
  });

  /** Lá non thuôn tại (x, y) hướng góc rot, dài s, có gân giữa. */
  const leaf = (x, y, s, rot, width = 0.9, alpha = 0.7) => place(x, y, rot, () => {
    stroke(() => { c.moveTo(0, 0); c.quadraticCurveTo(-s * 0.3, -s * 0.5, 0, -s); c.quadraticCurveTo(s * 0.3, -s * 0.5, 0, 0); }, width, alpha);
    stroke(() => { c.moveTo(0, -s * 0.1); c.lineTo(0, -s * 0.85); }, width * 0.5, alpha * 0.7);
  });

  /** Nét bút lông khô quanh tâm ở bán kính r, bề dày w, từ góc a0 tới a1 (radian, 0 = lên):
      nhiều sợi lông lệch nhau, đầu cuối xơ tưa và nhạt dần — cung hở, không khép đều nét. */
  const brushArc = (r, w, a0, a1, alpha = 0.9, seed = 1, hairs = 9) => {
    for (let h = 0; h < hairs; h++) {
      const off = (h / (hairs - 1) - 0.5) * w, j = rand(seed * 17 + h);
      const s0 = a0 + (a1 - a0) * 0.04 * j * (1 + Math.abs(off) / w * 3);
      const s1 = a1 - (a1 - a0) * 0.05 * rand(seed * 29 + h) * (1 + Math.abs(off) / w * 3);
      const thin = 1 - Math.abs(off) / w;
      stroke(() => c.arc(0, 0, r + off, s0 - Math.PI / 2, s1 - Math.PI / 2), 0.6 + 1.6 * thin, alpha * (0.35 + 0.65 * thin) * (0.7 + 0.3 * j));
    }
  };

  return { blossom, leaf, brushArc, polar, rand };
}
