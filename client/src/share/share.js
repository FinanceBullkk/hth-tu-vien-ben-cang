// Ảnh chia sẻ và thẻ lời chúc, vẽ bằng canvas nên tiếng Việt dùng font hệ thống đúng dấu.
import { fetchBook } from '../ui/book.js';
import { downloadBlob, h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

const FONT = '"Segoe UI","Noto Sans",Roboto,"Helvetica Neue",Arial,sans-serif';
const SERIF = '"Palatino Linotype","Book Antiqua",Palatino,"Noto Serif",Georgia,serif';

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s,.]*$/, '')}…`;
    return kept;
  }
  return lines;
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/** Chụp một khung WebGL: phải vẽ lại ngay trước khi đọc vì buffer không được giữ giữa các khung. */
export function captureScene(app) {
  const { renderer, scene, camera } = app;
  renderer.render(scene, camera);
  return renderer.domElement;
}

export function renderShareCard({ sceneCanvas, name, wish, fortune }) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Nền giấy ấm
  ctx.fillStyle = '#21140e';
  ctx.fillRect(0, 0, W, H);

  // Ảnh cảnh: cắt phần giữa cho khớp khung
  const imgH = 720;
  const sw = sceneCanvas.width;
  const sh = sceneCanvas.height;
  const scale = Math.max(W / sw, imgH / sh);
  const cropW = W / scale;
  const cropH = imgH / scale;
  ctx.drawImage(sceneCanvas, (sw - cropW) / 2, (sh - cropH) / 2, cropW, cropH, 0, 0, W, imgH);

  const grad = ctx.createLinearGradient(0, imgH - 200, 0, imgH);
  grad.addColorStop(0, 'rgba(33,20,14,0)');
  grad.addColorStop(1, 'rgba(33,20,14,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, imgH - 200, W, 200);

  const left = 72;
  const textW = W - left * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7e6c4';
  ctx.font = `700 64px ${SERIF}`;
  drawLines(ctx, wrap(ctx, name, textW, 1), left, imgH + 20, 70);

  let y = imgH + 92;
  const section = (label, text, font, maxLines) => {
    ctx.fillStyle = '#e0a458';
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(label, left, y);
    y += 50;
    ctx.fillStyle = '#fbf3e0';
    ctx.font = font;
    y = drawLines(ctx, wrap(ctx, text, textW, maxLines), left, y, 50);
    y += 26;
  };
  if (wish) section('Lời ước', `“${wish}”`, `500 38px ${SERIF}`, 3);
  if (fortune) section('Quẻ hôm nay', fortune, `400 36px ${FONT}`, 2);
  ctx.fillStyle = '#b98d5e';
  ctx.font = `600 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('HTH – Tu viện bên cảng', W / 2, H - 46);
  return canvas;
}

/** Thẻ lời chúc để gửi Zalo. */
export function renderFortuneCard(f) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6edd9';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#7a3a22';
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  ctx.fillStyle = '#7a3a22';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `800 62px ${FONT}`;
  ctx.fillText('LỜI CHÚC HÔM NAY', 90, 150);
  let y = 260;
  const line = (yy) => {
    ctx.strokeStyle = 'rgba(122,58,34,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, yy);
    ctx.lineTo(W - 90, yy);
    ctx.stroke();
  };
  line(y);
  ctx.fillStyle = '#2b1c13';
  ctx.font = `600 56px ${SERIF}`;
  drawLines(ctx, wrap(ctx, `“${f.text}”`, W - 180, 7), 90, y + 110, 78);
  line(y);

  ctx.fillStyle = '#8b6a4f';
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText(`Ngày ${f.date} · Mang tính giải trí`, 90, H - 90);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a8432a';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('HTH', W - 90, H - 88);
  return canvas;
}

export async function openShare(app) {
  const body = h('div', { class: 'share-stage' }, h('p', { class: 'muted' }, 'Đang vẽ ảnh…'));
  let url = null;
  let canvas = null;
  openModal({
    title: 'Chia sẻ',
    content: body,
    onClose: () => {
      // Giải phóng bộ nhớ ảnh khi đóng màn hình phụ.
      if (url) URL.revokeObjectURL(url);
      if (canvas) canvas.width = 0;
    },
  });

  const sceneCanvas = captureScene(app);
  // Chép ngay, trước khi có await: sau đó buffer WebGL có thể đã bị xoá.
  const snap = document.createElement('canvas');
  snap.width = sceneCanvas.width;
  snap.height = sceneCanvas.height;
  snap.getContext('2d').drawImage(sceneCanvas, 0, 0);

  let book = null;
  try {
    book = await fetchBook();
  } catch {
    // Vẫn vẽ được ảnh chỉ có cảnh và tên.
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const fortune = book?.fortunes.find((f) => f.date === today)?.text;
  canvas = renderShareCard({
    sceneCanvas: snap,
    name: app.myName,
    wish: book?.wishes[0]?.text,
    fortune,
  });
  snap.width = 0;

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    body.replaceChildren(h('p', {}, 'Chưa vẽ được ảnh, thử lại nhé.'));
    return;
  }
  url = URL.createObjectURL(blob);
  const file = new File([blob], 'hth-tu-vien.png', { type: 'image/png' });
  const buttons = h('div', { class: 'row-center' });
  if (navigator.canShare?.({ files: [file] })) {
    const shareBtn = h('button', { class: 'btn primary', type: 'button' }, 'Chia sẻ');
    shareBtn.addEventListener('click', () => {
      navigator.share({ files: [file], title: 'HTH – Tu viện bên cảng' }).catch(() => {});
    });
    buttons.append(shareBtn);
  }
  const dl = h('button', { class: 'btn primary', type: 'button' }, 'Tải ảnh về');
  dl.addEventListener('click', () => downloadBlob(blob, 'hth-tu-vien.png'));
  buttons.append(dl);
  body.replaceChildren(
    h('img', { class: 'share-img', src: url, alt: 'Ảnh chia sẻ từ tu viện', width: 1080, height: 1350 }),
    buttons,
    h('p', { class: 'muted small center' }, 'Tải về rồi gửi vào nhóm Zalo công ty nhé.'),
  );
}
