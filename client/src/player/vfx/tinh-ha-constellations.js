import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { sstep } from './aura-rhythm.js';
import { shellVertex, shellBillboardVertex, lineFragment, LINE_COUNT } from './tinh-ha-shaders.js';

// Chòm sao trên vỏ thiên cầu trong suốt, đặt theo xích kinh/xích vĩ thật (độ) trong khung bộ B nên
// quay cùng thiên cầu quanh trục cực: Bắc Đẩu và Thất Hiền (Cassiopeia) quanh cực bắc, Sâm Tú
// (Orion) trên xích đạo, Tâm Tú (Scorpius) phía nam, Chức Nữ (Lyra) và Ngưu Lang (Aquila).
// Mỗi nhịp thở nét nối sáng dần lần lượt từng đoạn như tay người vẽ tinh đồ, sao được nối tới thì
// bừng sáng nhẹ; cuối nhịp nét tan rồi vẽ lại. Nét nằm trên mặt cầu (cung lớn), chừa mặt.
const R = 1.36, SEG = 10, DRAW_START = 0.16, DRAW_STEP = 0.017, DRAW_LEN = 0.05;
const CONSTELLATIONS = [
  { stars: [[165.9, 61.8], [165.5, 56.4], [178.5, 53.7], [183.9, 57.0], [193.5, 56.0], [201.0, 54.9], [206.9, 49.3]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  { stars: [[88.8, 7.4], [81.3, 6.3], [83.0, -0.3], [84.1, -1.2], [85.2, -1.9], [86.9, -9.7], [78.6, -8.2]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 5], [2, 6]] },
  { stars: [[241.4, -19.8], [240.1, -22.6], [245.3, -25.6], [247.4, -26.4], [249.0, -28.2], [252.5, -34.3], [253.0, -38.0]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
  { stars: [[279.2, 38.8], [281.2, 37.6], [283.6, 36.9], [284.7, 32.7], [282.5, 33.4]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]] },
  { stars: [[297.7, 8.9], [296.6, 10.6], [298.8, 6.4]], lines: [[1, 0], [0, 2]] },
  { stars: [[28.6, 63.7], [21.5, 60.2], [14.2, 60.7], [10.1, 56.5], [2.3, 59.1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
];
const STARS = CONSTELLATIONS.flatMap(c => c.stars);
const LINES = [];
CONSTELLATIONS.reduce((offset, c) => { c.lines.forEach(([i, j]) => LINES.push([offset + i, offset + j])); return offset + c.stars.length; }, 0);
if (LINES.length > LINE_COUNT) throw new Error('Tinh Hà: quá nhiều nét chòm sao cho shader');
/** Hướng đơn vị của sao (xích kinh, xích vĩ theo độ) trong khung thiên cầu, cực bắc = +Y. */
const dirs = STARS.map(([ra, dec]) => {
  const a = ra * Math.PI / 180, d = dec * Math.PI / 180;
  return new THREE.Vector3(Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a));
});

/** Độ mọc (0..1) của nét k theo pha nhịp: nét sau bắt đầu khi nét trước gần xong. */
export const lineLit = (phase, k) => sstep(DRAW_START + k * DRAW_STEP, DRAW_START + k * DRAW_STEP + DRAW_LEN, phase);
export const CONSTELLATION_LINES = LINES.length;

/** frame: Matrix4 khung bộ B của thiên cầu (cập nhật trước mỗi khung); head: toạ độ đầu. */
export function createConstellations(parent, colors, lowQuality, frame, head) {
  const strips = createRibbonStrips(LINES.length, SEG);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.gold }, head: { value: head },
      opacity: { value: 1 }, glow: { value: 0 }, time: { value: 0 }, lit: { value: new Array(LINE_COUNT).fill(0) } },
    vertexShader: shellVertex, fragmentShader: lineFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(strips.geometry, material);
  mesh.name = 'tinh-ha-constellation-lines'; mesh.frustumCulled = false; mesh.renderOrder = 7; parent.add(mesh);
  // Lớp mực chàm (normal blending) dùng chung geometry và mảng lit, để nét đọc được trên nền sáng.
  const ink = lowQuality ? null : new THREE.ShaderMaterial({
    uniforms: { ...material.uniforms, edge: { value: colors.steel }, core: { value: colors.steel }, gold: { value: colors.steel },
      opacity: { value: 0.5 } },
    vertexShader: shellVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  if (ink) { const shade = new THREE.Mesh(strips.geometry, ink); shade.renderOrder = 6; parent.add(shade); }
  const stars = billboardLayer(parent, 'tinh-ha-constellation-stars', kiemVuStar(), STARS.length,
    colors.core.clone().lerp(colors.gold, 0.25), THREE.AdditiveBlending, { vertexShader: shellBillboardVertex, uniforms: { head: { value: head } } });
  const width = lowQuality ? 0.04 : 0.034, starLit = new Array(STARS.length);
  const pos = STARS.map(() => new THREE.Vector3());
  const u = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Vector3(), side = new THREE.Vector3(), nm = new THREE.Matrix3();

  return {
    update(time, rhythm, f) {
      dirs.forEach((d, i) => pos[i].copy(d).multiplyScalar(R).applyMatrix4(frame));
      nm.setFromMatrix4(frame);
      LINES.forEach(([i, j], k) => {
        for (let s = 0; s <= SEG; s++) {
          // Cung lớn giữa hai sao trên mặt cầu (nội suy hướng rồi chuẩn hoá); bề ngang tiếp xúc mặt cầu.
          u.lerpVectors(dirs[i], dirs[j], s / SEG).normalize(); q.lerpVectors(dirs[i], dirs[j], s / SEG + 0.02).normalize();
          side.subVectors(q, u).cross(u).applyMatrix3(nm).normalize();
          strips.write(k, s, p.copy(u).multiplyScalar(R).applyMatrix4(frame), side, width);
        }
      });
      strips.commit();
      const glow = 1 - sstep(0.8, 0.96, rhythm.phase), lit = material.uniforms.lit.value;
      starLit.fill(0);
      LINES.forEach(([i, j], k) => {
        lit[k] = lineLit(rhythm.phase, k);
        starLit[i] = Math.max(starLit[i], sstep(0, 0.1, lit[k])); starLit[j] = Math.max(starLit[j], sstep(0.8, 1, lit[k]));
      });
      pos.forEach((v, i) => {
        const tw = 0.5 + 0.5 * Math.sin(time * (0.8 + (i % 5) * 0.15) + i * 1.9);
        const s = 0.17 + 0.04 * tw + 0.1 * starLit[i] * glow;
        stars.set(i, v.x, v.y, v.z, s, s, 0.5 + 0.2 * tw + 0.3 * starLit[i] * glow, 0.02 * Math.sin(time * 0.2 + i));
      });
      stars.commit(); stars.material.uniforms.opacity.value = f;
      material.uniforms.glow.value = glow; material.uniforms.time.value = time;
      material.uniforms.opacity.value = 0.95 * f;
      if (ink) ink.uniforms.opacity.value = 0.5 * f;
    },
    dispose() { strips.geometry.dispose(); material.dispose(); ink?.dispose(); stars.dispose(); },
  };
}
