// Xúc xắc chấm cho bàn tài xỉu: mặt ngà, chấm đen, riêng mặt nhất chấm đỏ to như xúc xắc Á Đông.
// Mặt đối nhau cộng lại 7. dieQuaternion(v, yaw) xoay viên để mặt v ngửa lên, rồi xoay ngang một góc yaw.
import * as THREE from 'three';

// Giá trị trên từng mặt BoxGeometry theo thứ tự vật liệu: +x, -x, +y, -y, +z, -z.
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const UP = new THREE.Vector3(0, 1, 0);
const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};
let materials = null;

function faceTexture(value) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f6efe0';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(120, 90, 60, .35)';
  g.lineWidth = 6;
  g.strokeRect(3, 3, size - 6, size - 6);
  const big = value === 1;
  g.fillStyle = big || value === 4 ? '#c0281c' : '#1d1a18';
  for (const [x, y] of PIPS[value]) {
    g.beginPath();
    g.arc(x * size, y * size, big ? 22 : 11, 0, Math.PI * 2);
    g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** Sáu vật liệu dùng chung cho mọi viên. */
export function dieFaceMaterials() {
  materials ??= FACE_VALUES.map((v) => new THREE.MeshLambertMaterial({ map: faceTexture(v) }));
  return materials;
}

const tilt = new THREE.Quaternion();
const spin = new THREE.Quaternion();

/** Quaternion để mặt value (1..6) ngửa lên, xoay quanh trục đứng một góc yaw. Trả về bản mới. */
export function dieQuaternion(value, yaw) {
  tilt.setFromUnitVectors(NORMALS[FACE_VALUES.indexOf(value)], UP);
  spin.setFromAxisAngle(UP, yaw);
  return new THREE.Quaternion().copy(tilt).premultiply(spin);
}
