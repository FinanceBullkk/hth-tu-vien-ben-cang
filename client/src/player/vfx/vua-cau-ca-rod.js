import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { FISH_ATLAS, FISH_CELLS, fishAtlas } from './vua-cau-ca-textures.js';

// Bóng dáng riêng của Vua câu cá: CẦN CÂU VÀNG cong vồng từ sau hông phải vắt qua đầu, ngọn cần
// chúc xuống phía trước bên trái như đang dính cá lớn; dây câu buông thẳng, cuối dây là con cá
// chép vàng to quẫy mình, nhỏ nước. Cần đung đưa nhẹ quanh gốc theo nhịp cá giật; ánh sáng chạy
// dọc thân cần. Cá treo lệch hẳn sang trái (x ≈ -0.8) và chỉ đung đưa trước–sau, không che mặt hay thân người.
export const ROD_POINTS = [[0.34, 0.3, -0.4], [0.32, 1.0, -0.52], [0.1, 1.72, -0.45], [-0.4, 2.0, -0.08], [-0.8, 1.86, 0.28]];
export const LINE = { length: 0.72 };
const TROPHY = new THREE.Vector3(0.6, 0.3, 1), DRIPS = 6, DRIP_LIFE = 0.9;

const rodVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Thân cần: vàng đậm/vàng sáng theo vòng quanh thân (uv.y), đốt cần mỗi 1/9 chiều dài, vệt sáng chạy
// từ gốc lên ngọn (uv.x). glow = lớp vỏ cộng màu bao ngoài, chỉ sáng ở vệt chạy.
const rodFragment = `
  uniform vec3 deep, gold, light;
  uniform float time, opacity, glow;
  varying vec2 vUv;
  void main() {
    float run = pow(0.5 + 0.5 * sin(vUv.x * 14.0 - time * 3.0), 8.0);
    float joint = 1.0 - smoothstep(0.0, 0.05, abs(fract(vUv.x * 9.0) - 0.5) - 0.42);
    vec3 c = mix(deep, gold, 0.55 + 0.45 * sin(vUv.y * 6.2831853));
    c = mix(c, light, run * 0.8 + joint * 0.5);
    float a = glow > 0.5 ? 0.18 + 0.55 * run : 0.95;
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

export function createFishingRod(parent, colors, lowQuality) {
  const base = new THREE.Vector3(...ROD_POINTS[0]);
  const local = ROD_POINTS.map(pt => new THREE.Vector3(...pt).sub(base));
  const curve = new THREE.CatmullRomCurve3(local, false, 'centripetal'), tipLocal = local[local.length - 1].clone();
  const rod = new THREE.Group(); rod.name = 'vua-cau-ca-rod'; rod.position.copy(base); parent.add(rod);
  const owned = [], mats = [];
  const shell = (glow, scale) => {
    const geo = taperedTube(curve, lowQuality ? 40 : 72, lowQuality ? 5 : 8, u => scale * (0.022 - 0.015 * u)); owned.push(geo);
    const material = new THREE.ShaderMaterial({
      uniforms: { deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light },
        time: { value: 0 }, opacity: { value: 1 }, glow: { value: glow } },
      vertexShader: rodVertex, fragmentShader: rodFragment, transparent: true, depthWrite: false,
      side: glow ? THREE.BackSide : THREE.FrontSide, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mats.push(material);
    const mesh = new THREE.Mesh(geo, material); mesh.name = glow ? 'vua-cau-ca-rod-glow' : 'vua-cau-ca-rod-body'; mesh.renderOrder = 6 + glow;
    rod.add(mesh);
  };
  shell(0, 1);
  if (!lowQuality) shell(1, 2.4);
  // Ống cuộn dây vàng gần gốc cần.
  const reelGeo = new THREE.TorusGeometry(0.06, 0.014, 6, 20); owned.push(reelGeo);
  const reelMat = new THREE.MeshBasicMaterial({ color: colors.gold, transparent: true, depthWrite: false }); mats.push(reelMat);
  const reel = new THREE.Mesh(reelGeo, reelMat); reel.name = 'vua-cau-ca-reel';
  curve.getPointAt(0.12, reel.position); reel.position.x += 0.05; reel.rotation.y = Math.PI / 2; rod.add(reel);
  // Dây câu: ống rất mảnh, mỗi khung đặt lại từ ngọn cần tới miệng cá.
  const lineGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4, 1, true); owned.push(lineGeo);
  const lineMat = new THREE.MeshBasicMaterial({ color: colors.foam, transparent: true, depthWrite: false }); mats.push(lineMat);
  const line = new THREE.Mesh(lineGeo, lineMat); line.name = 'vua-cau-ca-line'; parent.add(line);
  const trophy = atlasPlaneLayer(parent, 'vua-cau-ca-hooked-carp', fishAtlas(), 1, { ...FISH_ATLAS, readableBack: false, renderOrder: 7 });
  const drips = billboardLayer(parent, 'vua-cau-ca-drips', softDot(), DRIPS, colors.aqua.clone(), THREE.AdditiveBlending);

  const tip = new THREE.Vector3(), end = new THREE.Vector3(), mid = new THREE.Vector3(), axis = new THREE.Vector3();
  const side = new THREE.Vector3(), normal = new THREE.Vector3(), center = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), twist = new THREE.Matrix4(), q = new THREE.Quaternion();

  return {
    update(time, rhythm, f) {
      // Cá giật: cần chúc xuống rồi bật lại, nhịp không đều nhờ cộng hai sóng.
      const tug = 0.5 + 0.5 * Math.sin(time * 2.3) * Math.sin(time * 0.9 + 1.1);
      rod.rotation.set(0.06 * tug, 0.03 * Math.sin(time * 0.6), -0.04 * tug);
      tip.copy(tipLocal).applyEuler(rod.rotation).add(rod.position);
      for (const mat of mats) {
        if (mat.uniforms) { mat.uniforms.time.value = time; mat.uniforms.opacity.value = (mat.uniforms.glow.value ? 0.7 + 0.3 * rhythm.pulse : 1) * f; }
        else mat.opacity = (mat === lineMat ? 0.75 : 0.95) * f;
      }
      // Dây buông như con lắc đung đưa trước–sau (lệch ngang rất ít) để cá không bao giờ lắc vào người.
      const swing = 0.22 * Math.sin(time * 1.3), sway = 0.05 * Math.sin(time * 0.9), len = LINE.length + 0.04 * tug;
      end.set(tip.x + sway * len, tip.y - Math.cos(swing) * len, tip.z + Math.sin(swing) * len);
      mid.addVectors(tip, end).multiplyScalar(0.5);
      axis.subVectors(tip, end);
      line.position.copy(mid); line.scale.set(1, axis.length(), 1);
      line.quaternion.copy(q.setFromUnitVectors(Y, axis.normalize()));
      // Cá chép treo đầu lên (miệng ở móc), xoắn mình hai bên và quẫy theo nhịp.
      side.set(1, 0, 0).addScaledVector(axis, -axis.x).normalize();
      normal.crossVectors(axis, side);
      m.makeBasis(axis, side, normal);
      twist.makeRotationX(0.7 * Math.sin(time * 2.1) + 0.2 * Math.sin(time * 5.3));
      m.multiply(twist).scale(TROPHY);
      center.copy(end).addScaledVector(axis, -TROPHY.x * 0.33);
      m.setPosition(center);
      trophy.set(0, m, f, FISH_CELLS.goldCarp);
      trophy.commit();
      // Nước nhỏ giọt từ thân cá.
      for (let i = 0; i < DRIPS; i++) {
        const u = ((time / DRIP_LIFE + i / DRIPS) % 1 + 1) % 1, jitter = (hash(i + 3) - 0.5) * 0.16;
        drips.set(i, center.x + jitter, center.y - 0.12 - 0.9 * u * u, center.z + (hash(i + 5) - 0.5) * 0.06, 0.035, 0.05, (1 - u) * 0.8 * f);
      }
      drips.commit();
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(o => o.dispose()); trophy.dispose(); drips.dispose(); rod.removeFromParent(); },
  };
}
