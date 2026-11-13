// Bàn tài xỉu: bạt Xỉu | Bão | Tài ở nửa phía khách, khay gỗ ở nửa phía nhà cái. Người cược lớn nhất tung:
// ba viên bay từ mép bàn phía khách, nảy vài nhịp trong khay rồi nằm đúng mặt server đã bốc (lực tung chỉ đổi độ cao,
// độ xoáy). Lúc đang chờ tung, ba viên nằm sẵn ở mép bàn và rung theo lực người tung đang lấy đà.
import * as THREE from 'three';
import { TAIXIU, TAIXIU_TARGETS, diceSum, isTriple, taixiuSide } from '../../../shared/taixiu.js';
import { TAIXIU_ZONE } from '../../../shared/layout.js';
import { CasinoFeltTable, TOP_Y, matte, mesh } from './casino-felt-table.js';
import { pickLine } from './table-dealer.js';
import { dieFaceMaterials, dieQuaternion } from './casino-dice-materials.js';

const DIE = 0.07;
const TRAY = { x: 0.42, r: 0.3 };
const HAND = { x: -0.62, y: TOP_Y + 0.32 }; // Chỗ ba viên chờ trong tay người tung.
const SPOTS = [[0.08, -0.1], [-0.07, 0.02], [0.06, 0.12]]; // Chỗ dừng trong khay, lệch nhau cho tự nhiên.
const FLY_S = 1.7; // Thời gian bay + nảy; phần còn lại của pha rolling là nằm yên cho mọi người nhìn.
const DEALER = { name: 'Cô Sáu nhà cái', look: { color: 3, hair: 1, hat: 0, attire: 7 } };
const LINES = {
  betting: ['Tài hay xỉu, đặt lẹ nào!', 'Cầu đang bệt đó nha!', 'Ai tài ai xỉu đây!'],
};
// Ba ô trên bạt theo pixel canvas (1024 ngang): [x0, x1, cửa]. Xỉu trái, Bão giữa, Tài phải.
const CELLS = [[0, 400, 0], [400, 624, 2], [624, 1024, 1]];
const easeOut = (t) => 1 - (1 - t) ** 3;

export class TaiXiuTable extends CasinoFeltTable {
  constructor(scene) {
    super(scene, {
      zone: TAIXIU_ZONE,
      title: 'Tài xỉu',
      dealer: DEALER,
      felt: { w: 1.4, d: 0.56, x: -0.32, px: 1024, py: 410 },
    });
    this.#buildTray();
    this.dice = [0, 1, 2].map(() => {
      const die = mesh(new THREE.BoxGeometry(DIE, DIE, DIE), dieFaceMaterials());
      this.group.add(die);
      return die;
    });
    this.faces = [1, 2, 3];
    this.flight = null; // { start, power, from[], to[], axes[] }
    this.charge = 0;
    this.time = 0;
    this.ready = false;
    this.#rest(this.faces);
    this.redraw();
  }

  #buildTray() {
    const wood = matte(0x7a4a26);
    const base = mesh(new THREE.CylinderGeometry(TRAY.r, TRAY.r, 0.012, 32), matte(0x2b1a10), TRAY.x, TOP_Y + 0.008, 0);
    const wall = mesh(new THREE.TorusGeometry(TRAY.r, 0.02, 6, 36), wood, TRAY.x, TOP_Y + 0.025, 0);
    wall.rotation.x = Math.PI / 2;
    this.group.add(base, wall);
  }

  drawFelt(g, W, H) {
    g.fillStyle = '#0f3d2a';
    g.fillRect(0, 0, W, H);
    for (const [x0, x1, target] of CELLS) {
      const t = TAIXIU_TARGETS[target];
      g.fillStyle = target === 2 ? '#5b1d14' : target === 1 ? '#7a1f16' : '#16314f';
      g.fillRect(x0 + 6, 6, x1 - x0 - 12, H - 12);
      g.strokeStyle = '#e8c36a';
      g.lineWidth = 4;
      g.strokeRect(x0 + 10, 10, x1 - x0 - 20, H - 20);
      g.fillStyle = '#ffe9b0';
      g.textAlign = 'center';
      g.font = `900 ${target === 2 ? 72 : 130}px Georgia, serif`;
      g.fillText(t.name.toUpperCase(), (x0 + x1) / 2, H * (target === 2 ? 0.48 : 0.55));
      g.font = '600 36px Georgia, serif';
      g.fillStyle = '#f5dca0';
      g.fillText(t.hint, (x0 + x1) / 2, H * 0.8);
      this.regions.push({ target, x0, y0: 0, x1, y1: H });
    }
  }

  /** Đặt ba viên nằm yên trong khay với mặt faces ngửa lên. */
  #rest(faces) {
    this.dice.forEach((die, i) => {
      die.position.set(TRAY.x + SPOTS[i][0], TOP_Y + 0.014 + DIE / 2, SPOTS[i][1]);
      die.quaternion.copy(dieQuaternion(faces[i], 0.5 + i * 1.7 + faces[i]));
    });
  }

  /** Ba viên nằm sẵn ở mép bàn phía khách chờ tung. */
  #inHand() {
    this.dice.forEach((die, i) => {
      die.position.set(HAND.x, HAND.y, (i - 1) * 0.085);
      die.quaternion.copy(dieQuaternion(1 + i, i));
    });
  }

  /** Lực đang lấy đà của người tung (chỉ máy người tung thấy rung). */
  setCharge(power) {
    this.charge = power;
  }

  setState(state, nowMs) {
    const prev = this.state;
    const changed = state.phase !== prev?.phase || state.round !== prev?.round;
    this.state = state;
    this.setTotals(state.totals);
    const shown = state.phase === 'rolling' || state.phase === 'result';
    if (shown) this.faces = state.result;
    if (state.phase === 'rolling' && changed && this.ready) this.#launch(state, nowMs);
    else if (state.phase === 'throwing') this.#inHand();
    else if (!this.flight) this.#rest(this.faces);
    // Ô thắng chỉ sáng khi ba viên đã nằm yên.
    this.setWinners(state.phase === 'result' ? this.#winners(state.result) : []);
    if (changed && this.ready) this.#announce(state);
    this.ready = true;
    this.labelSub.textContent = state.history[0] ? `Ván trước: ${diceSum(state.history[0].dice)} · ${TAIXIU_TARGETS[['xiu', 'tai', 'bao'].indexOf(state.history[0].side)].name}` : '';
  }

  #winners(dice) {
    return isTriple(dice) ? [2] : [diceSum(dice) >= 11 ? 1 : 0];
  }

  #launch(state, nowMs) {
    const power = state.power ?? 0.55;
    const start = state.endsAt - TAIXIU.rollMs;
    if (nowMs - start > FLY_S * 1000) return; // Vào muộn: khỏi diễn, nằm yên luôn.
    this.flight = {
      start,
      power,
      axes: this.dice.map(() => new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()),
      spin: 9 + power * 12,
      height: 0.25 + power * 0.45,
    };
  }

  #fly(nowMs) {
    const f = this.flight;
    const t = Math.min(1, (nowMs - f.start) / (FLY_S * 1000));
    const k = easeOut(t);
    const turn = new THREE.Quaternion();
    this.dice.forEach((die, i) => {
      const [sx, sz] = SPOTS[i];
      const toX = TRAY.x + sx;
      const fromZ = (i - 1) * 0.085;
      die.position.x = HAND.x + (toX - HAND.x) * k;
      die.position.z = fromZ + (sz - fromZ) * k + Math.sin(t * Math.PI) * (i - 1) * 0.06;
      // Bay vồng lên rồi nảy nhỏ dần trong khay.
      const arc = f.height * Math.sin(Math.min(1, t / 0.42) * Math.PI) * (t < 0.42 ? 1 : 0);
      const bounce = t >= 0.42 ? Math.abs(Math.sin(((t - 0.42) / 0.58) * Math.PI * 3)) * 0.07 * (1 - t) ** 1.5 : 0;
      const ground = TOP_Y + 0.014 + DIE / 2;
      die.position.y = t < 0.42 ? ground + (HAND.y - ground) * (1 - t / 0.42) + arc : ground + bounce;
      turn.setFromAxisAngle(f.axes[i], f.spin * (1 - t) ** 2);
      die.quaternion.copy(dieQuaternion(this.faces[i], 0.5 + i * 1.7 + this.faces[i])).multiply(turn);
    });
    if (t >= 1) this.flight = null;
  }

  #announce(state) {
    const { dealer } = this;
    if (state.phase === 'betting') dealer.say(pickLine(LINES.betting), 2600);
    else if (state.phase === 'throwing' && state.thrower) dealer.say(`${state.thrower.name} cược to nhất, tung đi!`, 3000);
    else if (state.phase === 'result') {
      const d = state.result;
      const side = taixiuSide(d);
      dealer.say(side === 'bao' ? `BÃO ${d[0]}! Nhà cái ăn tài xỉu!` : `${diceSum(d)} điểm, ${side === 'tai' ? 'TÀI' : 'XỈU'}!`, 3000);
      dealer.flourish();
    }
  }

  update(dt, camera, nowMs) {
    this.time += dt;
    if (this.flight) this.#fly(nowMs);
    else if (this.state?.phase === 'throwing' && this.charge > 0) {
      // Rung theo lực đang lấy đà, như lắc xúc xắc trong lòng bàn tay.
      this.dice.forEach((die, i) => {
        die.position.y = HAND.y + Math.abs(Math.sin(this.time * (18 + i * 3))) * 0.05 * this.charge;
        die.rotation.y += dt * 12 * this.charge;
      });
    }
    this.updateCommon(dt, camera, this.state?.phase === 'throwing' ? 'deal' : 'idle');
  }
}
