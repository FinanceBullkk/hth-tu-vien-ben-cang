// Trang phục chibi 7 kiểu: lữ khách (mặc định), đạo bào vân thủy, bạch y hiệp khách,
// hán phục vân kiêm (Trung), hanbok (Hàn), kimono (Nhật), áo dài (Việt).
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
  // Hán phục vân kiêm: cánh quạt cheo vai, vạt khép chéo ngực, nút thắt vàng.
  capePetal: new THREE.CylinderGeometry(0.15, 0.33, 0.17, 2, 1, true, -0.35, 0.7),
  placket: new THREE.BoxGeometry(0.035, 0.42, 0.02),
  bead: new THREE.OctahedronGeometry(0.028),
  // Hanbok: chima đầy, jeogori ngắn, gạch đan thanh viền cổ, cổ tay áo.
  chima: new THREE.CylinderGeometry(0.24, 0.52, 0.6, 8),
  chimaBand: new THREE.CylinderGeometry(0.26, 0.28, 0.06, 8),
  jeogori: new THREE.CylinderGeometry(0.205, 0.26, 0.3, 8),
  jeogoriHem: new THREE.CylinderGeometry(0.262, 0.272, 0.03, 8, 1, true),
  danBand: new THREE.BoxGeometry(0.02, 0.34, 0.027),
  cuff: new THREE.CylinderGeometry(0.185, 0.195, 0.035, 8, 1, true),
  // Kimono: thân thẳng, obi rộng với nơ hộp sau lưng, tay áo hộp.
  kRobe: new THREE.CylinderGeometry(0.21, 0.31, 0.64, 8),
  kHem: new THREE.CylinderGeometry(0.305, 0.32, 0.035, 8, 1, true),
  obi: new THREE.CylinderGeometry(0.25, 0.255, 0.13, 8),
  obiKnot: new THREE.BoxGeometry(0.17, 0.2, 0.06),
  obiCord: new THREE.CylinderGeometry(0.258, 0.258, 0.03, 8),
  kSleeve: new THREE.BoxGeometry(0.17, 0.3, 0.19),
  kSleeveHem: new THREE.BoxGeometry(0.178, 0.032, 0.2),
  // Áo dài: thân ôm, cổ đứng, tà trước/sau hở hai bên, quần ống rộng.
  aTunic: new THREE.CylinderGeometry(0.19, 0.27, 0.62, 8),
  mandarin: new THREE.CylinderGeometry(0.16, 0.19, 0.09, 8, 1, true),
  panelF: new THREE.CylinderGeometry(0.22, 0.29, 0.5, 4, 1, true, -0.6, 1.2),
  panelB: new THREE.CylinderGeometry(0.22, 0.29, 0.5, 4, 1, true, Math.PI - 0.6, 1.2),
  panelEdgeF: new THREE.CylinderGeometry(0.288, 0.302, 0.035, 4, 1, true, -0.6, 1.2),
  panelEdgeB: new THREE.CylinderGeometry(0.288, 0.302, 0.035, 4, 1, true, Math.PI - 0.6, 1.2),
  trouser: new THREE.CylinderGeometry(0.075, 0.09, 0.46, 8),
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
GEO.frontRibbon = [ribbon(-1, 0.07, 0.42), ribbon(1, 0.07, 0.42)]; // hán phục: dải lụa thắt trước
GEO.goreum = [ribbon(1, 0.05, 0.45), ribbon(-1, 0.05, 0.38)]; // otgoreum: dây áo hanbok kéo về giữa
GEO.tassel = [ribbon(-1, 0.025, 0.22), ribbon(1, 0.025, 0.22)]; // tua norigae ngắn theo dốc váy

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
  cream: new THREE.MeshLambertMaterial({ color: CREAM, flatShading: true }),
  // Accent cố định theo nước: đỏ hồng diệp (Nhật), đan thanh đỏ – xanh (Hàn).
  maple: new THREE.MeshLambertMaterial({ color: 0xa63b2a, flatShading: true }),
  danRed: new THREE.MeshLambertMaterial({ color: 0xb05a45, flatShading: true }),
  danBlue: new THREE.MeshLambertMaterial({ color: 0x4f7a8a, flatShading: true }),
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
    } else if (style === 4) {
      // Hanbok tiên hiệp: jeogori và tay áo pha loãng màu áo, chima đậm màu áo.
      const pale = base.clone().lerp(CREAM, 0.52);
      fabrics.set(key, {
        robe: new THREE.MeshLambertMaterial({ color: pale, flatShading: true }),
        shade: new THREE.MeshLambertMaterial({ color: pale.clone().multiplyScalar(0.78), flatShading: true, side: THREE.DoubleSide }),
        edge: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.35), flatShading: true }),
        trim: new THREE.MeshLambertMaterial({ color: base, flatShading: true, side: THREE.DoubleSide }),
      });
    } else if (style === 6) {
      // Áo dài: tà hở hai bên nên thân và tà cần material hai mặt, viền gấu hai mặt.
      fabrics.set(key, {
        robe: new THREE.MeshLambertMaterial({ color: base, flatShading: true, side: THREE.DoubleSide }),
        shade: new THREE.MeshLambertMaterial({ color: base.clone().multiplyScalar(0.46), flatShading: true, side: THREE.DoubleSide }),
        edge: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.58), flatShading: true, side: THREE.DoubleSide }),
        trim: new THREE.MeshLambertMaterial({ color: base.clone().lerp(CREAM, 0.3), flatShading: true, side: THREE.DoubleSide }),
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

// Dải lụa cắm tại điểm cố định trong group trang phục; trả về pivot để update xoay riêng từng dải.
function silkTail(geo, material, x, y, z, parent, yaw = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = yaw;
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  return pivot;
}

/** Dựng bộ trang phục theo style. API chung: { group, tails, hide, setColor, update }. */
export function createAttire(style, color, armL, armR, legL, legR) {
  if (style === 1) return daoBao(color, armL, armR);
  if (style === 2) return bachY(color, armL, armR);
  if (style === 3) return hanPhuc(color, armL, armR);
  if (style === 4) return hanBok(color, armL, armR);
  if (style === 5) return kimono(color, armL, armR);
  if (style === 6) return aoDai(color, armL, armR, legL, legR);
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

/** Style 3 — hán phục vân kiêm: cổ chéo V, 6 cánh quạt cheo vai, vạt khép, lụa bay trước sau. */
function hanPhuc(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(3, color);
  const inner = part(GEO.innerRobe, cloth.edge, 0, 0.24, 0, group);
  const outer = part(GEO.outerRobe, cloth.robe, 0, 0.32, 0, group);
  part(GEO.outerHem, shared.brightGold, 0, 0.055, 0, group);
  const belt = part(GEO.belt, cloth.shade, 0, 0.46, 0, group);
  part(GEO.clasp, shared.brightGold, 0, 0.47, 0.235, group);
  // Vạt khép chéo ngực kèm 2 nút thắt vàng.
  const placket = part(GEO.placket, cloth.edge, -0.02, 0.48, 0.245, group);
  placket.rotation.z = -0.62;
  part(GEO.bead, shared.brightGold, 0.07, 0.57, 0.235, group);
  part(GEO.bead, shared.brightGold, -0.1, 0.4, 0.26, group);
  // Vân kiêm: 6 cánh quạt xếp quanh vai, chấm vàng đầu cánh.
  const cape = new THREE.Group();
  cape.position.y = 0.87;
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const petal = part(GEO.capePetal, cloth.shade, 0, 0, 0, cape);
    petal.rotation.y = a;
    petals.push(petal);
    part(GEO.bead, shared.brightGold, Math.sin(a) * 0.33, -0.07, Math.cos(a) * 0.33, cape);
  }
  group.add(cape);
  // Cổ chéo V nổi trên ngực, hai bên hai màu tạo chiều sâu.
  const lapelL = part(GEO.collar, cloth.edge, -0.075, 0.7, 0.2, group);
  lapelL.rotation.z = 0.85;
  const lapelR = part(GEO.collar, cloth.trim, 0.075, 0.7, 0.21, group);
  lapelR.rotation.z = -0.85;

  const sleeves = [];
  const rims = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.bigSleeve, cloth.robe, 0, -0.22, 0, arm));
    rims.push(part(GEO.sleeveRim, cloth.edge, 0, -0.385, 0, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.44, 0, arm));
  }

  // 2 dải lụa thắt trước rủ từ dải lưng, 3 dải dài bay sau lưng ôm theo dốc áo.
  const tails = new THREE.Group();
  group.add(tails);
  const tailPivots = [
    { pivot: silkTail(GEO.frontRibbon[0], cloth.trim, -0.05, 0.44, 0.24, tails), kind: 'trim', baseX: 0 },
    { pivot: silkTail(GEO.frontRibbon[1], cloth.trim, 0.05, 0.44, 0.24, tails), kind: 'trim', baseX: 0 },
    { pivot: silkTail(GEO.longRibbon[2], cloth.shade, -0.14, 0.84, -0.22, tails, -0.35), kind: 'shade', baseX: 0.12 },
    { pivot: silkTail(GEO.longRibbon[4], shared.ribbonGold, 0, 0.86, -0.24, tails), kind: 'gold', baseX: 0.12 },
    { pivot: silkTail(GEO.longRibbon[3], cloth.shade, 0.14, 0.84, -0.22, tails, 0.35), kind: 'shade', baseX: 0.12 },
  ];

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...rims, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(3, next);
      inner.material = material.edge;
      outer.material = material.robe;
      belt.material = material.shade;
      placket.material = material.edge;
      lapelL.material = material.edge;
      lapelR.material = material.trim;
      for (const petal of petals) petal.material = material.shade;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const rim of rims) rim.material = material.edge;
      for (const { pivot, kind } of tailPivots) {
        pivot.children[0].material = kind === 'gold' ? shared.ribbonGold : material[kind];
      }
    },
    update(t, walkAmt, sitAmt) {
      for (let i = 0; i < tailPivots.length; i++) {
        const { pivot, baseX } = tailPivots[i];
        const phase = i * 1.9;
        const side = i < 2 ? (i ? 1 : -1) : Math.sign(pivot.position.x) || 0.4;
        pivot.rotation.z = side * (0.06 + Math.sin(t * 2.4 + phase) * 0.09 * (0.4 + walkAmt));
        pivot.rotation.x = baseX + Math.sin(t * 2.7 + phase) * 0.1 * (0.3 + walkAmt) + (i < 2 ? sitAmt * 0.15 : 0);
      }
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.14 * walkAmt;
      }
      cape.rotation.y = Math.sin(t * 0.7) * 0.03;
      cape.rotation.x = Math.sin(t * 1.6) * 0.02;
    },
  };
}

/** Style 4 — hanbok: jeogori pha màu áo, chima đậm màu, otgoreum, norigae ngọc bội, lụa bay sau. */
function hanBok(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(4, color);
  const chima = part(GEO.chima, cloth.trim, 0, 0.33, 0, group);
  const chimaBand = part(GEO.chimaBand, cloth.edge, 0, 0.575, 0, group);
  const jeogori = part(GEO.jeogori, cloth.robe, 0, 0.75, 0, group);
  const jeogoriHem = part(GEO.jeogoriHem, cloth.edge, 0, 0.605, 0, group);
  // Cổ V và hai gạch đan thanh ôm ngoài cổ, mỗi bên một màu.
  const lapelL = part(GEO.collar, cloth.trim, -0.07, 0.73, 0.2, group);
  lapelL.rotation.z = 0.4;
  const lapelR = part(GEO.collar, cloth.trim, 0.07, 0.73, 0.2, group);
  lapelR.rotation.z = -0.4;
  const bandL = part(GEO.danBand, shared.danBlue, -0.125, 0.73, 0.205, group);
  bandL.rotation.z = 0.4;
  const bandR = part(GEO.danBand, shared.danRed, 0.125, 0.73, 0.205, group);
  bandR.rotation.z = -0.4;
  part(GEO.clasp, shared.brightGold, 0.05, 0.78, 0.215, group);

  const sleeves = [];
  const cuffs = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.sleeve, cloth.shade, 0, -0.19, 0, arm));
    cuffs.push(part(GEO.cuff, shared.danBlue, 0, -0.375, 0, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.4, 0, arm));
  }

  // Otgoreum trước ngực, norigae ngọc bội drape theo dốc váy, 2 dải lụa bay sau vai.
  const tails = new THREE.Group();
  group.add(tails);
  const tailPivots = [
    { pivot: silkTail(GEO.goreum[0], cloth.trim, -0.035, 0.78, 0.215, tails), kind: 'trim', baseX: 0 },
    { pivot: silkTail(GEO.goreum[1], cloth.trim, 0.02, 0.78, 0.215, tails), kind: 'trim', baseX: 0 },
    { pivot: silkTail(GEO.tassel[0], shared.ribbonGold, -0.02, 0.545, 0.28, tails), kind: 'gold', baseX: -0.44 },
    { pivot: silkTail(GEO.tassel[1], shared.ribbonGold, 0.02, 0.545, 0.28, tails), kind: 'gold', baseX: -0.44 },
    { pivot: silkTail(GEO.ribbon[0], cloth.shade, -0.12, 0.82, -0.21, tails, -0.3), kind: 'shade', baseX: 0.12 },
    { pivot: silkTail(GEO.ribbon[1], cloth.shade, 0.12, 0.82, -0.21, tails, 0.3), kind: 'shade', baseX: 0.12 },
  ];
  part(GEO.jadePendant, shared.jade, 0, 0.53, 0.31, group);

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...cuffs, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(4, next);
      chima.material = material.trim;
      chimaBand.material = material.edge;
      jeogori.material = material.robe;
      jeogoriHem.material = material.edge;
      lapelL.material = material.trim;
      lapelR.material = material.trim;
      for (const sleeve of sleeves) sleeve.material = material.shade;
      for (const { pivot, kind } of tailPivots) {
        pivot.children[0].material = kind === 'gold' ? shared.ribbonGold : material[kind];
      }
    },
    update(t, walkAmt, sitAmt) {
      for (let i = 0; i < tailPivots.length; i++) {
        const { pivot, baseX } = tailPivots[i];
        const phase = i * 1.5;
        const side = Math.sign(pivot.position.x) || 0.4;
        pivot.rotation.z = side * (0.04 + Math.sin(t * 2.3 + phase) * 0.07 * (0.4 + walkAmt));
        pivot.rotation.x = baseX + Math.sin(t * 2 + phase) * 0.07 * (0.3 + walkAmt) + (i < 2 ? sitAmt * 0.12 : 0);
      }
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.1 * walkAmt;
      }
    },
  };
}

/** Style 5 — kimono: thân thẳng, cổ chéo hai lớp, obi đỏ nơ hộp, tay áo furisode dài, lụa bay sau. */
function kimono(color, armL, armR) {
  const group = new THREE.Group();
  const cloth = wardrobe(5, color);
  const robe = part(GEO.kRobe, cloth.robe, 0, 0.33, 0, group);
  const hem = part(GEO.kHem, cloth.edge, 0, 0.03, 0, group);
  part(GEO.obi, shared.maple, 0, 0.46, 0, group);
  const knot = part(GEO.obiKnot, shared.maple, 0, 0.5, -0.27, group);
  part(GEO.obiCord, shared.brightGold, 0, 0.42, 0, group);
  // Cổ chéo hai lớp: lớp trong đỏ hồng diệp, lớp ngoài màu kem pha.
  const innerL = part(GEO.collar, shared.maple, -0.05, 0.74, 0.185, group);
  innerL.rotation.z = 0.55;
  const innerR = part(GEO.collar, shared.maple, 0.05, 0.74, 0.185, group);
  innerR.rotation.z = -0.55;
  const outerL = part(GEO.collar, cloth.edge, -0.085, 0.69, 0.2, group);
  outerL.rotation.z = 0.8;
  const outerR = part(GEO.collar, cloth.edge, 0.085, 0.69, 0.2, group);
  outerR.rotation.z = -0.8;

  const sleeves = [];
  const hems = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.kSleeve, cloth.robe, 0, -0.28, 0.01, arm));
    hems.push(part(GEO.kSleeveHem, cloth.edge, 0, -0.42, 0.01, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.47, 0, arm));
  }

  // 4 dải lụa bay sau lưng rủ từ dưới nơ obi, nghiêng theo dốc áo.
  const tails = new THREE.Group();
  group.add(tails);
  const tailPivots = [
    { pivot: silkTail(GEO.ribbon[2], cloth.shade, -0.1, 0.52, -0.29, tails, -0.25), kind: 'shade', baseX: 0.08 },
    { pivot: silkTail(GEO.ribbon[3], cloth.shade, 0.1, 0.52, -0.29, tails, 0.25), kind: 'shade', baseX: 0.08 },
    { pivot: silkTail(GEO.frontRibbon[0], shared.ribbonGold, -0.04, 0.54, -0.31, tails, -0.08), kind: 'gold', baseX: 0.08 },
    { pivot: silkTail(GEO.frontRibbon[1], shared.ribbonGold, 0.04, 0.54, -0.31, tails, 0.08), kind: 'gold', baseX: 0.08 },
  ];

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...hems, ...hands]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(5, next);
      robe.material = material.robe;
      hem.material = material.edge;
      outerL.material = material.edge;
      outerR.material = material.edge;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const item of hems) item.material = material.edge;
      for (const { pivot, kind } of tailPivots) {
        pivot.children[0].material = kind === 'gold' ? shared.ribbonGold : material[kind];
      }
    },
    update(t, walkAmt, sitAmt) {
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.12 * walkAmt + sitAmt * 0.04;
      }
      knot.rotation.y = Math.sin(t * 1.2) * 0.04;
      for (let i = 0; i < tailPivots.length; i++) {
        const { pivot, baseX } = tailPivots[i];
        const phase = i * 1.6;
        const side = Math.sign(pivot.position.x) || 0.4;
        pivot.rotation.z = side * (0.05 + Math.sin(t * 2.2 + phase) * 0.08 * (0.4 + walkAmt));
        pivot.rotation.x = baseX + Math.sin(t * 2.6 + phase) * 0.1 * (0.3 + walkAmt) + sitAmt * 0.1;
      }
    },
  };
}

/** Style 6 — áo dài: thân ôm cổ đứng, hàng khuy vàng, tà trước/sau hở hai bên lộ quần ngà. */
function aoDai(color, armL, armR, legL, legR) {
  const group = new THREE.Group();
  const cloth = wardrobe(6, color);
  const tunic = part(GEO.aTunic, cloth.robe, 0, 0.56, 0, group);
  part(GEO.mandarin, cloth.robe, 0, 0.92, -0.01, group);
  // Hàng khuy vàng dọc ngực, đi theo độ vòm thân.
  part(GEO.bead, shared.brightGold, 0, 0.78, 0.205, group);
  part(GEO.bead, shared.brightGold, 0, 0.7, 0.215, group);
  part(GEO.bead, shared.brightGold, 0, 0.62, 0.225, group);
  // Tà trước/sau tách từ eo, hở hai bên cho lộ quần; viền gấu cắm con theo tà.
  const panelF = part(GEO.panelF, cloth.robe, 0, 0.29, 0, group);
  const hemF = part(GEO.panelEdgeF, cloth.edge, 0, -0.245, 0, panelF);
  const panelB = part(GEO.panelB, cloth.shade, 0, 0.29, 0, group);
  const hemB = part(GEO.panelEdgeB, cloth.edge, 0, -0.245, 0, panelB);

  const sleeves = [];
  const hands = [];
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    sleeves.push(part(GEO.sleeve, cloth.robe, 0, -0.19, 0, arm));
    hands.push(part(GEO.hand, shared.skin, 0, -0.4, 0, arm));
  }
  // Quần ống rộng màu ngà gắn vào chân để văng theo bước đi.
  const pants = [];
  for (const leg of [legL, legR]) {
    pants.push(part(GEO.trouser, shared.cream, 0, -0.14, 0, leg));
  }

  // 2 dải lụa rủ từ gáy, nghiêng ôm tà sau.
  const tails = new THREE.Group();
  group.add(tails);
  const tailPivots = [
    { pivot: silkTail(GEO.ribbon[2], cloth.trim, -0.05, 0.85, -0.2, tails, -0.25), kind: 'trim', baseX: 0.25 },
    { pivot: silkTail(GEO.ribbon[3], cloth.trim, 0.05, 0.85, -0.2, tails, 0.25), kind: 'trim', baseX: 0.25 },
  ];

  return {
    group,
    tails,
    hide() {
      group.visible = false;
      for (const item of [...sleeves, ...hands, ...pants]) item.visible = false;
    },
    setColor(next) {
      const material = wardrobe(6, next);
      tunic.material = material.robe;
      panelF.material = material.robe;
      panelB.material = material.shade;
      hemF.material = material.edge;
      hemB.material = material.edge;
      for (const sleeve of sleeves) sleeve.material = material.robe;
      for (const { pivot, kind } of tailPivots) {
        pivot.children[0].material = kind === 'gold' ? shared.ribbonGold : material[kind];
      }
    },
    update(t, walkAmt, sitAmt) {
      // Tà lượn theo bước và xòe ra khi ngồi xuống.
      panelF.rotation.x = walkAmt * 0.06 + Math.sin(t * 2.4) * 0.03 - sitAmt * 0.3;
      panelB.rotation.x = walkAmt * 0.05 + Math.sin(t * 2.4) * 0.03 - sitAmt * 0.34;
      for (let i = 0; i < sleeves.length; i++) {
        sleeves[i].rotation.x = Math.sin(t * 9.5 + (i ? Math.PI : 0)) * 0.08 * walkAmt;
      }
      for (let i = 0; i < tailPivots.length; i++) {
        const { pivot, baseX } = tailPivots[i];
        const phase = i * 1.8;
        const side = i ? 1 : -1;
        pivot.rotation.z = side * (0.05 + Math.sin(t * 2.5 + phase) * 0.08 * (0.4 + walkAmt));
        pivot.rotation.x = baseX + Math.sin(t * 2.7 + phase) * 0.09 * (0.3 + walkAmt);
      }
    },
  };
}
