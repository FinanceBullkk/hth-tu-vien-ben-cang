// Vòng cung giằng co bản tối giản: một nét cung mảnh, vệt ngọc chạy theo cá, chấm kim theo tay,
// ở giữa là con cá trong vòng tiến độ. Các đoạn cung dùng pathLength=100 nên chỉ cần đổi dasharray.
import { h } from './dom.js';

const CX = 120;
const CY = 112;
const R = 100;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const RING_R = 25;
const FISH_PATH = 'M-14 0C-8-8 5-8 10-2L17-7C16-2 16 2 17 7L10 2C5 8-8 8-14 0Z';

const svgTemplate = `
<svg class="fish-arc-svg" viewBox="0 0 240 126" aria-hidden="true">
  <path class="fish-arc-track" d="${ARC}" pathLength="100"/>
  <path class="fish-arc-green" d="${ARC}" pathLength="100"/>
  <circle class="fish-arc-needle" cx="${CX}" cy="${CY - R}" r="6"/>
  <circle class="fish-ring-track" cx="${CX}" cy="${CY}" r="${RING_R}"/>
  <circle class="fish-ring-fill" cx="${CX}" cy="${CY}" r="${RING_R}" pathLength="100" transform="rotate(-90 ${CX} ${CY})"/>
  <g class="fish-glyph" transform="translate(${CX} ${CY})"><path d="${FISH_PATH}"/></g>
</svg>`;

export class FishingArcGauge {
  constructor() {
    this.root = h('div', { class: 'fish-gauge' });
    this.root.innerHTML = svgTemplate;
    const pick = (selector) => this.root.querySelector(selector);
    this.green = pick('.fish-arc-green');
    this.needle = pick('.fish-arc-needle');
    this.ring = pick('.fish-ring-fill');
    this.glyph = pick('.fish-glyph');
  }

  /** Cá càng hiếm thì dáng cá trong vòng càng to: nhìn là biết con khó. */
  setRarity(rarity) {
    this.glyph.setAttribute('transform', `translate(${CX} ${CY}) scale(${0.8 + rarity * 0.14})`);
  }

  render({ center, half, needle, progress, ready }) {
    this.green.style.strokeDasharray = `${half * 200} 100`;
    this.green.style.strokeDashoffset = `${-(center - half) * 100}`;
    this.needle.setAttribute('transform', `rotate(${(needle - 0.5) * 180} ${CX} ${CY})`);
    this.ring.style.strokeDasharray = `${progress * 100} 100`;
    this.root.classList.toggle('hot', Math.abs(needle - center) <= half);
    this.root.classList.toggle('ready', Boolean(ready));
  }
}
