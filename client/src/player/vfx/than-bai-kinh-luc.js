import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bell, softDot } from './aura-rhythm.js';
import { cardFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { CARD_ATLAS, CARD_CELLS, cardAtlas } from './than-bai-textures.js';
import { ACE } from './than-bai-climax.js';

// KÌNH LỰC BÀI — phần "ra tay" của Thần bài: ba lá bài nạp kình lực bay theo quỹ đạo chữ S quanh người (vòng
// elip, lên xuống hai lần mỗi vòng), mặt bài hướng ra ngoài, mũi lá chỉ theo hướng bay, nghiêng lượn nhẹ.
// Mỗi lá bọc quầng lửa đỏ tím, mép lá lách tách tia điện vàng, và kéo một DẢI KHÍ theo đúng ngôn ngữ chất liệu
// của dự án: đầu sáng hẹp, bụng phình, cổ thắt, đuôi xói mép tan thành tím. Lúc tụ lực cả ba lá xoáy dồn về chỗ
// lá Át sẽ hiện (dải khí bị hút theo), lúc lá Át vỡ thì từ đó bay trở lại quỹ đạo.
export const KINH_LUC = { rx: 1.0, rz: 0.86, y: 0.95, wave: 0.32, period: 6.5, trail: 1.7 };
const SEG = 24, CARD = new THREE.Vector3(0.24, 0.336, 0.006), CRACKLE = 5;
const CARD_FACES = [CARD_CELLS.aceSpade, CARD_CELLS.kingHeart, CARD_CELLS.queenSpade];

const trailFragment = `
  uniform vec3 core, ember, violet;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float n = 0.5 + 0.5 * sin(u * 31.0 - time * 4.0 + vSeed * 7.0) * sin(u * 13.0 + time * 1.7 + vSeed);
    float edge = mix(0.95, 0.4, u) - 0.4 * n * u;
    float body = 1.0 - smoothstep(edge - 0.3, edge, across);
    float fil = pow(0.5 + 0.5 * sin(vUv.y * 18.0 + u * 12.0 - time * 5.0 + vSeed), 6.0) * 0.6;
    vec3 col = mix(core, ember, smoothstep(0.0, 0.3, u));
    col = mix(col, violet, smoothstep(0.35, 1.0, u));
    col = mix(col, core, (1.0 - across) * exp(-u * 6.0) * 0.8);
    float a = body * pow(1.0 - u, 1.3) * (0.65 + fil);
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const trailVertex = `
  attribute float seed;
  varying vec2 vUv;
  varying float vSeed;
  void main() { vUv = uv; vSeed = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** Điểm trên quỹ đạo chữ S của lá thứ i ở góc th. */
export function kinhLucPoint(i, th, out) {
  return out.set(Math.sin(th) * KINH_LUC.rx, KINH_LUC.y + KINH_LUC.wave * Math.sin(2 * th + i * 1.3), Math.cos(th) * KINH_LUC.rz);
}
/** Dáng dải khí theo u (0 đầu → 1 đuôi): đầu hẹp, bụng phình ở 0.22, cổ thắt ở 0.55, thuôn dần. */
const trailWidth = u => 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, u / 0.44)), 0.8) * (1 - 0.6 * bell(0.55, 0.09, u)) * Math.pow(1 - u, 0.5) + 0.004;

export function createKinhLucCards(parent, colors, lowQuality) {
  const count = lowQuality ? 2 : 3;
  const cards = instancedLayer(parent, 'than-bai-kinh-luc-cards', new THREE.BoxGeometry(1, 1, 1), litMaterial(cardFragment, {
    map: { value: cardAtlas() }, grid: { value: new THREE.Vector2(CARD_ATLAS.cols, CARD_ATLAS.rows) },
    gold: { value: colors.gold }, light: { value: colors.light }, flash: { value: 0.25 },
  }), count, 8);
  const strips = createRibbonStrips(count * 2, SEG);
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { core: { value: colors.light }, ember: { value: colors.red }, violet: { value: colors.violet }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: trailVertex, fragmentShader: trailFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const trail = new THREE.Mesh(strips.geometry, trailMat); trail.name = 'than-bai-kinh-luc-trails'; trail.frustumCulled = false; trail.renderOrder = 7;
  parent.add(trail);
  const aura = billboardLayer(parent, 'than-bai-kinh-luc-aura', softDot(), count, colors.ember.clone(), THREE.AdditiveBlending);
  const crackle = billboardLayer(parent, 'than-bai-kinh-luc-crackle', softDot(), count * CRACKLE, colors.light.clone(), THREE.AdditiveBlending);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), T = new THREE.Vector3(), side = new THREE.Vector3(), out = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), roll = new THREE.Matrix4(), ace = new THREE.Vector3(ACE.x, ACE.y, ACE.z);
  const pull = (i, k, time, converge, target) => {
    // Lúc tụ lực: điểm bị hút về lá Át theo đường xoáy nhỏ dần; đuôi bị hút chậm hơn đầu.
    const c = converge * converge * (1 - 0.45 * k);
    if (c <= 0) return target;
    const sp = time * 3.2 + i * 2.1, r = 0.35 * (1 - converge);
    out.set(ace.x + Math.cos(sp) * r, ace.y + Math.sin(sp) * r * 0.6, ace.z + Math.sin(sp * 0.7) * 0.1);
    return target.lerp(out, c);
  };

  return {
    /** converge: bị hút về lá Át (0..1); visible: 0 khi lá Át đang hiện (ba lá đã nhập làm một). */
    update(time, rhythm, f, converge = 0, visible = 1) {
      const vis = visible * f, tick = Math.floor(time * 12);
      for (let i = 0; i < count; i++) {
        const th = time * Math.PI * 2 / KINH_LUC.period + i * Math.PI * 2 / count;
        // Dải khí: hai dải bắt chéo (dọc và ngang) để nhìn góc nào cũng có khối.
        for (let j = 0; j <= SEG; j++) {
          const k = j / SEG, a = th - k * KINH_LUC.trail;
          pull(i, k, time, converge, kinhLucPoint(i, a, p));
          pull(i, Math.min(1, k + 0.02), time, converge, kinhLucPoint(i, a - 0.03, q));
          T.subVectors(p, q).normalize();
          side.copy(Y).addScaledVector(T, -T.y).normalize();
          const w = trailWidth(k) * (1 + 0.4 * rhythm.pulse) * (vis > 0.001 ? 1 : 0);
          strips.write(i * 2, j, p, side, w);
          strips.write(i * 2 + 1, j, p, side.crossVectors(T, side).normalize(), w * 0.7);
        }
        // Lá bài ở đầu dải: mũi lá theo hướng bay, mặt hướng ra ngoài, nghiêng lượn.
        pull(i, 0, time, converge, kinhLucPoint(i, th, p));
        pull(i, 0, time, converge, kinhLucPoint(i, th + 0.03, q));
        T.subVectors(q, p).normalize();
        side.set(p.x, 0, p.z).normalize().addScaledVector(T, -T.dot(side)).normalize();
        out.crossVectors(T, side);
        m.makeBasis(out, T, side);
        roll.makeRotationY(0.35 * Math.sin(time * 1.1 + i * 2));
        m.multiply(roll).scale(CARD).setPosition(p);
        cards.set(i, m, vis, CARD_FACES[i % CARD_FACES.length], CARD_CELLS.back);
        aura.set(i, p.x, p.y, p.z, 0.55, 0.55, (0.55 + 0.25 * Math.sin(time * 3 + i)) * vis);
        for (let c = 0; c < CRACKLE; c++) {
          const h = hash(tick * 3.1 + i * 17 + c * 5.3), e = (h - 0.5) * 2, on = hash(tick + c * 7.7 + i) > 0.45 ? 1 : 0;
          const size = 0.03 + 0.03 * hash(tick + c);
          crackle.set(i * CRACKLE + c, p.x + out.x * 0.12 * e + T.x * 0.15 * (c / CRACKLE - 0.5) * 2, p.y + out.y * 0.12 * e + T.y * 0.15 * (c / CRACKLE - 0.5) * 2,
            p.z + out.z * 0.12 * e + T.z * 0.15 * (c / CRACKLE - 0.5) * 2, size, size, on * vis);
        }
      }
      cards.commit(); strips.commit(); aura.commit(); crackle.commit();
      cards.material.uniforms.time.value = time; cards.material.uniforms.flash.value = 0.22 + 0.3 * converge;
      trailMat.uniforms.time.value = time; trailMat.uniforms.opacity.value = f;
    },
    dispose() { cards.mesh.geometry.dispose(); cards.dispose(); strips.geometry.dispose(); trailMat.dispose(); aura.dispose(); crackle.dispose(); },
  };
}
