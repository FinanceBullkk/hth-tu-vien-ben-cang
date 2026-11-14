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

// ===== Kit kỹ năng theo aura =====
// Mỗi aura (EFFECT_NAMES, id 1–12) một kit: tên chiêu, phân loại và mô tả riêng theo
// tông phái; số liệu TRÙNG baseline PK_SKILLS để PvP công bằng — khác biệt nằm ở tên,
// mô tả và hiệu ứng (client/src/scene/pk-vfx.js render theo effect id). Server vẫn
// resolve từ kit (`pkKitForEffect(player.effect)`) nên sau này muốn biến thể số liệu
// thì server là nơi chốt, client không tự đưa số lên.
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
  // 1 Sen kim — Kim Liên Tĩnh Tâm
  'kim-lien': makeKit({
    id: 'kim-lien', name: 'Kim Liên', effect: 1, color: '#ffd98a',
    attack: { name: 'Kim Liên Kiếm Ấn', shortLabel: 'Kiếm Ấn', type: 'Liên Hoa Kiếm Ý · Công Kích Chính',
      desc: 'Kiếm ý tòa sen chín phẩm chém xuống, đài liên vàng rực nở theo vết kiếm.' },
    slashQ: { name: 'Ngàn Tay Phật Quang', shortLabel: 'Phật Quang', type: 'Tuyệt Kỹ Trấn Phái · Phật Môn',
      desc: 'Bát bộ Phật chưởng hiện quanh điểm ngắm, hợp nhất dâng cột kim quang nở sen.' },
    shield: { name: 'Bửu Liên Hộ Thể', shortLabel: 'Bửu Liên', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Bửu liên chín phẩm xoay tròn bao thân, gánh chịu thương tích thay chủ nhân.' },
    dash: { name: 'Liên Bộ Thanh Vân', shortLabel: 'Liên Bộ', type: 'Thân Pháp · Tung Thân',
      desc: 'Nhất bộ nhất đóa liên hoa, gió cuốn cánh vàng đưa thân vượt nghìn trùng.' },
  }),
  // 2 Lưu ly — Lưu Ly Vân Thủy
  'luu-ly': makeKit({
    id: 'luu-ly', name: 'Lưu Ly', effect: 2, color: '#7ee8e0',
    attack: { name: 'Lưu Ly Thủy Trảm', shortLabel: 'Thủy Trảm', type: 'Thủy Kiếm · Công Kích Chính',
      desc: 'Lưỡi nước lưu ly trong vắt quét ngang, sóng gương loang theo dấu kiếm.' },
    slashQ: { name: 'Thủy Long Phá Kính', shortLabel: 'Thủy Long', type: 'Tuyệt Kỹ Trấn Phái · Thủy Tông',
      desc: 'Thủy long lượn tới điểm ngắm hóa Bích Lạc, hút mọi thứ vào rồi bùng như gương vỡ.' },
    shield: { name: 'Lưu Ly Kính Giới', shortLabel: 'Kính Giới', type: 'Kết Giới · Phòng Ngự',
      desc: 'Gương lưu ly kết thành giới, va vào là gợn sóng loang vỡ tan sát khí.' },
    dash: { name: 'Vân Thủy Tung Thân', shortLabel: 'Vân Thủy', type: 'Thân Pháp · Tung Thân',
      desc: 'Hóa thân thành làn nước chảy qua khe đá, đến nơi lại ngưng thành hình.' },
  }),
  // 3 Tinh hà — Tinh Hà Lữ Khách
  'tinh-ha': makeKit({
    id: 'tinh-ha', name: 'Tinh Hà', effect: 3, color: '#cdd8ff',
    attack: { name: 'Tinh Hà Nhất Trảm', shortLabel: 'Tinh Trảm', type: 'Tinh Kiếm · Công Kích Chính',
      desc: 'Rút một dải ngân hà vung xuống làm lưỡi sao băng chém tới.' },
    slashQ: { name: 'Vô Lượng Tinh Khung', shortLabel: 'Tinh Khung', type: 'Tuyệt Kỹ Trấn Phái · Tinh Tô',
      desc: 'Vòm sao vô lượng bao trùm điểm ngắm, tinh tú xoay chậm đốn cả dòng chảy thời gian.' },
    shield: { name: 'Thiên Hà Tinh Trận', shortLabel: 'Tinh Trận', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Ba vòng thiên hà xoay ngược nhau, sao chổi vờn quanh ngăn mọi ám chiêu.' },
    dash: { name: 'Thải Vân Truy Tinh', shortLabel: 'Truy Tinh', type: 'Thân Pháp · Tung Thân',
      desc: 'Đạp mây ngũ sắc đuổi theo sao băng, một chớp mắt đã qua ngàn dặm.' },
  }),
  // 4 Hỏa diễm — Hồng Liên Hỏa Vũ
  'hong-lien': makeKit({
    id: 'hong-lien', name: 'Hồng Liên', effect: 4, color: '#ffba87',
    attack: { name: 'Hỏa Liên Trảm', shortLabel: 'Hỏa Trảm', type: 'Hỏa Đao · Công Kích Chính',
      desc: 'Hỏa liên dưới chân bùng lên thành vệt chém, tàn lửa tung bay ngược trời.' },
    slashQ: { name: 'Cực Đại: Thiên Thạch', shortLabel: 'Thiên Thạch', type: 'Tuyệt Kỹ Trấn Phái · Hỏa Tông',
      desc: 'Triệu hồi thiên thạch cháy từ trời giáng xuống điểm ngắm, chấn địa nổ tung.' },
    shield: { name: 'Hỏa Yên Hộ Thể', shortLabel: 'Hỏa Yên', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Hỏa yên quấn thành vòng tròn xoay tít, ai lại gần bị thiêu thành tro.' },
    dash: { name: 'Báo Viêm Thuấn Bộ', shortLabel: 'Báo Viêm', type: 'Thân Pháp · Tung Thân',
      desc: 'Bùng cháy lao về phía trước như bão lửa, nơi đi qua còn vương tàn hồng.' },
  }),
  // 5 Đào hoa — Đào Hoa Tri Kỷ
  'dao-hoa': makeKit({
    id: 'dao-hoa', name: 'Đào Hoa', effect: 5, color: '#ffa8cc',
    attack: { name: 'Đào Hoa Trảm', shortLabel: 'Hoa Trảm', type: 'Kiếm Pháp · Công Kích Chính',
      desc: 'Cánh đào hồng bay theo vệt kiếm, đẹp mà không hề dịu dàng.' },
    slashQ: { name: 'Đào Nguyên Mê Chướng', shortLabel: 'Mê Chướng', type: 'Tuyệt Kỹ Trấn Phái · Đào Tông',
      desc: 'Sương đào kết cảnh giới mê lạc, vòi xoáy cánh hoa cuộn lại thành một trảm.' },
    shield: { name: 'Đào Nguyên Kết Giới', shortLabel: 'Kết Giới', type: 'Kết Giới · Phòng Ngự',
      desc: 'Trận đào kết giới hồng nhạt bao quanh, cánh hoa xoay tít che chắn sát khí.' },
    dash: { name: 'Phi Hoa Thân Pháp', shortLabel: 'Phi Hoa', type: 'Thân Pháp · Tung Thân',
      desc: 'Thân theo cánh hoa phiêu nhiên qua gió, người chưa thấy hoa đã rơi đầy.' },
  }),
  // 6 Bích ngọc — Bích Ngọc Thanh Phong
  'bich-ngoc': makeKit({
    id: 'bich-ngoc', name: 'Bích Ngọc', effect: 6, color: '#7ee8a0',
    attack: { name: 'Trúc Diệp Kiếm', shortLabel: 'Trúc Kiếm', type: 'Trúc Kiếm · Công Kích Chính',
      desc: 'Lá ngọc xanh mướt làm kiếm, một trảm mang theo hơi thở rừng trúc.' },
    slashQ: { name: 'Bích Trúc Lâm Hiện', shortLabel: 'Trúc Lâm', type: 'Tuyệt Kỹ Trấn Phái · Trúc Sơn',
      desc: 'Gọi rừng trúc mọc kín quanh điểm ngắm, ngọn nào cũng phóng tiễn xanh về tâm.' },
    shield: { name: 'Ngọc Trúc Hộ Thể', shortLabel: 'Ngọc Trúc', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Vành lá ngọc xoay quanh thân cứng như trúc già, gió lay không động.' },
    dash: { name: 'Thanh Phong Tung Thân', shortLabel: 'Thanh Phong', type: 'Thân Pháp · Tung Thân',
      desc: 'Một hơi thanh phong thổi qua rừng trúc, người đã xa vạn bước.' },
  }),
  // 7 Nguyệt bạch — Nguyệt Bạch Tri Âm
  'nguyet-bach': makeKit({
    id: 'nguyet-bach', name: 'Nguyệt Bạch', effect: 7, color: '#f6f7ff',
    attack: { name: 'Nguyệt Nha Trảm', shortLabel: 'Nguyệt Trảm', type: 'Nguyệt Kiếm · Công Kích Chính',
      desc: 'Lưỡi liềm trăng bạc rút khỏi không trung, vệt sáng lạnh thấu xương.' },
    slashQ: { name: 'Nguyệt Diệu Thiên Hàng', shortLabel: 'Thiên Hàng', type: 'Tuyệt Kỹ Trấn Phái · Nguyệt Tộc',
      desc: 'Nguyệt cầu giáng thế lơ lửng, tán thành sáu liềm trăng chém toả bốn phương.' },
    shield: { name: 'Nguyệt Hoa Bảo Chướng', shortLabel: 'Bảo Chướng', type: 'Bảo Chướng · Phòng Ngự',
      desc: 'Vòng trăng tròn treo bao thân, ánh nguyệt dịu mà ngăn nổi vạn quân.' },
    dash: { name: 'Thác Nguyệt Thuấn Ảnh', shortLabel: 'Thác Nguyệt', type: 'Thân Pháp · Tung Thân',
      desc: 'Nhảy qua bóng trăng để lại dư ảnh bạc, đến nơi người còn chưa kịp hay.' },
  }),
  // 8 Hắc ám — Huyền Dạ Du Hành
  'hac-am': makeKit({
    id: 'hac-am', name: 'Huyền Dạ', effect: 8, color: '#d2afff',
    attack: { name: 'Hắc Viêm Trảm', shortLabel: 'Hắc Trảm', type: 'Hắc Viêm · Công Kích Chính',
      desc: 'Hắc viêm lõi tím quét thành vệt chém, nơi đi qua ánh sáng đều bị nuốt.' },
    slashQ: { name: 'U Minh Hư Không', shortLabel: 'Hư Không', type: 'Tuyệt Kỹ Trấn Phái · U Minh',
      desc: 'Song cầu âm dương hút vào một, nổ thành tử viêm sét tối nuốt gọn vùng đất.' },
    shield: { name: 'Hắc Liên Kết Giới', shortLabel: 'Hắc Liên', type: 'Kết Giới · Phòng Ngự',
      desc: 'Hắc liên nở kết giới u ám, rune cổ lục lăng xoay ngược ngăn chiêu địch.' },
    dash: { name: 'Ám Ảnh Tung Thân', shortLabel: 'Ám Ảnh', type: 'Thân Pháp · Tung Thân',
      desc: 'Hòa mình vào bóng đêm rồi hiện ra nơi khác, chỉ để lại vệt ám ảnh.' },
  }),
  // 9 Long quyền — song long hỏa quấn thân
  'long-quyen': makeKit({
    id: 'long-quyen', name: 'Long Quyền', effect: 9, color: '#ffad60',
    attack: { name: 'Hàng Long Quyền', shortLabel: 'Long Quyền', type: 'Quyền Pháp · Công Kích Chính',
      desc: 'Một quyền như long trảo vồ mồi, hỏa khí quấn quanh nắm đấm.' },
    slashQ: { name: 'Thần Long Thăng Thiên', shortLabel: 'Thăng Thiên', type: 'Tuyệt Kỹ Trấn Phái · Long Môn',
      desc: 'Hỏa long từ nắm đấm bùng ra, lao xuyên điểm ngắm rồi vọt thẳng lên trời.' },
    shield: { name: 'Song Long Hộ Thể', shortLabel: 'Song Long', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Song long lửa quấn thân ngược chiều, vương miện lửa chống mọi sát chiêu.' },
    dash: { name: 'Long Ảnh Thuấn Bộ', shortLabel: 'Long Ảnh', type: 'Thân Pháp · Tung Thân',
      desc: 'Thân hóa long ảnh lao vọt, đường đi còn sót lại vệt hỏa long.' },
  }),
  // 10 Xích diễm — Xích Diễm Lưu Vân
  'xich-diem': makeKit({
    id: 'xich-diem', name: 'Xích Diễm', effect: 10, color: '#ffb440',
    attack: { name: 'Xích Diễm Trảm', shortLabel: 'Xích Trảm', type: 'Xích Đao · Công Kích Chính',
      desc: 'Xích viêm đỏ rực vung thành bán nguyệt, khói đỏ cuộn theo nhịp đao.' },
    slashQ: { name: 'Khai: Xích Viêm Thần Tiễn', shortLabel: 'Khai', type: 'Tuyệt Kỹ Trấn Phái · Viêm Hỏa',
      desc: 'Khai! Tích lực thành mũi tên xích viêm bắn xuyên tới điểm ngắm, nổ rực khắp vùng.' },
    shield: { name: 'Xích Viêm Trận Đồ', shortLabel: 'Trận Đồ', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Trận đồ xích viêm cháy quanh thân, đao quang đỏ xoay không ngớt.' },
    dash: { name: 'Lưu Vân Xích Bộ', shortLabel: 'Lưu Vân', type: 'Thân Pháp · Tung Thân',
      desc: 'Bay như vân đỏ chiều tà, người qua nơi chỉ còn làn khói hồng.' },
  }),
  // 11 Kim long — Kim Long Nguyệt Ảnh
  'kim-long': makeKit({
    id: 'kim-long', name: 'Kim Long', effect: 11, color: '#ffe4a0',
    attack: { name: 'Kim Long Trảo', shortLabel: 'Long Trảo', type: 'Trảo Pháp · Công Kích Chính',
      desc: 'Long trảo vàng vồ xuống, vảy kim lấp lánh theo vệt chém.' },
    slashQ: { name: 'Kim Long Xuất Hải', shortLabel: 'Xuất Hải', type: 'Tuyệt Kỹ Trấn Phái · Long Tộc',
      desc: 'Kim quang trần xuyên tới điểm ngắm, long đầu xoáy dọc tia rồi bùng vàng lấp lánh.' },
    shield: { name: 'Long Lân Hộ Thể', shortLabel: 'Long Lân', type: 'Pháp Trận · Phòng Ngự',
      desc: 'Long lân vàng kết thành hộ giáp xoay quanh, long uy trấn áp mọi sát khí.' },
    dash: { name: 'Long Đằng Thuấn Di', shortLabel: 'Long Đằng', type: 'Thân Pháp · Tung Thân',
      desc: 'Long đằng vạn dặm chỉ trong chớp mắt, vệt vàng còn vương trên mây.' },
  }),
  // 12 Kiếm vũ — Thanh Phong Kiếm Vũ
  'kiem-vu': makeKit({
    id: 'kiem-vu', name: 'Kiếm Vũ', effect: 12, color: '#a9f0e9',
    attack: { name: 'Thanh Phong Nhất Kiếm', shortLabel: 'Nhất Kiếm', type: 'Kiếm Pháp · Công Kích Chính',
      desc: 'Nhứ kiếm như gió mát lướt qua, kẻ trúng đòn mới biết kiếm đã ra.' },
    slashQ: { name: 'Phục Ma Kiếm Trận', shortLabel: 'Phục Ma', type: 'Tuyệt Kỹ Trấn Phái · Kiếm Vũ',
      desc: 'Lưới kiếm khí phủ kín vùng nổ, từng trảm hiện lên rồi thiêu rụi tất cả.' },
    shield: { name: 'Kiếm Khí Hộ Giới', shortLabel: 'Kiếm Giới', type: 'Kết Giới · Phòng Ngự',
      desc: 'Kiếm khí xanh kết thành giới tròn, phi kiếm bay vòng quanh không lỗ hổng.' },
    dash: { name: 'Ngự Kiếm Thuấn Ảnh', shortLabel: 'Ngự Kiếm', type: 'Thân Pháp · Tung Thân',
      desc: 'Đạp lên kiếm quang lướt gió, thân ảnh tan vào làn gió xanh.' },
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
