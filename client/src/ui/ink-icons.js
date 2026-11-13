// Bộ icon nét kiểu "mực tàu" dùng thay emoji trên HUD: SVG 24x24, chỉ nét (stroke) theo màu chữ,
// tự vẽ nên không phụ thuộc tài nguyên ngoài (CSP chỉ cho phép cùng nguồn).
// Chuỗi SVG là hằng số trong mã, không chứa dữ liệu người dùng, nên gắn bằng innerHTML là an toàn.

const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="currentColor" stroke="none"/>`;

const PATHS = {
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4 13.2 13.2 8.4 15.6 10.8 10.8z"/>',
  book: '<path d="M4 5.5c2.6-1 5.4-1 8 .6 2.6-1.6 5.4-1.6 8-.6v13c-2.6-1-5.4-1-8 .6-2.6-1.6-5.4-1.6-8-.6z"/><path d="M12 6.1v13"/>',
  wish: '<path d="M12 2.5v3"/><path d="M8.2 5.5h7.6v11.2L12 20.5l-3.8-3.8z"/><path d="M10.4 9.5h3.2M10.4 12.5h3.2"/>',
  camera: '<rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M8.5 7 10 4.5h4L15.5 7"/><circle cx="12" cy="13" r="3.2"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.6 14.6c2.3-.2 4.2 1.2 4.9 4"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/>',
  smile: `<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2"/>${DOT(9.3, 10)}${DOT(14.7, 10)}`,
  lotus: '<path d="M12 19c-4 0-7-2.5-8-6 2.5-.3 5 .6 6.5 2.3"/><path d="M12 19c4 0 7-2.5 8-6-2.5-.3-5 .6-6.5 2.3"/><path d="M12 19c-2-2-2.8-5-2-8.5.6-1.8 1.2-3 2-4.5.8 1.5 1.4 2.7 2 4.5.8 3.5 0 6.5-2 8.5z"/>',
  fish: `<path d="M3 12c3-4 8-5 12-2l4-3v10l-4-3c-4 3-9 2-12-2z"/>${DOT(8, 11)}`,
  bell: '<path d="M12 4c-3.3 0-5.5 2.6-5.5 6v4L5 16.5h14L17.5 14v-4c0-3.4-2.2-6-5.5-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  pot: '<path d="M9.5 4.5h5M10 4.5v2.5c-3 1.5-4.5 4-4.5 6.8C5.5 17.6 8.4 20 12 20s6.5-2.4 6.5-6.2c0-2.8-1.5-5.3-4.5-6.8V4.5"/><path d="m15.5 2-4.5 9"/>',
  sticks: '<path d="M7 10h10l-1.2 10H8.2z"/><path d="M9 10 8 3M12 10V2.5M15 10l1-7"/>',
  shop: '<path d="M3.5 9.5 5 4.5h14l1.5 5"/><path d="M3.5 9.5c0 1.4 1.1 2.3 2.4 2.3s2.4-.9 2.4-2.3c0 1.4 1.1 2.3 2.4 2.3h.6c1.3 0 2.4-.9 2.4-2.3 0 1.4 1.1 2.3 2.4 2.3s2.4-.9 2.4-2.3z"/><path d="M5.5 11.8V20h13v-8.2"/><path d="M10 20v-4.5h4V20"/>',
  robe: '<path d="M12 4.5a1.6 1.6 0 1 1 1.6 1.6c-.9 0-1.6.5-1.6 1.4"/><path d="M12 7.5 3.5 13.5c-.7.5-.3 1.5.5 1.5h16c.8 0 1.2-1 .5-1.5z"/><path d="M6.5 15v4.5h11V15"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><rect x="9.5" y="9.5" width="5" height="5"/>',
  dice: `<rect x="4.5" y="4.5" width="15" height="15" rx="3"/>${DOT(9, 9)}${DOT(15, 9)}${DOT(12, 12)}${DOT(9, 15)}${DOT(15, 15)}`,
  cards: '<rect x="4" y="6" width="10" height="14" rx="1.5" transform="rotate(-12 9 13)"/><rect x="10" y="4" width="10" height="14" rx="1.5" transform="rotate(10 15 11)"/>',
  wheel: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5"/>${DOT(17.5, 7)}`,
  tree: '<path d="M12 21v-6"/><path d="M12 15c-4.5 0-7-2.5-7-5.5S8 4 12 4s7 2.5 7 5.5-2.5 5.5-7 5.5z"/><path d="m12 15-3-3M12 13l3-3"/>',
};

/** Tạo một icon nét; tên lạ thì trả về span rỗng để giao diện không vỡ. */
export function inkIcon(name) {
  const span = document.createElement('span');
  span.className = 'ink-icon';
  span.setAttribute('aria-hidden', 'true');
  const body = PATHS[name];
  if (body) span.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${body}</svg>`;
  return span;
}

/** Thay mọi phần tử có data-icon trong root bằng icon tương ứng. */
export function mountInkIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) el.replaceWith(inkIcon(el.dataset.icon));
}
