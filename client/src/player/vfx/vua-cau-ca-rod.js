import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { softDot } from './aura-rhythm.js';
import { goldFragment, litMaterial } from './vip-aura-shaders.js';

// CẦN CÂU NGƯ VƯƠNG: cần vàng cong vồng từ sau hông phải vắt qua đầu, ngọn chúc xuống trước vai trái như
// đang dính cá lớn; bốn khoen dẫn dây và ống cuộn có tay quay bằng vàng đúc; dây câu là sợi kim quang võng nhẹ;
// cuối dây là cá chép vàng 3D (chung bộ dựng cá) quẫy mình, nhỏ nước. Cần đung đưa quanh gốc theo nhịp cá giật.
// Cá treo lệch hẳn sang trái (x ≈ -0.8) và chỉ đung đưa trước–sau, không che mặt hay thân người.
export const ROD_POINTS = [[0.34, 0.3, -0.4], [0.32, 1.0, -0.52], [0.1, 1.72, -0.45], [-0.4, 2.0, -0.08], [-0.8, 1.86, 0.28]];
export const LINE = { length: 0.72 };
export const HOOKED = { length: 0.55, height: 0.17, width: 0.1 };
const DRIPS = 6, DRIP_LIFE = 0.9, LINE_SEG = 12;

const rodVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Thân cần: vàng đậm/sáng quanh thân, đốt cần mỗi 1/9 chiều dài, vệt sáng chạy từ gốc lên ngọn; glow = vỏ cộng màu.
const rodFragment = `
  uniform vec3 deep, gold, light;
  uniform float time, opacity, glow;
  varying vec2 vUv;
  void main() {
    float run = pow(0.5 + 0.5 * sin(vUv.x * 14.0 - time * 3.0), 8.0);
    float joint = 1.0 - smoothstep(0.0, 0.05, abs(fract(vUv.x * 9.0) - 0.5) - 0.42);
    vec3 c = mix(deep, gold, 0.55 + 0.45 * sin(vUv.y * 6.2831853));
    c = mix(c, light, run * 0.8 + joint * 0.5);
    float a = glow > 0.5 ? 0.18 + 0.55 * run : 0.97;
    if (a * opacity < 0.003) discard;
    gl_FragColor = vec4(c, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Ống thuôn dọc đường cong: bán kính radius(u) (gốc to, ngọn nhỏ). */
function taperedTube(curve, segs, radial, radius) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = geo.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPointAt(u, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j, r = radius(u);
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r);
    }
  }
  return geo;
}

/** Khoen dẫn dây (xuyên theo thân cần) và ống cuộn có tay quay, gộp một khối vàng. */
function hardware(curve) {
  const parts = [], t = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
  for (const u of [0.35, 0.55, 0.72, 0.88]) {
    curve.getPointAt(u, p); curve.getTangentAt(u, t);
    q.setFromUnitVectors(Z, t);
    parts.push(new THREE.TorusGeometry(0.03 - u * 0.012, 0.006, 6, 14).applyQuaternion(q).translate(p.x, p.y, p.z));
    parts.push(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4).translate(0, -0.02, 0).applyQuaternion(q).translate(p.x, p.y, p.z));
  }
  curve.getPointAt(0.1, p);
  parts.push(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 20).rotateZ(Math.PI / 2).translate(p.x + 0.07, p.y, p.z));
  parts.push(new THREE.TorusGeometry(0.075, 0.012, 6, 20).rotateY(Math.PI / 2).translate(p.x + 0.045, p.y, p.z));
  parts.push(new THREE.BoxGeometry(0.012, 0.1, 0.014).translate(p.x + 0.1, p.y + 0.04, p.z));
  parts.push(new THREE.SphereGeometry(0.018, 10, 8).translate(p.x + 0.11, p.y + 0.09, p.z));
  const flat = parts.map(g => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(flat);
  parts.forEach(g => g.dispose()); flat.forEach(g => g.dispose());
  return geo;
}

export function createFishingRod(parent, bodies, index, colors, lowQuality) {
  const base = new THREE.Vector3(...ROD_POINTS[0]);
  const local = ROD_POINTS.map(pt => new THREE.Vector3(...pt).sub(base));
  const curve = new THREE.CatmullRomCurve3(local, false, 'centripetal'), tipLocal = local[local.length - 1].clone();
  const rod = new THREE.Group(); rod.name = 'vua-cau-ca-rod'; rod.position.copy(base); parent.add(rod);
  const owned = [], mats = [];
  const shell = (glow, scale) => {
    const geo = taperedTube(curve, lowQuality ? 40 : 72, lowQuality ? 6 : 10, u => scale * (0.03 - 0.021 * u)); owned.push(geo);
    const material = new THREE.ShaderMaterial({
      uniforms: { deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, time: { value: 0 }, opacity: { value: 1 }, glow: { value: glow } },
      vertexShader: rodVertex, fragmentShader: rodFragment, transparent: true, depthWrite: false,
      side: glow ? THREE.BackSide : THREE.FrontSide, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mats.push(material);
    const mesh = new THREE.Mesh(geo, material); mesh.name = glow ? 'vua-cau-ca-rod-glow' : 'vua-cau-ca-rod-body'; mesh.renderOrder = 6 + glow;
    rod.add(mesh);
  };
  shell(0, 1);
  if (!lowQuality) shell(1, 2.4);
  const hwGeo = hardware(curve); owned.push(hwGeo);
  const hwMat = litMaterial(goldFragment, { deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 } });
  mats.push(hwMat);
  const hw = new THREE.Mesh(hwGeo, hwMat); hw.name = 'vua-cau-ca-reel'; hw.renderOrder = 6; rod.add(hw);
  // Dây câu: sợi kim quang võng nhẹ từ ngọn cần tới miệng cá.
  const line = createRibbonStrips(1, LINE_SEG);
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.light }, core: { value: colors.light }, gold: { value: colors.aqua }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }); mats.push(lineMat);
  const lineMesh = new THREE.Mesh(line.geometry, lineMat); lineMesh.name = 'vua-cau-ca-line'; lineMesh.frustumCulled = false; lineMesh.renderOrder = 7;
  parent.add(lineMesh); owned.push(line.geometry);
  const drips = billboardLayer(parent, 'vua-cau-ca-drips', softDot(), DRIPS, colors.aqua.clone(), THREE.AdditiveBlending);

  const tip = new THREE.Vector3(), end = new THREE.Vector3(), p = new THREE.Vector3(), side = new THREE.Vector3(1, 0, 0);
  const hang = new THREE.Vector3(), up = new THREE.Vector3(), lat = new THREE.Vector3(), mid = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      // Cá giật: cần chúc xuống rồi bật lại, nhịp không đều nhờ cộng hai sóng.
      const tug = 0.5 + 0.5 * Math.sin(time * 2.3) * Math.sin(time * 0.9 + 1.1);
      rod.rotation.set(0.06 * tug, 0.03 * Math.sin(time * 0.6), -0.04 * tug);
      tip.copy(tipLocal).applyEuler(rod.rotation).add(rod.position);
      for (const mat of mats) {
        mat.uniforms.time.value = time;
        mat.uniforms.opacity.value = (mat.uniforms.glow?.value ? 0.7 + 0.3 * rhythm.pulse : 1) * f;
      }
      hwMat.uniforms.pulse.value = 0.3 * rhythm.pulse;
      // Dây buông như con lắc đung đưa trước–sau (lệch ngang rất ít) để cá không bao giờ lắc vào người.
      const swing = 0.22 * Math.sin(time * 1.3), sway = 0.05 * Math.sin(time * 0.9), len = LINE.length + 0.04 * tug;
      end.set(tip.x + sway * len, tip.y - Math.cos(swing) * len, tip.z + Math.sin(swing) * len);
      for (let j = 0; j <= LINE_SEG; j++) {
        const t = j / LINE_SEG;
        p.lerpVectors(tip, end, t); p.x += 0.04 * Math.sin(Math.PI * t) * (1 - tug);
        line.write(0, j, p, side, 0.006);
      }
      line.commit();
      // Cá chép mắc câu: đầu ở móc, thân rủ xuống, quẫy cong mình và xoay dần quanh dây.
      hang.subVectors(end, tip).normalize();
      const twist = time * 0.7 + 0.8 * Math.sin(time * 2.1);
      up.set(Math.cos(twist), 0, Math.sin(twist));
      lat.crossVectors(hang, up).normalize();
      bodies.pose(index, (u, out) => out.copy(end).addScaledVector(hang, u * HOOKED.length)
        .addScaledVector(lat, Math.sin(u * 3 - time * 5) * 0.07 * u + 0.12 * u * u * Math.sin(time * 1.7)), up, time * 1.6, 2);
      mid.copy(end).addScaledVector(hang, HOOKED.length * 0.45);
      for (let i = 0; i < DRIPS; i++) {
        const u = ((time / DRIP_LIFE + i / DRIPS) % 1 + 1) % 1, jitter = (hash(i + 3) - 0.5) * 0.12;
        drips.set(i, mid.x + jitter, mid.y - 0.15 - 0.9 * u * u, mid.z + (hash(i + 5) - 0.5) * 0.06, 0.035, 0.05, (1 - u) * 0.8 * f);
      }
      drips.commit();
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(o => o.dispose()); drips.dispose(); rod.removeFromParent(); },
  };
}
