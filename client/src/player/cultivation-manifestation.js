import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { swordGeometry } from './vfx/sword-geometry.js';
import { dropGeometry } from './vfx/drop-geometry.js';
import { buildDaoHoaThrone } from './vfx/dao-hoa-meditation-throne.js';
import { buildHongLienThrone } from './vfx/hong-lien-throne.js';
import { buildHuyenDaThrone } from './vfx/huyen-da-meditation-throne.js';

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

// Ngọn sóng cuộn (Lưu Ly): tấm mỏng dâng lên rồi cuộn xoáy về phía +z, chân rộng, ngọn thuôn.
// Đường giữa là xoắn ốc bán kính co dần cộng độ dâng theo chiều dài.
function waveCrest() {
  const geo = new THREE.PlaneGeometry(1, 1, 4, 28), pos = geo.attributes.position, uvs = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const t = uvs.getY(i), across = uvs.getX(i) - 0.5;
    const phi = t * Math.PI * 1.3, R = 0.5 - 0.3 * t;
    const w = Math.pow(1 - t, 0.7) * Math.min(1, t * 6 + 0.35);
    pos.setXYZ(i, across * w, R * Math.sin(phi) + 0.62 * t, R * (1 - Math.cos(phi)) * 0.8);
  }
  geo.computeVertexNormals();
  return geo;
}

function build(effect, stage) {
  const pieces = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const add = (geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, order = 'XYZ') => {
    rotation.setFromEuler(new THREE.Euler(rx, ry, rz, order));
    matrix.compose(new THREE.Vector3(x, y, z), rotation, new THREE.Vector3(sx, sy, sz));
    const transformed = geo.clone().applyMatrix4(matrix);
    const copy = transformed.index ? transformed.toNonIndexed() : transformed;
    if (copy !== transformed) transformed.dispose();
    for (const name of ['uv', 'part', 'across', 'kind']) copy.deleteAttribute(name);
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
  // Kiếm Vũ (12): tòa kiếm — kiếm cắm quanh người ngồi, mũi hướng trời, ngả ra ngoài như
  // cánh sen; tầng cuối thêm quạt kiếm sau lưng. Order YXZ: ngả trước rồi xoay quanh trục đứng.
  const plant = (n, r, len, lean, offset = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i + offset) * Math.PI * 2 / n;
      add(swordGeometry(), Math.sin(a) * r, 0.08, Math.cos(a) * r, len, len, len, lean, a, 0, 'YXZ');
    }
  };
  // Tinh Hà (3): tầng 3 ba sao bốn cánh quanh vai; tầng 4 Bắc Đẩu thất tinh sau lưng nối nét;
  // tầng 5 thiên cầu thu nhỏ — ba cung kinh vĩ hở đầu BAO QUANH người ngồi, mặt phẳng nghiêng sao
  // cho nửa trước thấp (ngang đùi) và nửa sau cao, kèm vương miện năm sao. Chừa trống khuôn mặt.
  const star4 = (x, y, z, s, rz = 0) => {
    add(crystal, x, y, z, s * 0.28, s, s * 0.18, 0, 0, rz);
    add(crystal, x, y, z, s * 0.28, s * 0.62, s * 0.18, 0, 0, rz + Math.PI / 2);
  };
  // Cung kinh vĩ hở đầu, cứ mỗi đoạn lại có một hạt chia độ như vòng hồn thiên nghi.
  const orbit = (r, rx, ry, a0, a1, cy = 0.55, cz = 0) => {
    const euler = new THREE.Euler(rx, ry, 0, 'YXZ');
    const points = Array.from({ length: 25 }, (_, i) => {
      const a = a0 + (a1 - a0) * i / 24, v = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0).applyEuler(euler);
      return [v.x, cy + v.y, cz + v.z];
    });
    stem(points, 0.012);
    for (let i = 3; i < 24; i += 4) add(sphere, ...points[i], 0.03, 0.03, 0.03);
  };
  const tinhHa = level => {
    if (level === 0) {
      star4(-0.62, 0.78, -0.3, 0.2, 0.2); star4(0.64, 0.86, -0.32, 0.18, -0.3); star4(0, 1.5, -0.55, 0.24);
    } else if (level === 1) {
      const dipper = [[-0.78, 1.38], [-0.85, 1.06], [-0.55, 0.98], [-0.46, 1.3], [-0.16, 1.45], [0.16, 1.52], [0.5, 1.7]];
      dipper.forEach(([x, y], i) => star4(x, y, -0.7, i === 0 || i === 6 ? 0.2 : 0.15, i * 0.3));
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]) {
        stem([[...dipper[i], -0.7], [...dipper[j], -0.7]], 0.007);
      }
    } else {
      // rx = -(π/2 - nghiêng): mặt vòng gần nằm ngang, nửa trước (z > 0) thấp hơn nửa sau.
      orbit(1.05, -Math.PI / 2, 0, 0.4, Math.PI * 1.8, 0.4);
      orbit(0.95, -(Math.PI / 2 - 0.4), 0.6, Math.PI * 0.2, Math.PI * 1.75);
      orbit(0.95, -(Math.PI / 2 - 0.4), -0.6, Math.PI * 1.2, Math.PI * 2.75);
      for (let i = 0; i < 5; i++) star4((i - 2) * 0.24, 2.02 - Math.abs(i - 2) * 0.09, -0.55, i === 2 ? 0.2 : 0.13);
    }
  };
  if (effect === 12) {
    if (stage === 0) plant(3, 0.7, 0.45, 0.2, 0.5);
    else if (stage === 1) plant(8, 0.62, 0.75, 0.38);
    else for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.33;
      add(swordGeometry(), Math.sin(a) * 0.32, 0.95 + Math.cos(a) * 0.32, -0.62, 0.78, 0.78, 0.78, 0, 0, -a);
    }
  } else if (effect === 3) {
    tinhHa(stage);
  } else if (effect === 4) {
    buildHongLienThrone(add, stage);
  } else if (effect === 5) {
    // Đào Hoa: tòa cành đào và nguyệt môn riêng, không mượn đoá sen.
    buildDaoHoaThrone(stage, add);
  } else if (effect === 8) {
    // Huyền Dạ: tòa nhật thực đen và lông quạ riêng, không mượn đôi cánh.
    buildHuyenDaThrone(stage, add);
  } else if (stage === 0) {
  // Tier three is a small spirit seed; later tiers introduce a new silhouette.
    if (effect === 1 || effect === 0) bloom(0, 0.18, -0.42, 0.42, 8);
    else if (effect === 2) for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      add(dropGeometry(), Math.cos(a) * 0.62, 0.45 + i * 0.12, Math.sin(a) * 0.52, 0.32, 0.32, 0.32);
    } else for (let i = 0; i < 3; i++) {
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
    // Lưu Ly (2): tòa sóng lưu ly — tầng 4 tám ngọn sóng cuộn theo một chiều quanh người ngồi như
    // xoáy nước; tầng 5 quạt bảy ngọn sóng sau lưng cuộn ra hai bên, đầu ngọn đọng giọt lưu ly.
    // Ngọn sóng xoay để mặt cắt xoắn ốc hướng về người nhìn — thấy rõ nét cuộn thay vì tấm phẳng.
    const crest = waveCrest();
    if (stage === 1) for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * Math.PI * 2 / 8;
      add(crest, Math.sin(a) * 0.7, 0.04, Math.cos(a) * 0.7, 0.26, 0.55, 0.5, -0.1, a + Math.PI / 2, 0, 'YXZ');
    } else for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.36, s = 1 - Math.abs(i - 3) * 0.1, side = i < 3 || (i === 3) ? -1 : 1;
      add(crest, Math.sin(a) * 0.36, 0.55 + Math.cos(a) * 0.36, -0.66, 0.3 * s, 1.2 * s, 0.75 * s, 0, side * Math.PI / 2, -a, 'ZYX');
      add(dropGeometry(), Math.sin(a) * (0.36 + 1.05 * s), 0.6 + Math.cos(a) * (0.36 + 1.05 * s), -0.62, 0.14, 0.14, 0.14, 0, 0, -a);
    }
    crest.dispose();
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
        // Tinh Hà giữ Bắc Đẩu ở tầng 5 (hồn thiên nghi ôm lấy chòm sao).
        const replacesCrown = [0, 1, 4, 8].includes(theme);
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
