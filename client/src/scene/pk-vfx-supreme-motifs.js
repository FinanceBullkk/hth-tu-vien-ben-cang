import * as THREE from 'three';
import { drawSuit } from './card-suit-paths.js';
import { CARD_ATLAS, CARD_CELLS, DICE_ATLAS, cardAtlas, diceAtlas } from '../player/vfx/than-bai-textures.js';

// Linh vật chiêu PK cho hai hào quang chí tôn (13 Thần bài, 14 Vua câu cá), cắm vào các
// bảng của pk-vfx.js (SIGIL_MOTIFS, motifMesh, MOTIF_SCALE, buildSlashStrike, mưa AOE, vòm
// hộ thể). Mesh tạo mới mỗi lần ra chiêu và gắn vào group chiêu nên được dispose theo
// traverse sẵn có; atlas lá bài/xúc xắc lấy từ cache dùng chung của aura Thần bài —
// material.dispose() không đụng tới map nên atlas không bao giờ bị huỷ nhầm.

// Thùng Phá Sảnh bích, đọc trái → phải: 10 J Q K Át.
const ROYAL = [CARD_CELLS.tenSpade, CARD_CELLS.jackSpade, CARD_CELLS.queenSpade, CARD_CELLS.kingSpade, CARD_CELLS.aceSpade];
const CARD_W = .14, CARD_H = .196; // đúng tỉ lệ lá bài 240 × 336 của atlas
// Mặt xúc xắc theo thứ tự mặt BoxGeometry (+x −x +y −y +z −z); hai mặt đối nhau cộng 7.
const DICE_FACES = [3, 4, 1, 6, 2, 5];

/** Cá chép ngóc đầu (+y), đuôi xoè hai thuỳ — ô đơn vị cao 1; dùng cho cả canvas lẫn THREE.Shape. */
function traceCarp(g) {
  g.moveTo(0, .5);
  g.bezierCurveTo(.17, .46, .21, .18, .15, -.05);
  g.quadraticCurveTo(.1, -.22, .04, -.3);
  g.quadraticCurveTo(.2, -.38, .26, -.52);
  g.quadraticCurveTo(.08, -.45, 0, -.38);
  g.quadraticCurveTo(-.08, -.45, -.26, -.52);
  g.quadraticCurveTo(-.2, -.38, -.04, -.3);
  g.quadraticCurveTo(-.1, -.22, -.15, -.05);
  g.bezierCurveTo(-.21, .18, -.17, .46, 0, .5);
}

function carpGeometry(height) {
  const shape = new THREE.Shape();
  traceCarp(shape);
  return new THREE.ShapeGeometry(shape, 10).scale(height, height, height);
}

/** Đổi UV của plane/box sang một ô atlas (cột × hàng, hàng 0 ở mép trên ảnh). */
function mapUvToCell(geo, cols, rows, cell, from = 0, count = geo.attributes.uv.count) {
  const uv = geo.attributes.uv;
  const cx = cell % cols, cy = Math.floor(cell / cols);
  for (let k = from; k < from + count; k++) {
    uv.setXY(k, (cx + uv.getX(k)) / cols, 1 - (cy + 1 - uv.getY(k)) / rows);
  }
  uv.needsUpdate = true;
  return geo;
}

const cardPlane = (cell, w = CARD_W, h = CARD_H) =>
  mapUvToCell(new THREE.PlaneGeometry(w, h), CARD_ATLAS.cols, CARD_ATLAS.rows, cell);

const basic = (color, { additive = true, opacity = .9, map = null } = {}) => new THREE.MeshBasicMaterial({
  color, map, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
});

/** Lá bài hai mặt thật (mặt bài + mặt lưng thần bài). Mặt bài quay về −z — về phía camera sau lưng
 *  người ra chiêu; facing = 'out' xoay mặt bài ra +x để vòng hộ thể khoe mặt bài ra ngoài. */
export function twoSidedCard(cell, facing) {
  const front = cardPlane(cell).rotateY(Math.PI);
  const back = cardPlane(CARD_CELLS.back);
  if (facing === 'out') { front.rotateY(-Math.PI / 2); back.rotateY(-Math.PI / 2); }
  const mat = (opacity) => new THREE.MeshBasicMaterial({ map: cardAtlas(), transparent: true, opacity,
    depthWrite: false, side: THREE.FrontSide, blending: THREE.NormalBlending });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(front, mat(.96)), new THREE.Mesh(back, mat(.9)));
  return g;
}

export function goldDie(t) {
  const geo = new THREE.BoxGeometry(.12, .12, .12);
  DICE_FACES.forEach((value, face) => mapUvToCell(geo, DICE_ATLAS, DICE_ATLAS, value - 1, face * 4, 4));
  return new THREE.Mesh(geo, basic(t.main, { additive: false, opacity: .97, map: diceAtlas() }));
}

function casinoChip(t, i) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .022, 18),
    basic(i % 2 ? t.core : t.accent, { additive: false, opacity: .95 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.075, .012, 6, 22), basic(t.main));
  rim.rotation.x = Math.PI / 2;
  g.add(body, rim);
  return g;
}

/** Cá chép: thân vàng + lõi sáng nhỏ lệch về đầu — hai lớp cộng sáng nên ở xa vẫn đọc ra con cá. */
export function glowingCarp(t, geoFn = carpGeometry) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geoFn(.3), basic(t.accent, { opacity: .92 }));
  const heart = new THREE.Mesh(geoFn(.17), basic(t.core, { opacity: .8 }));
  g.add(body, heart);
  return g;
}

// Cá bơi vòng hộ thể: nướng sẵn hướng đầu +z, mặt phẳng YZ — update() của khiên đặt rotation.y = −góc
// thì +z trùng hướng tiếp tuyến (đầu đi trước) và người đứng ngoài thấy nghiêng mình cá.
const swimCarpGeometry = (h) => carpGeometry(h).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);

/** Mesh linh vật cho motifMesh(); null nếu không phải loại chí tôn. */
export function supremeMotifMesh(kind, t, i = 0) {
  switch (kind) {
    case 'card': return twoSidedCard(ROYAL[i % ROYAL.length]);
    case 'cardRing': return twoSidedCard(ROYAL[i % ROYAL.length], 'out');
    case 'dice': return goldDie(t);
    case 'chip': return casinoChip(t, i);
    case 'fish': return glowingCarp(t, carpGeometry);
    case 'swimFish': return glowingCarp(t, swimCarpGeometry);
    default: return null;
  }
}

export const SUPREME_MOTIF_SCALE = { card: 2.4, cardRing: 2.6, dice: 2.2, chip: 2.4, fish: 2.2, swimFish: 2.2 };

// Hoạ tiết vành pháp trận (vẽ tại gốc, "lên" = hướng ra ngoài vành). i = thứ tự quanh vành.
export const SUPREME_SIGIL_MOTIFS = {
  // Bốn chất bài lần lượt ♠ ♣ ♦ ♥; rô và cơ tô đỏ son.
  suit: (ctx, color, i = 0) => drawSuit(ctx, i % 4, 0, 0, 46, i % 4 >= 2 ? '#ff4a3a' : color),
  carp: (ctx, color) => {
    ctx.save();
    ctx.scale(58, -58); // canvas y hướng xuống → lật để đầu cá chỉ ra ngoài vành
    ctx.beginPath();
    traceCarp(ctx);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  },
};

/** Dáng đòn đánh thường chí tôn; trả null nếu style không thuộc nhóm này. Helper và mảng extras
 *  lấy từ buildSlashStrike (push/radial ghi mảnh phụ vào extras đó). */
export function buildSupremeStrike(style, t, { arc, mat, push, radial, extras }) {
  if (style === 'cardFan') { // Thần bài — Thùng Phá Sảnh xoè quạt rồi phóng cả năm lá như phi đao
    const wave = arc(1.22, 1.38);
    wave.position.z = .45;
    const waveEdge = new THREE.Mesh(new THREE.RingGeometry(1.38, 1.46, 48, 1, -Math.PI * .45, Math.PI * .9),
      mat(t.accent, .9));
    waveEdge.position.z = .44;
    for (let i = 0; i < ROYAL.length; i++) {
      const k = i - 2; // 10 ở bên trái tầm nhìn (+x khi nhìn theo hướng đánh), Át bên phải
      const card = twoSidedCard(ROYAL[i]);
      card.scale.setScalar(SUPREME_MOTIF_SCALE.card * 1.2);
      card.rotation.z = k * .28;
      push(card, -k * .34, .12 - Math.abs(k) * .07, .7 + i * .015,
        { vx: -k * .9, vz: 2.6 + (2 - Math.abs(k)) * .35, spin: k * .7, grow: .45 });
    }
    return { wave, waveEdge, extras };
  }
  if (style === 'rodWhip') { // Vua câu cá — dây câu vàng vắt vòm, bọt sóng cong dưới, lưỡi câu phóng tới
    const wave = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.46, 64, 1, Math.PI * .1, Math.PI * .8), mat(t.accent));
    wave.position.z = .45;
    const waveEdge = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.28, 48, 1, Math.PI * 1.1, Math.PI * .8), mat(t.main, .85));
    waveEdge.rotation.x = -.5;
    waveEdge.position.z = .5;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.12, .024, 6, 20, Math.PI * 1.5), mat(t.accent));
    push(hook, Math.cos(Math.PI * .1) * 1.43, Math.sin(Math.PI * .1) * 1.43, .5, { vz: 3, vy: .6, spin: 5 });
    radial(8, () => new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), basic(t.core)), .9, 2.2, 0);
    // Hai cá chép vọt khỏi vòm sóng theo lưỡi câu — mặt phẳng XY nên camera sau lưng thấy trọn dáng cá.
    for (const side of [-1, 1]) {
      const carp = glowingCarp(t, carpGeometry);
      carp.scale.setScalar(SUPREME_MOTIF_SCALE.fish * 1.25);
      carp.rotation.z = side * .35;
      push(carp, side * .55, -.55, .62, { vx: side * .5, vy: 2.4, vz: .9, spin: side * 1.6, grow: .3 });
    }
    return { wave, waveEdge, extras };
  }
  return null;
}

/** Hình vật rơi/bùng ở vùng nổ AOE cho tông chí tôn; null nếu không thuộc nhóm này. */
export function supremeRainGeometry(kind) {
  if (kind === 'card') return cardPlane(CARD_CELLS.aceSpade, .55, .77); // Át bích mạ vàng đổ ập
  if (kind === 'fish') return carpGeometry(1.1); // cá chép vọt thẳng khỏi mặt nước
  return null;
}

export const supremeRainMap = (kind) => (kind === 'card' ? cardAtlas() : null);

const WHEEL_R = 1.52, WHEEL_BULBS = 16;

/** Vòm hộ thể 'wheel' (Thần bài): vành vàng ngang ngực với 16 bóng đèn sòng bạc đỏ–ngà xen kẽ. */
export function buildCasinoWheel(t) {
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, .04, 8, 72), basic(t.main, { opacity: .85 }));
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  const bulbGeo = new THREE.SphereGeometry(.07, 8, 6); // dùng chung; dispose lặp lại vô hại
  const bulbs = [];
  for (let i = 0; i < WHEEL_BULBS; i++) {
    const a = (i / WHEEL_BULBS) * Math.PI * 2;
    const bulb = new THREE.Mesh(bulbGeo, basic(i % 2 ? t.accent : t.core, { opacity: .95 }));
    bulb.position.set(Math.cos(a) * WHEEL_R, 0, Math.sin(a) * WHEEL_R);
    wheel.add(bulb);
    bulbs.push(bulb);
  }
  wheel.position.y = .1;
  wheel.userData.bulbs = bulbs;
  return wheel;
}

/** Đèn chạy đuổi quanh vành (2 sáng 2 tắt), vành quay chậm ngược chiều bài hộ thể. */
export function updateCasinoWheel(wheel, age, dt) {
  wheel.rotation.y -= dt * .7;
  const chase = Math.floor(age * 12);
  wheel.userData.bulbs.forEach((bulb, k) => { bulb.material.opacity = (k + chase) % 4 < 2 ? .95 : .18; });
}
