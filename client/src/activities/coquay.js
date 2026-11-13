// Cò quay: phím 1 Đỏ, 2 Đen, 3 Chẵn, 4 Lẻ; số đơn và tá thì bấm thẳng lên bạt. Phần chung ở CasinoRoundActivity.
import { COQUAY, COQUAY_TARGETS, OUTSIDE_ID, pocketColor } from '../../../shared/coquay.js';
import { COQUAY_ZONE } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { CasinoRoundActivity } from './casino-round-activity.js';

const COLOR_TEXT = { red: 'đỏ', black: 'đen', green: 'xanh' };
const LAND_S = 4.6; // Khớp coquay-wheel.js: bi chạm ô lúc này.

export function createCoQuayActivity(app) {
  let clickT = 0;
  return new CasinoRoundActivity(app, {
    name: 'coquay',
    title: 'Cò quay',
    zone: COQUAY_ZONE,
    targets: COQUAY_TARGETS,
    table: (a) => a.world.coquayTable,
    keys: {
      Digit1: OUTSIDE_ID.red, Digit2: OUTSIDE_ID.black, Digit3: OUTSIDE_ID.even, Digit4: OUTSIDE_ID.odd,
      Numpad1: OUTSIDE_ID.red, Numpad2: OUTSIDE_ID.black, Numpad3: OUTSIDE_ID.even, Numpad4: OUTSIDE_ID.odd,
    },
    help: 'Bấm ô số hoặc đỏ/đen, chẵn/lẻ trên bàn (phím 1–4). Ai cược to nhất được búng bi.',
    verb: 'búng bi',
    rollMs: COQUAY.rollMs,
    describe: (n) => `${n} ${COLOR_TEXT[pocketColor(n)]}`,
    // Bi lạch cạch trên vành: nhanh lúc đầu, thưa dần, tắt khi bi nằm trong ô.
    rollSound: (a, dt, t) => {
      if (t >= LAND_S) return;
      clickT -= dt;
      if (clickT <= 0) {
        clickT = 0.06 + (t / LAND_S) ** 2 * 0.45;
        a.audio.tick();
      }
    },
    road: (history) => history.map((n) => h('i', { class: `crh-dot ${pocketColor(n)}` }, String(n))),
  });
}
