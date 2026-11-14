import * as THREE from 'three';

// Hình học cánh sen Cửu Phẩm Kim Liên, kế thừa cách dựng cánh parametric của tòa sen V10.1
// (aura-signature cũ): bản cánh rộng thân, gốc thuôn cắm vào đài, mặt thìa lõm, mép vểnh,
// dọc cánh vồng nhẹ và đầu cánh vòm mềm vểnh lên — không nhọn như lưỡi kiếm, không phẳng
// như mảnh kính. v: 0 gốc → 1 đầu cánh; u: −1..1 ngang cánh.

// CHIỀU Z CÁNH: với cặp quay (rotation.x = lean, rotation.y = góc quanh đài, thứ tự 'YXZ')
// thì +z_local chỉ XUỐNG → mặt thìa lõm phải về −z_local (lõm hướng trời), đầu cánh vểnh
// lên cũng −z_local.
const W = .3, CUP = .1, EDGE = .05, BEND = .06, FLICK = .2, TUCK = .04;

const petals = new Map(), dishes = new Map();

function buildPetal(lSeg, wSeg) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= lSeg; j++) {
    const v = j / lSeg;
    const halfW = W * Math.pow(Math.sin(Math.PI * v), .45) * (.3 + .7 * Math.min(1, v / .22));
    const bow = -(BEND * Math.sin(Math.PI * Math.pow(v, 1.1))
      + FLICK * Math.pow(Math.max(0, (v - .68) / .32), 2))
      + TUCK * (1 - Math.min(1, v / .12));
    for (let k = 0; k <= wSeg; k++) {
      const u = k / wSeg, across = u * 2 - 1;
      const dish = (CUP * (1 - across * across) - EDGE * Math.pow(Math.abs(across), 3)) * (halfW / W);
      pos.push(across * halfW, v, bow + dish);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < lSeg; j++) for (let k = 0; k < wSeg; k++) {
    const n = j * (wSeg + 1) + k;
    idx.push(n, n + 1, n + wSeg + 1, n + 1, n + wSeg + 2, n + wSeg + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox();
  return g;
}

/** Cánh sen đơn vị (dài 1 theo trục +y), dựng một lần dùng chung mọi nhân vật — không dispose. */
export function petalGeometry(lowQuality = false) {
  const key = lowQuality ? 'low' : 'full';
  if (!petals.has(key)) petals.set(key, buildPetal(lowQuality ? 8 : 12, lowQuality ? 4 : 6));
  return petals.get(key);
}

/** Đế đài sen: chén vàng lòng sâu, vành chúi ra ngoài — cánh sen cắm quanh vành. */
export function dishGeometry(lowQuality = false) {
  const key = lowQuality ? 'low' : 'full';
  if (!dishes.has(key)) {
    const g = new THREE.LatheGeometry([
      new THREE.Vector2(0, .05), new THREE.Vector2(.18, .055), new THREE.Vector2(.3, .08),
      new THREE.Vector2(.4, .115), new THREE.Vector2(.48, .15), new THREE.Vector2(.515, .12),
      new THREE.Vector2(.5, .06), new THREE.Vector2(.42, .02), new THREE.Vector2(0, 0),
    ], lowQuality ? 24 : 40);
    g.computeBoundingBox();
    dishes.set(key, g);
  }
  return dishes.get(key);
}
