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

// ===== Kit kỹ năng theo aura — REBUILD CƠ CHẾ =====
// Mỗi aura (EFFECT_NAMES, id 1–12) một kit với SỐ LIỆU VÀ CƠ CHẾ RIÊNG:
//   strike — damage/range/cooldown/coneAngleCos riêng, maxTargets (chém quét đa mục tiêu),
//     lifesteal (hút khí huyết hồi HP);
//   slashQ — damage/range/burstRadius/cooldown riêng, pull (kéo địch về tâm kiểu "Lam");
//   shield — reduction/duration/cooldown riêng, reflect (khiên gậy lại một phần, không giết);
//   dash — distance/iframe/cooldown riêng, damage (lướt chém xuyên người).
// Server resolve toàn bộ từ kit (`pkKitForEffect(player.effect)`) — client chỉ gửi ý định.
// Baseline PK_SKILLS giữ nguyên làm kit Vô Môn (aura 0) và mốc cân bằng trong test.
function makeKit({ id, name, effect, color, attack, slashQ, shield, dash }) {
  return Object.freeze({
    id,
    name,
    effect,
    color,
    skills: Object.freeze({
      attack: Object.freeze({ ...PK_SKILLS.strike, ...attack }),
      strike: Object.freeze({ ...PK_SKILLS.strike, ...attack }),
      slashQ: Object.freeze({ ...PK_SKILLS.slashQ, ...slashQ }),
      shield: Object.freeze({ ...PK_SKILLS.shield, ...shield }),
      dash: Object.freeze({ ...PK_SKILLS.dash, ...dash }),
    }),
  });
}

export const PK_KITS = Object.freeze({
  none: Object.freeze({
    id: 'none',
    name: 'Vô Môn',
    effect: 0,
    color: '#e9d6ab',
    skills: Object.freeze({
      attack: PK_ATTACK,
      strike: PK_SKILLS.strike,
      slashQ: PK_SKILLS.slashQ,
      dash: PK_SKILLS.dash,
      shield: PK_SKILLS.shield,
    }),
  }),
  // 1 Sen kim — Kim Liên: trâu, hút khí huyết, khiên chắc.
  'kim-lien': makeKit({
    id: 'kim-lien', name: 'Kim Liên', effect: 1, color: '#ffd98a',
    attack: { name: 'Kim Liên Kiếm Ấn', shortLabel: 'Kiếm Ấn', type: 'Liên Hoa Kiếm Ý · Công Kích Chính',
      damage: 18, range: 2.4, cooldown: 550, lifesteal: .25,
      desc: 'Kiếm ấn hút thủy khí của sen, mỗi trảm hồi một phần khí huyết.' },
    slashQ: { name: 'Ngàn Tay Phật Quang', shortLabel: 'Phật Quang', type: 'Tuyệt Kỹ Trấn Phái · Phật Môn',
      damage: 14, range: 8, burstRadius: 4.5, cooldown: 700,
      desc: 'Bát bộ Phật chưởng hiện quanh điểm ngắm, hợp nhất dâng cột kim quang nở sen.' },
    shield: { name: 'Bửu Liên Hộ Thể', shortLabel: 'Bửu Liên', type: 'Pháp Trận · Phòng Ngự',
      duration: 1800, reduction: .7, cooldown: 900,
      desc: 'Bửu liên chín phẩm chống bảy phần thương tích, lâu hồi nhưng vững nhất.' },
    dash: { name: 'Liên Bộ Thanh Vân', shortLabel: 'Liên Bộ', type: 'Thân Pháp · Tung Thân',
      distance: 3.2, iframe: 300, cooldown: 600,
      desc: 'Nhất bộ nhất đóa liên hoa, né đòn trong 0.3 giây.' },
  }),
  // 2 Lưu ly — nước: chiêu Q kéo địch về tâm (kiểu "Lam"), lướt xa.
  'luu-ly': makeKit({
    id: 'luu-ly', name: 'Lưu Ly', effect: 2, color: '#7ee8e0',
    attack: { name: 'Lưu Ly Thủy Trảm', shortLabel: 'Thủy Trảm', type: 'Thủy Kiếm · Công Kích Chính',
      damage: 16, range: 2.2, cooldown: 450,
      desc: 'Lưỡi nước lưu ly ra vào như sóng, hồi chiêu nhanh nhất trong các tông kiếm.' },
    slashQ: { name: 'Thủy Long Phá Kính', shortLabel: 'Thủy Long', type: 'Tuyệt Kỹ Trấn Phái · Thủy Tông',
      damage: 15, range: 9, burstRadius: 3.5, cooldown: 600, pull: 2,
      desc: 'Thủy long hóa Bích Lạc hút địch về tâm rồi bùng như gương vỡ (kéo 2m).' },
    shield: { name: 'Lưu Ly Kính Giới', shortLabel: 'Kính Giới', type: 'Kết Giới · Phòng Ngự',
      duration: 1400, reduction: .55, cooldown: 500,
      desc: 'Gương lưu ly mỏng nhưng tái lập tức, đỡ được là lãi.' },
    dash: { name: 'Vân Thủy Tung Thân', shortLabel: 'Vân Thủy', type: 'Thân Pháp · Tung Thân',
      distance: 4, iframe: 250, cooldown: 550,
      desc: 'Hóa nước chảy qua khe đá, lướt 4m xa hơn mọi tông.' },
  }),
  // 3 Tinh hà — sao: AOE rộng nhất, khiên nhanh, né lâu.
  'tinh-ha': makeKit({
    id: 'tinh-ha', name: 'Tinh Hà', effect: 3, color: '#cdd8ff',
    attack: { name: 'Tinh Hà Nhất Trảm', shortLabel: 'Tinh Trảm', type: 'Tinh Kiếm · Công Kích Chính',
      damage: 15, range: 2.8, cooldown: 500,
      desc: 'Rút dải ngân hà làm kiếm, tầm đòn dài hơn mọi tông cận chiến.' },
    slashQ: { name: 'Vô Lượng Tinh Khung', shortLabel: 'Tinh Khung', type: 'Tuyệt Kỹ Trấn Phái · Tinh Tô',
      damage: 12, range: 9.5, burstRadius: 4.8, cooldown: 650,
      desc: 'Vòm sao vô lượng bao trùm vùng rộng nhất, đốn cả dòng chảy thời gian.' },
    shield: { name: 'Thiên Hà Tinh Trận', shortLabel: 'Tinh Trận', type: 'Pháp Trận · Phòng Ngự',
      duration: 1200, reduction: .5, cooldown: 450,
      desc: 'Ba vòng thiên hà tái lập chỉ 0.45s, đỡ được nhiều nhịp hơn ai.' },
    dash: { name: 'Thải Vân Truy Tinh', shortLabel: 'Truy Tinh', type: 'Thân Pháp · Tung Thân',
      distance: 3.6, iframe: 350, cooldown: 700,
      desc: 'Đạp mây đuổi sao, phách lối bất diệt 0.35 giây.' },
  }),
  // 4 Hỏa diễm — burst nặng, dash cháy qua người.
  'hong-lien': makeKit({
    id: 'hong-lien', name: 'Hồng Liên', effect: 4, color: '#ffba87',
    attack: { name: 'Hỏa Liên Trảm', shortLabel: 'Hỏa Trảm', type: 'Hỏa Đao · Công Kích Chính',
      damage: 26, range: 2, cooldown: 750,
      desc: 'Nhất đao thiêu hết ba phần sinh lực, chậm mà mỗi nhịp là một lời kết án.' },
    slashQ: { name: 'Cực Đại: Thiên Thạch', shortLabel: 'Thiên Thạch', type: 'Tuyệt Kỹ Trấn Phái · Hỏa Tông',
      damage: 30, range: 7.5, burstRadius: 3.2, cooldown: 1100,
      desc: 'Thiên thạch giáng thế — đòn nặng nhất võ lâm, hồi chiêu cũng đắt nhất.' },
    shield: { name: 'Hỏa Yên Hộ Thể', shortLabel: 'Hỏa Yên', type: 'Pháp Trận · Phòng Ngự',
      duration: 1200, reduction: .65, cooldown: 700,
      desc: 'Hỏa yên dày quấn quanh thân, ai lại gần phải trả giá.' },
    dash: { name: 'Báo Viêm Thuấn Bộ', shortLabel: 'Báo Viêm', type: 'Thân Pháp · Xung Kích',
      distance: 3, iframe: 200, cooldown: 600, damage: 12,
      desc: 'Bão lửa xuyên người: lướt qua ai là người đó chịu 12 sát thương.' },
  }),
  // 5 Đào hoa — mê hoặc: đánh nhanh hút máu, kéo nhẹ.
  'dao-hoa': makeKit({
    id: 'dao-hoa', name: 'Đào Hoa', effect: 5, color: '#ffa8cc',
    attack: { name: 'Đào Hoa Trảm', shortLabel: 'Hoa Trảm', type: 'Kiếm Pháp · Công Kích Chính',
      damage: 14, range: 2.3, cooldown: 400, lifesteal: .35,
      desc: 'Cánh đào không chỉ đẹp — mỗi nhát cướp của đối phương ba phần rưỡi sinh lực.' },
    slashQ: { name: 'Đào Nguyên Mê Chướng', shortLabel: 'Mê Chướng', type: 'Tuyệt Kỹ Trấn Phái · Đào Tông',
      damage: 11, range: 8, burstRadius: 3.8, cooldown: 550, pull: 1.2,
      desc: 'Sương đào mê hoặc kéo nhẹ địch vào tâm cảnh giới rồi trảm.' },
    shield: { name: 'Đào Nguyên Kết Giới', shortLabel: 'Kết Giới', type: 'Kết Giới · Phòng Ngự',
      duration: 1600, reduction: .6, cooldown: 600,
      desc: 'Trận đào kết giới ôm trọn một hơi thở dài.' },
    dash: { name: 'Phi Hoa Thân Pháp', shortLabel: 'Phi Hoa', type: 'Thân Pháp · Tung Thân',
      distance: 3.4, iframe: 400, cooldown: 800,
      desc: 'Phiêu nhiên như hoa rơi — bất khả xâm phạm 0.4 giây, dài nhất võ lâm.' },
  }),
  // 6 Bích ngọc — trúc: tầm kiếm dài, hình nón hẹp đánh chính xác.
  'bich-ngoc': makeKit({
    id: 'bich-ngoc', name: 'Bích Ngọc', effect: 6, color: '#7ee8a0',
    attack: { name: 'Trúc Diệp Kiếm', shortLabel: 'Trúc Kiếm', type: 'Trúc Kiếm · Công Kích Chính',
      damage: 17, range: 3.2, cooldown: 550, coneAngleCos: .86,
      desc: 'Trúc tiễn dài ba thước hai — tầm cận chiến dài nhất, góc chém hẹp phải nhắm chuẩn.' },
    slashQ: { name: 'Bích Trúc Lâm Hiện', shortLabel: 'Trúc Lâm', type: 'Tuyệt Kỹ Trấn Phái · Trúc Sơn',
      damage: 13, range: 9.5, burstRadius: 3, cooldown: 600,
      desc: 'Gọi rừng trúc mọc kín điểm ngắm, ngọn nào cũng phóng tiễn xanh về tâm.' },
    shield: { name: 'Ngọc Trúc Hộ Thể', shortLabel: 'Ngọc Trúc', type: 'Pháp Trận · Phòng Ngự',
      duration: 1500, reduction: .65, cooldown: 650,
      desc: 'Thân cứng như trúc già, gió lay không động.' },
    dash: { name: 'Thanh Phong Tung Thân', shortLabel: 'Thanh Phong', type: 'Thân Pháp · Tung Thân',
      distance: 3.8, iframe: 250, cooldown: 500,
      desc: 'Một hơi thanh phong qua rừng trúc, người đã xa vạn bước.' },
  }),
  // 7 Nguyệt bạch — trăng: đòn đơn mạnh, khiên giảm sâu nhất nhưng ngắn.
  'nguyet-bach': makeKit({
    id: 'nguyet-bach', name: 'Nguyệt Bạch', effect: 7, color: '#f6f7ff',
    attack: { name: 'Nguyệt Nha Trảm', shortLabel: 'Nguyệt Trảm', type: 'Nguyệt Kiếm · Công Kích Chính',
      damage: 24, range: 2.4, cooldown: 700, coneAngleCos: .82,
      desc: 'Lưỡi liềm trăng lạnh thấu xương, một trảm gần bằng hai trảm thường.' },
    slashQ: { name: 'Nguyệt Diệu Thiên Hàng', shortLabel: 'Thiên Hàng', type: 'Tuyệt Kỹ Trấn Phái · Nguyệt Tộc',
      damage: 18, range: 8.5, burstRadius: 3.6, cooldown: 800,
      desc: 'Nguyệt cầu giáng thế, tán thành sáu liềm trăng chém toả bốn phương.' },
    shield: { name: 'Nguyệt Hoa Bảo Chướng', shortLabel: 'Bảo Chướng', type: 'Bảo Chướng · Phòng Ngự',
      duration: 1000, reduction: .75, cooldown: 800,
      desc: 'Ánh nguyệt chặn bảy phần rưỡi sát thương — sâu nhất, nhưng chỉ một khoảnh khắc.' },
    dash: { name: 'Thác Nguyệt Thuấn Ảnh', shortLabel: 'Thác Nguyệt', type: 'Thân Pháp · Tung Thân',
      distance: 4.2, iframe: 250, cooldown: 700,
      desc: 'Nhảy qua bóng trăng — 4.2m, xa nhất võ lâm.' },
  }),
  // 8 Hắc ám — hút linh lực: kéo mạnh, hút máu cả AOE, khiên phản.
  'hac-am': makeKit({
    id: 'hac-am', name: 'Huyền Dạ', effect: 8, color: '#d2afff',
    attack: { name: 'Hắc Viêm Trảm', shortLabel: 'Hắc Trảm', type: 'Hắc Viêm · Công Kích Chính',
      damage: 19, range: 2.2, cooldown: 600, lifesteal: .3,
      desc: 'Hắc viêm nuốt ánh sáng và cả sinh lực kẻ địch.' },
    slashQ: { name: 'U Minh Hư Không', shortLabel: 'Hư Không', type: 'Tuyệt Kỹ Trấn Phái · U Minh',
      damage: 17, range: 8, burstRadius: 3.6, cooldown: 750, pull: 2.5, lifesteal: .4,
      desc: 'Song cầu hút địch 2.5m về tâm, hấp thụ bốn phần thương tích thành sinh lực.' },
    shield: { name: 'Hắc Liên Kết Giới', shortLabel: 'Hắc Liên', type: 'Kết Giới · Phản Kích',
      duration: 1400, reduction: .6, cooldown: 600, reflect: .25,
      desc: 'Hắc liên gậy lại một phần sát thương lên kẻ trúng khiên.' },
    dash: { name: 'Ám Ảnh Tung Thân', shortLabel: 'Ám Ảnh', type: 'Thân Pháp · Tung Thân',
      distance: 3.6, iframe: 300, cooldown: 650,
      desc: 'Hòa vào bóng đêm, hiện ra nơi khác chỉ còn vệt ám ảnh.' },
  }),
  // 9 Long quyền — brawler: gần, mạnh, phản quyền, dash đâm xuyên.
  'long-quyen': makeKit({
    id: 'long-quyen', name: 'Long Quyền', effect: 9, color: '#ffad60',
    attack: { name: 'Hàng Long Quyền', shortLabel: 'Long Quyền', type: 'Quyền Pháp · Công Kích Chính',
      damage: 22, range: 1.9, cooldown: 550, coneAngleCos: .6,
      desc: 'Quyền phong quét rộng hơn một trăm độ — gần thì không ai thoát.' },
    slashQ: { name: 'Thần Long Thăng Thiên', shortLabel: 'Thăng Thiên', type: 'Tuyệt Kỹ Trấn Phái · Long Môn',
      damage: 20, range: 6, burstRadius: 2.6, cooldown: 650,
      desc: 'Hỏa long xuyên đích vọt lên trời — cận chiến, nhỏ mà đặc.' },
    shield: { name: 'Song Long Hộ Thể', shortLabel: 'Song Long', type: 'Pháp Trận · Phản Kích',
      duration: 1300, reduction: .55, cooldown: 550, reflect: .35,
      desc: 'Song long phản quyền — gậy lại ba phần rưỡi sát thương kẻ trúng khiên.' },
    dash: { name: 'Long Ảnh Thuấn Bộ', shortLabel: 'Long Ảnh', type: 'Thân Pháp · Xung Kích',
      distance: 3.5, iframe: 220, cooldown: 550, damage: 15,
      desc: 'Long ảnh đâm xuyên: đứng trên đường long là chịu 15 sát thương.' },
  }),
  // 10 Xích diễm — beam xa nhất: bắn tỉa.
  'xich-diem': makeKit({
    id: 'xich-diem', name: 'Xích Diễm', effect: 10, color: '#ffb440',
    attack: { name: 'Xích Diễm Trảm', shortLabel: 'Xích Trảm', type: 'Xích Đao · Công Kích Chính',
      damage: 20, range: 2.1, cooldown: 600,
      desc: 'Xích viêm vung thành bán nguyệt, khói đỏ cuộn theo nhịp đao.' },
    slashQ: { name: 'Khai: Xích Viêm Thần Tiễn', shortLabel: 'Khai', type: 'Tuyệt Kỹ Trấn Phái · Viêm Hỏa',
      damage: 24, range: 10.5, burstRadius: 2.2, cooldown: 900,
      desc: 'Khai! Mũi tên xích viêm bắn xa nhất võ lâm, hẹp mà chính xác.' },
    shield: { name: 'Xích Viêm Trận Đồ', shortLabel: 'Trận Đồ', type: 'Pháp Trận · Phòng Ngự',
      duration: 1500, reduction: .6, cooldown: 650,
      desc: 'Trận đồ xích viêm cháy quanh thân, đao quang đỏ không ngớt.' },
    dash: { name: 'Lưu Vân Xích Bộ', shortLabel: 'Lưu Vân', type: 'Thân Pháp · Tung Thân',
      distance: 3.4, iframe: 250, cooldown: 550,
      desc: 'Bay như vân đỏ chiều tà, người qua nơi chỉ còn làn khói hồng.' },
  }),
  // 11 Kim long — all-rounder mạnh, giá trị ổn định.
  'kim-long': makeKit({
    id: 'kim-long', name: 'Kim Long', effect: 11, color: '#ffe4a0',
    attack: { name: 'Kim Long Trảo', shortLabel: 'Long Trảo', type: 'Trảo Pháp · Công Kích Chính',
      damage: 21, range: 2.3, cooldown: 600,
      desc: 'Long trảo vàng vồ xuống, vảy kim lấp lánh theo vệt chém.' },
    slashQ: { name: 'Kim Long Xuất Hải', shortLabel: 'Xuất Hải', type: 'Tuyệt Kỹ Trấn Phái · Long Tộc',
      damage: 19, range: 9, burstRadius: 3.8, cooldown: 750,
      desc: 'Kim quang trần xuyên tới điểm ngắm, long đầu xoáy dọc tia bùng vàng.' },
    shield: { name: 'Long Lân Hộ Thể', shortLabel: 'Long Lân', type: 'Pháp Trận · Phòng Ngự',
      duration: 1600, reduction: .65, cooldown: 750,
      desc: 'Long lân kết hộ giáp — vững như vảy rồng vàng.' },
    dash: { name: 'Long Đằng Thuấn Di', shortLabel: 'Long Đằng', type: 'Thân Pháp · Tung Thân',
      distance: 4, iframe: 280, cooldown: 650,
      desc: 'Long đằng vạn dặm trong chớp mắt, vệt vàng còn vương trên mây.' },
  }),
  // 12 Kiếm vũ — tốc độ: chém liên hồi quét hai người một nhịp.
  'kiem-vu': makeKit({
    id: 'kiem-vu', name: 'Kiếm Vũ', effect: 12, color: '#a9f0e9',
    attack: { name: 'Thanh Phong Nhất Kiếm', shortLabel: 'Nhất Kiếm', type: 'Kiếm Pháp · Quét Đa Mục Tiêu',
      damage: 12, range: 2.2, cooldown: 350, maxTargets: 2,
      desc: 'Kiếm nhanh nhất võ lâm — một hơi hai trảm, quét cả cặp địch đứng cạnh nhau.' },
    slashQ: { name: 'Phục Ma Kiếm Trận', shortLabel: 'Phục Ma', type: 'Tuyệt Kỹ Trấn Phái · Kiếm Vũ',
      damage: 15, range: 9, burstRadius: 4.2, cooldown: 700,
      desc: 'Lưới kiếm khí phủ kín vùng nổ, từng trảm hiện lên rồi thiêu rụi tất cả.' },
    shield: { name: 'Kiếm Khí Hộ Giới', shortLabel: 'Kiếm Giới', type: 'Kết Giới · Phản Kích',
      duration: 1500, reduction: .55, cooldown: 550, reflect: .2,
      desc: 'Kiếm giới gạy lại hai phần sát thương lên kẻ mạo phạm.' },
    dash: { name: 'Ngự Kiếm Thuấn Ảnh', shortLabel: 'Ngự Kiếm', type: 'Thân Pháp · Tung Thân',
      distance: 3.8, iframe: 300, cooldown: 600,
      desc: 'Đạp kiếm quang lướt gió, thân ảnh tan vào làn gió xanh.' },
  }),
});

// Index theo effect id cho tra nhanh; aura 0 hoặc id lạ → kit Vô Môn.
export const PK_KIT_BY_EFFECT = Object.freeze([
  PK_KITS.none, // 0 — Không
  PK_KITS['kim-lien'], PK_KITS['luu-ly'], PK_KITS['tinh-ha'], PK_KITS['hong-lien'],
  PK_KITS['dao-hoa'], PK_KITS['bich-ngoc'], PK_KITS['nguyet-bach'], PK_KITS['hac-am'],
  PK_KITS['long-quyen'], PK_KITS['xich-diem'], PK_KITS['kim-long'], PK_KITS['kiem-vu'],
]);

export function pkKitForEffect(effect) {
  return Number.isInteger(effect) && effect >= 1 && effect < PK_KIT_BY_EFFECT.length
    ? PK_KIT_BY_EFFECT[effect] : PK_KITS.none;
}

export function pkKit() {
  return PK_KITS.none;
}

export function pkTitleMask(wins) {
  return PK_TITLES.reduce((mask, title) => (wins >= title.wins ? mask | title.bit : mask), 0);
}
