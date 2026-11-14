// Đồ trang trí hai bên chữ danh hiệu chí tôn, đúng chủ đề (vẽ kiểu sprite MMO 2D: màu tươi, viền tối dày).
// Vẽ cho bên TRÁI, gốc sát mép chữ ở cạnh phải viewBox; bên phải lật gương sẵn (mirror; chữ trên lá bài được lật
// lại để không bị ngược):
// - Thần bài: xấp ba lá A♠ K♥ Q♦ xoè ra ngoài (mặt ngà viền vàng, có chỉ số góc), nén nguyên bảo vàng loé sáng ở gốc,
//   phỉnh sòng đỏ lật qua lại như đồng xu;
// - Vua câu cá: cá chép vàng vây đỏ (vảy, gân vây, vệt sáng lưng) nhấp nhô trên ngọn sóng hai lớp bọt trắng,
//   giọt nước bắn lấp lánh; đầu cá hướng vào chữ (hai con chầu nhau).
// Lớp class vtto-* được CSS cho chuyển động (client/src/ui/vip-name-board.css).
// Chuỗi SVG hằng số, không chứa dữ liệu người chơi; id gradient trùng giữa các nhân vật vẫn vẽ đúng vì cùng nội dung.

const W = 60, H = 36;
const EDGE = '#2a0c00';
const SERIF = `Georgia,'Times New Roman',serif`;

// Chất bài quanh gốc toạ độ, cao ~10.
const SUITS = {
  spade: ['M0 -5C1.3 -2.5 5 -1.3 5 1.4 5 3.3 2.8 4 .8 2.5L1.5 5H-1.5L-.8 2.5C-2.8 4 -5 3.3 -5 1.4 -5 -1.3 -1.3 -2.5 0 -5Z', '#16080a'],
  heart: ['M0 4.6C-1.6 3 -5 .8 -5 -1.6 -5 -3.6 -3.2 -4.8 -1.6 -4.3 -.8 -4 -.3 -3.4 0 -2.8 .3 -3.4 .8 -4 1.6 -4.3 3.2 -4.8 5 -3.6 5 -1.6 5 .8 1.6 3 0 4.6Z', '#d0102a'],
  diamond: ['M0 -5L3.6 0L0 5L-3.6 0Z', '#d0102a'],
};
const GLINT = 'M0 -3.2L.7 -.7L3.2 0L.7 .7L0 3.2L-.7 .7L-3.2 0L-.7 -.7Z';

function cardsAndIngot(mirror) {
  const unflip = mirror ? ' scale(-1 1)' : '';
  // Ba lá xoè quanh gốc (46, 34): lá ngoài cùng nghiêng nhiều nhất, lá trong đè lên.
  const cards = [['A', 'spade', -66], ['K', 'heart', -42], ['Q', 'diamond', -18]].map(([rank, suit, angle]) => {
    const [d, color] = SUITS[suit];
    return `<g transform="translate(46 34) rotate(${angle})">
      <rect x="-8" y="-24" width="16" height="23" rx="2.2" fill="url(#vtto-card)" stroke="${EDGE}" stroke-width="1.1"/>
      <rect x="-6.5" y="-22.5" width="13" height="20" rx="1.3" fill="none" stroke="#e0a42a" stroke-width=".8"/>
      <text transform="translate(-4.4 -16.4)${unflip}" text-anchor="middle" font-family="${SERIF}" font-size="7.2" font-weight="700" fill="${color}">${rank}</text>
      <path d="${d}" transform="translate(-4.4 -12.2) scale(.36)" fill="${color}"/>
      <path d="${d}" transform="translate(1.4 -10) scale(.85)" fill="${color}"/></g>`;
  }).join('');
  // Nén nguyên bảo: thuyền vàng hai đầu vểnh, bầu tròn giữa, điểm sáng và tia loé.
  const ingot = `<g transform="translate(42 30.5)">
    <ellipse cx="0" cy="-4.2" rx="5.4" ry="4.4" fill="url(#vtto-gold)" stroke="${EDGE}" stroke-width="1"/>
    <path d="M-12.5 -5.6C-10.5 -1 -7 3.2 0 3.2C7 3.2 10.5 -1 12.5 -5.6C8.5 -3.2 4.2 -2.4 0 -2.4C-4.2 -2.4 -8.5 -3.2 -12.5 -5.6Z"
      fill="url(#vtto-gold)" stroke="${EDGE}" stroke-width="1" stroke-linejoin="round"/>
    <ellipse cx="-1.8" cy="-6" rx="1.8" ry="1.1" fill="#fffbe6" opacity=".9"/>
    <path d="M-8 -1.6C-5 .8 5 .8 8 -1.6" fill="none" stroke="#fff3b0" stroke-width=".7" opacity=".8"/>
    <path class="vtto-glint" d="${GLINT}" transform="translate(3.6 -7.2)" fill="#fff"/></g>`;
  // Phỉnh: đĩa đỏ, vành trắng đứt khúc, lõi vàng; lật quanh trục đứng.
  const chip = `<g transform="translate(54 20)"><g class="vtto-flip">
    <circle r="6.2" fill="#d81a2c" stroke="${EDGE}" stroke-width="1.1"/>
    <circle r="4.9" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.1 1.75"/>
    <circle r="2.9" fill="url(#vtto-gold)" stroke="#7a1a00" stroke-width=".6"/>
    <circle cx="-.9" cy="-.9" r=".75" fill="#fff"/></g></g>`;
  return `<defs>
    <linearGradient id="vtto-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e2bf"/></linearGradient>
    <radialGradient id="vtto-gold" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffcc2a"/><stop offset="1" stop-color="#a65a00"/></radialGradient></defs>
  ${cards}${ingot}${chip}`;
}

function carpAndWave() {
  const sea = `<path d="M60 36H4C2 33 2 29 5 26C8 23 13 23 15.4 26C13.2 25 10.2 26 10.2 29C10.2 32 14.2 33 18.2 31C25 27.4 33 28.4 41 31.4C48 33.8 54 33.2 60 31Z"
      fill="url(#vtto-sea)" stroke="#021c3a" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M60 36H21C25 33.2 31 32.4 38 33.8C45 35.2 52.4 34.4 60 32.6Z" fill="url(#vtto-sea2)" stroke="#021c3a" stroke-width=".9"/>
    <path d="M5.6 27.6C8 24.4 12.6 24 14.8 26.4M18.4 31.2C25 27.6 33 28.6 40.6 31.6M15 26.4L16.8 25M14.6 28.2L16.6 27.8M41 31.6L42.6 30.4"
      fill="none" stroke="#f2feff" stroke-width="1.2" stroke-linecap="round"/>`;
  // Cá vẽ ở hệ 50×30 rồi phóng 1.2; nhóm vtto-bob cho CSS nhấp nhô.
  const fish = `<g class="vtto-bob"><g transform="scale(1.2)">
    <path d="M29.5 5.2L31.4 -.4L34 2.2L36.6 .6L37.4 4.6Z M34 13L30.4 18.8L37.2 14Z" fill="url(#vtto-fin)" stroke="${EDGE}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M15 13L8.6 6.4L10.4 12.6L4.6 11.6L9.6 16L5 21.6L11.8 18.6L15 17Z" fill="url(#vtto-fin)" stroke="${EDGE}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M14 14.4L8.4 8.6M14 15.4L7 12.6M14 16.2L7.4 19.6" fill="none" stroke="#ffe0c8" stroke-width=".5" stroke-linecap="round"/>
    <path d="M44.5 9C40.5 4 31.5 3 25 7C21 9.5 18 12 15 13L15 17C20 18 26 17 31 15C37 13 42 12 44.5 9Z"
      fill="url(#vtto-carp)" stroke="${EDGE}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M18 15.8C24 16.6 30 15.6 35 13.6" fill="none" stroke="#fff6d0" stroke-width=".8" opacity=".8"/>
    <path d="M20.4 10.6a2.2 2.2 0 0 0 0 4.4M24.6 9.2a2.2 2.2 0 0 0 0 4.4M28.8 8.2a2.2 2.2 0 0 0 0 4.4M33 8a2.2 2.2 0 0 0 0 4.4
      M22.6 13.2a2 2 0 0 0 0 3.4M26.8 12.6a2 2 0 0 0 0 3.4M31 11.8a2 2 0 0 0 0 3.4" fill="none" stroke="#a8560a" stroke-width=".65"/>
    <path d="M42 6.4C36.4 4.4 30.4 4.8 25.6 7.4" fill="none" stroke="#fff" stroke-width=".7" opacity=".75" stroke-linecap="round"/>
    <path d="M37.6 6.6C36.4 8.6 36.4 11 37.8 12.8" fill="none" stroke="#7a3a00" stroke-width=".8"/>
    <circle cx="41" cy="8.2" r="1.3" fill="#160800"/><circle cx="40.6" cy="7.8" r=".45" fill="#fff"/>
    <path d="M44.5 9.6C46.4 11 47.2 13 46.8 15.2M44 10.4C44.6 12.4 44.4 14 43.6 15.4" fill="none" stroke="#ffd34a" stroke-width=".7" stroke-linecap="round"/>
  </g></g>`;
  const drops = [[4, 17, 1.4], [9.6, 21, 1], [2.4, 23, .9]].map(([x, y, r]) =>
    `<path class="vtto-drop" d="M${x} ${y - r * 1.8}C${x + r} ${y - r * .4} ${x + r} ${y + r} ${x} ${y + r}C${x - r} ${y + r} ${x - r} ${y - r * .4} ${x} ${y - r * 1.8}Z"
      fill="#e8fbff" stroke="#2a8ad0" stroke-width=".45"/>`).join('');
  return `<defs>
    <linearGradient id="vtto-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe6ff"/><stop offset=".5" stop-color="#2690dc"/><stop offset="1" stop-color="#0a3f8c"/></linearGradient>
    <linearGradient id="vtto-sea2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6f6ff"/><stop offset="1" stop-color="#3aa8ea"/></linearGradient>
    <linearGradient id="vtto-carp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8c8"/><stop offset=".45" stop-color="#ffc832"/><stop offset="1" stop-color="#e2700e"/></linearGradient>
    <linearGradient id="vtto-fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb08a"/><stop offset="1" stop-color="#d81e1e"/></linearGradient></defs>
  ${sea}${fish}${drops}`;
}

const ART = { 'than-bai': cardsAndIngot, 'vua-cau-ca': carpAndWave };

/** SVG đồ trang trí một bên chữ cho board; mirror = bên phải. '' nếu board không có. */
export function sideOrnamentSvg(board, mirror) {
  const draw = ART[board];
  if (!draw) return '';
  return `<svg class="vtt-wing" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
  <g${mirror ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${draw(mirror)}</g></svg>`;
}
