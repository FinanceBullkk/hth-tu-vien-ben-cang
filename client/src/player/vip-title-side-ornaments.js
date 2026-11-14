// Đồ trang trí hai bên chữ danh hiệu chí tôn, ngôn ngữ hình kiếm hiệp Hồng Kông (sprite MMO 2D: màu tươi, viền tối).
// Vẽ cho bên TRÁI, gốc sát mép chữ ở cạnh phải viewBox; bên phải lật gương sẵn (mirror):
// - Thần bài: mây tường vân vàng cuộn xoáy làm nền, xúc xắc kiểu Tàu (chấm 1 và 4 đỏ) ngồi trên cuộn mây,
//   nén nguyên bảo loé sáng sát chữ, đồng tiền xu lỗ vuông treo dây đỏ dưới cuộn mây lớn;
// - Vua câu cá: sóng "hải thuỷ" (vảy sóng tầng tầng, ngọn cuộn bọt trắng), cần câu trúc có đốt vươn ra ngoài thả
//   dây và lưỡi câu vàng, cá chép vàng vây đỏ nhảy lên đớp mồi, giọt nước bắn.
// Lớp class vtto-* được CSS cho chuyển động (client/src/ui/vip-name-board.css).
// Chuỗi SVG hằng số, không chứa dữ liệu người chơi; id gradient trùng giữa các nhân vật vẫn vẽ đúng vì cùng nội dung.

const W = 60, H = 36;
const EDGE = '#2a0c00';
const GLINT = 'M0 -3.2L.7 -.7L3.2 0L.7 .7L0 3.2L-.7 .7L-3.2 0L-.7 -.7Z';

// Nét vẽ "đúc vàng": viền tối dày dưới, thân vàng giữa, chỉ sáng mảnh trên cùng.
const goldStroke = paths => [[EDGE, 5.4, ''], ['url(#vtto-goldline)', 3.2, ''], ['#fff7c8', .8, ' opacity=".85"']]
  .map(([stroke, width, extra]) => paths.map(d =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`).join(''))
  .join('');

// Mây tường vân: dải mây từ chân chữ chạy ra ngoài rồi cuộn xoáy lớn, hai cuộn nhỏ mọc lên từ dải mây.
const CLOUD = [
  'M58 27C48 29 36 30 24 28C14 26.5 8 24 8 18C8 12.5 13 10 17 12C20.5 13.8 20 18.5 16.5 18.8C14 19 13 16.5 14.6 15.4',
  'M30 28.5C27 24 28.5 18 34 17C38.5 16.2 41 20 39 22.6C37.4 24.6 34.6 23.4 35.4 21.2',
  'M46 28.4C45 25.6 46.6 23.2 49.4 23.4C51.6 23.6 52.2 26 50.8 26.8',
];

// Xúc xắc nhìn chéo, ngồi trên cuộn mây giữa: mặt trên 1 chấm đỏ, mặt trái 3 chấm đen, mặt phải 4 chấm đỏ.
const DICE = `<g stroke="${EDGE}" stroke-width=".9" stroke-linejoin="round">
    <path d="M33 4L39.1 7.5L33 11L26.9 7.5Z" fill="#ffffff"/>
    <path d="M26.9 7.5L33 11V18L26.9 14.5Z" fill="#efe4d0"/>
    <path d="M33 11L39.1 7.5V14.5L33 18Z" fill="#d6c8b0"/></g>
  <ellipse cx="33" cy="7.5" rx="1.7" ry="1" fill="#d0102a"/>
  <g fill="#1a0a06"><ellipse cx="28.4" cy="10.1" rx=".75" ry=".85"/><ellipse cx="29.95" cy="12.75" rx=".75" ry=".85"/><ellipse cx="31.5" cy="15.4" rx=".75" ry=".85"/></g>
  <g fill="#d0102a"><ellipse cx="34.7" cy="12" rx=".75" ry=".85"/><ellipse cx="37.4" cy="10.4" rx=".75" ry=".85"/>
    <ellipse cx="34.7" cy="15.1" rx=".75" ry=".85"/><ellipse cx="37.4" cy="13.5" rx=".75" ry=".85"/></g>`;

// Nén nguyên bảo: thuyền vàng hai đầu vểnh, bầu tròn giữa, điểm sáng và tia loé.
const INGOT = `<g transform="translate(47.5 21.6) scale(.82)">
    <ellipse cx="0" cy="-4.2" rx="5.4" ry="4.4" fill="url(#vtto-gold)" stroke="${EDGE}" stroke-width="1.2"/>
    <path d="M-12.5 -5.6C-10.5 -1 -7 3.2 0 3.2C7 3.2 10.5 -1 12.5 -5.6C8.5 -3.2 4.2 -2.4 0 -2.4C-4.2 -2.4 -8.5 -3.2 -12.5 -5.6Z"
      fill="url(#vtto-gold)" stroke="${EDGE}" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="-1.8" cy="-6" rx="1.8" ry="1.1" fill="#fffbe6" opacity=".9"/>
    <path class="vtto-glint" d="${GLINT}" transform="translate(3.8 -7.4)" fill="#fff"/></g>`;

// Đồng tiền xu lỗ vuông treo dây đỏ dưới cuộn mây lớn; khẽ đung đưa.
const COIN = `<g class="vtto-swing">
    <path d="M15.6 26V28.4" stroke="#c4101e" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="15.6" cy="31.6" r="3.7" fill="url(#vtto-gold)" stroke="${EDGE}" stroke-width="1"/>
    <circle cx="15.6" cy="31.6" r="2.7" fill="none" stroke="#a86400" stroke-width=".5"/>
    <rect x="14.5" y="30.5" width="2.2" height="2.2" fill="#3a1600"/></g>`;

function cloudDiceIngot() {
  return `<defs>
    <linearGradient id="vtto-goldline" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#b06a00"/></linearGradient>
    <radialGradient id="vtto-gold" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffcc2a"/><stop offset="1" stop-color="#a65a00"/></radialGradient></defs>
  ${COIN}${goldStroke(CLOUD)}${DICE}${INGOT}`;
}

// Sóng hải thuỷ: nền sóng xanh, vảy sóng trắng tầng tầng, ngọn cuộn bọt có móng ở ngoài cùng.
const SEA = `<path d="M60 36H0V29C3 25.6 8 25 11.6 27.4C15 25 20.4 25 24 28C28 25 33.6 25 37.4 28C41 25.4 46.4 25.2 50 27.6C53 26 57 25.8 60 26.4Z"
    fill="url(#vtto-sea)" stroke="#021c3a" stroke-width="1" stroke-linejoin="round"/>
  <path d="M3 32C5.4 29.8 9.4 29.8 11.6 32M15.6 32.4C18.4 30 22.6 30 25.4 32.4M29 32.4C31.8 30 36 30 38.8 32.4M42.6 32C45.2 29.8 49 29.8 51.4 32
    M8.8 35.4C11.2 33.4 15 33.4 17.4 35.4M22.4 35.4C24.8 33.4 28.6 33.4 31 35.4M36 35.4C38.4 33.4 42.2 33.4 44.6 35.4"
    fill="none" stroke="#e8fbff" stroke-width=".9" stroke-linecap="round"/>
  <path d="M0 27.6C0 21 4.6 16.6 9.6 17.4C13.6 18 15 22 12.6 23.8C11.6 21.6 8.6 21.4 7.6 23.4C6.6 25.4 8.4 27.4 11 26.8"
    fill="none" stroke="#021c3a" stroke-width="4.4" stroke-linecap="round"/>
  <path d="M0 27.6C0 21 4.6 16.6 9.6 17.4C13.6 18 15 22 12.6 23.8C11.6 21.6 8.6 21.4 7.6 23.4C6.6 25.4 8.4 27.4 11 26.8"
    fill="none" stroke="#5cc8f2" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M2 21.4C3.6 18.6 7 17.4 9.8 18.2M9.8 18.2L11.2 16.4M12.4 19.4L14.4 18.6M13.4 22L15.4 22.2"
    fill="none" stroke="#f4feff" stroke-width="1.1" stroke-linecap="round"/>`;

// Cần câu trúc có đốt, từ sát chữ vươn chếch ra ngoài; dây thả xuống, lưỡi câu vàng cong.
const ROD = `<path d="M58 8.2L3 1.6" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/>
  <path d="M58 8.2L3 1.6" stroke="url(#vtto-bamboo)" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M46 6.8V8.6M34 5.4V7.2M22 3.9V5.7M11 2.6V4.4" stroke="#3a4a10" stroke-width=".9" stroke-linecap="round"/>
  <path d="M3.2 1.8C3.6 6 4.6 10 6 13.6" fill="none" stroke="#f2f2f2" stroke-width=".6" stroke-opacity=".9"/>
  <path d="M6 13.6V16.2C6 17.8 7.8 18.2 8.4 16.8" fill="none" stroke="#ffd34a" stroke-width=".9" stroke-linecap="round"/>`;

// Cá chép vẽ hướng +x ở hệ 50×30, lật quay ra ngoài để đớp lưỡi câu; nhóm vtto-bob cho CSS nhấp nhô.
const CARP = `<g class="vtto-bob"><g transform="translate(55.5 3.6) scale(-1.04 1.04)">
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
    <path d="M44.5 9.6C47.4 11.4 49.4 14.6 48.6 18.4M44 10.4C45 13.2 44.8 16 43.4 18" fill="none" stroke="#ffd34a" stroke-width=".7" stroke-linecap="round"/>
  </g></g>`;

const drop = (x, y, r) => `<path class="vtto-drop" d="M${x} ${y - r * 1.8}C${x + r} ${y - r * .4} ${x + r} ${y + r} ${x} ${y + r}C${x - r} ${y + r} ${x - r} ${y - r * .4} ${x} ${y - r * 1.8}Z"
  fill="#e8fbff" stroke="#2a8ad0" stroke-width=".45"/>`;

function seaRodCarp() {
  return `<defs>
    <linearGradient id="vtto-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fdcff"/><stop offset=".5" stop-color="#1f86d6"/><stop offset="1" stop-color="#083a86"/></linearGradient>
    <linearGradient id="vtto-bamboo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8f08a"/><stop offset="1" stop-color="#8ab43a"/></linearGradient>
    <linearGradient id="vtto-carp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8c8"/><stop offset=".45" stop-color="#ffc832"/><stop offset="1" stop-color="#e2700e"/></linearGradient>
    <linearGradient id="vtto-fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb08a"/><stop offset="1" stop-color="#d81e1e"/></linearGradient></defs>
  ${SEA}${ROD}${CARP}${drop(17, 22.6, 1.2)}${drop(21.6, 25.4, .9)}${drop(13, 25.6, .8)}`;
}

const ART = { 'than-bai': cloudDiceIngot, 'vua-cau-ca': seaRodCarp };

/** SVG đồ trang trí một bên chữ cho board; mirror = bên phải. '' nếu board không có. */
export function sideOrnamentSvg(board, mirror) {
  const draw = ART[board];
  if (!draw) return '';
  return `<svg class="vtt-wing" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
  <g${mirror ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${draw()}</g></svg>`;
}
