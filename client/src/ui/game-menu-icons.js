// Bộ icon minh hoạ cho thanh menu kiểu game thùng đồ: vật thể nổi khối tô chuyển màu, viền đậm, vệt bóng sáng,
// đứng tự do trên dải menu tối (xem game-menu.css). Tự vẽ bằng SVG nên không cần tài nguyên ngoài (CSP cùng nguồn).
// Dải màu dùng chung khai báo một lần trong một SVG ẩn gắn vào body; mọi icon tham chiếu theo id.
// Chuỗi SVG là hằng số trong mã, không chứa dữ liệu người dùng, nên gắn bằng innerHTML là an toàn.

const O = '#3a1804'; // màu viền chung

/** Dải màu dọc ba nấc: sáng ở trên, đậm ở dưới cho cảm giác khối. */
const RAMPS = {
  gold: ['#fff6c2', '#ffcb3d', '#b86f06'],
  red: ['#ffa184', '#e8402a', '#8a1406'],
  wood: ['#f4ba72', '#c06e26', '#6e3510'],
  blue: ['#c4e6ff', '#4b97ee', '#1a4d9e'],
  purple: ['#efdcff', '#a466ee', '#521c99'],
  pink: ['#ffe2ec', '#ff86ad', '#c2386a'],
  green: ['#ddffd2', '#5ad466', '#1f7a28'],
  cream: ['#fffef6', '#f8e8c2', '#d9b77c'],
  steel: ['#ffffff', '#b9c1cc', '#5d6672'],
  grey: ['#f4f1ec', '#b9b2a6', '#6b655c'],
};

const DEFS = `${Object.entries(RAMPS).map(([name, [a, b, c]]) => `<linearGradient id="gm-${name}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`).join('')}
  <radialGradient id="gm-shine"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;

const fill = (name) => `url(#gm-${name})`;
const shine = (cx, cy, rx, ry, rot = -30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="url(#gm-shine)"/>`;

/** Ngôi sao năm cánh tâm (cx, cy). */
function star(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * k).toFixed(2)},${(cy + Math.sin(a) * k).toFixed(2)}`);
  }
  return `M${pts.join('L')}z`;
}

/** Bánh răng teeth răng, răng hình thang. */
function gear(cx, cy, rOut, rIn, teeth) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, rr] of [[-0.42, rIn], [-0.24, rOut], [0.24, rOut], [0.42, rIn]]) {
      const t = a + da * step;
      pts.push(`${(cx + Math.cos(t) * rr).toFixed(2)},${(cy + Math.sin(t) * rr).toFixed(2)}`);
    }
  }
  return `M${pts.join('L')}z`;
}

/** Loa (dùng cho bật và tắt tiếng). */
const speaker = (ramp, line) => `<path d="M5 15h7l8-7v24l-8-7H5z" fill="${fill(ramp)}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M12 15v10" stroke="${line}" stroke-width="1.4"/>${shine(10, 14, 3, 1.6)}`;

const ICONS = {
  // La bàn vàng kim đỏ xanh: "Chơi gì?"
  compass: `<circle cx="20" cy="21" r="16" fill="${fill('gold')}" stroke="${O}" stroke-width="2"/>
    <circle cx="20" cy="21" r="11.5" fill="${fill('cream')}" stroke="#9a5a08" stroke-width="1.4"/>
    <path d="M20 10.8v2.4M20 28.8v2.4M9.8 21h2.4M27.8 21h2.4" stroke="#9a5a08" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M20 11.8 23.2 21h-6.4z" fill="${fill('red')}" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M20 30.2 16.8 21h6.4z" fill="${fill('blue')}" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="20" cy="21" r="2.2" fill="${fill('gold')}" stroke="${O}" stroke-width="1"/>
    <path d="M16.6 5.6a3.4 3.4 0 0 1 6.8 0" fill="none" stroke="${O}" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M16.6 5.6a3.4 3.4 0 0 1 6.8 0" fill="none" stroke="#ffcb3d" stroke-width="2" stroke-linecap="round"/>
    ${shine(13.5, 12.5, 6, 3)}`,
  // Sổ dày bìa đỏ nhìn chéo, góc bọc vàng, huy hiệu giữa bìa: "Sổ an"
  book: `<path d="M9 8.8 29 5.6l4.4 3v24.6l-20 3.2L9 33.4z" fill="${fill('cream')}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M29.6 9.2 32 11v20.6" stroke="#c9a46a" stroke-width="1"/>
    <path d="M6.5 10.4 27 7.2v25L6.5 35.4z" fill="${fill('red')}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M6.5 10.4v25" stroke="#5e0e04" stroke-width="3"/>
    <path d="M27 7.2l-5 .8v3.6l5-.8zM27 32.2l-5 .8v-3.6l5-.8z" fill="${fill('gold')}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
    <circle cx="17" cy="21.6" r="5" fill="${fill('gold')}" stroke="${O}" stroke-width="1.3"/>
    <path d="${star(17, 21.8, 3, 1.3)}" fill="#c0392b"/>
    ${shine(13, 14, 4.5, 2.2, -12)}`,
  // Bao da buộc dây đỏ, miệng lộ đồng vàng, huy hiệu đồng trên thân: "Túi đồ"
  bag: `<path d="M14 14c-6 4-9 9.5-9 14 0 5.5 6 8 15 8s15-2.5 15-8c0-4.5-3-10-9-14z" fill="${fill('wood')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M13.5 6.5h13L23 14h-6z" fill="${fill('wood')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="20" cy="6.4" rx="5" ry="1.8" fill="${fill('gold')}" stroke="${O}" stroke-width="1.1"/>
    <circle cx="17.5" cy="4.6" r="2.2" fill="${fill('gold')}" stroke="${O}" stroke-width="1"/>
    <path d="M13 14.4c4 1.5 10 1.5 14 0" stroke="${O}" stroke-width="4.4" stroke-linecap="round" fill="none"/>
    <path d="M13 14.4c4 1.5 10 1.5 14 0" stroke="#e23a2a" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <circle cx="24.5" cy="15.4" r="2" fill="${fill('red')}" stroke="${O}" stroke-width="1"/>
    <circle cx="21" cy="26.5" r="5.2" fill="${fill('gold')}" stroke="${O}" stroke-width="1.4"/>
    <rect x="19.3" y="24.8" width="3.4" height="3.4" fill="#9a5a08"/>
    ${shine(11.5, 23, 2.8, 5.5, 25)}`,
  // Dấu chân hồng bóng: "Thú cưng"
  paw: `<path d="M20 19c-5.5 0-10 4.8-10 9.4 0 3.2 2.7 4.9 5.4 4.3 1.8-.4 3-1.2 4.6-1.2s2.8.8 4.6 1.2c2.7.6 5.4-1.1 5.4-4.3 0-4.6-4.5-9.4-10-9.4z" fill="${fill('pink')}" stroke="#5a1430" stroke-width="2" stroke-linejoin="round"/>
    ${[[8.6, 17, -24], [14.8, 10.2, -8], [25.2, 10.2, 8], [31.4, 17, 24]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="3.5" ry="4.5" transform="rotate(${r} ${x} ${y})" fill="${fill('pink')}" stroke="#5a1430" stroke-width="1.8"/>${shine(x - 0.8, y - 1.6, 1.3, 0.8, r)}`).join('')}
    ${shine(16.5, 23.5, 3.5, 1.8, -15)}`,
  // Sạp hàng mái sọc đỏ trắng, quầy gỗ bày đồ: "Cửa hàng"
  shop: `<path d="M8 13v21M32 13v21" stroke="#6e3510" stroke-width="2.6"/>
    <path d="M7 19h26v15H7z" fill="${fill('cream')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="13" cy="21.6" r="2.6" fill="${fill('gold')}" stroke="${O}" stroke-width="1"/>
    <path d="M18.4 24 21 19.6l2.6 4.4z" fill="${fill('blue')}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
    <rect x="26" y="20" width="4.2" height="4" rx=".8" fill="${fill('green')}" stroke="${O}" stroke-width="1"/>
    <path d="M5.5 24h29v4.4h-29z" fill="${fill('wood')}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M4 15 8 5h24l4 10z" fill="${fill('red')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 5.4 12.6 15M20 5.4V15M26 5.4l1.4 9.6" stroke="#fff4e0" stroke-width="3"/>
    <path d="M4 15a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 8 0" fill="${fill('red')}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M20 5V1.6l4.2 1.4L20 4.4" fill="${fill('gold')}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>
    ${shine(11, 8.5, 4, 1.6, -18)}`,
  // Thẻ ước đỏ viền vàng, sao giữa, tua vàng: "Bảng ước"
  wish: `<path d="M20 1.8v6" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
    <path d="M13.5 30.5l-2.2 6.5M26.5 30.5l2.2 6.5" stroke="${O}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M13.5 30.5l-2.2 6.5M26.5 30.5l2.2 6.5" stroke="#ffcb3d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10 9h20v18l-10 9-10-9z" fill="${fill('red')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12.6 11.6h14.8v14.2L20 32.4l-7.4-6.6z" fill="none" stroke="#ffcb3d" stroke-width="1.2"/>
    <path d="${star(20, 20.5, 6.4, 2.7)}" fill="${fill('gold')}" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="20" cy="8" r="2.2" fill="${fill('gold')}" stroke="${O}" stroke-width="1"/>
    ${shine(14.5, 14, 3.5, 1.8, -25)}`,
  // Máy ảnh xanh ống kính bạc: "Chia sẻ"
  camera: `<path d="M13 11.5l2.6-4.8h8.8l2.6 4.8z" fill="${fill('blue')}" stroke="#0e2450" stroke-width="2" stroke-linejoin="round"/>
    <rect x="4" y="11" width="32" height="22" rx="4.5" fill="${fill('blue')}" stroke="#0e2450" stroke-width="2"/>
    <rect x="7" y="8.6" width="4.4" height="2.6" rx=".8" fill="${fill('red')}" stroke="#0e2450" stroke-width="1"/>
    <rect x="5.2" y="17" width="29.6" height="3" fill="#1a4d9e" opacity=".55"/>
    <circle cx="20" cy="22.4" r="8.2" fill="${fill('steel')}" stroke="#0e2450" stroke-width="2"/>
    <circle cx="20" cy="22.4" r="5.2" fill="#163a72" stroke="#0e2450" stroke-width="1"/>
    <circle cx="18.2" cy="20.6" r="2" fill="#c4e6ff"/>
    <rect x="28" y="13.4" width="5" height="3" rx="1" fill="#fff6c2" stroke="#0e2450" stroke-width="1"/>
    ${shine(10, 14.5, 4, 1.6, -10)}`,
  // Đôi nốt nhạc tím bóng, lấp lánh: "Nhạc"
  music: `<path d="M14 12.4 33 7.4v6l-19 5z" fill="${fill('purple')}" stroke="#3a1458" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 15v14.6M33 10v14.6" stroke="#3a1458" stroke-width="2.8" stroke-linecap="round"/>
    <ellipse cx="10" cy="30.4" rx="5.2" ry="4.1" transform="rotate(-18 10 30.4)" fill="${fill('purple')}" stroke="#3a1458" stroke-width="2"/>
    <ellipse cx="29" cy="25.4" rx="5.2" ry="4.1" transform="rotate(-18 29 25.4)" fill="${fill('purple')}" stroke="#3a1458" stroke-width="2"/>
    ${shine(8.6, 29, 2.2, 1.2, -18)}${shine(27.6, 24, 2.2, 1.2, -18)}${shine(19, 11.6, 3.5, 1.1, -14)}
    <path d="${star(7, 9, 3.4, 1.1)}" fill="#fff3b0"/>`,
  // Bánh răng bạc lõi vàng: "Đồ hoạ"
  sliders: `<path d="${gear(20, 20, 16, 12.2, 9)}" fill="${fill('steel')}" stroke="#2a2f38" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="7" fill="${fill('gold')}" stroke="#2a2f38" stroke-width="1.8"/>
    <circle cx="20" cy="20" r="2.8" fill="#5d6672" stroke="#2a2f38" stroke-width="1"/>
    ${shine(14, 12.5, 5, 2.2, -35)}`,
  // Loa xanh lá phát sóng: tiếng đang bật
  sound: `${speaker('green', '#14400f')}
    <path d="M25 14.5a7 7 0 0 1 0 11M29.5 10a13 13 0 0 1 0 20" fill="none" stroke="#14400f" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M25 14.5a7 7 0 0 1 0 11M29.5 10a13 13 0 0 1 0 20" fill="none" stroke="#7fe08a" stroke-width="2.2" stroke-linecap="round"/>`,
  // Loa xám gạch chéo đỏ: đã tắt tiếng
  mute: `${speaker('grey', '#3a3530')}
    <path d="m24 14.5 10 10m0-10-10 10" stroke="#3a1804" stroke-width="5.4" stroke-linecap="round"/>
    <path d="m24 14.5 10 10m0-10-10 10" stroke="#ff4a36" stroke-width="3" stroke-linecap="round"/>`,
};

let defsMounted = false;
/** Gắn dải màu dùng chung một lần. SVG chứa defs không được display:none, nếu không trình duyệt bỏ qua dải màu. */
function mountDefs() {
  if (defsMounted || typeof document === 'undefined') return;
  defsMounted = true;
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = `<defs>${DEFS}</defs>`;
  document.body.prepend(holder);
}

/** Icon minh hoạ: span.game-icon chứa SVG 40x40. Tên lạ thì trả ô trống để nút vẫn bấm được. */
export function gameIcon(name) {
  mountDefs();
  const span = document.createElement('span');
  span.className = 'game-icon';
  span.setAttribute('aria-hidden', 'true');
  const body = ICONS[name];
  if (body) span.innerHTML = `<svg viewBox="0 0 40 40" focusable="false">${body}</svg>`;
  return span;
}

/** Thay mọi phần tử có data-game-icon trong root bằng icon tương ứng. */
export function mountGameIcons(root = document) {
  for (const el of root.querySelectorAll('[data-game-icon]')) el.replaceWith(gameIcon(el.dataset.gameIcon));
}
