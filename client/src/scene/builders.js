// Công cụ dựng hình low-poly: gộp khối theo màu đỉnh, mái cong, số ngẫu nhiên có hạt giống.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

/** Bộ sinh số ngẫu nhiên có hạt giống, để mọi máy dựng cảnh giống hệt nhau. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gộp nhiều khối tĩnh thành một mesh duy nhất, màu lưu theo đỉnh. Giảm draw call. */
export class Batch {
  constructor(seed = 7) {
    this.geos = [];
    this.rand = rng(seed);
  }

  /** @param {{x?,y?,z?,rx?,ry?,rz?,sx?,sy?,sz?,jitter?,colorFn?}} o */
  add(geometry, color, o = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.deleteAttribute('uv');
    if (!g.attributes.normal) g.computeVertexNormals();
    // Thứ tự YXZ: nghiêng trước, xoay hướng (yaw) sau cùng, nên ry luôn là hướng trên mặt đất.
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);

    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const jitter = o.jitter ?? 0.04;
    _c.set(color);
    const shade = 1 + (this.rand() - 0.5) * jitter * 2;
    for (let i = 0; i < count; i++) {
      colors[i * 3] = _c.r * shade;
      colors[i * 3 + 1] = _c.g * shade;
      colors[i * 3 + 2] = _c.b * shade;
    }
    if (o.colorFn) o.colorFn(g.attributes.position, colors);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geos.push(g);
    return this;
  }

  box(w, h, d, color, x, y, z, o = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, { x, y, z, ...o });
  }

  cyl(rTop, rBottom, h, color, x, y, z, o = {}) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, o.seg ?? 8), color, { x, y, z, ...o });
  }

  build(material, { castShadow = true, receiveShadow = true } = {}) {
    const merged = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos.length = 0;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}

export function flatMaterial(extra = {}) {
  return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, ...extra });
}

/**
 * Mái cong kiểu Việt: mặt lõm xuống rồi hất lên ở bốn góc.
 * Tâm hình học ở chân mái (y = 0), đỉnh cao h.
 */
export function curvedRoofGeometry(w, d, h, { seg = 14, curve = 1.75, lift = 0.75 } = {}) {
  const ridge = Math.max(0, (w - d) / w);
  const pos = [];
  const point = (i, j) => {
    const u = -1 + (2 * i) / seg;
    const v = -1 + (2 * j) / seg;
    const du = Math.max(0, (Math.abs(u) - ridge) / Math.max(1e-3, 1 - ridge));
    const dv = Math.abs(v);
    const s = Math.max(du, dv);
    const y = h * (1 - s) ** curve + lift * (Math.abs(u) * dv) ** 3;
    return [(u * w) / 2, y, (v * d) / 2];
  };
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const a = point(i, j);
      const b = point(i + 1, j);
      const c = point(i + 1, j + 1);
      const e = point(i, j + 1);
      pos.push(...a, ...e, ...c, ...a, ...c, ...b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Tô sọc ngói: xen kẽ màu theo trục dài của mái. */
export function tileColors(w, a = '#8a4632', b = '#6e3324') {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return (pos, colors) => {
    const step = w / 14;
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const c = Math.floor((x + 1000) / step) % 2 === 0 ? ca : cb;
      for (let k = 0; k < 3; k++) {
        colors[(i + k) * 3] = c.r;
        colors[(i + k) * 3 + 1] = c.g;
        colors[(i + k) * 3 + 2] = c.b;
      }
    }
  };
}

/** Đặt một mái cong kèm nóc và hai đầu đao vào batch. */
export function addRoof(batch, w, d, h, x, y, z, { ry = 0, lift, a, b } = {}) {
  const geo = curvedRoofGeometry(w, d, h, { lift: lift ?? Math.min(w, d) * 0.08 });
  batch.add(geo, '#8a4632', { x, y, z, ry, colorFn: tileColors(w, a, b) });
  const ridgeLen = Math.max(w - d, 0.2) + 0.5;
  batch.box(ridgeLen, 0.22, 0.3, '#5a2a1c', x, y + h + 0.03, z, { ry });
  // Đầu đao hất lên ở hai đầu nóc
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  for (const side of [-1, 1]) {
    const ox = (side * ridgeLen) / 2;
    batch.box(0.7, 0.16, 0.2, '#5a2a1c', x + ox * cos, y + h + 0.16, z - ox * sin, { ry, rz: side * 0.55 });
  }
}

/** Texture chữ dựng bằng canvas: chữ Việt hiện đúng dấu, không cần tải font ngoài. */
export function textTexture(lines, { w = 512, h = 256, bg = '#5a1f14', fg = '#f2c76b', font = 'bold 110px "Segoe UI",Roboto,Arial,sans-serif', border = '#c89a4a' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(4, h * 0.03);
    ctx.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
  }
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 + (i - (arr.length - 1) / 2) * (h / (arr.length + 0.4)));
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Texture tròn mờ dần, dùng cho quầng sáng, đom đóm, khói. */
export function glowTexture(size = 64, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
