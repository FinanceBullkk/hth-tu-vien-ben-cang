// Họa tiết máy gạt cần vẽ bằng canvas: dải hình quấn quanh cuộn (bản nét và bản nhoè khi quay nhanh), bảng hiệu đèn trên nóc,
// tấm kính bảng thưởng trước thân máy và lớp bóng đổ trên ô cửa cuộn. Không dùng ảnh ngoài (CSP chỉ cho cùng nguồn);
// emoji vẽ bằng font hệ thống, tên hình in kèm để máy thiếu font emoji vẫn đọc được.
import * as THREE from 'three';
import { SLOT_SYMBOLS } from '../../../shared/slot.js';

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const SCALE = 2; // Camera đứng sát máy: vẽ gấp đôi điểm ảnh để emoji và chữ không nhoè.
const CELL = 128; // Bề ngang cuộn trên dải hình, logic px.
const BLUR_STEPS = 9;

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function scaledCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const g = canvas.getContext('2d');
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  return { canvas, g };
}

/**
 * Dải hình của một cuộn. CylinderGeometry trải u quanh chu vi và v dọc trục; cuộn nằm ngang (trục x) nên chiều ngang
 * canvas chạy vòng quanh cuộn (trái -> phải là từ dưới lên ở mặt trước), mép trên canvas là đầu bên trái của cuộn.
 * Vì thế mỗi hình được vẽ xoay 90° để đứng thẳng khi nhìn từ trước máy. Ô k nằm giữa u = (k + 0.5) / N.
 * aspect = chiều cao một ô trên cuộn (cung) chia bề ngang cuộn: ô canvas rộng CELL × aspect để hình không méo.
 * Trả { sharp, blur }: bản nhoè kéo vệt theo chiều quay, đổi sang khi cuộn quay nhanh.
 */
export function reelStripTextures(strip, aspect = 1) {
  const step = Math.round(CELL * aspect); // Bề cao một ô (theo chiều quay) trên canvas.
  const W = strip.length * step;
  const { canvas, g } = scaledCanvas(W, CELL);
  const paper = g.createLinearGradient(0, 0, 0, CELL);
  paper.addColorStop(0, '#e9dcbc');
  paper.addColorStop(0.5, '#fbf5e6');
  paper.addColorStop(1, '#e9dcbc');
  g.fillStyle = paper;
  g.fillRect(0, 0, W, CELL);
  const emoji = Math.round(step * 0.74);
  strip.forEach((id, k) => {
    const s = SLOT_SYMBOLS[id];
    const cx = k * step + step / 2;
    g.fillStyle = 'rgba(120, 70, 30, .28)';
    g.fillRect(k * step, 0, 2, CELL); // Vạch ngăn giữa hai ô.
    g.save();
    g.translate(cx, CELL / 2);
    g.rotate(Math.PI / 2); // Từ đây trục ngang là bề ngang cuộn (CELL), trục dọc là chiều quay (step).
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#000'; // Emoji màu vẫn nhận độ trong của fillStyle: phải đặc, không thì hình mờ.
    g.font = `${emoji}px ${EMOJI_FONT}`;
    g.fillText(s.icon, 0, -step * 0.07);
    g.font = `700 ${Math.round(step * 0.12)}px ${SERIF}`;
    g.fillStyle = s.color;
    g.fillText(s.name.toUpperCase(), 0, step * 0.41);
    g.restore();
  });
  const sharp = canvasTexture(canvas);

  // Bản nhoè: chồng nhiều bản lệch dọc theo chiều quay (trục ngang canvas), vòng qua mép để không có vết nối.
  const blur = scaledCanvas(W, CELL);
  blur.g.setTransform(1, 0, 0, 1, 0, 0);
  blur.g.fillStyle = '#f3ead2'; // Nền đặc: các bản chồng mờ không để lại chỗ trong suốt.
  blur.g.fillRect(0, 0, canvas.width, canvas.height);
  blur.g.globalAlpha = 1 / BLUR_STEPS * 1.6;
  for (let i = 0; i < BLUR_STEPS; i++) {
    const dx = ((i / (BLUR_STEPS - 1)) - 0.5) * step * 0.9 * SCALE;
    blur.g.drawImage(canvas, dx, 0);
    blur.g.drawImage(canvas, dx + (dx < 0 ? canvas.width : -canvas.width), 0);
  }
  return { sharp, blur: canvasTexture(blur.canvas) };
}

/** Bảng hiệu nóc máy: nền đỏ son viền vàng, chữ "GẠT CẦN" và dòng nổ hũ. Vẽ bằng vật liệu không chịu sáng nên luôn rực. */
export function marqueeTexture() {
  const W = 512;
  const H = 160;
  const { canvas, g } = scaledCanvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#b3271b');
  bg.addColorStop(1, '#5e0c08');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#f1c75b';
  g.lineWidth = 8;
  g.strokeRect(8, 8, W - 16, H - 16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `52px ${EMOJI_FONT}`;
  g.fillText('🐉', 62, H / 2);
  g.fillText('🐉', W - 62, H / 2);
  const gold = g.createLinearGradient(0, 30, 0, 110);
  gold.addColorStop(0, '#fff3b0');
  gold.addColorStop(0.55, '#f2c14e');
  gold.addColorStop(1, '#b7791f');
  g.fillStyle = gold;
  g.shadowColor = 'rgba(0, 0, 0, .55)';
  g.shadowBlur = 6;
  g.font = `900 64px ${SERIF}`;
  g.fillText('GẠT CẦN', W / 2, 66);
  g.shadowBlur = 0;
  g.fillStyle = '#ffe8b0';
  g.font = `700 24px ${SERIF}`;
  g.fillText('Ba Rồng · Nổ hũ ×200', W / 2, 122);
  return canvasTexture(canvas);
}

/** Tấm kính bảng thưởng trước thân máy: mỗi hàng một hình, ăn bộ ba và ăn đôi. */
export function paytableTexture() {
  const W = 512;
  const H = 384;
  const { canvas, g } = scaledCanvas(W, H);
  g.fillStyle = '#2a0907';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d9a83f';
  g.lineWidth = 6;
  g.strokeRect(6, 6, W - 12, H - 12);
  g.textBaseline = 'middle';
  g.fillStyle = '#f6d47a';
  g.font = `800 30px ${SERIF}`;
  g.textAlign = 'center';
  g.fillText('BẢNG THƯỞNG', W / 2, 38);
  g.font = `600 17px ${SERIF}`;
  g.fillStyle = '#e8cfa0';
  g.fillText('ba hình            đôi bất kỳ', W / 2 + 70, 68);
  const rows = [...SLOT_SYMBOLS.keys()].reverse(); // Rồng trên cùng.
  rows.forEach((id, r) => {
    const s = SLOT_SYMBOLS[id];
    const y = 104 + r * 46;
    if (r % 2 === 0) {
      g.fillStyle = 'rgba(255, 220, 140, .07)';
      g.fillRect(18, y - 21, W - 36, 42);
    }
    g.textAlign = 'left';
    g.fillStyle = '#000';
    g.font = `30px ${EMOJI_FONT}`;
    g.fillText(`${s.icon}${s.icon}${s.icon}`, 30, y + 1);
    g.font = `700 19px ${SERIF}`;
    g.fillStyle = '#f3e3c0';
    g.fillText(s.name, 152, y);
    g.textAlign = 'right';
    g.font = `900 28px ${SERIF}`;
    g.fillStyle = id === SLOT_SYMBOLS.length - 1 ? '#ffd23f' : '#ffe9b8';
    g.fillText(`×${s.triple}`, 352, y);
    g.font = `800 22px ${SERIF}`;
    g.fillStyle = s.pair > 0 ? '#9fe6a8' : 'rgba(255, 255, 255, .3)';
    g.fillText(s.pair > 0 ? `×${s.pair}` : '–', 470, y);
  });
  return canvasTexture(canvas);
}

/** Bóng đổ trên ô cửa cuộn: tối ở mép trên/dưới, trong suốt ở giữa, cho cảm giác cuộn tròn khuất vào thân máy. */
export function reelShadeTexture() {
  const { canvas, g } = scaledCanvas(4, 128);
  const shade = g.createLinearGradient(0, 0, 0, 128);
  shade.addColorStop(0, 'rgba(0, 0, 0, .82)');
  shade.addColorStop(0.28, 'rgba(0, 0, 0, .05)');
  shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.72, 'rgba(0, 0, 0, .05)');
  shade.addColorStop(1, 'rgba(0, 0, 0, .82)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 4, 128);
  return canvasTexture(canvas);
}
