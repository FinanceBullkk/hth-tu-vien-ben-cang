// Mặt dạ bàn xì dách vẽ bằng canvas: dạ xanh có thớ, sáng giữa như dưới đèn, chữ in vàng chạy theo cung phía khách,
// vòng đặt cược trước từng ghế và ấn HTH giữa bàn. Toạ độ (x, z) là khung nhóm bàn (tâm bàn ở gốc),
// canvas: px theo x, py theo z. Chữ xoay để người đứng phía khách (x âm, nhìn về +x) đọc xuôi.

const S = 1024;
const GOLD = 'rgba(240, 205, 120, .82)';
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const deg = (d) => (d * Math.PI) / 180;

/** Chữ chạy theo cung bán kính rho (m) quanh tâm bàn, giữa cung ở góc ghế 0 (phía tây), đầu chữ hướng vào tâm. */
function arcText(g, k, text, rho, font) {
  g.font = font;
  const r = rho * k;
  const total = g.measureText(text).width;
  let offset = -total / 2;
  for (const ch of text) {
    const w = g.measureText(ch).width;
    const a = (offset + w / 2) / r; // Góc ghế: 0 ở phía tây, dương về +z.
    offset += w;
    g.save();
    g.translate(S / 2 - Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    g.rotate(Math.PI / 2 - a);
    g.fillText(ch, 0, 0);
    g.restore();
  }
}

/** Cung vàng mảnh phía khách, từ góc ghế -span tới +span. */
function arcLine(g, k, rho, span, width = 3) {
  g.beginPath();
  g.arc(S / 2, S / 2, rho * k, Math.PI - deg(span), Math.PI + deg(span));
  g.lineWidth = width;
  g.strokeStyle = GOLD;
  g.stroke();
}

/** Thớ dạ: nhiễu sáng tối nhẹ từng điểm ảnh. */
function grain(g) {
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/**
 * Vẽ mặt dạ lên canvas mới và trả về canvas.
 * @param {{ radius: number, chipSpots: {x: number, z: number}[], emblem: {x: number, z: number} }} opts
 */
export function paintXiDachFelt({ radius, chipSpots, emblem }) {
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext('2d');
  const k = S / (2 * radius);
  const at = (x, z) => [(x + radius) * k, (z + radius) * k];

  const light = g.createRadialGradient(S * 0.45, S / 2, 0, S / 2, S / 2, S * 0.55);
  light.addColorStop(0, '#2f8f59');
  light.addColorStop(0.6, '#1f6640');
  light.addColorStop(1, '#14442a');
  g.fillStyle = light;
  g.fillRect(0, 0, S, S);
  grain(g);

  g.fillStyle = GOLD;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  arcLine(g, k, 0.29, 66);
  arcLine(g, k, 0.47, 70);
  arcText(g, k, 'XÌ DÁCH  ·  TRẢ GẤP ĐÔI', 0.34, `700 30px ${SERIF}`);
  arcText(g, k, 'NHÀ CÁI RÚT DƯỚI 17  ·  NON DƯỚI 16 KHÔNG ĐƯỢC DẰN', 0.42, `600 17px ${SERIF}`);

  for (const spot of chipSpots) { // Vòng đặt cược: hai vòng lồng nhau.
    const [x, y] = at(spot.x, spot.z);
    for (const [r, w] of [[0.06, 3], [0.048, 1.5]]) {
      g.beginPath();
      g.arc(x, y, r * k, 0, Math.PI * 2);
      g.lineWidth = w;
      g.strokeStyle = GOLD;
      g.stroke();
    }
  }

  const [ex, ey] = at(emblem.x, emblem.z); // Ấn HTH giữa bàn.
  g.beginPath();
  g.arc(ex, ey, 0.105 * k, 0, Math.PI * 2);
  g.lineWidth = 3;
  g.strokeStyle = GOLD;
  g.stroke();
  g.beginPath();
  g.arc(ex, ey, 0.09 * k, 0, Math.PI * 2);
  g.lineWidth = 1.2;
  g.stroke();
  g.save();
  g.translate(ex, ey);
  g.rotate(Math.PI / 2);
  g.font = `700 38px ${SERIF}`;
  g.fillText('HTH', 0, -8);
  g.font = `700 10.5px ${SERIF}`;
  g.fillText('TU VIỆN BÊN CẢNG', 0, 22);
  g.restore();
  return canvas;
}
