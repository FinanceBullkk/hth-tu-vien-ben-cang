import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { swordGeometry } from './vfx/sword-geometry.js';
import { buildHongLienThrone } from './vfx/hong-lien-throne.js';

const cache = new Map();
const petal = new THREE.PlaneGeometry(1, 1, 8, 12);
const p = petal.attributes.position, uv = petal.attributes.uv;
for (let i = 0; i < p.count; i++) {
  const t = uv.getY(i), w = Math.sin(t * Math.PI) ** 0.7;
  p.setXYZ(i, (uv.getX(i) - 0.5) * w, t, Math.sin(t * Math.PI) * 0.18 + t * t * 0.22);
}
petal.computeVertexNormals();
const crystal = new THREE.OctahedronGeometry(1);
const sphere = new THREE.SphereGeometry(1, 10, 6);

function build(effect, stage) {
  const pieces = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const add = (geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, order = 'XYZ') => {
    rotation.setFromEuler(new THREE.Euler(rx, ry, rz, order));
    matrix.compose(new THREE.Vector3(x, y, z), rotation, new THREE.Vector3(sx, sy, sz));
    const transformed = geo.clone().applyMatrix4(matrix);
    const copy = transformed.index ? transformed.toNonIndexed() : transformed;
    if (copy !== transformed) transformed.dispose();
    copy.deleteAttribute('uv');
    copy.deleteAttribute('part');
    pieces.push(copy);
  };
  const stem = (points, radius = 0.025) => {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))), 40, radius, 5, false);
    add(geo, 0, 0, 0, 1, 1, 1); geo.dispose();
  };
  const bloom = (x, y, z, scale, n = 5) => {
    for (let i = 0; i < n; i++) add(petal, x, y, z, scale * 0.7, scale, scale, -0.3, 0, i * Math.PI * 2 / n);
    add(sphere, x, y, z + 0.03, scale * 0.13, scale * 0.13, scale * 0.13);
  };
  const wings = (dark) => {
    for (const side of [-1, 1]) for (let i = 0; i < (stage === 2 ? 8 : 5); i++) {
      const f = i / (stage === 2 ? 8 : 5);
      add(dark ? crystal : petal, side * (0.22 + f * 0.55), 0.85 + f * 0.25, -0.45,
        dark ? 0.25 : 0.38, (stage === 2 ? 1.55 : 1.05) * (1 - f * 0.35), 0.8,
        -0.28, side * 0.25, -side * (0.4 + f * 1.0));
    }
  };
  // Kiếm Vũ (12): tòa kiếm — kiếm cắm quanh người ngồi, mũi hướng trời, ngả ra ngoài như
  // cánh sen; tầng cuối thêm quạt kiếm sau lưng. Order YXZ: ngả trước rồi xoay quanh trục đứng.
  const plant = (n, r, len, lean, offset = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i + offset) * Math.PI * 2 / n;
      add(swordGeometry(), Math.sin(a) * r, 0.08, Math.cos(a) * r, len, len, len, lean, a, 0, 'YXZ');
    }
  };
  if (effect === 4) buildHongLienThrone(add, stage);
  else if (effect === 12) {
    if (stage === 0) plant(3, 0.7, 0.45, 0.2, 0.5);
    else if (stage === 1) plant(8, 0.62, 0.75, 0.38);
    else for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.33;
      add(swordGeometry(), Math.sin(a) * 0.32, 0.95 + Math.cos(a) * 0.32, -0.62, 0.78, 0.78, 0.78, 0, 0, -a);
    }
  } else if (stage === 0) {
  // Tier three is a small spirit seed; later tiers introduce a new silhouette.
    if (effect === 1 || effect === 0 || effect === 5) bloom(0, 0.18, -0.42, 0.42, effect === 5 ? 5 : 8);
    else for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      add(crystal, Math.cos(a) * 0.65, 0.5 + i * 0.12, Math.sin(a) * 0.55, 0.08, 0.2, 0.08, 0, 0, -a);
    }
  } else if (effect === 0 || effect === 1) {
    const count = stage === 1 ? 9 : 12;
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count;
      add(petal, 0, 0.95, -0.6 - stage * 0.08, stage === 1 ? 0.45 : 0.5,
        stage === 1 ? 0.85 : 1.4, 0.8, -0.2, 0, a);
    }
  } else if (effect === 2) {
    const side = stage === 1 ? -1 : 1;
    const points = Array.from({ length: 33 }, (_, i) => {
      const t = i / 32, a = t * Math.PI * 1.45;
      return [side * (0.35 + Math.sin(a) * 0.72), 0.2 + t * 1.65, -0.65 + Math.cos(a) * 0.35];
    });
    stem(points, 0.065);
    const head = points.at(-1);
    add(sphere, ...head, 0.14, 0.13, 0.22, -0.3);
    add(sphere, head[0], head[1] - 0.025, head[2] + 0.2, 0.11, 0.065, 0.15);
    for (const horn of [-1, 1]) {
      const x = head[0] + horn * 0.09, y = head[1], z = head[2];
      stem([[x, y + 0.08, z], [x + horn * 0.06, y + 0.26, z - 0.08], [x + horn * 0.14, y + 0.34, z - 0.12]], 0.015);
      stem([[x, y + 0.05, z + 0.18], [x + horn * 0.18, y - 0.04, z + 0.35], [x + horn * 0.27, y + 0.07, z + 0.4]], 0.008);
      add(crystal, x, y + 0.03, z + 0.12, 0.035, 0.025, 0.04);
    }
    for (let i = 3; i < 29; i += 3) add(petal, ...points[i], 0.16, 0.28, 0.3, -0.5, 0, side * -0.7);
  } else if (effect === 3) {
    const points = [];
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      const x = Math.cos(a) * (stage === 1 ? 0.7 : 1.15), y = 1.05 + Math.sin(a) * 0.8;
      points.push([x, y, -0.7]);
      add(crystal, x, y, -0.7, 0.08, 0.14, 0.06, 0, 0, a);
    }
    stem([...points, points[0]], 0.008);
    if (stage === 2) for (let i = 0; i < 5; i++) add(petal, (i - 2) * 0.3, 1.7, -0.8, 0.08, 0.65, 0.2, 0, 0, (i - 2) * -0.2);
  } else if (effect === 8) {
    wings(true);
    if (stage === 2) for (let i = 0; i < 3; i++) add(petal, (i - 1) * 0.12, 1.65, -0.5, 0.15, 0.55 - Math.abs(i - 1) * 0.15, 0.4, 0, 0, (i - 1) * -0.3);
  } else if (effect === 5) {
    const side = stage === 1 ? -1 : 1;
    stem([[side * 0.45, 0.1, -0.65], [side * 0.85, 0.75, -0.65], [side * 0.65, 1.5, -0.65], [side * 0.25, 1.85, -0.65]], 0.018);
    for (let i = 0; i < 5; i++) bloom(side * (0.35 + Math.sin(i * 1.3) * 0.4), 0.55 + i * 0.3, -0.6, 0.18 + i % 2 * 0.07);
  } else if (effect === 6) {
    for (let i = 0; i < 3; i++) {
      const side = stage === 1 ? -1 : 1, x = side * (0.45 + i * 0.25), height = 1.2 + i * 0.3;
      stem([[x, 0.1, -0.65], [x, height * 0.5, -0.68], [x - side * 0.15, height, -0.65]], 0.018);
      for (let j = 0; j < 4; j++) add(petal, x, 0.5 + j * 0.28, -0.65, 0.14, 0.45, 0.4, 0.2, 0, (j % 2 ? -1 : 1) * 1.0);
    }
  } else if (effect === 7) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1, Math.PI * 0.25, Math.PI * 1.75, false);
    shape.bezierCurveTo(-0.4, -0.55, -0.4, 0.55, Math.SQRT1_2, Math.SQRT1_2);
    const moon = new THREE.ShapeGeometry(shape, 40);
    if (stage === 1) add(moon, 0, 1.5, -0.7, 0.65, 0.65, 1, 0, 0, -0.25);
    else for (let i = 0; i < 5; i++) add(crystal, (i - 2) * 0.38, 1.85 - Math.abs(i - 2) * 0.25, -0.6, 0.06, 0.17, 0.04, 0, 0, (i - 2) * 0.3);
    moon.dispose();
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach(g => g.dispose());
  return geometry;
}

export function createManifestation(effect, tint, accent, lowQuality = false) {
  const theme = Number.isInteger(effect) && ((effect >= 0 && effect <= 8) || effect === 12) ? effect : 0;
  if (!cache.has(theme)) cache.set(theme, [0, 1, 2].map(stage => {
    const geometry = build(theme, stage);
    geometry.userData.outline = new THREE.EdgesGeometry(geometry, 35);
    return geometry;
  }));
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: tint.clone() }, accent: { value: accent.clone() }, opacity: { value: 0.6 } },
    vertexShader: `varying vec3 n, eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); eye=normalize(-p.xyz); gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint,accent; uniform float opacity; varying vec3 n,eye;
      void main(){float edge=pow(1.0-abs(dot(normalize(n),normalize(eye))),1.5);
      gl_FragColor=vec4(mix(tint,accent,edge),opacity*(0.32+edge*0.62));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const ink = new THREE.LineBasicMaterial({ color: tint.clone().lerp(accent, 0.4), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const layers = cache.get(theme).map(geometry => {
    const m = new THREE.Mesh(geometry, material);
    if (!lowQuality) m.add(new THREE.LineSegments(geometry.userData.outline, ink));
    group.add(m); return m;
  });
  return { group, layers,
    update(level, sit, time, fading) {
      group.visible = level >= 3 && sit > 0.1 && fading > 0;
      layers.forEach((mesh, i) => {
        // Hồng Liên (4) giữ đài sen tầng 4 dưới đôi cánh tầng 5.
        const replacesCrown = [0, 1, 3, 8].includes(theme);
        mesh.visible = level >= i + 3 && !(i === 1 && level >= 5 && replacesCrown);
        mesh.position.y = i ? Math.sin(time * 0.7 + i) * 0.035 : Math.sin(time) * 0.06;
        mesh.rotation.y = Math.sin(time * 0.35 + i) * (i ? 0.08 : 0.15);
      });
      material.uniforms.opacity.value = (0.65 + Math.sin(time * 0.9) * 0.08) * sit * fading;
      ink.opacity = 0.42 * sit * fading;
    },
    dispose() { group.removeFromParent(); material.dispose(); ink.dispose(); },
  };
}
