// Vật liệu chip sòng bài cho bàn 3D: cạnh có sọc trắng (insert) như chip thật, mặt có vòng sọc và lõi tròn in mệnh giá.
// Chồng chip trong khay nhà cái dùng một trụ dài, vân cạnh lặp theo số chip nên nhìn như từng đồng xếp chồng.
// Vẽ canvas một lần rồi giữ lại.
import * as THREE from 'three';

/** Màu theo mệnh giá cược (khớp chip trong bảng chơi), thêm vài màu chỉ để trang trí khay. */
export const CHIP_COLORS = { 1: '#ece3cf', 5: '#b52a1e', 10: '#d39a22', 25: '#2e7d4f', 50: '#1f6f8b', 100: '#26262b' };
const cache = new Map();

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const light = (color) => (color === CHIP_COLORS[1] ? '#9b2a1e' : '#fffaf0');

/** Cạnh chip: nền màu, sáu vạch trắng đều quanh vòng; lines = true thêm khe tối ở mép để lặp thành nhiều chip. */
function sideTexture(color, lines) {
  return canvasTexture(128, 16, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 16);
    g.fillStyle = light(color);
    for (let i = 0; i < 6; i++) g.fillRect(i * (128 / 6) + 4, 3, 9, 10);
    if (lines) {
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(0, 0, 128, 1.5);
    }
  });
}

/** Mặt chip: vòng sọc ngoài, lõi sáng có viền nét đứt, số mệnh giá ở giữa. */
function topTexture(color, label) {
  return canvasTexture(128, 128, (g) => {
    const c = 64;
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = light(color);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.arc(c, c, 64, a, a + 0.32);
      g.arc(c, c, 50, a + 0.32, a, true);
      g.fill();
    }
    g.beginPath();
    g.arc(c, c, 40, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255, 250, 240, .9)';
    g.fill();
    g.setLineDash([5, 4]);
    g.lineWidth = 2;
    g.strokeStyle = color;
    g.beginPath();
    g.arc(c, c, 35, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = color === CHIP_COLORS[1] ? '#6e140e' : color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 34px Georgia, serif';
    g.fillText(label, c, c + 2);
  });
}

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/** Bộ vật liệu [cạnh, mặt trên, mặt dưới] cho một đồng chip mệnh giá value (dùng với CylinderGeometry). */
export function chipMaterials(value) {
  return cached(`chip:${value}`, () => {
    const color = CHIP_COLORS[value];
    const face = new THREE.MeshLambertMaterial({ map: topTexture(color, String(value)) });
    return [new THREE.MeshLambertMaterial({ map: sideTexture(color, false) }), face, face];
  });
}

/**
 * Bộ vật liệu cho một chồng chip gộp thành một trụ (khay nhà cái). Vân cạnh lặp theo trục dọc:
 * geometry của chồng nhân toạ độ v với số chip (chipStackGeometry), nên mọi chồng cùng mệnh giá
 * dùng chung một vật liệu và gộp được chung một lần vẽ.
 */
export function chipStackMaterials(value) {
  return cached(`stack:${value}`, () => {
    const side = sideTexture(CHIP_COLORS[value], true);
    side.wrapT = THREE.RepeatWrapping;
    return [new THREE.MeshLambertMaterial({ map: side }), chipMaterials(value)[1], chipMaterials(value)[1]];
  });
}

/** Trụ chồng count chip cao 1 đơn vị (scale.y theo chiều cao thật): vân cạnh lặp count lần. */
export function chipStackGeometry(base, count) {
  return cached(`stack-geo:${base.uuid}:${count}`, () => {
    const geometry = base.clone();
    const uv = geometry.attributes.uv;
    const side = geometry.groups.find((g) => g.materialIndex === 0);
    // Cylinder có index: vùng thân là các đỉnh đầu tiên, trước hai nắp; lấy theo chỉ số đỉnh lớn nhất của nhóm thân.
    let last = 0;
    for (let i = side.start; i < side.start + side.count; i++) last = Math.max(last, geometry.index.getX(i));
    for (let i = 0; i <= last; i++) uv.setY(i, uv.getY(i) * count);
    return geometry;
  });
}
