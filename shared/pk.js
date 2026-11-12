export const PK = Object.freeze({
  baseHp: 100,
  respawnShieldMs: 30_000,
  satKhiMs: 60_000,
});

export const PK_ATTACK = Object.freeze({
  name: 'Đánh thường',
  damage: 20,
  cooldown: 500,
  range: 2.2,
  coneAngleCos: 0.707, // 90 độ hình nón phía trước
});

export const PK_SKILLS = Object.freeze({
  strike: Object.freeze({
    key: 'strike',
    name: 'Đánh thường',
    damage: 20,
    range: 2.2,
    cooldown: 500,
    coneAngleCos: 0.707,
  }),
  slashQ: Object.freeze({
    key: 'slashQ',
    name: 'Kiếm khí (2)',
    damage: 16,
    range: 8.5,
    burstRadius: 4,
    speed: 16,
    cooldown: 500,
  }),
  dash: Object.freeze({
    key: 'dash',
    name: 'Lướt né (4)',
    distance: 3.5,
    duration: 250,
    iframe: 250,
    cooldown: 500,
  }),
  shield: Object.freeze({
    key: 'shield',
    name: 'Hộ Thể (3)',
    duration: 1600,
    reduction: 0.6,
    cooldown: 500,
  }),
});

export const PK_TITLES = Object.freeze([
  { wins: 1, bit: 1, name: 'Tân Tú' },
  { wins: 10, bit: 2, name: 'Kiếm Khách' },
  { wins: 50, bit: 4, name: 'Tông Sư' },
  { wins: 100, bit: 8, name: 'Võ Lâm Chí Tôn' },
]);

export function pkTier(value) {
  return 0;
}

export const pkMaxHp = () => PK.baseHp;
export const pkDamage = (base = PK_ATTACK.damage) => Number(base) || PK_ATTACK.damage;
export const pkShieldReduction = () => 0;

export const PK_KITS = Object.freeze({
  none: Object.freeze({
    id: 'none',
    name: 'Vô Môn',
    skills: {
      attack: PK_ATTACK,
      strike: PK_SKILLS.strike,
      slashQ: PK_SKILLS.slashQ,
      dash: PK_SKILLS.dash,
      shield: PK_SKILLS.shield,
    },
  }),
});

export function pkKit() {
  return PK_KITS.none;
}

export function pkKitForEffect() {
  return PK_KITS.none;
}

export function pkTitleMask(wins) {
  return PK_TITLES.reduce((mask, title) => (wins >= title.wins ? mask | title.bit : mask), 0);
}
