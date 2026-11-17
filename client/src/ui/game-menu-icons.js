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
  // Dấu chân (glyph nâu đơn sắc): "Thú cưng"
  paw: `<path d="M20 19.5c-4.6 0-8.4 4-8.4 7.9 0 2.7 2.3 4.1 4.5 3.6 1.5-.3 2.5-1 3.9-1s2.4.7 3.9 1c2.2.5 4.5-.9 4.5-3.6 0-3.9-3.8-7.9-8.4-7.9z" fill="#6a3408"/>
    <ellipse cx="11.4" cy="19.4" rx="2.7" ry="3.4" transform="rotate(-22 11.4 19.4)" fill="#6a3408"/>
    <ellipse cx="16.6" cy="13.6" rx="2.8" ry="3.7" transform="rotate(-8 16.6 13.6)" fill="#6a3408"/>
    <ellipse cx="23.4" cy="13.6" rx="2.8" ry="3.7" transform="rotate(8 23.4 13.6)" fill="#6a3408"/>
    <ellipse cx="28.6" cy="19.4" rx="2.7" ry="3.4" transform="rotate(22 28.6 19.4)" fill="#6a3408"/>`,
  // Quầy hàng mái hiên (glyph nâu đơn sắc như các nút ToolBar): "Cửa hàng"
  shop: `<path d="M8 15 11 8.5h18L32 15z" fill="#6a3408"/>
    <path d="M8 15h24v2.4H8z" fill="#6a3408"/>
    <path d="M11 18h18v13H11z" fill="#6a3408"/>
    <path d="M14 21h5.5v4.6H14zM21.5 21H26v10h-4.5z" fill="#f9c25c"/>
    <path d="M9 31.5h22" stroke="#6a3408" stroke-width="2" stroke-linecap="round"/>`,
  // Thẻ ước đỏ viền vàng, sao giữa, tua vàng: "Bảng ước"
  wish: `<path d="M20 1.8v6" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
    <path d="M13.5 30.5l-2.2 6.5M26.5 30.5l2.2 6.5" stroke="${O}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M13.5 30.5l-2.2 6.5M26.5 30.5l2.2 6.5" stroke="#ffcb3d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10 9h20v18l-10 9-10-9z" fill="${fill('red')}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12.6 11.6h14.8v14.2L20 32.4l-7.4-6.6z" fill="none" stroke="#ffcb3d" stroke-width="1.2"/>
    <path d="${star(20, 20.5, 6.4, 2.7)}" fill="${fill('gold')}" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="20" cy="8" r="2.2" fill="${fill('gold')}" stroke="${O}" stroke-width="1"/>
    ${shine(14.5, 14, 3.5, 1.8, -25)}`,
  // Đôi nốt nhạc (glyph nâu đơn sắc): "Nhạc"
  music: `<path d="M15 10.6 30 7.4v5.4l-15 3.2z" fill="#6a3408"/>
    <path d="M15 11.5v15M30 8v14.4" stroke="#6a3408" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="11.4" cy="27.4" rx="4.6" ry="3.6" transform="rotate(-20 11.4 27.4)" fill="#6a3408"/>
    <ellipse cx="26.4" cy="23.6" rx="4.6" ry="3.6" transform="rotate(-20 26.4 23.6)" fill="#6a3408"/>
    <path d="M15.6 13.2 28 10.6" stroke="#f9c25c" stroke-width="1" stroke-linecap="round" opacity=".7"/>`,
  // Bánh răng bạc lõi vàng: "Đồ hoạ"
  sliders: `<path d="${gear(20, 20, 16, 12.2, 9)}" fill="${fill('steel')}" stroke="#2a2f38" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="7" fill="${fill('gold')}" stroke="#2a2f38" stroke-width="1.8"/>
    <circle cx="20" cy="20" r="2.8" fill="#5d6672" stroke="#2a2f38" stroke-width="1"/>
    ${shine(14, 12.5, 5, 2.2, -35)}`,
  // Loa phát sóng (glyph nâu đơn sắc): tiếng đang bật
  sound: `<path d="M8 16h6.5l8-7v22l-8-7H8z" fill="#6a3408"/>
    <path d="M26.5 15.2a7 7 0 0 1 0 9.6M30 11.6a12 12 0 0 1 0 16.8" fill="none" stroke="#6a3408" stroke-width="2.4" stroke-linecap="round"/>`,
  // Loa gạch chéo (glyph nâu đơn sắc): đã tắt tiếng
  mute: `<path d="M8 16h6.5l8-7v22l-8-7H8z" fill="#6a3408"/>
    <path d="m26 15.5 8 9m0-9-8 9" stroke="#6a3408" stroke-width="3" stroke-linecap="round"/>`,
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

/** Nút trên dải menu có ảnh tròn thật chép từ module ToolBar của Gunny92 (cùng nguồn, xem SOURCES.json);
   nút không có ảnh sạch (Cửa hàng, Thú cưng, Nhạc, Âm thanh) dùng glyph SVG nâu đơn sắc đặt trên nền tròn cam cùng phong cách. */
const IMG_ICONS = {
  bag: '/ui/gunny/components/toolbar-bag.png',
  book: '/ui/gunny/components/toolbar-scroll.png',
  sliders: '/ui/gunny/components/toolbar-gear.png',
  wish: '/ui/gunny/components/toolbar-mail.png',
  compass: '/ui/gunny/components/toolbar-turnto.png',
  camera: '/ui/gunny/components/toolbar-people.png',
};

/** Icon minh hoạ: span.game-icon chứa SVG 40x40, hoặc ảnh tròn thật nếu có trong IMG_ICONS. Tên lạ thì trả ô trống để nút vẫn bấm được. */
export function gameIcon(name) {
  mountDefs();
  const span = document.createElement('span');
  span.className = 'game-icon';
  span.setAttribute('aria-hidden', 'true');
  const src = IMG_ICONS[name];
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    span.appendChild(img);
    return span;
  }
  const body = ICONS[name];
  if (body) {
    span.classList.add('game-icon-svg');
    span.innerHTML = `<svg viewBox="0 0 40 40" focusable="false">${body}</svg>`;
  }
  return span;
}

/** Thay mọi phần tử có data-game-icon trong root bằng icon tương ứng. */
export function mountGameIcons(root = document) {
  for (const el of root.querySelectorAll('[data-game-icon]')) el.replaceWith(gameIcon(el.dataset.gameIcon));
}
