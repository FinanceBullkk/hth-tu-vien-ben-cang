import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { hash } from './aura-billboard-layer.js';

// Texture "giang hồ" của Bích Ngọc: cờ phướn vải cũ viết chữ bút lông, bia đá khắc chữ, sương
// thủy mặc. Vẽ màu thật (normal blend). Khung vẽ 1024 tâm (0, 0); tấm phẳng không vuông nên chữ
// vẽ co theo tỉ lệ để không bị kéo giãn.
const TAU = Math.PI * 2;

/** Cờ phướn: rộng × cao (m). */
export const BANNER_SIZE = [0.46, 1.32];
export function bichNgocBanner() {
  return canvasTexture('bich-ngoc-banner', 512, ({ c }) => {
    const k = BANNER_SIZE[0] / BANNER_SIZE[1];
    // Thân vải ngà cũ, đuôi nheo xẻ hai ở dưới, mép hơi sờn.
    c.beginPath(); c.moveTo(-470, -512);
    for (let y = -512; y <= 380; y += 32) c.lineTo(-470 + 10 * (hash(y) - 0.5), y);
    c.lineTo(-430, 512); c.lineTo(-60, 300); c.lineTo(0, 330); c.lineTo(60, 300); c.lineTo(430, 512);
    for (let y = 380; y >= -512; y -= 32) c.lineTo(470 + 10 * (hash(y + 5) - 0.5), y);
    c.closePath(); c.fillStyle = 'rgb(232,220,188)'; c.fill();
    c.save(); c.clip();
    // Vết ố loang và thớ vải.
    for (let i = 0; i < 24; i++) {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(150,120,70,0.22)'); g.addColorStop(1, 'rgba(150,120,70,0)');
      c.save(); c.translate((hash(i) - 0.5) * 900, (hash(i + 30) - 0.5) * 1000); c.scale(60 + 120 * hash(i + 60), 40 + 90 * hash(i + 90));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
    }
    c.strokeStyle = 'rgba(120,100,60,0.12)'; c.lineWidth = 2;
    for (let x = -460; x < 470; x += 14) { c.beginPath(); c.moveTo(x, -512); c.lineTo(x + 4, 512); c.stroke(); }
    // Dải đầu cờ màu ngọc bích sẫm, viền chỉ vàng.
    c.fillStyle = 'rgb(22,84,60)'; c.fillRect(-512, -512, 1024, 110);
    c.strokeStyle = 'rgb(214,196,120)'; c.lineWidth = 8; c.beginPath(); c.moveTo(-480, -396); c.lineTo(480, -396); c.stroke();
    c.lineWidth = 5; c.strokeRect(-430, -370, 860, 640);
    c.restore();
    // Chữ 清 風 bút lông đậm, mực loang nhẹ ở mép.
    c.save(); c.scale(1, k); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 640px ${CJK_FONT}`;
    c.shadowColor = 'rgba(20,30,25,0.5)'; c.shadowBlur = 18; c.fillStyle = 'rgb(20,26,22)';
    c.fillText('清', 0, -150 / k); c.fillText('風', 0, 170 / k);
    c.restore();
    // Triện son đóng góc dưới trái: ô vuông đỏ, chữ 竹 trắng.
    c.save(); c.translate(-250, 268); c.scale(1, k * 2.4);
    c.fillStyle = 'rgb(178,30,36)'; c.fillRect(-70, -70, 140, 140);
    c.fillStyle = 'rgb(245,226,206)'; c.font = `110px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('竹', 0, 6);
    c.restore();
  });
}

/** Bia đá: mặt khắc rộng × cao (m) — hai cột chữ 竹林 · 聽風 khắc chìm, khung chỉ, rêu bám mép. */
export const STELE_FACE = [0.34, 0.66];
export function bichNgocSteleFace() {
  return canvasTexture('bich-ngoc-stele-face', 512, ({ c }) => {
    const k = STELE_FACE[0] / STELE_FACE[1];
    c.strokeStyle = 'rgba(40,52,46,0.8)'; c.lineWidth = 12; c.strokeRect(-440, -470, 880, 940);
    c.lineWidth = 4; c.strokeRect(-400, -430, 800, 860);
    c.save(); c.scale(1, k); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `330px ${CJK_FONT}`;
    for (const [x, text] of [[190, '竹林'], [-190, '聽風']]) {
      [...text].forEach((ch, i) => {
        const y = (i ? 250 : -250) / k;
        c.fillStyle = 'rgba(230,236,226,0.55)'; c.fillText(ch, x + 6, y + 8 / k); // mép sáng của nét khắc
        c.fillStyle = 'rgba(26,40,34,0.92)'; c.fillText(ch, x, y);
      });
    }
    c.restore();
    for (let i = 0; i < 40; i++) {
      const side = i % 4, t = hash(i) * 2 - 1;
      const x = side < 2 ? (side ? 1 : -1) * (440 + 30 * hash(i + 9)) : t * 460, y = side < 2 ? t * 480 : (side === 2 ? 1 : -1) * (470 + 30 * hash(i + 9));
      c.fillStyle = `rgba(${80 + 30 * hash(i + 3)},${130 + 30 * hash(i + 4)},60,0.75)`;
      c.beginPath(); c.arc(x, y, 18 + 30 * hash(i + 5), 0, TAU); c.fill();
    }
  });
}

/** Sương thủy mặc: một đám mây khói mềm nhiều cụm, trắng (shader tô màu). */
export function bichNgocMist() {
  return canvasTexture('bich-ngoc-ink-mist', 128, ({ c }) => {
    for (let i = 0; i < 9; i++) {
      const x = (hash(i) - 0.5) * 560, y = (hash(i + 20) - 0.5) * 200, r = 180 + 160 * hash(i + 40);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  });
}
