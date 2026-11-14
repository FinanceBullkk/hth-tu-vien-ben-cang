// Đồ trang trí hai bên chữ danh hiệu chí tôn, kiểu "khí" kiếm hiệp: nét sáng mảnh, dải khí vuốt như nét bút lông,
// thân trong mờ — không viền đen dày, không vật thể mập kiểu hoạt hình (trông như đồ chơi).
// Vẽ cho bên TRÁI, gốc sát mép chữ ở cạnh phải viewBox; bên phải lật gương sẵn (mirror):
// - Thần bài: dải khí vàng vuốt ra ngoài cuộn mây ở đầu, dải phụ mảnh bên dưới; ba lá bài nét vàng nền đỏ trong mờ
//   xoè sau dải khí, chất bài khắc vàng như huy hiệu chạm; sao loé ở đầu dải;
// - Vua câu cá: dải nước ánh lam vuốt ra ngoài cuộn sóng nét trắng; linh ngư (cá chép nét vàng sáng, thân trong mờ,
//   vây dài như lụa) nhảy vượt dải nước; giọt sáng bắn.
// Quầng sáng nhẹ do CSS (client/src/ui/vip-name-board.css); class vtto-* cho chuyển động.
// Chuỗi SVG hằng số, không chứa dữ liệu người chơi; id gradient trùng giữa các nhân vật vẫn vẽ đúng vì cùng nội dung.

const W = 60, H = 36;
const STAR = 'M0 -3.4L.6 -.6L3.4 0L.6 .6L0 3.4L-.6 .6L-3.4 0L-.6 -.6Z';

// Dải khí chính: gốc rộng sát chữ, vuốt nhọn ra ngoài rồi cuộn một vòng như mây; dải phụ mảnh bên dưới.
const RIBBON = 'M60 19.5C47 23 31 24.6 17.6 21C9.6 18.8 5.4 13.4 8.8 9.4C11.8 6 17.2 7.6 16.6 11.4C16 14.4 12.4 14.6 11.8 12.4'
  + 'C14.4 16.4 21.6 18.2 31 18C41 17.8 51 16.2 60 13.6Z';
const RIBBON2 = 'M60 25C49 28.6 35 30.6 21 29.2C33 28.2 47 26 60 21.8Z';
const ribbonEdge = 'M59 14C49 16.6 39 18 30 18.2M59 19.8C47 23 33 24.4 20 21.6';

// Chất bài quanh gốc toạ độ, cao ~10.
const SUITS = [
  'M0 -5C1.3 -2.5 5 -1.3 5 1.4 5 3.3 2.8 4 .8 2.5L1.5 5H-1.5L-.8 2.5C-2.8 4 -5 3.3 -5 1.4 -5 -1.3 -1.3 -2.5 0 -5Z',
  'M0 4.6C-1.6 3 -5 .8 -5 -1.6 -5 -3.6 -3.2 -4.8 -1.6 -4.3 -.8 -4 -.3 -3.4 0 -2.8 .3 -3.4 .8 -4 1.6 -4.3 3.2 -4.8 5 -3.6 5 -1.6 5 .8 1.6 3 0 4.6Z',
  'M0 -5L3.6 0L0 5L-3.6 0Z',
];

function goldQiCards() {
  // Gốc xoè đặt cao để nửa trên ba lá nhô hẳn lên khỏi dải khí, đọc được chất bài.
  const cards = [-48, -26, -4].map((angle, i) => `<g transform="translate(47 22) rotate(${angle})">
      <rect x="-6" y="-19" width="12" height="17" rx="1.6" fill="url(#vtto-cardglass)" stroke="url(#vtto-au)" stroke-width=".9"/>
      <rect x="-4.6" y="-17.6" width="9.2" height="14.2" rx="1" fill="none" stroke="#ffe9a8" stroke-width=".35" opacity=".8"/>
      <path d="${SUITS[i]}" transform="translate(0 -12.4) scale(.7)" fill="url(#vtto-au)"/></g>`).join('');
  return `<defs>
    <linearGradient id="vtto-au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe2"/><stop offset=".5" stop-color="#ffd453"/><stop offset="1" stop-color="#e8960f"/></linearGradient>
    <linearGradient id="vtto-qi" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffc83a" stop-opacity=".95"/><stop offset="1" stop-color="#ff8a10" stop-opacity=".55"/></linearGradient>
    <linearGradient id="vtto-cardglass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a1020" stop-opacity=".78"/><stop offset="1" stop-color="#3a0408" stop-opacity=".78"/></linearGradient></defs>
  ${cards}
  <path d="${RIBBON2}" fill="url(#vtto-qi)" opacity=".6"/>
  <path d="${RIBBON}" fill="url(#vtto-qi)"/>
  <path d="${ribbonEdge}" fill="none" stroke="#fffdf0" stroke-width=".55" stroke-linecap="round" opacity=".9"/>
  <path class="vtto-glint" d="${STAR}" transform="translate(9.6 8.4)" fill="#fff"/>`;
}

// Linh ngư: cá chép hướng +x vẽ ở hệ 50×30 (nét sáng mảnh, thân trong mờ, vây/đuôi dài như lụa), lật quay vào chữ.
const CARP = `<g class="vtto-bob"><g transform="translate(9 1) scale(1.02)">
    <path d="M15 13.4C10 10 6 6 1 5.6C4.4 8.4 6.6 11 8 13.6C6 15.6 3.6 18.6 .4 21C5.4 20.6 10.4 18.4 15 16.6Z" fill="url(#vtto-fin)" stroke="#ffe9b0" stroke-width=".55" stroke-linejoin="round"/>
    <path d="M14.4 14.2C10 11.2 6.4 8.4 3.4 7.2M14.4 15.4C10.6 16.6 6.6 18.6 3.4 20" fill="none" stroke="#fff3d8" stroke-width=".4" opacity=".8"/>
    <path d="M27 6.4C29 2.6 33 .6 37.6 1.2C35.6 2.6 34.6 4.4 34.4 6.2Z M33.4 13.4C32.4 17 30 19.6 26.6 20.8C28 18.4 28.6 16.2 28.6 14.4Z"
      fill="url(#vtto-fin)" stroke="#ffe9b0" stroke-width=".5" stroke-linejoin="round"/>
    <path d="M44.5 9C40.5 4 31.5 3 25 7C21 9.5 18 12 15 13.4L15 16.6C20 18 26 17 31 15C37 13 42 12 44.5 9Z"
      fill="url(#vtto-carp)" stroke="#fff1c0" stroke-width=".7" stroke-linejoin="round"/>
    <path d="M22.4 10.4a2.2 2.2 0 0 0 0 4.4M26.6 9.2a2.2 2.2 0 0 0 0 4.4M30.8 8.4a2.2 2.2 0 0 0 0 4.4M35 8.2a2.2 2.2 0 0 0 0 4.2"
      fill="none" stroke="#fff6d8" stroke-width=".4" opacity=".75"/>
    <path d="M37.6 6.6C36.4 8.6 36.4 11 37.8 12.8" fill="none" stroke="#fff6d8" stroke-width=".5" opacity=".8"/>
    <circle cx="41" cy="8.3" r=".95" fill="#fffef0"/>
    <path d="M44.5 9.6C47.6 11.6 49.6 15 48.6 19M44 10.4C45 13.4 44.6 16.4 43 18.6" fill="none" stroke="#ffe9a0" stroke-width=".5" stroke-linecap="round"/>
  </g></g>`;

const WATER = 'M60 23C48 27.4 32 29.6 18 26.6C9 24.6 4 19.4 7 15.2C9.6 11.6 15.4 12.4 15.4 16.4C15.4 19.4 11.6 20.2 10.6 17.8'
  + 'C13.6 21.6 22 23.4 32 23C42 22.6 52 20.6 60 17.4Z';
const WATER2 = 'M60 28.6C48 32.4 33 34.6 18 33C31 32 46 29.6 60 25.6Z';
const waterEdge = 'M59 18C49 21 40 22.6 31 23M59 23.4C47 27.4 32 29 19 26.4M7.8 15.6C9.8 13 13.6 13 14.8 15.4';

function spiritCarpWater() {
  return `<defs>
    <linearGradient id="vtto-water" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#e8fdff"/><stop offset=".45" stop-color="#5fd2ff" stop-opacity=".95"/><stop offset="1" stop-color="#1a7ee0" stop-opacity=".55"/></linearGradient>
    <linearGradient id="vtto-carp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".5" stop-color="#ffcf48" stop-opacity=".85"/><stop offset="1" stop-color="#ff8a1a" stop-opacity=".7"/></linearGradient>
    <linearGradient id="vtto-fin" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6a8" stop-opacity=".9"/><stop offset="1" stop-color="#ff4a3a" stop-opacity=".45"/></linearGradient></defs>
  <path d="${WATER2}" fill="url(#vtto-water)" opacity=".55"/>
  <path d="${WATER}" fill="url(#vtto-water)"/>
  <path d="${waterEdge}" fill="none" stroke="#ffffff" stroke-width=".55" stroke-linecap="round" opacity=".9"/>
  ${CARP}
  <circle class="vtto-drop" cx="6" cy="10" r=".9" fill="#ffffff"/><circle class="vtto-drop" cx="3.4" cy="13.6" r=".6" fill="#e8fdff"/>
  <path class="vtto-glint" d="${STAR}" transform="translate(5 22) scale(.8)" fill="#fff"/>`;
}

const ART = { 'than-bai': goldQiCards, 'vua-cau-ca': spiritCarpWater };

/** SVG đồ trang trí một bên chữ cho board; mirror = bên phải. '' nếu board không có. */
export function sideOrnamentSvg(board, mirror) {
  const draw = ART[board];
  if (!draw) return '';
  return `<svg class="vtt-wing" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
  <g${mirror ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${draw()}</g></svg>`;
}
