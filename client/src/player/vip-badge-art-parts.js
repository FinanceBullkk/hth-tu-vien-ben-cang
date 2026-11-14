// Chi tiết vẽ dùng chung cho huy hiệu danh hiệu chí tôn và khung bảng tên (chuỗi SVG thuần, không chạm DOM).
// Vẻ "đúc kim loại" đến từ bộ lọc ánh sáng SVG: lấy độ mờ của hình làm bản đồ lồi lõm rồi chiếu đèn khuếch tán
// (sáng tối theo mặt nghiêng) và đèn phản chiếu (vệt bóng loáng) lên màu vàng gốc, nên mép cánh, viền bảng, chữ đều
// có gờ nổi như vàng thật thay vì mảng màu phẳng. Ảnh được trình duyệt raster một lần (SVG làm ảnh), không tốn khung hình.

export const FONT = `'Palatino Linotype','Book Antiqua',Palatino,'Noto Serif',Georgia,serif`;

// Bộ lọc kim loại: blur = độ bo của gờ, depth = độ cao gờ.
const metalFilter = (id, blur, depth) => `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
  <feSpecularLighting in="b" surfaceScale="${depth}" specularConstant="1.3" specularExponent="20" lighting-color="#fff4d2" result="s">
    <feDistantLight azimuth="225" elevation="36"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
  <feDiffuseLighting in="b" surfaceScale="${depth}" diffuseConstant="1.2" lighting-color="#fff" result="d">
    <feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
  <feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/>
  <feComposite in="SourceGraphic" in2="d2" operator="arithmetic" k1="1.18" result="lit"/>
  <feComposite in="s2" in2="lit" operator="arithmetic" k2=".8" k3="1"/>
</filter>`;

/** Khối defs chung: vàng gốc, sơn mài theo chủ đề, ngọc theo chủ đề, bộ lọc kim loại lớn/nhỏ, bóng đổ. */
export function sharedDefs(theme) {
  const [l0, l1, l2] = theme.lacquer, [g0, g1, g2] = theme.gem;
  return `<linearGradient id="au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b4"/><stop offset=".3" stop-color="#f0c457"/>
    <stop offset=".58" stop-color="#b07419"/><stop offset=".78" stop-color="#e6b444"/><stop offset="1" stop-color="#8f5a10"/></linearGradient>
  <linearGradient id="lq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l0}"/><stop offset=".5" stop-color="${l1}"/><stop offset="1" stop-color="${l2}"/></linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="gem" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${g0}"/><stop offset=".45" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></radialGradient>
  ${metalFilter('mB', 1.3, 3.2)}${metalFilter('mS', 0.65, 2)}
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.3" stdDeviation="1.3" flood-color="#000" flood-opacity=".6"/></filter>`;
}

/** Viên ngọc cắt hình thoi: nền gradient ngọc, viền vàng, điểm sáng trắng. */
export const gemDiamond = (x, y, r) => `<path d="M${x} ${y - r}L${x + r * 0.8} ${y}L${x} ${y + r}L${x - r * 0.8} ${y}Z" fill="url(#gem)" stroke="#2a1300" stroke-width=".7"/>
  <path d="M${x} ${y - r}L${x + r * 0.8} ${y}L${x} ${y + r}L${x - r * 0.8} ${y}Z" fill="none" stroke="#ffe08a" stroke-width=".5" stroke-opacity=".8"/>
  <ellipse cx="${n(x - r * 0.22)}" cy="${n(y - r * 0.35)}" rx="${n(r * 0.22)}" ry="${n(r * 0.14)}" fill="#fff" opacity=".9"/>`;
const n = v => +v.toFixed(2);

// Cánh trái: năm lông vũ vàng vuốt nhọn (dài xen ngắn) toả ra từ đầu bảng, có rãnh gân, và một cuộn xoắn ở gốc.
// Cánh phải lật gương. Tất cả vẽ trong nhóm lọc kim loại lớn.
const WING_BLADES = [
  'M92 60C72 44 46 31 12 24C38 35 57 50 74 69Z',
  'M76 70C56 62 30 59 2 63C28 69 50 74 74 81Z',
  'M78 85C60 91 41 101 18 116C42 107 61 99 84 91Z',
  'M76 64C61 54 45 47 24 42C41 51 56 60 72 72Z',
  'M74 79C59 81 42 85 24 94C44 91 59 89 76 87Z',
];
const WING_VEINS = 'M84 58C66 46 44 35 22 28M70 71C52 66 30 63 12 64M74 87C58 93 42 102 28 110M70 64C58 56 44 50 32 46M70 82C58 84 44 88 32 92';
const WING_SCROLL = 'M66 74C61 65 50 68 51 76C52 83 62 83 62 77C62 73 56 73 57 77';

export function wings(width) {
  const side = `${WING_BLADES.map(d => `<path d="${d}"/>`).join('')}
    <path d="${WING_VEINS}" fill="none" stroke="#6a3c06" stroke-width=".9" stroke-linecap="round"/>
    <path d="${WING_SCROLL}" fill="none" stroke="url(#au)" stroke-width="3" stroke-linecap="round"/>`;
  return `<g filter="url(#sh)"><g filter="url(#mB)" fill="url(#au)" stroke="#3a1d02" stroke-width=".7" stroke-linejoin="round">${side}
    <g transform="translate(${width} 0) scale(-1 1)">${side}</g></g></g>`;
}

// Bảng sơn mài bát giác vát góc, viền vàng đúc dày, chỉ vàng mảnh bên trong, ngọc hai đầu, móc treo ngọc phía dưới.
const PLAQUE = 'M80 56H220L238 65V83L220 92H80L62 83V65Z';
const PLAQUE_INNER = 'M83 59.6H217L233.4 67.2V80.8L217 88.4H83L66.6 80.8V67.2Z';
const PENDANT = 'M135 90H165L159 101L150 111L141 101Z';

export function plaque() {
  return `<g filter="url(#sh)"><path d="${PLAQUE}" fill="url(#lq)"/></g>
  <path d="${PLAQUE}" fill="url(#gloss)"/>
  <g filter="url(#mB)" fill="none" stroke="url(#au)" stroke-linejoin="round">
    <path d="${PLAQUE}" stroke-width="5"/><path d="${PLAQUE_INNER}" stroke-width="1.1"/></g>
  ${gemDiamond(72.5, 74, 5)}${gemDiamond(227.5, 74, 5)}`;
}

export function pendant() {
  return `<g filter="url(#sh)"><path d="${PENDANT}" fill="url(#au)" stroke="#3a1d02" stroke-width=".7" filter="url(#mB)"/></g>
  <ellipse cx="150" cy="99.5" rx="6.2" ry="6.8" fill="url(#gem)" stroke="#2a1300" stroke-width=".8"/>
  <ellipse cx="147.8" cy="96.6" rx="2.1" ry="1.3" fill="#fff" opacity=".9"/>`;
}

/** Chữ danh hiệu: quầng màu chủ đề, viền tối dày, thân vàng đúc gờ nổi. */
export function titleText(title, { size, spacing }, glow) {
  const x = 150 + spacing / 2; // letter-spacing cộng thêm một khoảng sau chữ cuối, bù để chữ nằm giữa
  const attrs = `x="${x}" y="81" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" letter-spacing="${spacing}"`;
  return `<linearGradient id="tx" gradientUnits="userSpaceOnUse" x1="0" y1="63" x2="0" y2="82"><stop offset="0" stop-color="#fffbe8"/>
    <stop offset=".38" stop-color="#ffe07c"/><stop offset=".55" stop-color="#c48419"/><stop offset=".72" stop-color="#ffe9a2"/><stop offset="1" stop-color="#b2760f"/></linearGradient>
  <filter id="tg" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
  <text ${attrs} fill="${glow}" stroke="${glow}" stroke-width="3" opacity=".75" filter="url(#tg)">${title}</text>
  <text ${attrs} fill="none" stroke="#1c0900" stroke-width="3.6" stroke-linejoin="round">${title}</text>
  <text ${attrs} fill="url(#tx)" filter="url(#mS)">${title}</text>`;
}
