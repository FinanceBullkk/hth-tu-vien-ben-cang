import * as THREE from 'three';

// Bộ nét vẽ hoa văn cho Kiếm Vũ: vẽ trắng trên nền trong suốt (shader tô màu sau), nét
// có quầng mờ như aura-sigil của Kim Liên. Mỗi texture vẽ một lần, dùng chung mọi nhân vật.
const cache = new Map();
export const CJK_FONT = '"KaiTi", "STKaiti", "SimSun", serif';

/** Texture canvas có cache; môi trường không có DOM (test Node) nhận texture 1×1 rỗng. */
export function canvasTexture(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  let texture;
  if (globalThis.document?.createElement) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const c = canvas.getContext('2d');
    c.translate(size / 2, size / 2); c.scale(size / 1024, size / 1024);
    c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    draw(pen(c));
    texture = new THREE.CanvasTexture(canvas);
  } else {
    texture = new THREE.DataTexture(new Uint8Array(4), 1, 1); texture.needsUpdate = true;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

// Hệ toạ độ vẽ: tâm (0,0), bán kính đầy khung 512; góc 0 = hướng lên, tăng theo chiều kim đồng hồ.
function pen(c) {
  const stroke = (path, width = 2, alpha = 1) => {
    c.save(); c.globalAlpha = alpha; c.beginPath(); path();
    c.save(); c.globalAlpha = alpha * 0.2; c.lineWidth = width * 6; c.shadowColor = '#fff'; c.shadowBlur = 12; c.stroke(); c.restore();
    c.lineWidth = width * 1.8; c.stroke(); c.restore();
  };
  const at = (angle, fn) => { c.save(); c.rotate(angle); fn(); c.restore(); };
  const ring = (r, width = 1.2, alpha = 1) => stroke(() => c.arc(0, 0, r, 0, Math.PI * 2), width, alpha);
  return {
    c, stroke, at, ring,
    /** Lặp n lần quanh tâm, lệch pha offset (đơn vị: một bước). */
    around(n, fn, offset = 0) { for (let i = 0; i < n; i++) at((i + offset) * Math.PI * 2 / n, () => fn(i)); },
    /** Đa giác sao {n/k} nội tiếp bán kính r — lưới đan xen tạo chiều sâu hình học. */
    star(n, k, r, width = 0.8, alpha = 0.3) {
      stroke(() => {
        for (let i = 0; i <= n; i++) {
          const a = (i * k % n) * Math.PI * 2 / n;
          if (i) c.lineTo(Math.sin(a) * r, -Math.cos(a) * r); else c.moveTo(Math.sin(a) * r, -Math.cos(a) * r);
        }
      }, width, alpha);
    },
    /** Viền thanh kiếm hướng tâm → ngoài, từ r0 (núm) tới r1 (mũi), kèm rãnh sáng giữa lưỡi. */
    sword(r0, r1, w, width = 1.4, alpha = 1) {
      const len = r1 - r0, guard = r0 + len * 0.24, hilt = r0 + len * 0.06;
      stroke(() => {
        c.moveTo(0, -guard); c.lineTo(-w, -(guard + len * 0.05)); c.lineTo(-w * 0.8, -(r1 - len * 0.16));
        c.lineTo(0, -r1); c.lineTo(w * 0.8, -(r1 - len * 0.16)); c.lineTo(w, -(guard + len * 0.05)); c.closePath();
      }, width, alpha);
      stroke(() => { c.moveTo(0, -(guard + len * 0.08)); c.lineTo(0, -(r1 - len * 0.2)); }, width * 0.5, alpha * 0.7);
      // Chắn tay cong mây: hai cuộn xoắn ốc nhỏ ở hai đầu.
      stroke(() => {
        c.moveTo(-w * 2.6, -guard + 4); c.quadraticCurveTo(0, -guard - 8, w * 2.6, -guard + 4);
      }, width, alpha);
      for (const s of [-1, 1]) stroke(() => c.arc(s * w * 2.6, -guard + 10, 6, 0, Math.PI * 1.5 * s, s < 0), width * 0.7, alpha);
      stroke(() => { c.moveTo(0, -guard + 4); c.lineTo(0, -hilt); }, width * 1.3, alpha);
      stroke(() => c.arc(0, -hilt + 6, 6, 0, Math.PI * 2), width * 0.8, alpha);
    },
    /** Tường vân: cụm mây cuộn ba vòng, dùng chen giữa các motif. */
    cloud(x, y, s, width = 1, alpha = 0.6) {
      stroke(() => {
        c.moveTo(x - 22 * s, y + 6 * s);
        c.bezierCurveTo(x - 30 * s, y - 12 * s, x - 8 * s, y - 20 * s, x - 4 * s, y - 6 * s);
        c.bezierCurveTo(x - 2 * s, y - 22 * s, x + 22 * s, y - 22 * s, x + 18 * s, y - 4 * s);
        c.bezierCurveTo(x + 32 * s, y - 6 * s, x + 30 * s, y + 10 * s, x + 18 * s, y + 8 * s);
      }, width, alpha);
      stroke(() => c.arc(x - 6 * s, y - 4 * s, 5 * s, Math.PI, Math.PI * 2.6), width * 0.7, alpha);
      stroke(() => c.arc(x + 10 * s, y - 8 * s, 4 * s, Math.PI, Math.PI * 2.6), width * 0.7, alpha);
    },
    /** Quẻ bát quái (bits: 1 = hào liền), đặt ở bán kính r. */
    trigram(bits, r, width = 1.6, alpha = 0.85) {
      for (let k = 0; k < 3; k++) {
        const y = -r - k * 13;
        if (bits >> k & 1) stroke(() => { c.moveTo(-26, y); c.lineTo(26, y); }, width, alpha);
        else for (const s of [-1, 1]) stroke(() => { c.moveTo(s * 26, y); c.lineTo(s * 6, y); }, width, alpha);
      }
    },
    /** Chữ đặt tiếp tuyến ở bán kính r. */
    glyph(text, r, px, alpha = 0.9) {
      c.save(); c.globalAlpha = alpha; c.font = `${px}px ${CJK_FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#fff'; c.shadowBlur = 8; c.fillText(text, 0, -r); c.restore();
    },
    /** Hạt trân châu/hình thoi nhỏ. */
    diamond(r, s, width = 1, alpha = 0.9) {
      stroke(() => { c.moveTo(0, -r - s); c.lineTo(s * 0.6, -r); c.lineTo(0, -r + s); c.lineTo(-s * 0.6, -r); c.closePath(); }, width, alpha);
    },
    /** Đốm sáng mềm (lớp glow). */
    dot(x, y, r, a) {
      const g = c.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff';
    },
  };
}
