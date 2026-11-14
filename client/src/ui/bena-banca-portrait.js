// Chân dung Bena Banca cho quầy bên hồ: tóc bob đen mái bằng, má hồng nét sóng, pyjama satin đen chấm đào,
// bé mèo mướp đội vòng hoa hồng khoác áo choàng xanh than trên vai, nền trời hoàng hôn. Cùng bảng màu với mô hình 3D
// (scene/bena-banca-look.js). Chuỗi SVG là hằng số trong mã nên gắn innerHTML an toàn.

const SKIN = '#f6d6c2';
const HAIR = '#17131a';
const SATIN = '#1f1b24';
const PEACH = '#f2b8a8';
const TABBY = '#d89a4a';

/** Mèo mướp nhỏ đứng trên vai trái của cô (bên phải khung hình). */
const CAT = `
  <path d="M41 58q9-9 18 0v8H41z" fill="#2b3550" stroke="#efe3c9" stroke-width="1.2"/>
  <path d="M44.6 44.5l.6-6.5 4.4 3.6zM55.4 44.5l-.6-6.5-4.4 3.6z" fill="${TABBY}"/>
  <circle cx="50" cy="47" r="6.6" fill="${TABBY}"/>
  <path d="M48 41.4v2.6M50 40.8v3M52 41.4v2.6" stroke="#8a5a24" stroke-width="1"/>
  <circle cx="47.7" cy="47" r=".95" fill="#2b1c13"/><circle cx="52.3" cy="47" r=".95" fill="#2b1c13"/>
  <path d="M49.3 49.1h1.4l-.7.8z" fill="#c8606c"/>
  <path d="M44.6 41.6q5.4-4.6 10.8 0" stroke="#5f9a52" stroke-width="1.4" fill="none"/>
  ${[[45, 41.4], [47.4, 39.6], [50, 39], [52.6, 39.6], [55, 41.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.35" fill="#f08aa0"/>`).join('')}`;

/** Chấm bánh bao đào trên áo pyjama. */
const DOTS = [[13, 58], [20, 54], [44, 61], [24, 62], [9, 63]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${PEACH}"/>`).join('');

export function benaPortraitSvg() {
  return `<svg class="bena-portrait" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <radialGradient id="benaSky" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#f7cdb2"/><stop offset=".55" stop-color="#b97a8c"/><stop offset="1" stop-color="#3a2b45"/></radialGradient>
    <clipPath id="benaClip"><circle cx="32" cy="32" r="31"/></clipPath>
  </defs>
  <circle cx="32" cy="32" r="31" fill="url(#benaSky)"/>
  <g clip-path="url(#benaClip)">
    <path d="M14 36c-1-14 6-22 18-22s19 8 18 22v10H14z" fill="${HAIR}"/>
    <path d="M4 66c1-12 9-18 28-18s27 6 28 18z" fill="${SATIN}"/>
    ${DOTS}
    <rect x="28" y="40" width="8" height="10" rx="3" fill="#ecc6b0"/>
    <path d="M25.5 48.5 32 57l6.5-8.5" fill="none" stroke="#4a4352" stroke-width="1.6"/>
    <ellipse cx="32" cy="33" rx="11" ry="12" fill="${SKIN}"/>
    <path d="M19.6 29C19.6 19.6 25 15 32 15s12.4 4.6 12.4 14z" fill="${HAIR}"/>
    <path d="M19.6 27h3.2v16h-3.6zM44.4 27h-3.2v16h3.6z" fill="${HAIR}"/>
    <path d="M25 19.5q4-2.2 8.5-1.6" stroke="#6a6070" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M25.6 33.6q2-2 4 0M34.4 33.6q2-2 4 0" stroke="#2b1c13" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M23.4 37.6q1-1.1 2 0t2 0M36.6 37.6q1-1.1 2 0t2 0" stroke="#e98a8a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M30.2 40.6q1.8 1.4 3.6 0" stroke="#c8606c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${CAT}
  </g>
  <circle cx="32" cy="32" r="31" fill="none" stroke="${PEACH}" stroke-width="1.5"/>
</svg>`;
}
