// Phần "vương miện" phía trên bảng danh hiệu, mỗi chủ đề một kiểu (chuỗi SVG thuần):
// - Thần bài: quạt năm lá thùng phá sảnh bích 10 J Q K A, mặt ngà viền mạ vàng, lá A có con bích lớn viền vàng.
// - Vua câu cá: cá chép vàng đúc vượt sóng, vây và đuôi men ngọc lam viền vàng, hai ngọn sóng pháp lam, giọt ngọc trai.
import { FONT } from './vip-badge-art-parts.js';

// Con bích quanh gốc toạ độ, rộng 20 cao 22.
const SPADE = 'M0 -11C2.6 -6 10 -3.4 10 2.4 10 6.2 5.6 7.8 1.6 4.8L3 11H-3L-1.6 4.8C-5.6 7.8 -10 6.2 -10 2.4 -10 -3.4 -2.6 -6 0 -11Z';
const spade = (x, y, s, extra = '') => `<path d="${SPADE}" transform="translate(${x} ${y}) scale(${s})" ${extra}/>`;

export function cardFanCrest() {
  const ranks = ['10', 'J', 'Q', 'K', 'A'];
  const cards = ranks.map((rank, i) => {
    const angle = (i - 2) * 19;
    const ace = rank === 'A'
      ? spade(150, 40, 0.95, 'fill="#14080a" stroke="url(#au)" stroke-width="1.1"') : '';
    return `<g transform="rotate(${angle} 150 108)" filter="url(#sh)">
      <rect x="136" y="18" width="28" height="40" rx="2.6" fill="url(#card)" stroke="url(#au)" stroke-width="1.6"/>
      <rect x="138.4" y="20.4" width="23.2" height="35.2" rx="1.6" fill="none" stroke="#c99a3e" stroke-width=".5"/>
      <text x="${rank === '10' ? 138.6 : 140}" y="29.6" font-family="${FONT}" font-weight="700" font-size="9.5"
        letter-spacing="${rank === '10' ? -0.7 : 0}" fill="#14080a">${rank}</text>
      ${spade(143, 35.2, 0.3, 'fill="#14080a"')}${ace}</g>`;
  }).join('');
  return `<linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#eadbb8"/></linearGradient>
  ${cards}`;
}

// Cá chép quanh gốc toạ độ, đầu hướng +x, dáng thon dài: thân, đuôi voan xẻ hai thuỳ dài, vây lưng vuốt ngược,
// vây ngực/bụng/hậu môn, mang, vảy, mắt, hai râu dài. Vây và đuôi là men ngọc lam viền vàng (kiểu pháp lam).
const CARP_BODY = 'M52 -4C46 -15 24 -20 2 -14C-12 -10 -22 -5 -30 -3L-30 3C-20 6 -6 9 10 8.5C28 9 44 6 52 -4Z';
const CARP_TAIL = 'M-29 -3C-38 -8 -48 -18 -61 -25C-55 -15 -52 -7 -46 0C-52 6 -57 14 -65 21C-51 16 -40 10 -29 3Z';
const CARP_FINS = 'M26 -18C18 -30 2 -34 -14 -30C-8 -25 -6 -19 -8 -12C4 -15 16 -17 26 -18Z'
  + 'M36 5C30 13 22 19 12 23C17 15 21 10 26 6.5Z M6 8.5C2 14 -4 19 -12 21C-6 15 -2 11 0 8.5Z M-14 6C-18 10 -24 13 -30 14C-26 10 -22 7 -20 5Z';
const CARP_RAYS = 'M-32 -2L-50 -16M-33 0L-48 -4M-33 2L-52 10M-31 3L-58 17M18 -19L4 -29M8 -16L-6 -27M30 8L18 18M2 10L-8 18';
const CARP_LINES = 'M38 -12C34 -5 34 2 38 7';
const scaleRow = (y, from, to) => {
  let d = '';
  for (let x = from; x <= to; x += 7) d += `M${x} ${y - 3.4}a3.4 3.4 0 0 0 0 6.8`;
  return d;
};
const CARP_SCALES = scaleRow(-9, -6, 30) + scaleRow(-2, -20, 34) + scaleRow(5, -12, 26);

// Ngọn sóng cuộn kiểu pháp lam bên trái (bên phải lật gương): men ngọc lam viền vàng, mào bọt trắng có móng,
// hai đường cuộn sáng bên trong; chân sóng khuất sau bảng.
const WAVE = 'M86 60C88 50 96 42 108 40C118 38 126 42 127 49C124 45 118 45 116 49C114 53 118 56 122 57V60Z';
const WAVE_CURLS = 'M92 57C94 50 100 46 107 45M99 59C101 54 105 51 111 50.5';
const WAVE_FOAM = 'M106 40.6C113 37 120 37 125 41.5M119.5 38.6L122.4 35.8M123.8 40.6L127.6 39.2M126.4 45L130 44.8';
const pearl = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9fcff" stroke="#7fd8e8" stroke-width=".5"/>
  <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff"/>`;

export function leapingCarpCrest() {
  const wave = `<path d="${WAVE}" fill="url(#wv)" stroke="url(#au)" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="${WAVE_CURLS}" fill="none" stroke="#9eeef8" stroke-width=".9" stroke-linecap="round"/>
    <path d="${WAVE_FOAM}" fill="none" stroke="#f4feff" stroke-width="1.3" stroke-linecap="round"/>`;
  return `<linearGradient id="wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fd6ea"/><stop offset=".55" stop-color="#14798f"/><stop offset="1" stop-color="#05303e"/></linearGradient>
  <linearGradient id="fin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d5d71"/><stop offset=".55" stop-color="#2fb6cf"/><stop offset="1" stop-color="#c4f8fd"/></linearGradient>
  <g filter="url(#sh)"><g filter="url(#mS)">${wave}<g transform="translate(300 0) scale(-1 1)">${wave}</g></g></g>
  <g transform="translate(150 43) rotate(-12)" filter="url(#sh)"><g filter="url(#mB)">
    <path d="${CARP_TAIL}" fill="url(#fin)" stroke="url(#au)" stroke-width="1" stroke-linejoin="round"/>
    <path d="${CARP_FINS}" fill="url(#fin)" stroke="url(#au)" stroke-width=".9" stroke-linejoin="round"/>
    <path d="${CARP_RAYS}" fill="none" stroke="#e9d27a" stroke-width=".55" stroke-opacity=".8" stroke-linecap="round"/>
    <path d="${CARP_BODY}" fill="url(#au)" stroke="#3a1d02" stroke-width=".8" stroke-linejoin="round"/>
    <path d="${CARP_SCALES}" fill="none" stroke="#7a4a0a" stroke-width=".75"/>
    <path d="${CARP_LINES}" fill="none" stroke="#5c3405" stroke-width="1" stroke-linecap="round"/>
    <path d="M51 -2C56 2 62 2 70 -3M50 0C54 8 60 12 68 12" fill="none" stroke="url(#au)" stroke-width="1.1" stroke-linecap="round"/></g>
    <circle cx="45" cy="-7" r="2.2" fill="#1a0c04"/><circle cx="44.3" cy="-7.7" r=".7" fill="#fff"/></g>
  ${pearl(100, 26, 2)}${pearl(208, 30, 1.7)}${pearl(196, 14, 1.2)}${pearl(112, 14, 1.2)}`;
}
