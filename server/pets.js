// Thú cưng: ấp trứng bằng TEU ra thú ngẫu nhiên, dắt một thú đi theo, cho ăn cá trong túi để tăng thân thiết.
// Server là nguồn sự thật: client chỉ gửi ý định (ấp, dắt thú nào, cho ăn con cá nào); bốc thú, trừ TEU,
// kiểm tra sở hữu, xoá cá và cộng thân thiết đều ở đây. Cả phòng thấy thú của nhau qua player:pet và pet:fed.
import crypto from 'node:crypto';
import { PET, PETS, PET_WEIGHT_TOTAL, bondTier, isPetKind, rollPet } from '../shared/pets.js';
import { localDate } from './time.js';

const FEED_ERRORS = {
  notOwned: 'Bạn chưa có bé này.',
  full: 'Bé đã là tri kỷ rồi, để dành cá bán lấy TEU nhé.',
  noFish: 'Con cá này không còn trong túi, hoặc đang khoá.',
};

export class Pets {
  /**
   * @param {{ db: any, io: { emit: Function }, config: any, random?: (n: number) => number }} deps
   * random(n) trả số nguyên trong [0, n); test truyền dãy số dựng sẵn.
   */
  constructor({ db, io, config, random = (n) => crypto.randomInt(n) }) {
    Object.assign(this, { db, io, config, random });
  }

  /** Trạng thái thú của một người, gửi trong snapshot và sau mỗi thay đổi. */
  state(pid) {
    const { active, pity } = this.db.pets.meta(pid);
    return { list: this.db.pets.list(pid), active, pity, eggPrice: PET.eggPrice };
  }

  /** Lúc vào phòng: gắn thú đang dắt và bậc thân thiết lên người chơi để cả phòng thấy. */
  load(p) {
    const { active } = this.db.pets.meta(p.pid);
    p.pet = active;
    p.petTier = active >= 0 ? bondTier(this.db.pets.bond(p.pid, active)) : 0;
  }

  #announce(p) {
    this.io.emit('player:pet', { sid: p.sid, pet: p.pet, tier: p.petTier });
  }

  /** Ấp một trứng. Nở trùng thú đã có thì cộng thân thiết cho bé đó. */
  hatch(p) {
    const now = Date.now();
    if (now - (p.lastPetHatch ?? 0) < PET.hatchIntervalMs) return { ok: false, error: 'Trứng đang nở, chờ chút nhé.' };
    p.lastPetHatch = now;
    const date = localDate(now, this.config.timezone);
    const pick = (pity) => rollPet(this.random(PET_WEIGHT_TOTAL), this.random(1 << 16), pity);
    const res = this.db.pets.hatch(p.pid, PET.eggPrice, date, pick, now);
    const teu = this.db.shop.teu(p.pid);
    if (!res.ok) return { ok: false, error: `Còn thiếu ${PET.eggPrice - teu} TEU để mua trứng.`, teu };
    // Nở Linh thú trở lên lần đầu thì cả tu viện cùng biết.
    if (!res.dup && PETS[res.kind].rarity >= PET.pityRarity) this.io.emit('pet:hatched', { sid: p.sid, kind: res.kind });
    // Đang dắt đúng bé vừa nở trùng: thân thiết tăng có thể lên bậc, cả phòng thấy hiệu ứng mới.
    if (res.kind === p.pet && bondTier(res.bond) !== p.petTier) {
      p.petTier = bondTier(res.bond);
      this.#announce(p);
    }
    return { ok: true, kind: res.kind, dup: res.dup, gained: res.gained, bond: res.bond, teu, ...this.state(p.pid) };
  }

  /** Dắt thú data.kind đi theo; kind -1 là cất thú về. */
  summon(p, data) {
    const kind = data?.kind;
    if (kind !== -1 && !isPetKind(kind)) return { ok: false, error: 'Thú này không có thật.' };
    const now = Date.now();
    if (now - (p.lastPetSummon ?? 0) < PET.summonIntervalMs) return { ok: false, error: 'Từ từ thôi, bé đang chạy tới.' };
    let tier = 0;
    if (kind >= 0) {
      const bond = this.db.pets.bond(p.pid, kind);
      if (bond === null) return { ok: false, error: 'Bạn chưa có bé này, ấp trứng thử vận may nhé.' };
      tier = bondTier(bond);
    }
    p.lastPetSummon = now;
    this.db.pets.setActive(p.pid, kind);
    if (p.pet !== kind || p.petTier !== tier) {
      p.pet = kind;
      p.petTier = tier;
      this.#announce(p);
    }
    return { ok: true, active: kind };
  }

  /** Cho thú đang dắt ăn con cá data.id trong túi. */
  feed(p, data) {
    if (!isPetKind(p.pet)) return { ok: false, error: 'Dắt một bé ra trước rồi mới cho ăn được.' };
    const id = data?.id;
    if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: FEED_ERRORS.noFish };
    const now = Date.now();
    if (now - (p.lastPetFeed ?? 0) < PET.feedIntervalMs) return { ok: false, error: `${PETS[p.pet].name} đang nhai, chờ chút nhé.` };
    const res = this.db.pets.feed(p.pid, p.pet, id);
    if (!res.ok) return { ok: false, error: FEED_ERRORS[res.reason] };
    p.lastPetFeed = now;
    const tier = bondTier(res.bond);
    const up = tier > p.petTier;
    p.petTier = tier;
    this.io.emit('pet:fed', { sid: p.sid, rarity: res.rarity, tier });
    return { ok: true, id, kind: p.pet, gained: res.gained, bond: res.bond, tier, up };
  }
}
