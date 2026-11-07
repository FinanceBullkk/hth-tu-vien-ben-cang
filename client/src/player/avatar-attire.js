// Trang phục chibi 3 kiểu: lữ khách (mặc định), đạo bào vân thủy, bạch y hiệp khách.
// Mọi hình khối dựng bằng code, vật liệu cache theo (style, màu) dùng chung cho mọi nhân vật.
import * as THREE from 'three';
import { SHIRT_COLORS } from '../../../shared/protocol.js';

const GEO = {
  skirt: new THREE.CylinderGeometry(0.2, 0.35, 0.58, 8),
  hem: new THREE.CylinderGeometry(0.347, 0.355, 0.025, 8, 1, true),
  sleeve: new THREE.CylinderGeometry(0.085, 0.18, 0.3, 8, 1, true),
  hand: new THREE.IcosahedronGeometry(0.07, 1),
  collar: new THREE.BoxGeometry(0.075, 0.34, 0.025),
  belt: new THREE.CylinderGeometry(0.205, 0.23, 0.075, 8),
  clasp: new THREE.BoxGeometry(0.1, 0.09, 0.035),
  shoulder: new THREE.CylinderGeometry(0.28, 0.24, 0.14, 8, 1, true),
  // Đạo bào vân thủy: lớp trong dài, lớp ngoài ngắn hơn, tay áo rộng, đai ngọc.
  innerRobe: new THREE.CylinderGeometry(0.21, 0.37, 0.74, 8),
  outerRobe: new THREE.CylinderGeometry(0.22, 0.34, 0.56, 8),
  outerHem: new THREE.CylinderGeometry(0.337, 0.345, 0.025, 8, 1, true),
  bigSleeve: new THREE.CylinderGeometry(0.09, 0.22, 0.34, 8, 1, true),
  sleeveRim: new THREE.CylinderGeometry(0.215, 0.225, 0.03, 8, 1, true),
  jadeBelt: new THREE.CylinderGeometry(0.235, 0.25, 0.07, 8),
  jadePendant: new THREE.OctahedronGeometry(0.05),
  hairpin: new THREE.CylinderGeometry(0.011, 0.011, 0.3, 5),
  // Bạch y hiệp khách: áo kem gọn, cổ cao, đai da.
  lightRobe: new THREE.CylinderGeometry(0.2, 0.33, 0.6, 8),
  lightHem: new THREE.CylinderGeometry(0.327, 0.335, 0.022, 8, 1, true),
  highCollar: new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8, 1, true),
  leatherBelt: new THREE.CylinderGeometry(0.21, 0.235, 0.06, 8),
  buckle: new THREE.BoxGeometry(0.07, 0.05, 0.03),
};

// Dải lụa: ShapeGeometry 2D, gốc tại điểm cắm (0,0) để xoay từ khớp.
function ribbon(sign, w, len) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(sign * w, -0.04 * len);
  shape.lineTo(sign * (w + 0.09), -len);
  shape.lineTo(sign * (w * 0.5), -len + 0.08);
  shape.lineTo(sign * 0.02, -len + 0.03);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

GEO.ribbon = [ribbon(-1, 0.16, 0.62), ribbon(1, 0.16, 0.62), ribbon(-1, 0.12, 0.5), ribbon(1, 0.12, 0.5)];
GEO.longRibbon = [
  ribbon(-1, 0.14, 0.78), ribbon(1, 0.14, 0.78), ribbon(-1, 0.1, 0.68), ribbon(1, 0.1, 0.68),
  ribbon(0.0, 0.13, 0.74), // dải giữa gần thẳng
];

const CREAM = new THREE.Color(0xf2e9d6);
const shared = {
  gold: new THREE.MeshLambertMaterial({ color: 0xbca36b, flatShading: true }),
  brightGold: new THREE.MeshLambertMaterial({ color: 0xe0a458, flatShading: true }),
  // Dải lụa là ShapeGeometry một mặt: mọi vật liệu làm lụa phải DoubleSide.
  ribbonGold: new THREE.MeshLambertMaterial({ color: 0xe0a458, flatShading: true, side: THREE.DoubleSide }),
  jade: new THREE.MeshLambertMaterial({ color: 0x57b88a, flatShading: true }),
  leather: new THREE.MeshLambertMaterial({ color: 0x6e4f33, flatShading: true }),
  ink: new THREE.MeshLambertMaterial({ color: 0x241a14, flatShading: true }),
  skin: new THREE.MeshLambertMaterial({ color: 0xf0c8a0, flatShading: true }),
};

const fabrics = new Map();
function wardrobe(style, color) {
  const key = `${style}:${color}`;
  if (!fabrics.has(key)) {
    const base = new THREE.Color(SHIRT_COLORS[color] ?? SHIRT_COLORS[0]);
    if (style === 2) {
      // Bạch y: áo kem cố định, viền theo màu áo.
      fabrics.set(key, {
        robe: new THREE.MeshLambertMaterial({ color: CREAM, flatShading: true }),
        shade: new THREE.MeshLambertMaterial({ color: CREAM.clone().multiplyScalar(0.8), flatShading: true, side: THREE.DoubleSide }),
        edge: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.25), flatShading: true }),
        trim: new THREE.MeshLambertMaterial({ color: base, flatShading: true, side: THREE.DoubleSide }),
      });
    } else {
      fabrics.set(key, {
        robe: new THREE.MeshLambertMaterial({ color: base, flatShading: true }),
        shade: new THREE.MeshLambertMaterial({ color: base.clone().multiplyScalar(0.46), flatShading: true, side: THREE.DoubleSide }),
        edge: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.58), flatShading: true }),
        trim: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.3), flatShading: true, side: THREE.DoubleSide }),
      });
    }
  }
  return fabrics.get(key);
}

function part(geometry, material, x, y, z, parent) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Dải lụa cắm vào khớp để uốn; trả về pivot để update xoay từng dải.
function ribbonTail(geoIndex, material, x, y, z, yaw, parent, phase) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = yaw;
  const mesh = new THREE.Mesh(GEO[geoIndex === 'long' ? 'longRibbon' : 'ribbon'][ribbonIndex(geoIndex, phase)], material);
  mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  return pivot;
}
function ribbonIndex(kind, i) {
  return kind === 'long' ? i % 5 : i % 4;
}

/** Dựng bộ trang phục theo style. API chung: { group, tails, hide, setColor, update }. */
export function createAttire(style, color, armL, armR) {
  if (style === 1) return daoBao(color, armL, armR);
  if (style === 2) return bachY(color, armL, armR);
  return luKhach(color, armL, armR);
}

/** Style 0 — lữ khách: giữ nguyên bộ gốc. */
function luKhach(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(0, color);
  const skirt = part(GEO.skirt, cloth.robe, 0, 0.31, 0, group);
  const hem = part(GEO.hem, cloth.edge, 0, 0.03, 0, group);
  const shoulder = part(GEO.shoulder, cloth.shade, 0, 0.84, 0, group);
  const belt = part(GEO.belt, cloth.shade, 0, 0.46, 0, group);
  part(GEO.clasp, shared.gold, 0, 0.47, 0.235, group);

  const lapels = [];
  const sleeves = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const lapel = part(GEO.collar, cloth.edge, side * 0.085, 0.69, 0.205, group);
    lapel.rotation.z = side * 0.38;
    lapels.push(lapel);
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.sleeve, cloth.robe, 0, -0.19, 0, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.4, 0, arm));
  }

  const tails = new THREE.Group();
  tails.position.z = -0.24;
  ribbonTail('short', cloth.shade, -0.07, 0.8, 0, -0.2, tails, 0);
  ribbonTail('short', cloth.shade, 0.07, 0.8, 0, 0.2, tails, 1.7);
  group.add(tails);

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(0, next);
      skirt.material = material.robe;
      hem.material = material.edge;
      shoulder.material = material.shade;
      belt.material = material.shade;
      for (const lapel of lapels) lapel.material = material.edge;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const pivot of tails.children) pivot.children[0].material = material.shade;
    },
    update(t, walkAmt) {
      tails.rotation.x = -0.08 - walkAmt * 0.24 + Math.sin(t * 2.1) * 0.05;
    },
  };
}

/** Style 1 — đạo bào vân thủy: áo 2 lớp, tay áo rộng, 5 dải lụa, đai ngọc bội. */
function daoBao(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(1, color);
  const inner = part(GEO.innerRobe, cloth.edge, 0, 0.24, 0, group);
  const outer = part(GEO.outerRobe, cloth.robe, 0, 0.32, 0, group);
  part(GEO.outerHem, shared.brightGold, 0, 0.055, 0, group);
  const shoulder = part(GEO.shoulder, cloth.shade, 0, 0.84, 0, group);
  const belt = part(GEO.jadeBelt, shared.ink, 0, 0.47, 0, group);
  part(GEO.clasp, shared.brightGold, 0, 0.47, 0.22, group);
  const pendant = part(GEO.jadePendant, shared.jade, 0, 0.39, 0.24, group);

  const lapels = [];
  const sleeves = [];
  const rims = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const lapel = part(GEO.collar, cloth.edge, side * 0.09, 0.7, 0.2, group);
    lapel.rotation.z = side * 0.5;
    lapels.push(lapel);
    const arm = side < 0 ? armL : armR;
    const sleeve = part(GEO.bigSleeve, cloth.robe, 0, -0.22, 0, arm);
    rims.push(part(GEO.sleeveRim, cloth.edge, 0, -0.385, 0, arm));
    sleeves.push(sleeve);
    hands.push(part(GEO.hand, shared.skin, 0, -0.44, 0, arm));
  }

  const tails = new THREE.Group();
  tails.position.set(0, 0.82, -0.21);
  const clothMats = [cloth.shade, cloth.shade, cloth.trim, shared.ribbonGold, cloth.shade];
  const yaws = [-0.55, -0.25, 0, 0.25, 0.55];
  const tailPivots = [];
  for (let i = 0; i < 5; i++) {
    const pivot = ribbonTail('long', clothMats[i], yaws[i] * 0.16, 0, 0, yaws[i], tails, i);
    tailPivots.push(pivot);
  }
  group.add(tails);

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...rims, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(1, next);
      inner.material = material.edge;
      outer.material = material.robe;
      shoulder.material = material.shade;
      for (const lapel of lapels) lapel.material = material.edge;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const rim of rims) rim.material = material.edge;
      clothMats[0] = material.shade;
      clothMats[1] = material.shade;
      clothMats[2] = material.trim;
      clothMats[4] = material.shade;
      tailPivots.forEach((pivot, i) => { pivot.children[0].material = clothMats[i]; });
    },
    update(t, walkAmt, sitAmt) {
      tails.rotation.x = -0.1 - walkAmt * 0.3 + Math.sin(t * 1.9) * 0.06 + sitAmt * 0.12;
      for (let i = 0; i < tailPivots.length; i++) {
        const phase = i * 1.9;
        const side = Math.sign(yaws[i]) || 0.4;
        tailPivots[i].rotation.z = side * (0.05 + Math.sin(t * 2.3 + phase) * 0.09 * (0.4 + walkAmt));
        tailPivots[i].rotation.x = Math.sin(t * 2.9 + phase) * 0.12 * (0.3 + walkAmt);
      }
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.16 * walkAmt;
      }
      pendant.rotation.y = t * 0.8;
    },
  };
}

/** Style 2 — bạch y hiệp khách: áo kem viền màu áo, cổ cao, đai da, 2 dải lụa ngắn. */
function bachY(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(2, color);
  const robe = part(GEO.lightRobe, cloth.robe, 0, 0.29, 0, group);
  const hem = part(GEO.lightHem, cloth.trim, 0, 0.0, 0, group);
  const shoulder = part(GEO.shoulder, cloth.shade, 0, 0.84, 0, group);
  const belt = part(GEO.leatherBelt, shared.leather, 0, 0.47, 0, group);
  part(GEO.buckle, shared.brightGold, 0, 0.47, 0.225, group);
  const collar = part(GEO.highCollar, cloth.robe, 0, 0.9, -0.02, group);

  const sleeves = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.sleeve, cloth.robe, 0, -0.19, 0, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.4, 0, arm));
  }

  const tails = new THREE.Group();
  tails.position.set(0, 0.8, -0.22);
  const tailPivots = [
    ribbonTail('short', cloth.trim, -0.06, 0, 0, -0.3, tails, 0),
    ribbonTail('short', cloth.trim, 0.06, 0, 0, 0.3, tails, 1.3),
  ];
  group.add(tails);

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(2, next);
      robe.material = material.robe;
      hem.material = material.trim;
      shoulder.material = material.shade;
      collar.material = material.robe;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const pivot of tailPivots) pivot.children[0].material = material.trim;
    },
    update(t, walkAmt, sitAmt) {
      tails.rotation.x = -0.06 - walkAmt * 0.18 + Math.sin(t * 2.4) * 0.04 + sitAmt * 0.08;
      for (let i = 0; i < tailPivots.length; i++) {
        const side = i ? 1 : -1;
        tailPivots[i].rotation.z = side * (0.06 + Math.sin(t * 2.6 + i * 2) * 0.08 * (0.4 + walkAmt));
      }
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.1 * walkAmt;
      }
      collar.rotation.y = Math.sin(t * 0.6) * 0.03;
    },
  };
}
