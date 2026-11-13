// Mô hình 3D low-poly cho từng loài cá, dựng bằng code từ bảng fish-looks.js (không cần file GLB).
// Thân là khối cầu kéo dài, tô màu theo đỉnh: lưng đậm, bụng sáng, thêm sọc/đốm theo loài; vây và đuôi là tấm phẳng.
// Gốc toạ độ đặt ở mũi cá, thân chạy về phía -z và dài đúng look.size mét, để treo lên lưỡi câu cho dễ.
import * as THREE from 'three';
import { fishLook } from './fish-looks.js';

const cache = new Map(); // id loài -> Group mẫu; mỗi lần dùng thì clone, hình và vật liệu dùng chung
const lerp = (a, b, t) => a + (b - a) * t;
const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Màu một đỉnh trên thân theo độ cao (yn: -1 bụng .. 1 lưng), vị trí dọc thân và hoa văn của loài. */
function bodyColor(look, palette, x, yn, z) {
  const { back, side, belly, mark } = palette;
  const c = new THREE.Color();
  if (yn > 0.15) c.copy(side).lerp(back, Math.min(1, (yn - 0.15) / 0.5));
  else c.copy(side).lerp(belly, Math.min(1, (0.15 - yn) / 0.55));
  if (look.pattern === 'stripes' && yn > 0.05 && Math.sin(z * 38 + yn * 4) > 0.35) c.copy(mark);
  if (look.pattern === 'lines' && yn < 0.05 && yn > -0.65 && Math.sin(yn * 20) > 0.55) c.copy(mark);
  if (look.pattern === 'spots' && yn > -0.4 && hash3(x, yn, z) > 0.74) c.copy(mark);
  return c;
}

function bodyGeometry(look, palette) {
  const geo = new THREE.SphereGeometry(0.5, 14, 24); // nhiều vòng dọc thân để sọc và đốm hiện rõ
  geo.rotateX(Math.PI / 2); // hai cực của khối cầu nằm dọc trục z: thành mũi và đuôi
  const pos = geo.attributes.position;
  const colors = [];
  const snout = look.snout ?? 0;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    // Phía đuôi thon dần; loài mõm nhọn thì phía đầu cũng thon.
    let k = z < 0 ? 1 - (-z / 0.5) ** 1.6 * 0.62 : 1 - (z / 0.5) ** 2 * snout * 0.55;
    if (look.tail === 'clavus') k = z < 0 ? 1 - (-z / 0.5) ** 3 * 0.35 : k;
    const yn = pos.getY(i) / 0.5;
    const x = pos.getX(i) * look.w * k;
    pos.setXYZ(i, x, pos.getY(i) * look.h * k, z);
    const c = bodyColor(look, palette, x, yn, z);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Tấm vây vẽ trên mặt phẳng (dọc thân, cao), rồi xoay vào mặt phẳng z-y của cá. */
function finGeometry(points) {
  const shape = new THREE.Shape();
  points.forEach(([px, py], i) => (i ? shape.lineTo(px, py) : shape.moveTo(px, py)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function tailPoints(look) {
  const th = Math.max(look.h, 0.22) / 2;
  switch (look.tail) {
    case 'round': return [[-0.4, 0], [-0.55, th * 0.55], [-0.66, th * 0.3], [-0.68, 0], [-0.66, -th * 0.3], [-0.55, -th * 0.55]];
    case 'shark': return [[-0.38, 0.02], [-0.74, th * 1.15], [-0.56, 0], [-0.64, -th * 0.55]];
    case 'clavus': return [[-0.4, th * 0.84], [-0.5, th * 0.6], [-0.54, 0], [-0.5, -th * 0.6], [-0.4, -th * 0.84]];
    default: return [[-0.4, 0], [-0.66, th * 0.8], [-0.56, 0], [-0.66, -th * 0.8]];
  }
}

function buildFish(look) {
  const palette = Object.fromEntries(['back', 'side', 'belly', 'mark'].map((k) => [k, new THREE.Color(look[k] ?? look.side)]));
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  if (look.glow) skin.emissive = new THREE.Color(look.glow).multiplyScalar(0.18);
  group.add(new THREE.Mesh(bodyGeometry(look, palette), skin));

  const finMat = new THREE.MeshLambertMaterial({ color: look.fin, side: THREE.DoubleSide, flatShading: true });
  const d = look.dorsal ?? 0.14;
  const top = look.h * 0.42;
  group.add(
    new THREE.Mesh(finGeometry(tailPoints(look)), finMat),
    new THREE.Mesh(finGeometry([[0.12, top - 0.02], [-0.02, top + d], [-0.2, top - 0.02]]), finMat),
    new THREE.Mesh(finGeometry([[-0.08, -top + 0.02], [-0.18, -top - d * 0.5], [-0.28, -top + 0.04]]), finMat),
  );

  const eyeGeo = new THREE.SphereGeometry(0.032, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14100c });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * look.w * 0.36, look.h * 0.09, 0.33);
    group.add(eye);
  }
  // Cá lồng đèn: một hàng chấm sáng dọc bụng, nhìn rõ cả lúc trời tối.
  if (look.pattern === 'dots') {
    const dotGeo = new THREE.SphereGeometry(0.022, 5, 4);
    const dotMat = new THREE.MeshBasicMaterial({ color: look.mark });
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const z = 0.25 - i * 0.11;
      const k = z < 0 ? 1 - (-z / 0.5) ** 1.6 * 0.62 : 1;
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(s * look.w * 0.46 * k, -look.h * 0.22 * k, z);
      group.add(dot);
    }
  }
  return group;
}

function buildJunk(look) {
  const group = new THREE.Group();
  const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const add = (geo, material, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    group.add(mesh);
  };
  if (look.kind === 'slipper') {
    // Dép tổ ong: đế dày, quai to vắt ngang mu bàn chân.
    add(new THREE.BoxGeometry(0.42, 0.14, 1), mat(look.color), 0, 0, 0);
    const strap = new THREE.TorusGeometry(0.2, 0.06, 6, 12, Math.PI); // nửa vòng nằm sẵn trên mặt phẳng ngang thân
    add(strap, mat(look.strap), 0, 0.07, 0.12);
  } else if (look.kind === 'shoe') {
    add(new THREE.BoxGeometry(0.36, 0.07, 1), mat(look.sole), 0, -0.05, 0);
    const upper = new THREE.SphereGeometry(0.5, 9, 6);
    upper.scale(0.36, 0.5, 1);
    add(upper, mat(look.color), 0, 0.06, -0.02);
    add(new THREE.CylinderGeometry(0.15, 0.17, 0.16, 8), mat(look.color), 0, 0.26, -0.2);
  } else {
    add(new THREE.BoxGeometry(0.42, 0.42, 1), mat(look.color), 0, 0, 0);
    const rib = new THREE.BoxGeometry(0.44, 0.44, 0.03);
    const ribMat = mat(look.rib);
    for (let i = 0; i < 7; i++) add(rib, ribMat, 0, 0, -0.42 + i * 0.14);
  }
  return group;
}

function prototypeOf(id) {
  if (!cache.has(id)) {
    const look = fishLook(id);
    const model = look.kind === 'fish' ? buildFish(look) : buildJunk(look);
    model.position.z = -0.5; // mũi cá về gốc toạ độ
    const proto = new THREE.Group();
    proto.add(model);
    proto.scale.setScalar(look.size);
    proto.userData.size = look.size;
    cache.set(id, proto);
  }
  return cache.get(id);
}

/** Một con cá mới để đặt vào cảnh. Dùng chung hình và vật liệu với mẫu, nên bỏ đi chỉ cần gỡ khỏi cảnh. */
export function buildFishModel(id) {
  const proto = prototypeOf(id);
  const fish = proto.clone();
  fish.userData.size = proto.userData.size;
  return fish;
}

/** Hệ số phóng to khi khoe cá trên cần: cá nhỏ phóng nhiều hơn để vẫn rõ từ góc máy câu, cá to giữ gần cỡ thật. */
export const fishShowScale = (id) => lerp(2.2, 1.25, Math.min(1, fishLook(id).size / 1.2));
