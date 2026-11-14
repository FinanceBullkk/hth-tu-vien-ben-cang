// Đồ trang trí hai bên chữ danh hiệu chí tôn, đúng chủ đề (vẽ kiểu sprite MMO 2D: màu tươi, viền tối dày).
// Vẽ cho bên TRÁI, gốc sát mép chữ ở cạnh phải viewBox; bên phải lật gương sẵn (mirror) nên:
// - Thần bài: xấp ba lá bài xoè ra ngoài (♠ ♥ ♦, mặt ngà viền vàng) + phỉnh sòng đỏ viền trắng ở gốc;
// - Vua câu cá: cá chép vàng vây đỏ nhảy khỏi ngọn sóng xanh bọt trắng, đầu hướng vào chữ (hai con chầu nhau).
// Chuỗi SVG hằng số, không chứa dữ liệu người chơi; id gradient trùng giữa các nhân vật vẫn vẽ đúng vì cùng nội dung.

const W = 50, H = 30;
const EDGE = '#2a0c00';

// Chất bài quanh gốc toạ độ, cao ~10.
const SUITS = {
  spade: ['M0 -5C1.3 -2.5 5 -1.3 5 1.4 5 3.3 2.8 4 .8 2.5L1.5 5H-1.5L-.8 2.5C-2.8 4 -5 3.3 -5 1.4 -5 -1.3 -1.3 -2.5 0 -5Z', '#16080a'],
  heart: ['M0 4.6C-1.6 3 -5 .8 -5 -1.6 -5 -3.6 -3.2 -4.8 -1.6 -4.3 -.8 -4 -.3 -3.4 0 -2.8 .3 -3.4 .8 -4 1.6 -4.3 3.2 -4.8 5 -3.6 5 -1.6 5 .8 1.6 3 0 4.6Z', '#d0102a'],
  diamond: ['M0 -5L3.6 0L0 5L-3.6 0Z', '#d0102a'],
};

function cardsAndChip() {
  // Ba lá xoè quanh điểm gốc (44, 28): lá ngoài cùng nghiêng nhiều nhất.
  const cards = [['spade', -70], ['heart', -46], ['diamond', -22]].map(([suit, angle]) => {
    const [d, color] = SUITS[suit];
    return `<g transform="translate(44 28) rotate(${angle})">
      <rect x="-7.5" y="-22" width="15" height="21" rx="2" fill="url(#vtto-card)" stroke="${EDGE}" stroke-width="1.1"/>
      <rect x="-5.9" y="-20.4" width="11.8" height="17.8" rx="1.2" fill="none" stroke="#e0a42a" stroke-width=".8"/>
      <path d="${d}" transform="translate(0 -11.5) scale(.95)" fill="${color}"/></g>`;
  }).join('');
  // Phỉnh: đĩa đỏ, vành trắng đứt khúc, lõi vàng.
  const chip = `<g transform="translate(43 22)">
    <circle r="6.6" fill="#d81a2c" stroke="${EDGE}" stroke-width="1.1"/>
    <circle r="5.2" fill="none" stroke="#fff" stroke-width="1.7" stroke-dasharray="2.2 1.9"/>
    <circle r="3.1" fill="url(#vtto-gold)" stroke="#7a1a00" stroke-width=".6"/>
    <circle cx="-1" cy="-1" r=".8" fill="#fff"/></g>`;
  return `<defs>
    <linearGradient id="vtto-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e2bf"/></linearGradient>
    <radialGradient id="vtto-gold" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff8c8"/><stop offset=".55" stop-color="#ffc21a"/><stop offset="1" stop-color="#a85e00"/></radialGradient></defs>
  ${cards}${chip}`;
}

function carpAndWave() {
  const wave = `<path d="M50 30H7C4.5 27 4.5 22.5 7.5 19.5C10.5 16.5 16 16.5 18.5 19.8C16.4 18.6 13.2 19.6 13.2 22.6C13.2 25.6 17.4 26.6 21.4 24.4C27.4 21.2 34 22 40 25.2C44 27.2 47 28 50 28Z"
      fill="url(#vtto-sea)" stroke="#021c3a" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M8.4 21.4C10.6 18.2 15 17.6 17.6 19.6M22 24C28 21.4 34 22.2 40.4 25.6" fill="none" stroke="#f2feff" stroke-width="1.2" stroke-linecap="round"/>`;
  const fish = `<path d="M30.5 4.6L33.2 .6L36.4 4.2Z M34 13L30.8 18.4L37 14Z" fill="url(#vtto-fin)" stroke="${EDGE}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M44.5 9C40.5 4 31.5 3 25 7C21 9.5 18 12 15 13L8.5 8.8L11 15L6.8 20.6L15 17C20 18 26 17 31 15C37 13 42 12 44.5 9Z"
      fill="url(#vtto-carp)" stroke="${EDGE}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M8.5 8.8L11 15L6.8 20.6L15 17L15 13Z" fill="url(#vtto-fin)" stroke="${EDGE}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M24 9.4a2.2 2.2 0 0 0 0 4.4M28.4 8.2a2.2 2.2 0 0 0 0 4.4M32.8 8a2.2 2.2 0 0 0 0 4.4M26.2 12.6a2 2 0 0 0 0 3.6M30.6 12a2 2 0 0 0 0 3.6"
      fill="none" stroke="#a8560a" stroke-width=".7"/>
    <path d="M37.6 6.6C36.4 8.6 36.4 11 37.8 12.8" fill="none" stroke="#7a3a00" stroke-width=".8"/>
    <circle cx="41" cy="8.2" r="1.25" fill="#160800"/><circle cx="40.6" cy="7.8" r=".4" fill="#fff"/>
    <path d="M44.5 9.6C46.4 11 47.2 13 46.8 15.2" fill="none" stroke="#ffd34a" stroke-width=".8" stroke-linecap="round"/>
    <circle cx="5" cy="14" r="1.3" fill="#e8fbff" stroke="#3aa0d8" stroke-width=".5"/><circle cx="9" cy="5.5" r=".9" fill="#e8fbff" stroke="#3aa0d8" stroke-width=".4"/>`;
  return `<defs>
    <linearGradient id="vtto-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9eeeff"/><stop offset=".5" stop-color="#2a9ae0"/><stop offset="1" stop-color="#0a4a9a"/></linearGradient>
    <linearGradient id="vtto-carp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8c8"/><stop offset=".45" stop-color="#ffc832"/><stop offset="1" stop-color="#e2700e"/></linearGradient>
    <linearGradient id="vtto-fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb08a"/><stop offset="1" stop-color="#d81e1e"/></linearGradient></defs>
  ${wave}${fish}`;
}

const ART = { 'than-bai': cardsAndChip, 'vua-cau-ca': carpAndWave };

/** SVG đồ trang trí một bên chữ cho board; mirror = bên phải. '' nếu board không có. */
export function sideOrnamentSvg(board, mirror) {
  const draw = ART[board];
  if (!draw) return '';
  return `<svg class="vtt-wing" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
  <g${mirror ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${draw()}</g></svg>`;
}
