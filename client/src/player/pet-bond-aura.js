// Hiệu ứng thân thiết quanh thú cưng, chồng lớp theo bậc:
// Thân quen: tim nhỏ thỉnh thoảng bay lên. Gắn bó: thêm vòng sáng màu thú dưới chân và đốm sáng bốc lên.
// Tri kỷ: thêm vầng hào quang vàng trên đầu, vòng sáng thứ hai và đốm vàng dày hơn.
// Vật liệu phát sáng dùng chung giữa các thú nên chỉ đổi kích thước, vị trí, không đổi độ mờ.
// Mỗi lớp là một lần vẽ (tim gộp một mesh, đốm sáng gộp một Points) để đông người dắt thú vẫn nhẹ.
import * as THREE from 'three';
import { mergeStaticMeshes } from '../scene/static-mesh-merge.js';
import { ball, geo, glow, part } from '../scene/pet-model-kit.js';

const MOTES = 8;
let moteTexture = null;

/** Chấm sáng tròn mềm vẽ một lần bằng canvas (không tải tài nguyên ngoài). */
function softDot() {
  if (moteTexture) return moteTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  moteTexture = new THREE.CanvasTexture(c);
  return moteTexture;
}

function heartMesh() {
  const g = new THREE.Group();
  const mat = glow(0xff6f9a, 0.95);
  g.add(ball(mat, [-0.028, 0, 0], 0.034, [1, 1, 0.6], 8), ball(mat, [0.028, 0, 0], 0.034, [1, 1, 0.6], 8));
  g.add(part(geo.cone(4), mat, [0, -0.04, 0], [0.058, 0.07, 0.03], [Math.PI, 0, 0]));
  mergeStaticMeshes(g);
  return g;
}

/** Đốm sáng bốc lên quanh thú: một Points, nửa màu thú nửa vàng nhạt. */
function motePoints(color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
  const colors = new Float32Array(MOTES * 3);
  const a = new THREE.Color(color);
  const b = new THREE.Color(0xfff2b0);
  for (let i = 0; i < MOTES; i++) (i % 2 ? b : a).toArray(colors, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.07, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // vị trí đổi mỗi khung, hộp bao không cập nhật
  return points;
}

export class BondAura {
  /** color: màu chủ đạo của thú; height: chiều cao thú; fly: thú bay (vòng sáng nằm dưới bụng thay vì dưới đất). */
  constructor(color, height, fly) {
    this.group = new THREE.Group();
    this.height = height;
    this.tier = 0;
    this.base = fly ? -0.2 : 0.015;
    const hex = new THREE.Color(color).getHex();

    this.heart = heartMesh();
    this.heart.visible = false;
    this.ring = part(geo.ring(), glow(hex, 0.55), [0, this.base, 0], 0.36, [-Math.PI / 2, 0, 0]);
    this.ring2 = part(geo.ring(), glow(0xffd36a, 0.5), [0, this.base + 0.01, 0], 0.5, [-Math.PI / 2, 0, 0]);
    this.halo = part(geo.torus(), glow(0xffe08a, 0.9), [0, height + 0.12, 0], 0.11, [Math.PI / 2, 0, 0]);
    this.motes = motePoints(hex);
    this.group.add(this.heart, this.ring, this.ring2, this.halo, this.motes);
    this.setTier(0);
  }

  setTier(tier) {
    this.tier = tier;
    this.ring.visible = tier >= 2;
    this.ring2.visible = tier >= 3;
    this.halo.visible = tier >= 3;
    this.motes.visible = tier >= 2;
    this.motes.material.size = tier >= 3 ? 0.09 : 0.06;
  }

  dispose() {
    this.motes.geometry.dispose();
    this.motes.material.dispose();
  }

  /** t: giây chạy liên tục của thú. */
  update(t) {
    const { tier } = this;
    if (tier >= 1) {
      // Mỗi 5 giây một trái tim bay lên rồi nhỏ dần.
      const k = (t % 5) / 1.6;
      this.heart.visible = k < 1;
      if (k < 1) {
        this.heart.position.set(Math.sin(k * 6) * 0.04, this.height + 0.08 + k * 0.35, 0);
        this.heart.scale.setScalar(Math.sin(k * Math.PI) * (0.8 + tier * 0.15));
        this.heart.rotation.y = t * 2;
      }
    }
    if (tier < 2) return;
    const pulse = 1 + Math.sin(t * 3) * 0.06;
    this.ring.scale.setScalar(0.36 * pulse);
    this.ring.rotation.z = t * 0.8;
    if (tier >= 3) {
      this.ring2.scale.setScalar(0.5 * (2 - pulse));
      this.ring2.rotation.z = -t * 0.5;
      this.halo.position.y = this.height + 0.12 + Math.sin(t * 2) * 0.015;
      this.halo.rotation.z = t;
    }
    // Đốm sáng xoắn ốc bốc lên rồi tắt ở đỉnh; bậc Gắn bó chỉ hiện nửa số đốm (dồn xuống dưới đất).
    const pos = this.motes.geometry.attributes.position;
    for (let i = 0; i < MOTES; i++) {
      const seed = i / MOTES;
      const k = (t * 0.45 + seed) % 1;
      const a = seed * Math.PI * 2 + t * 0.6;
      const r = 0.22 + k * 0.08;
      const lift = tier >= 3 || i % 2 === 0 ? k * (this.height + 0.25) : -10;
      pos.setXYZ(i, Math.cos(a) * r, this.base + lift, Math.sin(a) * r);
    }
    pos.needsUpdate = true;
  }
}
