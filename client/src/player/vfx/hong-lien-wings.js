import * as THREE from 'three';
import { featherGeometry, featherMaterial, featherSet } from './hong-lien-materials.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { hongLienWingGlow, WING_GLOW_ROOT, WING_GLOW_SIZE } from './hong-lien-textures.js';
import { WING, PRIMARIES, SECONDARIES, COVERTS, wingStroke, wingMatrix, armPoint } from './hong-lien-wing-frame.js';

// Đôi cánh chu tước của Hồng Liên — bóng dáng chính: chữ V rộng giang ngang hai bên vai.
// Các lớp đi cùng nhịp vỗ chậm (wingStroke): lông vũ lửa 3D (sáng + mực) · cánh hư ảnh lớn hơn,
// trong hơn, vỗ trễ nhịp như dư ảnh · quầng lửa mềm vẽ theo bố cục lông · mép cánh là một sợi lửa
// lụa chạy từ vai ra ngọn lông bay. Lông ngoài trễ nhịp một chút như bị gió ép, nên cánh uốn mềm
// chứ không quay cứng như bản lề. tips: vị trí ngọn lông bay/lông giữa (thế giới) cho lưỡi lửa.
const ECHO_SCALE = 1.32, ECHO_LAG = 0.7;
const glowPlane = new THREE.PlaneGeometry(WING_GLOW_SIZE, WING_GLOW_SIZE) // dùng chung, không dispose
  .translate(-WING_GLOW_ROOT[0] / 1024 * WING_GLOW_SIZE, WING_GLOW_ROOT[1] / 1024 * WING_GLOW_SIZE, -0.03);

export function createWings(parent, colors, lowQuality) {
  const feathers = lowQuality ? [...PRIMARIES.filter((_, i) => i % 2 === 0), ...SECONDARIES.filter((_, i) => i % 2 === 0)]
    : [...PRIMARIES, ...SECONDARIES, ...COVERTS];
  const glowMat = featherMaterial(colors, 0), inkMat = featherMaterial(colors, 1);
  const set = featherSet(parent, featherGeometry(), feathers.length * 2, glowMat, inkMat, lowQuality, 'hong-lien-wings');
  // Cánh hư ảnh: chỉ lớp sáng, bỏ ở chất lượng thấp.
  const echoMat = lowQuality ? null : featherMaterial(colors, 0);
  const echo = lowQuality ? null : featherSet(parent, featherGeometry(), feathers.length * 2, echoMat, null, true, 'hong-lien-wing-echo');
  if (echo) echo.glow.renderOrder = 5;
  const tipFeathers = feathers.filter(f => PRIMARIES.includes(f) || SECONDARIES.includes(f));
  const tips = Array.from({ length: tipFeathers.length * 2 }, () => new THREE.Vector3());

  const auraMat = new THREE.MeshBasicMaterial({ map: hongLienWingGlow(), color: colors.edge, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const auras = [-1, 1].map(() => {
    const mesh = new THREE.Mesh(glowPlane, auraMat); mesh.name = 'hong-lien-wing-glow';
    mesh.matrixAutoUpdate = false; mesh.renderOrder = 4; mesh.frustumCulled = false; parent.add(mesh); return mesh;
  });

  const seg = lowQuality ? 14 : 26, edge = createRibbonStrips(2, seg);
  const edgeMat = new THREE.ShaderMaterial({ uniforms: { edge: { value: colors.edge }, core: { value: colors.core },
    gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 0.8 } },
  vertexShader: ribbonVertex, fragmentShader: arcFragment,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const edgeMesh = new THREE.Mesh(edge.geometry, edgeMat); edgeMesh.name = 'hong-lien-wing-edge';
  edgeMesh.frustumCulled = false; edgeMesh.renderOrder = 7; parent.add(edgeMesh);

  const frame = new THREE.Matrix4(), m = new THREE.Matrix4(), dummy = new THREE.Object3D();
  const p = new THREE.Vector3(), q = new THREE.Vector3(), normal = new THREE.Vector3(), tangent = new THREE.Vector3(), across = new THREE.Vector3();
  // Điểm u (0 vai → 0.55 cổ tay → 1 ngọn lông bay đầu) trên mép cánh, toạ độ khung.
  const edgePoint = (side, u, armA, lag, out) => {
    if (u <= 0.55) return armPoint(side, (u / 0.55) * 0.98, armA, out).setZ(0.03);
    const [s, ang, len] = PRIMARIES[0], a = ang + (armA - WING.base) + lag, d = ((u - 0.55) / 0.45) * len * 0.95;
    return armPoint(side, s, armA, out).add(q.set(side * Math.sin(a) * d, Math.cos(a) * d, 0.03));
  };

  // Đặt lông một bên cánh vào bộ target theo nhịp stroke, phóng to scale; ghi ngọn lông vào tips nếu có.
  const lay = (target, stroke, scale, k, side, time, spread, tipsOut) => {
    const lagWave = Math.sin(stroke.phase * Math.PI * 2 - 0.9);
    let t = 0;
    feathers.forEach(([s, ang, len, dz], i) => {
      const lag = 0.08 * lagWave * s, a = ang * (1 + spread) + stroke.delta + lag + 0.02 * Math.sin(time * 0.6 + i * 1.3 + k);
      armPoint(side, s * scale, stroke.armA, dummy.position).z = dz - 0.02 * s - (scale - 1) * 0.25;
      dummy.rotation.set(0.1 * Math.sin(time * 0.3 + i), 0, -side * a);
      const l = len * scale; dummy.scale.set(side * l, l, l); dummy.updateMatrix();
      target.setMatrixAt(k * feathers.length + i, m.multiplyMatrices(frame, dummy.matrix));
      if (tipsOut && tipFeathers.includes(feathers[i])) {
        tipsOut[k * tipFeathers.length + t++].set(side * Math.sin(a) * l * 0.92, Math.cos(a) * l * 0.92, 0).add(dummy.position).applyMatrix4(frame);
      }
    });
  };

  return {
    tips,
    update(time, rhythm, f) {
      const stroke = wingStroke(time), { phase, armA, delta } = stroke, echoStroke = wingStroke(time - ECHO_LAG);
      const lagWave = Math.sin(phase * Math.PI * 2 - 0.9), spread = 0.05 * rhythm.release - 0.03 * rhythm.gather;
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        wingMatrix(side, frame);
        lay(set.glow, stroke, 1, k, side, time, spread, tips);
        if (echo) lay(echo.glow, echoStroke, ECHO_SCALE, k, side, time - ECHO_LAG, spread * 1.5);
        // Quầng cánh xoay theo cánh tay; bên trái lật gương.
        dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, -side * delta); dummy.scale.set(side, 1, 1); dummy.updateMatrix();
        auras[k].matrix.multiplyMatrices(frame, dummy.matrix);
        // Mép lửa: dải nằm trong mặt phẳng cánh, thon dần ra ngọn.
        normal.set(0, 0, 1).transformDirection(frame);
        // Đầu sáng của dải ở ngọn lông bay (u = 0), đuôi tan dần về vai — không lóe sát đầu nhân vật.
        for (let j = 0; j <= seg; j++) {
          const u = 1 - j / seg;
          edgePoint(side, u, armA, 0.08 * lagWave, p).applyMatrix4(frame);
          const back = u >= 0.01 ? u - 0.01 : u + 0.01;
          edgePoint(side, back, armA, 0.08 * lagWave, tangent).applyMatrix4(frame);
          tangent.sub(p).normalize(); if (back > u) tangent.negate();
          across.crossVectors(normal, tangent).normalize();
          edge.write(k, j, p, across, 0.012 + 0.035 * Math.sin(Math.PI * Math.min(1, (1 - u) * 1.4 + 0.15)));
        }
      }
      set.glow.instanceMatrix.needsUpdate = true; edge.commit();
      if (echo) echo.glow.instanceMatrix.needsUpdate = true;
      for (const mat of [glowMat, inkMat, echoMat]) if (mat) { mat.uniforms.time.value = time; mat.uniforms.pulse.value = rhythm.pulse; }
      if (echoMat) echoMat.uniforms.opacity.value = (0.28 + 0.12 * rhythm.release) * f;
      glowMat.uniforms.opacity.value = (0.85 + 0.15 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.6 * f;
      auraMat.opacity = (0.5 + 0.3 * rhythm.release) * f;
      edgeMat.uniforms.time.value = time; edgeMat.uniforms.opacity.value = (0.6 + 0.25 * rhythm.release) * f;
    },
    dispose() { set.dispose(); echo?.dispose(); glowMat.dispose(); inkMat.dispose(); echoMat?.dispose(); auraMat.dispose(); edge.geometry.dispose(); edgeMat.dispose(); },
  };
}
