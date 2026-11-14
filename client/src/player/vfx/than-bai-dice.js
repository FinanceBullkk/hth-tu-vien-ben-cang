import * as THREE from 'three';
import { bell } from './aura-rhythm.js';
import { diceFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { DICE_ATLAS, diceAtlas } from './than-bai-textures.js';

// Ba xúc xắc vàng ròng của Thần bài: khối bo góc, chấm hồng ngọc; trôi vòng ngang hông, đứng nghiêng xoay chậm,
// lúc "tất tay" cùng nảy vọt lên và chấm đỏ rực sáng. Mặt đối nhau cộng bằng 7 như xúc xắc thật.
export const DICE = { radius: 1.0, y: 0.6, size: 0.17 };
// Thứ tự nhóm mặt của BoxGeometry: +x, -x, +y, -y, +z, -z → số chấm.
const FACE_VALUES = [3, 4, 1, 6, 2, 5];

/** Hộp bo góc: lưới hộp chia nhỏ rồi kéo các đỉnh gần góc về mặt cầu bán kính r; UV từng mặt trỏ vào ô atlas. */
function roundedDiceGeometry(r = 0.14, seg = 4) {
  const geo = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg), pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  const inner = 0.5 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
    v.sub(c).normalize(); // pháp tuyến đúng của hộp bo góc (mặt phẳng lẫn góc cầu)
    nor.setXYZ(i, v.x, v.y, v.z);
    v.multiplyScalar(r).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const perFace = (seg + 1) * (seg + 1);
  FACE_VALUES.forEach((value, face) => {
    const cell = value - 1, col = cell % DICE_ATLAS, row = Math.floor(cell / DICE_ATLAS);
    for (let k = face * perFace; k < (face + 1) * perFace; k++) {
      uv.setXY(k, (col + uv.getX(k)) / DICE_ATLAS, 1 - (row + 1 - uv.getY(k)) / DICE_ATLAS);
    }
  });
  return geo;
}

export function createThanBaiDice(parent, colors, lowQuality) {
  const geo = roundedDiceGeometry(0.14, lowQuality ? 2 : 4);
  const dice = instancedLayer(parent, 'than-bai-dice', geo, litMaterial(diceFragment, {
    map: { value: diceAtlas() }, deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light },
    ruby: { value: colors.red }, pulse: { value: 0 },
  }), 3, 7);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();
  const s = new THREE.Vector3().setScalar(DICE.size);

  return {
    update(time, rhythm, f) {
      const jump = bell(0.47, 0.06, rhythm.phase);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2 - time * 0.24;
        p.set(Math.sin(a) * DICE.radius, DICE.y + 0.08 * Math.sin(time * 0.8 + i * 2) + 0.6 * jump, Math.cos(a) * DICE.radius);
        // Đứng nghiêng kiểu trưng bày (lộ ba mặt), chỉ xoay chậm quanh trục đứng; tất tay mới lật một vòng.
        q.setFromEuler(e.set(0.62 + jump * Math.PI * 2, time * 0.35 + i * 2.1, 0.785, 'YXZ'));
        dice.set(i, m.compose(p, q, s), f);
      }
      dice.commit();
      dice.material.uniforms.time.value = time;
      dice.material.uniforms.pulse.value = 0.25 * rhythm.pulse + jump;
    },
    dispose() { dice.dispose(); geo.dispose(); },
  };
}
