// Bàn tài xỉu ở sân trước thiền đường: lõi chung ở casino-round-table.js, đây chỉ khai báo luật.
import { TAIXIU, TAIXIU_TARGETS, rollTaixiu, settleTaixiu, taixiuSide } from '../shared/taixiu.js';
import { TAIXIU_ZONE } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { CasinoRoundTable } from './casino-round-table.js';

export const TAIXIU_RULES = {
  name: 'taixiu',
  label: 'tài xỉu',
  zone: TAIXIU_ZONE,
  activity: ACTIVITY.taixiu,
  targets: TAIXIU_TARGETS,
  timing: TAIXIU,
  draw: rollTaixiu,
  settle: settleTaixiu,
  historyEntry: (dice) => ({ dice: [...dice], side: taixiuSide(dice) }),
};

export class TaiXiu extends CasinoRoundTable {
  constructor(opts) {
    super({ ...opts, rules: TAIXIU_RULES });
  }
}
