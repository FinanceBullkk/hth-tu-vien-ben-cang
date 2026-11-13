// Hình minh hoạ cá nhìn ngang bằng SVG, vẽ từ cùng bảng ngoại hình với mô hình 3D (scene/fish-looks.js).
// Dùng ở thẻ thành quả khi kéo cá lên và trong Sổ cá; loài chưa bắt thì chỉ hiện bóng đen để người chơi tò mò.
import { fishLook } from '../scene/fish-looks.js';

const CY = 32; // trục giữa thân trong khung 120 x 64
const NOSE = 102;
const TAIL_BASE = 26;
const BODY = NOSE - TAIL_BASE;
let uid = 0;

function bodyPath(look, ry) {
  const s = look.snout ? 0.6 : 1; // mõm nhọn: điểm điều khiển lùi về sau
  return `M${NOSE} ${CY} C${NOSE - 10 * s} ${CY - ry * 1.05} ${NOSE - BODY * 0.68} ${CY - ry * 1.12} ${TAIL_BASE} ${CY - ry * 0.28}`
    + ` L${TAIL_BASE} ${CY + ry * 0.28} C${NOSE - BODY * 0.68} ${CY + ry * 1.12} ${NOSE - 10 * s} ${CY + ry * 1.05} ${NOSE} ${CY}Z`;
}

function tailPath(look, ry) {
  const th = Math.max(ry, 9);
  const x = TAIL_BASE + 3;
  switch (look.tail) {
    case 'round': return `M${x} ${CY}L${x - 12} ${CY - th * 0.95}Q${x - 24} ${CY} ${x - 12} ${CY + th * 0.95}Z`;
    case 'shark': return `M${x} ${CY - 2}L${x - 24} ${CY - th * 1.9}L${x - 12} ${CY}L${x - 18} ${CY + th * 0.8}Z`;
    case 'clavus': return `M${x} ${CY - ry * 0.85}Q${x - 12} ${CY} ${x} ${CY + ry * 0.85}Z`;
    default: return `M${x} ${CY}L${x - 20} ${CY - th * 1.15}L${x - 12} ${CY}L${x - 20} ${CY + th * 1.15}Z`;
  }
}

function patternMarks(look, ry) {
  const out = [];
  if (look.pattern === 'stripes') {
    for (let x = 36; x < 96; x += 7) out.push(`<path d="M${x} ${CY - ry * 1.2}q3 ${ry * 0.5} 0 ${ry * 1.05}" stroke="${look.mark}" stroke-width="2.2" fill="none"/>`);
  } else if (look.pattern === 'lines') {
    for (let i = 1; i <= 3; i++) out.push(`<path d="M30 ${CY + i * ry * 0.22}H98" stroke="${look.mark}" stroke-width="1.6"/>`);
  } else if (look.pattern === 'spots') {
    for (let i = 0; i < 16; i++) out.push(`<circle cx="${32 + ((i * 37) % 64)}" cy="${CY - ry * 0.85 + ((i * 53) % 100) / 100 * ry * 1.5}" r="1.8" fill="${look.mark}"/>`);
  } else if (look.pattern === 'dots') {
    for (let x = 40; x < 92; x += 8) out.push(`<circle cx="${x}" cy="${CY + ry * 0.45}" r="1.9" fill="${look.mark}"/>`);
  }
  return out.join('');
}

function fishSvg(look, id, dark) {
  const ry = Math.min(27, (look.h * BODY) / 2);
  const d = Math.min(30 - ry, (look.dorsal ?? 0.14) * BODY);
  const ink = '#2b241c';
  const fill = dark ? ink : `url(#g${id})`;
  const fin = dark ? ink : look.fin;
  const body = bodyPath(look, ry);
  return `${dark ? '' : `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${look.back}"/><stop offset=".5" stop-color="${look.side}"/><stop offset="1" stop-color="${look.belly}"/></linearGradient><clipPath id="c${id}"><path d="${body}"/></clipPath></defs>`}
    <path d="${tailPath(look, ry)}" fill="${fin}"/>
    <path d="M72 ${CY - ry * 0.9}L58 ${CY - ry - d}L44 ${CY - ry * 0.8}Z" fill="${fin}"/>
    <path d="M58 ${CY + ry * 0.85}L50 ${CY + ry + d * 0.45}L42 ${CY + ry * 0.75}Z" fill="${fin}"/>
    <path d="${body}" fill="${fill}"/>
    ${dark ? '' : `<g clip-path="url(#c${id})">${patternMarks(look, ry)}</g>`}
    ${dark ? '' : `<circle cx="${NOSE - 11}" cy="${CY - ry * 0.22}" r="2.6" fill="#14100c"/><circle cx="${NOSE - 10.3}" cy="${CY - ry * 0.22 - 0.8}" r=".8" fill="#fff"/>`}`;
}

function junkSvg(look, dark) {
  const ink = '#2b241c';
  const c = dark ? ink : look.color;
  if (look.kind === 'slipper') {
    const holes = dark ? '' : Array.from({ length: 12 }, (_, i) => `<circle cx="${24 + i * 6.6}" cy="41" r="1.5" fill="${look.strap}"/>`).join('');
    return `<path d="M56 36C58 16 84 16 88 36" stroke="${dark ? ink : look.strap}" stroke-width="8" fill="none"/>
      <rect x="14" y="34" width="92" height="14" rx="7" fill="${c}"/>${holes}`;
  }
  if (look.kind === 'shoe') {
    return `<path d="M18 44V26c0-3 3-5 6-5h14c4 0 6 3 8 6l6 6c4 4 10 4 18 5 10 1 26 1 30 4v4Z" fill="${c}"/>
      <rect x="16" y="43" width="86" height="6" rx="3" fill="${dark ? ink : look.sole}"/>`;
  }
  const ribs = dark ? '' : Array.from({ length: 9 }, (_, i) => `<path d="M${22 + i * 9.5} 18V48" stroke="${look.rib}" stroke-width="2"/>`).join('');
  return `<rect x="16" y="16" width="88" height="34" rx="2" fill="${c}"/>${ribs}`;
}

/** Chuỗi SVG của một loài. dark: chỉ vẽ bóng, cho loài chưa bắt được. */
export function fishPortraitSvg(fishId, { dark = false } = {}) {
  const look = fishLook(fishId);
  const id = `fp${++uid}`;
  const art = look.kind === 'fish' ? fishSvg(look, id, dark) : junkSvg(look, dark);
  return `<svg class="fish-portrait${dark ? ' dark' : ''}" viewBox="0 0 120 64" aria-hidden="true">${art}</svg>`;
}
