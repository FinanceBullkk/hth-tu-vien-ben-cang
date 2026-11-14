// Bộ icon màu cho thanh menu kiểu game thùng đồ: hình khối tô màu tươi, viền nâu đậm như tranh hoạt hình,
// đặt trên ô nút nổi khối (xem game-menu.css). Tự vẽ bằng SVG nên không cần tài nguyên ngoài (CSP cùng nguồn).
// Chuỗi SVG là hằng số trong mã, không chứa dữ liệu người dùng, nên gắn bằng innerHTML là an toàn.

const O = '#4a1e04'; // màu viền chung

const ICONS = {
  // La bàn vàng, kim đỏ xanh: "Chơi gì?"
  compass: `<circle cx="16" cy="16" r="12.5" fill="#ffcf4a" stroke="${O}" stroke-width="2"/>
    <circle cx="16" cy="16" r="9" fill="#fff6d6" stroke="#c98a1c" stroke-width="1.2"/>
    <path d="M16 7.6 19 16h-6z" fill="#ec4a2c" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M16 24.4 13 16h6z" fill="#4a86e8" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="16" cy="16" r="1.7" fill="${O}"/>
    <path d="M9.5 9.8a9 9 0 0 1 4-3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".8"/>`,
  // Sổ bìa đỏ, nhãn vàng, gáy trang kem: "Sổ an"
  book: `<path d="M7 5.5h16a2 2 0 0 1 2 2v19H9.5A2.5 2.5 0 0 1 7 24z" fill="#cf432c" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M9.5 22.5H25v4H9.5a2 2 0 0 1 0-4z" fill="#fff3d2" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="11.5" y="9" width="9.5" height="6.5" rx="1.2" fill="#ffd45a" stroke="${O}" stroke-width="1.3"/>
    <path d="M13.5 11.5h5.5M13.5 13.2h3.5" stroke="#a5521a" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M9.2 7.5v13" stroke="#f08a6c" stroke-width="1.4" stroke-linecap="round"/>`,
  // Bao da buộc dây, đồng vàng giữa thân: "Túi đồ"
  bag: `<path d="M11 10c-4 3-6 7-6 10.4 0 4.4 4.4 6.4 11 6.4s11-2 11-6.4C27 17 25 13 21 10z" fill="#c9843c" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M10.5 4.5h11L19 10h-6z" fill="#e3a557" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M10.2 10.2h11.6" stroke="#7a2d0c" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="16" cy="19" r="4.2" fill="#ffd34d" stroke="${O}" stroke-width="1.5"/>
    <path d="M14.6 19h2.8" stroke="#b2700c" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M8.6 17c.5-2 1.6-3.6 3-4.8" stroke="#f3c48a" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  // Dấu chân hồng: "Thú cưng"
  paw: `<path d="M16 15c-4 0-7.5 3.6-7.5 7 0 2.4 2 3.6 4 3.2 1.3-.3 2.2-.9 3.5-.9s2.2.6 3.5.9c2 .4 4-.8 4-3.2 0-3.4-3.5-7-7.5-7z" fill="#ff8fb3" stroke="#5a1430" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="7.4" cy="13.6" rx="2.7" ry="3.4" transform="rotate(-24 7.4 13.6)" fill="#ff8fb3" stroke="#5a1430" stroke-width="1.8"/>
    <ellipse cx="12.4" cy="8.4" rx="2.8" ry="3.6" transform="rotate(-8 12.4 8.4)" fill="#ff8fb3" stroke="#5a1430" stroke-width="1.8"/>
    <ellipse cx="19.6" cy="8.4" rx="2.8" ry="3.6" transform="rotate(8 19.6 8.4)" fill="#ff8fb3" stroke="#5a1430" stroke-width="1.8"/>
    <ellipse cx="24.6" cy="13.6" rx="2.7" ry="3.4" transform="rotate(24 24.6 13.6)" fill="#ff8fb3" stroke="#5a1430" stroke-width="1.8"/>
    <ellipse cx="14" cy="19" rx="2.2" ry="1.3" fill="#ffd6e4"/>`,
  // Sạp mái sọc đỏ trắng: "Cửa hàng"
  shop: `<path d="M6.5 14h19v12.5h-19z" fill="#f6dfb2" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="13" y="18" width="6" height="8.5" fill="#a0602a" stroke="${O}" stroke-width="1.5"/>
    <path d="M4 13.5 6.8 5.5h18.4L28 13.5z" fill="#e8402a" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11.3 5.8 10 13.3M16 5.8v7.5M20.7 5.8l1.3 7.5" stroke="#fff3df" stroke-width="2.4"/>
    <path d="M4 13.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" fill="#e8402a" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="9.6" cy="20.5" r="1.6" fill="#ffd34d" stroke="${O}" stroke-width="1"/>`,
  // Thẻ ước đỏ treo dây, sao vàng: "Bảng ước"
  wish: `<path d="M16 2.5v4.5" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
    <path d="M8.5 7h15v14.5L16 28l-7.5-6.5z" fill="#e2412e" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <path d="m16 10.4 1.6 3.2 3.5.5-2.5 2.5.6 3.5L16 18.4l-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="#ffd34d" stroke="#7a2306" stroke-width="1" stroke-linejoin="round"/>
    <path d="M10.5 9v10" stroke="#f58a74" stroke-width="1.4" stroke-linecap="round"/>`,
  // Máy ảnh xanh: "Chia sẻ"
  camera: `<path d="M4.5 11.5a2 2 0 0 1 2-2h4l2-3.2h7l2 3.2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2z" fill="#4f8fe0" stroke="#10285a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="16" cy="17.3" r="5.4" fill="#cfe6ff" stroke="#10285a" stroke-width="2"/>
    <circle cx="16" cy="17.3" r="2.5" fill="#2a5aa8"/>
    <circle cx="15" cy="16.3" r=".9" fill="#fff"/>
    <circle cx="24" cy="12.6" r="1.3" fill="#ffd34d" stroke="#10285a" stroke-width=".8"/>`,
  // Nốt nhạc đôi tím: "Nhạc"
  music: `<path d="M12 9.5 25 6v4.2l-13 3.5z" fill="#a46be8" stroke="#3a1458" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 12v10.5M25 9v10" stroke="#3a1458" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="9" cy="23" rx="3.8" ry="3" fill="#a46be8" stroke="#3a1458" stroke-width="2"/>
    <ellipse cx="22" cy="19.6" rx="3.8" ry="3" fill="#a46be8" stroke="#3a1458" stroke-width="2"/>
    <ellipse cx="8" cy="22" rx="1.2" ry=".7" fill="#e3ccff"/>`,
  // Hai thanh trượt núm cam, núm ngọc: "Đồ hoạ"
  sliders: `<rect x="4.5" y="9" width="23" height="4.4" rx="2.2" fill="#6b5846" stroke="#2a1a0c" stroke-width="1.5"/>
    <rect x="4.5" y="19" width="23" height="4.4" rx="2.2" fill="#6b5846" stroke="#2a1a0c" stroke-width="1.5"/>
    <circle cx="19.5" cy="11.2" r="4.2" fill="#ffb13d" stroke="${O}" stroke-width="1.8"/>
    <circle cx="11.5" cy="21.2" r="4.2" fill="#4fd1c5" stroke="#0e3a36" stroke-width="1.8"/>
    <circle cx="18.4" cy="10" r="1.1" fill="#fff" opacity=".8"/><circle cx="10.4" cy="20" r="1.1" fill="#fff" opacity=".8"/>`,
  // Loa xanh lá: tiếng đang bật
  sound: `<path d="M4.5 12.5h5l6.5-5.3v17.6l-6.5-5.3h-5z" fill="#5fcf6a" stroke="#14400f" stroke-width="2" stroke-linejoin="round"/>
    <path d="M20 12.2a5 5 0 0 1 0 7.6M23.4 8.8a9.5 9.5 0 0 1 0 14.4" fill="none" stroke="#14400f" stroke-width="2.3" stroke-linecap="round"/>`,
  // Loa xám gạch chéo đỏ: đã tắt tiếng
  mute: `<path d="M4.5 12.5h5l6.5-5.3v17.6l-6.5-5.3h-5z" fill="#bdb5a8" stroke="#3a3530" stroke-width="2" stroke-linejoin="round"/>
    <path d="m19.5 12.5 7 7m0-7-7 7" stroke="#e23a2a" stroke-width="3" stroke-linecap="round"/>`,
};

/** Ô icon màu: span.game-icon chứa SVG 32x32. Tên lạ thì trả ô trống để nút vẫn bấm được. */
export function gameIcon(name) {
  const span = document.createElement('span');
  span.className = 'game-icon';
  span.setAttribute('aria-hidden', 'true');
  const body = ICONS[name];
  if (body) span.innerHTML = `<svg viewBox="0 0 32 32" focusable="false">${body}</svg>`;
  return span;
}

/** Thay mọi phần tử có data-game-icon trong root bằng icon màu tương ứng. */
export function mountGameIcons(root = document) {
  for (const el of root.querySelectorAll('[data-game-icon]')) el.replaceWith(gameIcon(el.dataset.gameIcon));
}
