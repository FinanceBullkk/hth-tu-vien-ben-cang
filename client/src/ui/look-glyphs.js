// Icon vật phẩm cho món ngoại hình (ô túi đồ, ô trang bị): áo, trang phục, vũ khí, mũ, tóc, hào quang.
// Mỗi món một hình vẽ tay đơn giản, nhuộm theo màu riêng để các ô không giống nhau.
// Trả về chuỗi SVG dựng hoàn toàn từ hằng số trong mã, nên gắn innerHTML an toàn.
import { SHIRT_COLORS } from '../../../shared/protocol.js';

/** Màu chủ đạo của từng hào quang (cả ô sạp và icon túi đồ). */
export const EFFECT_TINT = {
  1: '#e8c060', 2: '#7fc8e8', 3: '#5b6fd6', 4: '#e2672a', 5: '#f08cb0', 6: '#3fae8a', 7: '#c9d6e8',
  8: '#4b2f63', 9: '#d4a017', 10: '#c0392b', 11: '#e8c34a', 12: '#5fb7d9', 13: '#d4a52a', 14: '#2aa7c4',
};

// Trang phục: màu thân áo và màu viền, cổ, đai.
const ATTIRE_TINT = [
  ['#8a6a4a', '#4e3622'], ['#4f7fb8', '#e8d9a8'], ['#eef0f2', '#7aa0c8'], ['#d9822b', '#7a3a10'],
  ['#b8443a', '#e0b050'], ['#3d9a8e', '#e8d0a0'], ['#d9607a', '#f5e0c0'], ['#e0b030', '#c0392b'],
];

const wrap = (body, defs = '') => `<svg class="bag-glyph look-glyph" viewBox="0 0 48 48" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

/** Làm tối (f < 0) hoặc sáng (f > 0) một màu hex. */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function shirt(color) {
  const line = shade(color, -0.5);
  return wrap(`<path d="M16 9 10 12 5 20l5 4 3-3v19h22V21l3 3 5-4-5-8-6-3c-2 4-14 4-16 0Z" fill="${color}" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>`
    + `<path d="M16 9l8 9 8-9" fill="none" stroke="${line}" stroke-width="1.6"/><path d="M13 27h22" stroke="${shade(color, 0.35)}" stroke-width="1.4" opacity=".7"/>`);
}

function robe(index) {
  const [body, trim] = ATTIRE_TINT[index] ?? ATTIRE_TINT[0];
  const line = shade(body, -0.55);
  return wrap(`<path d="M17 6 9 9 3 22l6 4 3-3-1 21h26l-1-21 3 3 6-4-6-13-8-3Z" fill="${body}" stroke="${line}" stroke-width="1.7" stroke-linejoin="round"/>`
    + `<path d="M17 6l10 16M31 6 21 18" stroke="${trim}" stroke-width="3" stroke-linecap="round"/>`
    + `<rect x="11.5" y="24" width="25" height="4.5" rx="1" fill="${trim}" stroke="${line}" stroke-width="1"/>`
    + `<path d="M3 22l6 4M45 22l-6 4M11 44h26" stroke="${trim}" stroke-width="2.2"/>`);
}

const WEAPON = {
  1: '<path d="M36 7l5 5-23 23-5-5Z" fill="#e3eaf2" stroke="#4f5f72" stroke-width="1.5" stroke-linejoin="round"/><path d="M38.5 9.5 16 32" stroke="#fff" stroke-width="1" opacity=".8"/>'
    + '<path d="M10 27l11 11" stroke="#d4a017" stroke-width="4" stroke-linecap="round"/><path d="M14 34l-7 7" stroke="#5a2a12" stroke-width="4.5" stroke-linecap="round"/>'
    + '<circle cx="6.5" cy="41.5" r="2.6" fill="#d4a017"/><path d="M6 43c-1 2-1 3 0 4M8 43c1 2 1 3 2 4" stroke="#c0392b" stroke-width="1.6"/>',
  2: '<path d="M36 6 23 23" stroke="#8a5a2a" stroke-width="4" stroke-linecap="round"/><circle cx="23" cy="23" r="3" fill="#d4a017" stroke="#7a5418"/>'
    + '<path d="M22 25c-4 6-9 10-15 16M22 25c-2 7-6 12-10 18M21 24c-6 3-11 5-16 10M23 26c0 7-3 12-5 17M21 25c-5 5-10 7-15 9" fill="none" stroke="#f6f2e6" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M22 25c-4 6-9 10-15 16M22 25c-2 7-6 12-10 18" fill="none" stroke="#c9c2b0" stroke-width=".8"/>',
  3: '<path d="M11 19q0-7 7-7h13q7 0 7 7v12q0 9-9 9H19q-8 0-8-8Z" fill="#f0c8a0" stroke="#8a5a32" stroke-width="1.6"/>'
    + '<path d="M11 21h27M11 27h27M12 33h25" stroke="#f7f4ee" stroke-width="3.4"/><path d="M11 21h27M11 27h27M12 33h25" stroke="#c9c0b0" stroke-width=".7"/>'
    + '<path d="M18 12v7M24.5 12v7M31 12v7" stroke="#8a5a32" stroke-width="1.2"/><path d="M38 23c3 0 4 3 2 6" fill="none" stroke="#8a5a32" stroke-width="1.6"/>',
};

const HAT = {
  3: '<path d="M10 30q0-18 15-18 15 0 15 16Z" fill="#2f6d9e" stroke="#163650" stroke-width="1.6"/><path d="M7 30h37q0 5-8 5l-28-1Z" fill="#245478" stroke="#163650" stroke-width="1.5"/><circle cx="25" cy="12.5" r="2" fill="#163650"/><path d="M25 13v16" stroke="#4f8dbe" stroke-width="1.2"/>',
  4: '<path d="M3 32 24 7l21 25q-21 7-42 0Z" fill="#dcc58c" stroke="#8a6a2a" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 23q13 4 26 0M16 17q8 3 16 0M7 28q17 5 34 0" fill="none" stroke="#b49a5a" stroke-width="1.1"/>',
  5: '<path d="M8 31q0-20 16-20t16 20Z" fill="#f2c230" stroke="#8a6a10" stroke-width="1.6"/><path d="M24 11v20" stroke="#fff3b0" stroke-width="3"/><path d="M4 31h40v4H4Z" fill="#d9a816" stroke="#8a6a10" stroke-width="1.4"/>',
  6: '<circle cx="24" cy="26" r="15" fill="#d9a06e" stroke="#8a5a32" stroke-width="1.6"/><path d="M8 24l32-6" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/><ellipse cx="30" cy="22" rx="5" ry="4" fill="#2b2b2b"/><path d="M15 31q3 2 6 0" stroke="#8a5a32" stroke-width="1.4" fill="none"/>',
  8: '<path d="M14 36V22q10-6 20 0v14Z" fill="#2b3a52" stroke="#151d2a" stroke-width="1.6"/><path d="M18 22q6-12 12 0" fill="#3c5274" stroke="#151d2a" stroke-width="1.4"/><path d="M6 25h36" stroke="#d4a017" stroke-width="2.6" stroke-linecap="round"/><circle cx="42" cy="25" r="2.4" fill="#3fae8a"/><path d="M14 32h20" stroke="#d4a017" stroke-width="1.4"/>',
  9: '<path d="M8 36V17l8 9 8-15 8 15 8-9v19Z" fill="#e8c34a" stroke="#8a6a10" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 31h32" stroke="#fff3b0" stroke-width="1.6"/><circle cx="24" cy="25" r="3" fill="#c0392b" stroke="#fff3b0"/><circle cx="14" cy="30" r="1.8" fill="#3fae8a"/><circle cx="34" cy="30" r="1.8" fill="#3fae8a"/>',
  10: '<path d="M8 30v14h32V30" fill="#fff" fill-opacity=".45" stroke="#d8d0c0" stroke-width="1.2"/><path d="M14 31v13M20 31v13M28 31v13M34 31v13" stroke="#fff" stroke-width=".8" opacity=".7"/><path d="M3 30 24 6l21 24q-21 7-42 0Z" fill="#dcc58c" stroke="#8a6a2a" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 21q13 4 26 0" fill="none" stroke="#b49a5a" stroke-width="1.1"/>',
};

const FACE = '<circle cx="24" cy="28" r="11" fill="#f0c8a0" stroke="#a8784a" stroke-width="1.2"/><circle cx="20" cy="29" r="1.2" fill="#241a14"/><circle cx="28" cy="29" r="1.2" fill="#241a14"/>';
function hairGlyph(index) {
  const c = index === 5 ? '#dfe3ea' : '#2a1c16';
  const line = index === 5 ? '#8a94a4' : '#0f0906';
  const st = `fill="${c}" stroke="${line}" stroke-width="1.4"`;
  const cap = `<path d="M12 28q0-16 12-16t12 16q-3-8-12-8t-12 8Z" ${st}/>`;
  const long = `<path d="M12 26q-2 10 0 18h6l-5-14ZM36 26q2 10 0 18h-6l5-14Z" ${st}/>`;
  const parts = {
    0: '',
    1: long,
    2: `<circle cx="24" cy="10" r="5.5" ${st}/>`,
    3: `<circle cx="24" cy="10" r="5.5" ${st}/><path d="M14 6l20 7" stroke="#3fae8a" stroke-width="2.2" stroke-linecap="round"/><circle cx="34" cy="13" r="2.2" fill="#7fe0b8" stroke="#2a7a5a"/>`,
    4: `<circle cx="13" cy="13" r="5" ${st}/><circle cx="35" cy="13" r="5" ${st}/>`,
    5: long,
  };
  return wrap(`${parts[index] ?? ''}${FACE}${cap}`);
}

// Hoạ tiết giữa vầng hào quang theo chất của từng hào quang.
const FX_MOTIF = {
  flame: 'M24 12c4 6 8 9 8 15a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 5 3 6-1-5 0-9 1-13Z',
  lotus: 'M24 14c3 4 4 9 0 15-4-6-3-11 0-15ZM24 29c-5-1-10-4-11-9 5 0 9 3 11 9Zm0 0c5-1 10-4 11-9-5 0-9 3-11 9Z',
  moon: 'M28 13a11 11 0 1 0 0 22 9 9 0 1 1 0-22Z',
  swirl: 'M24 24m-2 0a2 2 0 1 1 4 0 5 5 0 0 1-9 2 8 8 0 0 1 9-9 11 11 0 0 1 9 13',
  star: 'M24 12l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z',
};
const FX_KIND = { 1: 'lotus', 5: 'lotus', 4: 'flame', 10: 'flame', 7: 'moon', 8: 'moon', 9: 'swirl', 11: 'swirl' };

function auraGlyph(index) {
  const tint = EFFECT_TINT[index] ?? '#e8c060';
  const id = `lgfx${index}`;
  const defs = `<radialGradient id="${id}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".38" stop-color="${tint}" stop-opacity=".9"/>`
    + `<stop offset=".72" stop-color="${tint}" stop-opacity=".35"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>`;
  const kind = FX_KIND[index] ?? 'star';
  const motif = kind === 'swirl'
    ? `<path d="${FX_MOTIF.swirl}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`
    : `<path d="${FX_MOTIF[kind]}" fill="#fff" fill-opacity=".92" stroke="${shade(tint, -0.4)}" stroke-width=".9"/>`;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M24 3v5" transform="rotate(${a} 24 24)"/>`).join('');
  return wrap(`<circle cx="24" cy="24" r="22" fill="url(#${id})"/><circle cx="24" cy="24" r="15" fill="none" stroke="${tint}" stroke-width="2" stroke-dasharray="3 2.4"/>`
    + `<g stroke="${shade(tint, 0.45)}" stroke-width="2" stroke-linecap="round">${rays}</g>${motif}`, defs);
}

/** Icon của một món: slot là 'color' | 'hair' | 'hat' | 'attire' | 'weapon' | 'effect'. */
export function lookGlyphSvg(slot, index) {
  if (slot === 'color') return shirt(SHIRT_COLORS[index] ?? SHIRT_COLORS[0]);
  if (slot === 'attire') return robe(index);
  if (slot === 'weapon') return wrap(WEAPON[index] ?? WEAPON[1]);
  if (slot === 'hat') return wrap(HAT[index] ?? HAT[3]);
  if (slot === 'hair') return hairGlyph(index);
  return auraGlyph(index);
}
