// Bàn cò quay: bánh xe ở nửa phía nhà cái, mặt bạt số ở nửa phía khách (0 bên trái, lưới 3 × 12, hàng tá, hàng cửa ngoài).
// Người chơi bấm thẳng lên ô số hay ô cửa ngoài; người cược lớn nhất búng bi. Chỉ diễn theo trạng thái server gửi.
import { COQUAY, COQUAY_TARGETS, OUTSIDE_ID, coquayWins, pocketColor } from '../../../shared/coquay.js';
import { COQUAY_ZONE } from '../../../shared/layout.js';
import { CasinoFeltTable, TOP_Y } from './casino-felt-table.js';
import { CoQuayWheel } from './coquay-wheel.js';
import { pickLine } from './table-dealer.js';

const DEALER = { name: 'Anh Bảy hồ lì', look: { color: 6, hair: 3, hat: 0, attire: 7 } };
const LINES = { betting: ['Đặt đi, đỏ hay đen!', 'Số đơn ăn ba lăm nha!', 'Mời quý khách đặt cược!'] };
// Bố cục bạt theo pixel canvas 1200 × 480.
const ZERO_W = 90;
const COL_W = (1200 - ZERO_W) / 12;
const ROW_H = 90; // Ba hàng số: y 0..270.
const DOZEN_Y = [270, 370];
const OUT_Y = [370, 480];
const OUTSIDE_ROW = ['low', 'even', 'red', 'black', 'odd', 'high'];
const FILL = { red: '#9e1f17', black: '#1b1b1f', green: '#1f6f40' };

export class CoQuayTable extends CasinoFeltTable {
  constructor(scene) {
    super(scene, {
      zone: COQUAY_ZONE,
      title: 'Cò quay',
      dealer: DEALER,
      felt: { w: 1.5, d: 0.6, x: -0.42, px: 1200, py: 480 },
    });
    this.wheel = new CoQuayWheel(this.group, 0.62, TOP_Y);
    this.ready = false;
    this.redraw();
  }

  #cell(g, target, x0, y0, x1, y1, text, fill) {
    g.fillStyle = fill;
    g.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
    g.strokeStyle = '#e8c36a';
    g.lineWidth = 3;
    g.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
    g.fillStyle = '#fff3d6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, (x0 + x1) / 2, (y0 + y1) / 2 + 2);
    this.regions.push({ target, x0, y0, x1, y1 });
  }

  drawFelt(g, W, H) {
    g.fillStyle = '#0f3d2a';
    g.fillRect(0, 0, W, H);
    g.font = '800 40px Georgia, serif';
    this.#cell(g, 0, 0, 0, ZERO_W, ROW_H * 3, '0', FILL.green);
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const n = 3 * (c + 1) - r; // Hàng trên cùng (phía xa) là 3, 6, 9…
        const x0 = ZERO_W + c * COL_W;
        this.#cell(g, n, x0, r * ROW_H, x0 + COL_W, (r + 1) * ROW_H, String(n), FILL[pocketColor(n)]);
      }
    }
    g.font = '700 38px Georgia, serif';
    ['d1', 'd2', 'd3'].forEach((key, i) => {
      const x0 = ZERO_W + i * 4 * COL_W;
      this.#cell(g, OUTSIDE_ID[key], x0, DOZEN_Y[0], x0 + 4 * COL_W, DOZEN_Y[1], `${COQUAY_TARGETS[OUTSIDE_ID[key]].name} · 1 ăn 2`, '#0f3d2a');
    });
    OUTSIDE_ROW.forEach((key, i) => {
      const x0 = ZERO_W + i * 2 * COL_W;
      const fill = key === 'red' ? FILL.red : key === 'black' ? FILL.black : '#0f3d2a';
      const label = key === 'red' || key === 'black' ? '◆' : COQUAY_TARGETS[OUTSIDE_ID[key]].name;
      this.#cell(g, OUTSIDE_ID[key], x0, OUT_Y[0], x0 + 2 * COL_W, OUT_Y[1], label, fill);
    });
    g.fillStyle = '#e8c36a';
    g.font = '600 26px Georgia, serif';
    g.fillText('1 ăn 1', ZERO_W / 2, (OUT_Y[0] + OUT_Y[1]) / 2);
    g.fillText('Số 1:35', ZERO_W / 2, (DOZEN_Y[0] + DOZEN_Y[1]) / 2);
  }

  setCharge(power) {
    this.wheel.charge = power;
  }

  setState(state, nowMs) {
    const prev = this.state;
    const changed = state.phase !== prev?.phase || state.round !== prev?.round;
    this.state = state;
    this.setTotals(state.totals);
    if (state.phase === 'rolling' && changed && this.ready) {
      this.wheel.launch(state.result, state.power ?? 0.55, state.endsAt - COQUAY.rollMs, nowMs);
    } else if (state.phase === 'throwing') this.wheel.hold();
    else if (state.result != null && !this.wheel.spin) this.wheel.rest(state.result);
    else if (state.result == null && state.history.length && !this.wheel.spin) this.wheel.rest(state.history[0]);
    const n = state.phase === 'result' ? state.result : null;
    this.setWinners(n == null ? [] : COQUAY_TARGETS.map((_, t) => t).filter((t) => coquayWins(t, n)));
    if (changed && this.ready) this.#announce(state);
    this.ready = true;
    this.labelSub.textContent = state.history.length ? `Gần đây: ${state.history.slice(0, 5).join(' · ')}` : '';
  }

  #announce(state) {
    const { dealer } = this;
    if (state.phase === 'betting') dealer.say(pickLine(LINES.betting), 2600);
    else if (state.phase === 'throwing' && state.thrower) dealer.say(`Hết đặt! ${state.thrower.name} búng bi nào!`, 3000);
    else if (state.phase === 'result') {
      const n = state.result;
      const color = { red: 'đỏ', black: 'đen', green: 'xanh' }[pocketColor(n)];
      dealer.say(`${n} ${color}!`, 3000);
      dealer.flourish();
    }
  }

  update(dt, camera, nowMs) {
    this.wheel.update(dt, nowMs);
    this.updateCommon(dt, camera, this.state?.phase === 'throwing' ? 'deal' : 'idle');
  }
}
