// Bàn bầu cua ở góc chợ: bàn tròn, tấm bạt 3×2 trải phía khách, đĩa sứ và bát úp phía nhà cái.
// Đặt cược: bát úp kín trên đĩa. Xóc: nhà cái nhấc cả đĩa lên rung. Mở: bát nhấc lên nghiêng về phía khách,
// ba viên lộ mặt và ô trúng trên bạt sáng vàng. Cảnh chỉ vẽ theo trạng thái server gửi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';
import { BAUCUA_ZONE, floorHeight } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { BauCuaDealer } from './baucua-dealer.js';
import { createMat, diceFaceTexture, drawMat } from './baucua-textures.js';

const TOP_Y = 0.8; // Mặt bàn cao hơn nền chừng này.
const DICE_SIZE = 0.16;
const PLATE_RADIUS = 0.34;
const BOWL_RADIUS = 0.3;
const DISH_X = -0.48; // Đĩa ở nửa phía nhà cái (tây).
const MAT = { x: 0.3, along: 1.05, across: 0.7 }; // Bạt ở nửa phía khách (đông).
const LABEL_SHOW_DISTANCE = 22;
// Pháp tuyến từng mặt của BoxGeometry theo thứ tự vật liệu: +x, -x, +y, -y, +z, -z. Mặt i mang biểu tượng i.
const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const UP = new THREE.Vector3(0, 1, 0);
const DICE_SPOTS = [[0.12, 0], [-0.06, 0.105], [-0.06, -0.105]];

const matte = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const ease = (from, to, dt, rate) => from + (to - from) * (1 - Math.exp(-dt * rate));

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class BauCuaTable {
  constructor(scene) {
    const { x, z } = BAUCUA_ZONE;
    this.group = new THREE.Group();
    this.group.position.set(x, floorHeight(x, z), z);
    this.#buildTable();
    this.#buildMat();
    this.#buildDish();
    this.#buildLabel();
    scene.add(this.group);
    this.dealer = new BauCuaDealer(scene);

    this.phase = 'idle';
    this.state = null;
    this.ready = false;
    this.winnersKey = '';
    this.open = 0; // 0 bát úp kín, 1 bát đã mở.
    this.lift = 0; // 0 đĩa nằm trên bàn, 1 nhà cái đang nhấc đĩa xóc.
    this.shakeT = 0;
    this.labelClock = 0;
  }

  #buildTable() {
    const radius = BAUCUA_ZONE.tableRadius - 0.03;
    const wood = matte(0x6a3f22);
    const dark = matte(0x3f2414);
    const top = mesh(new THREE.CylinderGeometry(radius, radius, 0.07, 32), wood, 0, TOP_Y - 0.035, 0);
    const cloth = mesh(new THREE.CylinderGeometry(radius - 0.04, radius - 0.04, 0.012, 32), matte(0x4a1a12), 0, TOP_Y + 0.001, 0);
    const rim = mesh(new THREE.TorusGeometry(radius, 0.035, 6, 32), dark, 0, TOP_Y, 0);
    rim.rotation.x = Math.PI / 2;
    const stem = mesh(new THREE.CylinderGeometry(0.13, 0.2, TOP_Y - 0.08, 10), dark, 0, (TOP_Y - 0.08) / 2, 0);
    const foot = mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 16), dark, 0, 0.03, 0);
    this.group.add(top, cloth, rim, stem, foot);
  }

  /** Bạt 3×2 xoay để chữ đọc xuôi với người đứng phía đông nhìn về phía nhà cái. */
  #buildMat() {
    this.mat = createMat();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(MAT.along, MAT.across), new THREE.MeshLambertMaterial({ map: this.mat.texture }));
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    const holder = new THREE.Group();
    holder.position.set(MAT.x, TOP_Y + 0.009, 0);
    holder.rotation.y = Math.PI / 2;
    holder.add(plane);
    this.group.add(holder);
  }

  #buildDish() {
    this.dish = new THREE.Group();
    this.dish.position.set(DISH_X, TOP_Y + 0.008, 0);
    const porcelain = matte(0xf4efe4);
    const blue = matte(0x2f5d9e);
    const plate = mesh(new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS - 0.04, 0.03, 28), porcelain, 0, 0.015, 0);
    const plateRim = mesh(new THREE.TorusGeometry(PLATE_RADIUS - 0.01, 0.012, 6, 28), blue, 0, 0.03, 0);
    plateRim.rotation.x = Math.PI / 2;
    this.dish.add(plate, plateRim);

    const faces = BAUCUA_SYMBOLS.map((_, i) => new THREE.MeshLambertMaterial({ map: diceFaceTexture(i) }));
    const geometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE);
    this.dice = DICE_SPOTS.map(([dx, dz]) => {
      const die = mesh(geometry, faces, dx, 0.03 + DICE_SIZE / 2, dz);
      die.visible = false;
      this.dish.add(die);
      return die;
    });

    this.bowl = new THREE.Group();
    const shell = mesh(new THREE.SphereGeometry(BOWL_RADIUS, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), matte(0xf4efe4, { side: THREE.DoubleSide }));
    const band = mesh(new THREE.TorusGeometry(BOWL_RADIUS * 0.78, 0.016, 6, 24), blue, 0, BOWL_RADIUS * 0.62, 0);
    band.rotation.x = Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(BOWL_RADIUS, 0.014, 6, 24), blue, 0, 0.004, 0);
    rim.rotation.x = Math.PI / 2;
    const knob = mesh(new THREE.SphereGeometry(0.05, 10, 8), matte(0xa8432a), 0, BOWL_RADIUS + 0.015, 0);
    this.bowl.add(shell, band, rim, knob);
    this.bowl.position.y = 0.03;
    this.dish.add(this.bowl);
    this.group.add(this.dish);
  }

  #buildLabel() {
    this.labelSub = h('small', {}, '');
    this.label = new CSS2DObject(h('div', { class: 'baucua-label' }, h('b', {}, 'Bầu cua'), this.labelSub));
    this.label.position.set(0, TOP_Y + 1.1, 0);
    this.group.add(this.label);
  }

  /** Đặt ba viên về đúng mặt kết quả, mỗi viên xoay ngang một góc riêng cho tự nhiên. */
  #showDice(faces) {
    const tilt = new THREE.Quaternion();
    const yaw = new THREE.Quaternion();
    this.dice.forEach((die, i) => {
      tilt.setFromUnitVectors(FACE_NORMALS[faces[i]], UP);
      yaw.setFromAxisAngle(UP, 0.4 + i * 1.9 + faces[i] * 0.7);
      die.quaternion.copy(tilt).premultiply(yaw);
    });
  }

  #highlight(winners) {
    const key = [...winners].sort().join(',');
    if (key === this.winnersKey) return;
    this.winnersKey = key;
    drawMat(this.mat.canvas, winners);
    this.mat.texture.needsUpdate = true;
  }

  /** Nhận trạng thái bàn từ server. Lần đầu (vào phòng giữa ván) vào thẳng tư thế, không chạy hoạt ảnh. */
  setState(state) {
    const changed = state.phase !== this.phase;
    this.state = state;
    this.phase = state.phase;
    const showResult = Boolean(state.dice) && (state.phase === 'result' || state.phase === 'idle');
    if (showResult) this.#showDice(state.dice);
    this.#highlight(showResult ? new Set(state.dice) : new Set());
    if (!this.ready) {
      this.ready = true;
      this.open = showResult ? 1 : 0;
    } else if (changed) this.dealer.onPhase(state.phase, state.dice);
    this.labelClock = 0;
  }

  #labelText(now) {
    const s = this.state;
    const icons = (dice) => dice.map((d) => BAUCUA_SYMBOLS[d].icon).join(' ');
    if (!s || s.phase === 'idle') return s?.dice ? `ván trước ${icons(s.dice)}` : 'bấm E để chơi';
    if (s.phase === 'betting') return `nhận cược · ${Math.max(0, Math.ceil((s.endsAt - now) / 1000))}s · ${s.bettors} người`;
    if (s.phase === 'rolling') return 'đang xóc…';
    return icons(s.dice);
  }

  /** nowMs: giờ server (net.now()) để đếm ngược khớp với endsAt. */
  update(dt, camera, nowMs) {
    const rolling = this.phase === 'rolling';
    const opened = Boolean(this.state?.dice) && (this.phase === 'result' || this.phase === 'idle');
    this.shakeT = rolling ? this.shakeT + dt : 0;
    this.lift = ease(this.lift, rolling ? 1 : 0, dt, 9);
    this.open = ease(this.open, opened ? 1 : 0, dt, 7);

    // Đĩa: nhà cái nhấc lên ngang ngực rồi rung mạnh.
    const t = this.shakeT;
    const shake = rolling ? 1 : 0;
    this.dish.position.set(
      DISH_X - this.lift * 0.12 + shake * Math.sin(t * 41) * 0.05,
      TOP_Y + 0.008 + this.lift * 0.3 + shake * Math.abs(Math.sin(t * 23)) * 0.06,
      shake * Math.cos(t * 37) * 0.05,
    );
    this.dish.rotation.z = shake * Math.sin(t * 29) * 0.12;
    // Bát: mở thì nhấc lên và nghiêng miệng bát về phía khách (đông) để lộ xúc xắc.
    const o = this.open;
    this.bowl.position.set(-o * 0.08, 0.03 + o * 0.42, 0);
    this.bowl.rotation.z = o * 1.05;
    const showDice = o > 0.2 && this.state?.dice;
    for (const die of this.dice) die.visible = Boolean(showDice);

    this.dealer.update(dt, camera, rolling);
    this.labelClock -= dt;
    if (this.labelClock <= 0) {
      this.labelClock = 0.25;
      this.labelSub.textContent = this.#labelText(nowMs);
    }
    this.label.visible = camera.position.distanceTo(this.group.position) < LABEL_SHOW_DISTANCE;
  }
}
