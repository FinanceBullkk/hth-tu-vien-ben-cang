// Bãi đá cạnh bãi container: dựng dãy đe đá, đống đá thô, bảng gỗ "Bãi đá" và biển tên nổi; nhận lượt đập
// (của mình hoặc người khác) và diễn trên đúng đe. Không giữ luật hay tiền.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { STONE_YARD } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { Batch, flatMaterial, rng, textTexture } from './builders.js';
import { StoneAnvil } from './stone-anvil.js';
import { roughRockGeometry } from './stone-yard-models.js';

const LABEL_SHOW_DISTANCE = 22;
const ACTIVE_DISTANCE = 40; // Xa hơn thì thôi diễn (vẫn dọn nốt mảnh vụn đang bay).
const HEAP_COLORS = ['#7d776e', '#8d867a', '#6c665e', '#958c7e', '#5f5a53'];

/** Đe đá, đống đá thô, xe cút kít và bảng gỗ: một mesh gộp, không đổi theo thời gian. */
function buildProps() {
  const b = new Batch(61);
  const rand = rng(61);
  for (const s of STONE_YARD.spots) {
    b.cyl(0.36, 0.44, 0.5, '#5d5a55', s.x, 0.25, s.z, { seg: 7, ry: rand() * 3 });
    b.box(0.66, 0.08, 0.62, '#46433f', s.x, 0.54, s.z, { ry: (rand() - 0.5) * 0.2 });
    // Vài mảnh vụn rải quanh chân đe.
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const d = 0.55 + rand() * 0.35;
      b.add(roughRockGeometry(0.05 + rand() * 0.05, i + 3), HEAP_COLORS[i % HEAP_COLORS.length], { x: s.x + Math.cos(a) * d, y: 0.03, z: s.z + Math.sin(a) * d * 0.6 });
    }
  }
  const { heap } = STONE_YARD;
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * heap.r * 0.85;
    const r = 0.18 + rand() * 0.24 * (1 - d / heap.r);
    const y = r * 0.6 + (1 - d / heap.r) * 0.45 * rand();
    b.add(roughRockGeometry(r, 20 + i), HEAP_COLORS[i % HEAP_COLORS.length], { x: heap.x + Math.cos(a) * d, y, z: heap.z + Math.sin(a) * d, ry: rand() * 6 });
  }
  // Xe cút kít chở đá cạnh đống đá.
  const cx = heap.x - 0.4;
  const cz = heap.z + 1.35;
  b.box(0.7, 0.26, 0.48, '#6e4b2c', cx, 0.42, cz, { rz: 0.08 });
  b.cyl(0.16, 0.16, 0.06, '#3b3a38', cx + 0.42, 0.16, cz, { rx: Math.PI / 2, seg: 10 });
  for (const dz of [-0.2, 0.2]) b.box(0.6, 0.04, 0.04, '#5a3d24', cx - 0.5, 0.36, cz + dz, { rz: 0.25 });
  for (let i = 0; i < 4; i++) b.add(roughRockGeometry(0.11, 40 + i), HEAP_COLORS[i], { x: cx - 0.15 + i * 0.1, y: 0.58, z: cz + (i % 2 ? 0.08 : -0.08) });
  // Hai cột gỗ đỡ bảng tên, đứng sau dãy đe.
  const first = STONE_YARD.spots[0];
  const last = STONE_YARD.spots.at(-1);
  const boardX = (first.x + last.x) / 2;
  const boardZ = first.z - 1.05;
  for (const dx of [-1.15, 1.15]) b.cyl(0.06, 0.07, 1.9, '#5a3d24', boardX + dx, 0.95, boardZ, { seg: 6 });
  const mesh = b.build(flatMaterial({ side: THREE.FrontSide }));
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.55),
    new THREE.MeshLambertMaterial({ map: textTexture(['BÃI ĐÁ · TÌM NGỌC'], { w: 1024, h: 232, bg: '#4a3322', fg: '#f3dca6', font: 'bold 92px "Segoe UI",Roboto,Arial,sans-serif' }) }),
  );
  board.position.set(boardX, 1.62, boardZ + 0.07);
  return { mesh, board };
}

export class StoneYard {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const { mesh, board } = buildProps();
    this.group.add(mesh, board);
    this.anvils = STONE_YARD.spots.map((spot) => new StoneAnvil(this.group, spot));
    this.labelSub = h('small', {}, 'bấm E để đập đá');
    this.label = new CSS2DObject(h('div', { class: 'casino-label stone-label' }, h('b', {}, 'Đập đá'), this.labelSub));
    this.label.position.set(STONE_YARD.x, 2.35, STONE_YARD.spots[0].z - 1.05);
    scene.add(this.label);
    this.center = new THREE.Vector3(STONE_YARD.x, 1, STONE_YARD.z);
  }

  place(spot, kind, crack = 0) {
    this.anvils[spot]?.place(kind, crack);
  }

  swing(spot) {
    this.anvils[spot]?.swing();
  }

  hit(spot, kind, crack, grade) {
    const anvil = this.anvils[spot];
    if (!anvil) return;
    if (!anvil.rock.visible) anvil.place(kind, crack);
    anvil.hit(crack, grade);
  }

  shatter(spot, kind, gem) {
    this.anvils[spot]?.shatter(kind, gem);
  }

  clear(spot) {
    this.anvils[spot]?.clear();
  }

  /** Người vừa vào: đặt đúng các tảng đang nằm trên đe. */
  applySnapshot(list) {
    for (const anvil of this.anvils) anvil.clear();
    for (const { s, k, c } of list ?? []) this.place(s, k, c);
  }

  update(dt, camera) {
    const dist = camera.position.distanceTo(this.center);
    this.label.visible = dist < LABEL_SHOW_DISTANCE;
    for (const anvil of this.anvils) {
      if (dist < ACTIVE_DISTANCE || anvil.busy) anvil.update(dt);
    }
  }
}
