// Bàn cò quay ở sân trước thiền đường: lõi chung ở casino-round-table.js, đây chỉ khai báo luật.
import { COQUAY, COQUAY_TARGETS, settleCoquay, spinCoquay } from '../shared/coquay.js';
import { COQUAY_ZONE } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { CasinoRoundTable } from './casino-round-table.js';

export const COQUAY_RULES = {
  name: 'coquay',
  label: 'cò quay',
  zone: COQUAY_ZONE,
  activity: ACTIVITY.coquay,
  targets: COQUAY_TARGETS,
  timing: COQUAY,
  draw: spinCoquay,
  settle: settleCoquay,
  historyEntry: (n) => n,
};

export class CoQuay extends CasinoRoundTable {
  constructor(opts) {
    super({ ...opts, rules: COQUAY_RULES });
  }
}
