// Nét vẽ riêng của Đào Hoa, chồng lên bút chung của aura-canvas-kit (p = pen):
// bông đào khía tim (có nhụy) và lá non có gân.
// Hệ toạ độ như bút chung: tâm (0,0), góc 0 hướng lên, tăng theo chiều kim đồng hồ.

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

  return { blossom, leaf };
}
