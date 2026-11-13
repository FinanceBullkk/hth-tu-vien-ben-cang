// Tài xỉu: phím 1 Xỉu, 2 Tài, 3 Bão. Mọi thứ khác dùng chung CasinoRoundActivity.
import { BAO, TAI, TAIXIU, TAIXIU_TARGETS, XIU, diceSum, taixiuSide } from '../../../shared/taixiu.js';
import { TAIXIU_ZONE } from '../../../shared/layout.js';
import { h } from '../ui/dom.js';
import { CasinoRoundActivity } from './casino-round-activity.js';

const SIDE_TEXT = { tai: 'TÀI', xiu: 'XỈU', bao: 'BÃO' };
// Tiếng xúc xắc va khay: dày lúc mới rơi xuống, thưa dần rồi tắt khi ba viên nằm yên.
const BOUNCE_AT = [0.72, 0.9, 1.05, 1.18, 1.3, 1.42];

export function createTaiXiuActivity(app) {
  let next = 0;
  return new CasinoRoundActivity(app, {
    name: 'taixiu',
    title: 'Tài xỉu',
    zone: TAIXIU_ZONE,
    targets: TAIXIU_TARGETS,
    table: (a) => a.world.taixiuTable,
    keys: { Digit1: XIU, Digit2: TAI, Digit3: BAO, Numpad1: XIU, Numpad2: TAI, Numpad3: BAO },
    help: 'Bấm Xỉu, Tài hoặc Bão trên bàn (phím 1–3). Ai cược to nhất được tự tung.',
    verb: 'tung',
    rollMs: TAIXIU.rollMs,
    describe: (dice) => `${dice.join('-')} · ${diceSum(dice)} ${SIDE_TEXT[taixiuSide(dice)]}`,
    rollSound: (a, _dt, t) => {
      if (t < 0.1) next = 0;
      if (next < BOUNCE_AT.length && t >= BOUNCE_AT[next]) {
        next++;
        a.audio.rattle();
      }
    },
    road: (history) => history.map((r) => h('i', { class: `crh-dot ${r.side}`, title: r.dice.join('-') }, r.side === 'bao' ? 'B' : String(diceSum(r.dice)))),
  });
}
