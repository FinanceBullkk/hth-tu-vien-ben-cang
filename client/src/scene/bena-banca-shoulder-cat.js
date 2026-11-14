// Bé mèo mướp trên vai Bena Banca: đứng hai chân, áo choàng xanh than viền kem, cổ lông trắng, vòng hoa hồng trên đầu.
// Thân gộp một lần vẽ; đầu, đuôi và chân vẫy để riêng cho NPC cử động.
import * as THREE from 'three';
import { mergeStaticMeshes } from './static-mesh-merge.js';

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

const CAT = {
  fur: new THREE.MeshLambertMaterial({ color: 0x8e8c93, flatShading: true }),
  stripe: new THREE.MeshLambertMaterial({ color: 0x55525a, flatShading: true }),
  white: new THREE.MeshLambertMaterial({ color: 0xf1eee9, flatShading: true }),
  pink: new THREE.MeshLambertMaterial({ color: 0xf2a0ae, flatShading: true }),
  eye: new THREE.MeshBasicMaterial({ color: 0x1a1a22 }),
  cape: new THREE.MeshLambertMaterial({ color: 0x1f2c5c, flatShading: true, side: THREE.DoubleSide }),
  trim: new THREE.MeshLambertMaterial({ color: 0xf0dca8, flatShading: true }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x6f9a5a, flatShading: true }),
  roses: [0xf4a7b9, 0xf9cfd6, 0xe98aa2].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true })),
};

/**
 * Bé mèo mướp đứng hai chân trên vai: áo choàng xanh than viền kem, cổ lông trắng, vòng hoa hồng trên đầu,
 * một chân trước giơ lên vẫy. Trả về nhóm kèm đuôi và đầu để NPC cho cử động.
 */
export function buildShoulderCat() {
  const g = new THREE.Group();
  const body = new THREE.Group(); // các mảnh đứng yên, gộp một lần vẽ cho mỗi vật liệu
  const ball = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = mesh(new THREE.SphereGeometry(r, 9, 7), mat, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  body.add(ball(0.052, CAT.fur, 0, 0.06, 0, 1, 1.25, 0.9));
  body.add(ball(0.036, CAT.white, 0, 0.05, 0.03, 1, 1.2, 0.8));
  // Chân sau và hai chân trước, chân phải giơ lên vẫy (để riêng cho cử động).
  body.add(ball(0.022, CAT.white, -0.03, 0.01, 0.02), ball(0.022, CAT.white, 0.03, 0.01, 0.02));
  body.add(ball(0.018, CAT.white, -0.042, 0.075, 0.04));
  const paw = ball(0.018, CAT.white, 0.05, 0.13, 0.035);
  g.add(paw);

  // Áo choàng nửa sau, mở về phía trước, viền kem ở mép dưới và cổ lông trắng.
  const cape = mesh(new THREE.CylinderGeometry(0.04, 0.078, 0.12, 12, 1, true, Math.PI / 2, Math.PI), CAT.cape, 0, 0.05, -0.006);
  const hem = mesh(new THREE.TorusGeometry(0.078, 0.008, 4, 12, Math.PI), CAT.trim, 0, -0.01, -0.006);
  hem.rotation.set(Math.PI / 2, 0, Math.PI);
  const ruff = mesh(new THREE.TorusGeometry(0.04, 0.014, 5, 12), CAT.white, 0, 0.108, 0);
  ruff.rotation.x = Math.PI / 2;
  body.add(cape, hem, ruff);
  mergeStaticMeshes(body);
  g.add(body);

  const head = new THREE.Group();
  head.position.y = 0.15;
  head.add(ball(0.055, CAT.fur, 0, 0, 0, 1.08, 0.95, 1));
  head.add(ball(0.024, CAT.white, 0, -0.016, 0.042, 1.2, 0.8, 0.8));
  head.add(ball(0.007, CAT.pink, 0, -0.006, 0.058));
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.022, 0.042, 4), CAT.fur, s * 0.033, 0.05, 0);
    ear.rotation.z = -s * 0.25;
    const inner = mesh(new THREE.ConeGeometry(0.011, 0.024, 4), CAT.pink, s * 0.033, 0.047, 0.008);
    inner.rotation.z = -s * 0.25;
    head.add(ear, inner, ball(0.009, CAT.eye, s * 0.021, 0.008, 0.048));
  }
  // Vằn mướp trên trán.
  for (const dx of [-0.012, 0, 0.012]) {
    const stripe = mesh(new THREE.BoxGeometry(0.005, 0.02, 0.004), CAT.stripe, dx, 0.03, 0.045);
    stripe.rotation.x = -0.6;
    head.add(stripe);
  }
  // Vòng hoa: vành lá và năm bông hồng.
  const wreath = mesh(new THREE.TorusGeometry(0.042, 0.006, 4, 14), CAT.leaf, 0, 0.042, 0);
  wreath.rotation.x = Math.PI / 2 - 0.15;
  head.add(wreath);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    head.add(ball(0.014, CAT.roses[i % 3], Math.sin(a) * 0.042, 0.046 + Math.cos(a) * 0.006, Math.cos(a) * 0.042));
  }
  mergeStaticMeshes(head);
  g.add(head);

  // Đuôi ba đốt, gốc đặt ở mông để vẫy quanh đó.
  const tail = new THREE.Group();
  tail.position.set(0, 0.02, -0.045);
  [[0, 0.02, -0.02, 0.016], [0, 0.05, -0.04, 0.014], [0, 0.085, -0.045, 0.012]].forEach(([x, y, z, r], i) => {
    tail.add(ball(r, i === 2 ? CAT.stripe : CAT.fur, x, y, z));
  });
  mergeStaticMeshes(tail);
  g.add(tail);
  return { group: g, head, tail, paw };
}
