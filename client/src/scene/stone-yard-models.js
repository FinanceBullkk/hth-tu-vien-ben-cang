// Hình và vật liệu của bãi đá: tảng đá thô gồ ghề, lớp vân nứt phát sáng, búa, ngọc, cột sáng và quầng sáng.
// Dựng một lần, dùng chung cho cả bốn đe. Chỉ là hình; luật và tiền ở server.
import * as THREE from 'three';
import { STONE_GEMS, STONE_KINDS } from '../../../shared/stone.js';
import { glowTexture, rng } from './builders.js';

// Màu ánh sáng rỉ ra từ vết nứt theo loại đá: không theo ngọc bên trong, để vết nứt không lộ trước kết quả.
const VEIN_COLORS = ['#ffd9a0', '#7dffc0', '#ffcf5a'];

/** Số giả ngẫu nhiên theo toạ độ đỉnh: đỉnh trùng vị trí (nhiều mặt chung) lệch giống nhau nên mặt không hở. */
function hash3(x, y, z, seed) {
  const k = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 997) * 78.233 + Math.round(z * 997) * 37.719 + seed * 4.1414) * 43758.5453;
  return k - Math.floor(k);
}

/** Tảng đá thô: khối hai mươi mặt chia nhỏ, đẩy lồi lõm theo đỉnh rồi ép dẹt. */
export function roughRockGeometry(radius, seed) {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.82 + hash3(v.x, v.y, v.z, seed) * 0.34);
    v.y *= 0.8;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Ảnh vân nứt: đường gãy khúc trắng trên nền đen, dán lên lớp vỏ cộng sáng (đen là không sáng). */
function crackTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const rand = rng(91);
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 6;
  for (let i = 0; i < 16; i++) {
    let x = rand() * cv.width;
    let y = rand() * cv.height;
    ctx.lineWidth = 1.5 + rand() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 4 + Math.floor(rand() * 5);
    const dir = rand() * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      const a = dir + (rand() - 0.5) * 1.6;
      x += Math.cos(a) * (10 + rand() * 18);
      y += Math.sin(a) * (6 + rand() * 12);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Dải mờ dần theo chiều cao cho cột sáng: chân đậm, ngọn tan vào trời. */
function beamTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(cv);
}

let shared = null;

/** Hình và vật liệu dùng chung, tạo lần đầu khi cần. */
export function stoneYardAssets() {
  if (shared) return shared;
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  shared = {
    rocks: STONE_KINDS.map((_, k) => roughRockGeometry(0.29 + k * 0.02, 11 + k * 7)),
    rockMaterials: STONE_KINDS.map((spec) => new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.92, metalness: 0.04, flatShading: true })),
    veinColors: VEIN_COLORS.map((c) => new THREE.Color(c)),
    crackMap: crackTexture(),
    additive,
    chip: new THREE.TetrahedronGeometry(0.05),
    chipMaterial: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    gem: new THREE.OctahedronGeometry(0.12, 0),
    gemMaterials: STONE_GEMS.map((g) => new THREE.MeshStandardMaterial({
      color: g.color, emissive: g.color, emissiveIntensity: g.tier === 0 ? 0 : 0.35 + g.tier * 0.12,
      roughness: g.tier === 0 ? 0.95 : 0.18, metalness: g.tier >= 5 ? 0.45 : 0.15, flatShading: true,
    })),
    glow: glowTexture(64),
    beam: new THREE.CylinderGeometry(0.07, 0.2, 3.4, 18, 1, true).translate(0, 1.7, 0),
    beamMap: beamTexture(),
    ring: new THREE.RingGeometry(0.2, 0.28, 40).rotateX(-Math.PI / 2),
  };
  return shared;
}

/** Búa đập đá: chuôi gỗ và đầu sắt, gốc toạ độ ở chỗ tay cầm, đầu búa nằm về phía -z. */
export function createHammer() {
  const group = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#7a5634' });
  const iron = new THREE.MeshStandardMaterial({ color: '#4d4f55', roughness: 0.5, metalness: 0.6, flatShading: true });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.62, 6).rotateX(Math.PI / 2), wood);
  handle.position.z = -0.31;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.11), iron);
  head.position.z = -0.6;
  head.castShadow = true;
  group.add(handle, head);
  return group;
}
