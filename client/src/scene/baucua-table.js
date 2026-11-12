// Bàn bầu cua ở góc chợ: bàn tròn mặt sáu ô, cái bát úp che ba viên xúc xắc.
// Đặt cược: bát úp kín. Xóc: bát rung. Mở: bát lật sang bên, ba viên hiện mặt kết quả và ô trúng sáng vàng.
// Cảnh chỉ vẽ theo trạng thái server gửi; không có luật chơi nào ở đây.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';
import { BAUCUA_ZONE, floorHeight } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { createTableTop, diceFaceTexture, drawTableTop } from './baucua-textures.js';

const TOP_Y = 0.8; // Mặt bàn cao hơn nền chừng này.
const DICE_SIZE = 0.15;
const BOWL_RADIUS = 0.34;
const LABEL_SHOW_DISTANCE = 22;
// Pháp tuyến từng mặt của BoxGeometry, theo thứ tự vật liệu: +x, -x, +y, -y, +z, -z. Mặt i mang biểu tượng i.
const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const DICE_SPOTS = [[0.17, 0.0], [-0.09, 0.15], [-0.09, -0.15]];

const matte = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function mesh(geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class BauCuaTable {
  constructor(scene) {
    const { x, z } = BAUCUA_ZONE;
    this.y = floorHeight(x, z);
    this.group = new THREE.Group();
    this.group.position.set(x, this.y, z);
    this.#buildTable();
    this.#buildDice();
    this.#buildBowl();
    this.#buildLabel();
    scene.add(this.group);

    this.phase = 'idle';
    this.winnersKey = '';
    this.open = 0; // 0 bát úp kín, 1 bát đã lật mở.
    this.openTarget = 0;
    this.shakeT = 0;
    this.labelClock = 0;
    this.state = null;
    this.ready = false;
  }

  #buildTable() {
    const wood = matte(0x6a3f22);
    const dark = matte(0x3f2414);
    const top = mesh(new THREE.CylinderGeometry(BAUCUA_ZONE.tableRadius - 0.03, BAUCUA_ZONE.tableRadius - 0.03, 0.07, 28), wood, 0, TOP_Y - 0.035, 0);
    const rim = mesh(new THREE.TorusGeometry(BAUCUA_ZONE.tableRadius - 0.03, 0.035, 6, 28), dark, 0, TOP_Y, 0);
    rim.rotation.x = Math.PI / 2;
    const stem = mesh(new THREE.CylinderGeometry(0.13, 0.2, TOP_Y - 0.08, 10), dark, 0, (TOP_Y - 0.08) / 2, 0);
    const foot = mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 16), dark, 0, 0.03, 0);
    this.group.add(top, rim, stem, foot);

    this.top = createTableTop();
    const felt = new THREE.Mesh(
      new THREE.CircleGeometry(BAUCUA_ZONE.tableRadius - 0.07, 40),
      new THREE.MeshLambertMaterial({ map: this.top.texture }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = TOP_Y + 0.004;
    felt.receiveShadow = true;
    this.group.add(felt);
  }

  #buildDice() {
    const faces = BAUCUA_SYMBOLS.map((_, i) => new THREE.MeshLambertMaterial({ map: diceFaceTexture(i) }));
    const geometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE);
    this.dice = DICE_SPOTS.map(([dx, dz]) => {
      const die = mesh(geometry, faces, dx, TOP_Y + DICE_SIZE / 2 + 0.006, dz);
      die.visible = false;
      this.group.add(die);
      return die;
    });
  }

  #buildBowl() {
    this.bowl = new THREE.Group();
    const shell = mesh(
      new THREE.SphereGeometry(BOWL_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xf1ead9, side: THREE.DoubleSide, flatShading: true }),
      0, 0, 0,
    );
    const rim = mesh(new THREE.TorusGeometry(BOWL_RADIUS, 0.014, 6, 24), matte(0xc89b3c), 0, 0.005, 0);
    rim.rotation.x = Math.PI / 2;
    const knob = mesh(new THREE.SphereGeometry(0.045, 8, 6), matte(0xa8432a), 0, BOWL_RADIUS + 0.01, 0);
    this.bowl.add(shell, rim, knob);
    this.bowl.position.y = TOP_Y + 0.008;
    this.group.add(this.bowl);
  }

  #buildLabel() {
    this.labelTitle = h('b', {}, 'Bầu cua');
    this.labelSub = h('small', {}, '');
    this.label = new CSS2DObject(h('div', { class: 'baucua-label' }, this.labelTitle, this.labelSub));
    this.label.position.set(0, TOP_Y + 1.05, 0);
    this.group.add(this.label);
  }

  /** Đặt ba viên về đúng mặt kết quả, mỗi viên xoay ngang một góc riêng cho tự nhiên. */
  #showDice(faces) {
    const q = new THREE.Quaternion();
    this.dice.forEach((die, i) => {
      q.setFromUnitVectors(FACE_NORMALS[faces[i]], UP);
      die.quaternion.copy(q).premultiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Y, 0.9 + i * 2.1 + faces[i]));
    });
  }

  #highlight(winners) {
    const key = [...winners].sort().join(',');
    if (key === this.winnersKey) return;
    this.winnersKey = key;
    drawTableTop(this.top.canvas, winners);
    this.top.texture.needsUpdate = true;
  }

  /** Nhận trạng thái bàn từ server. Lần đầu (vào phòng giữa ván) vào thẳng tư thế, không chạy hoạt ảnh. */
  setState(state) {
    this.state = state;
    this.phase = state.phase;
    const showResult = Boolean(state.dice) && (state.phase === 'result' || state.phase === 'idle');
    this.openTarget = showResult ? 1 : 0;
    if (showResult) this.#showDice(state.dice);
    this.#highlight(showResult ? new Set(state.dice) : new Set());
    if (!this.ready) {
      this.ready = true;
      this.open = this.openTarget;
    }
    this.labelClock = 0;
  }

  #labelText(now) {
    const s = this.state;
    if (!s || s.phase === 'idle') return s?.dice ? this.#diceText(s.dice) : 'bàn đang nghỉ';
    if (s.phase === 'betting') return `cược ${Math.max(0, Math.ceil((s.endsAt - now) / 1000))}s · ${s.bettors} người`;
    if (s.phase === 'rolling') return 'đang xóc…';
    return this.#diceText(s.dice);
  }

  #diceText(dice) {
    return dice.map((d) => BAUCUA_SYMBOLS[d].icon).join(' ');
  }

  /** nowMs: giờ server (net.now()) để đếm ngược khớp với endsAt. */
  update(dt, camera, nowMs) {
    if (this.phase === 'rolling') this.shakeT += dt;
    else this.shakeT = 0;

    this.open += (this.openTarget - this.open) * (1 - Math.exp(-dt * 6));
    const o = this.open;
    const shaking = this.phase === 'rolling' && o < 0.5;
    const t = this.shakeT;
    // Bát úp ở giữa; mở thì nhấc lên và trượt sang bên cho lộ xúc xắc.
    this.bowl.position.set(
      o * 0.62 + (shaking ? Math.sin(t * 38) * 0.05 : 0),
      TOP_Y + 0.008 + Math.sin(Math.min(1, o) * Math.PI) * 0.3 + o * 0.12 + (shaking ? Math.abs(Math.sin(t * 19)) * 0.07 : 0),
      o * 0.2 + (shaking ? Math.cos(t * 31) * 0.05 : 0),
    );
    this.bowl.rotation.z = -o * 0.55;
    const showDice = o > 0.15 && this.state?.dice;
    for (const die of this.dice) die.visible = Boolean(showDice);

    this.labelClock -= dt;
    if (this.labelClock <= 0) {
      this.labelClock = 0.25;
      this.labelSub.textContent = this.#labelText(nowMs);
    }
    this.label.visible = camera.position.distanceTo(this.group.position) < LABEL_SHOW_DISTANCE;
  }
}
