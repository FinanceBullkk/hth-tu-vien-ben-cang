import { h } from './dom.js';

const pct = (n, max) => `${Math.max(0, Math.min(100, max ? (n / max) * 100 : 0))}%`;

export class PkPanel {
  constructor(app, activity) {
    this.app = app;
    this.activity = activity;
    this.prevPhase = null;
    this.prevMatchId = null;
    this.bannerTimeout = null;

    // 1. Đấu thủ A (Bên trái) - Khung ngọc bích cổ phong Võ Lâm Chi Mộng
    this.aBadge = h('span', { class: 'pk-fighter-badge' }, 'TIÊN HIỆP');
    this.aName = h('span', { class: 'pk-fighter-name' });
    this.aMeta = h('div', { class: 'pk-fighter-meta' }, this.aBadge, this.aName);
    this.aBuffer = h('div', { class: 'pk-bar-buffer' });
    this.aBar = h('div', { class: 'pk-bar-fill' });
    this.aHpText = h('span', { class: 'pk-hp-text' }, '100 / 100');
    this.aWrap = h('div', { class: 'pk-bar-wrap' }, this.aBuffer, this.aBar, this.aHpText);
    this.aHealth = h('div', { class: 'pk-health' }, this.aMeta, this.aWrap);

    this.status = h('p', { class: 'pk-status', role: 'status' });
    this.topHud = h('div', { class: 'pk-top-hud' }, this.aHealth, this.status);

    // =========================================================================
    // 5. CÁC Ô KỸ NĂNG VÀ PHÍM TẮT THỰC TẾ (REAL INTERACTIVE SLOTS)
    // =========================================================================
    this.tooltip = h('div', { class: 'vlcm-tooltip-card', hidden: true });

    const showTip = (data) => {
      if (!data) return;
      this.tooltip.innerHTML = '';
      const header = h(
        'div',
        { class: 'vlcm-tooltip-header' },
        h('span', { class: 'vlcm-tooltip-title' }, data.name),
        h('span', { class: 'vlcm-tooltip-hotkey' }, data.hotkey)
      );
      const typeEl = h('div', { class: 'vlcm-tooltip-type' }, data.type);
      const statsEl = h('div', { class: 'vlcm-tooltip-stats' }, data.stats);
      const descEl = h('div', { class: 'vlcm-tooltip-desc' }, data.desc);
      this.tooltip.append(header, typeEl, statsEl, descEl);
      this.tooltip.hidden = false;
    };

    const hideTip = () => {
      this.tooltip.hidden = true;
    };

    const createVlcmSlot = ({
      slotClass,
      iconSrc,
      hotkeyText,
      shortLabel,
      title,
      action,
      srText = null,
      tipData = null,
    }) => {
      const iconImg = h('img', { class: 'vlcm-slot-icon', src: iconSrc, alt: title, draggable: 'false' });
      const hotkey = hotkeyText
        ? h('span', { class: 'vlcm-slot-hotkey' }, hotkeyText)
        : null;
      const cdCurtain = h('div', { class: 'vlcm-cd-curtain', hidden: true },
        h('span', { class: 'vlcm-cd-timer' })
      );
      const flash = h('div', { class: 'vlcm-slot-flash' });
      const sr = srText ? h('span', { class: 'vlcm-sr-text' }, srText) : null;
      const label = h('span', { class: 'vlcm-slot-label' }, shortLabel);

      const btn = h(
        'button',
        {
          class: `vlcm-slot-btn ${slotClass}`,
          type: 'button',
          title,
          onClick: (e) => {
            flash.classList.remove('active');
            void flash.offsetWidth;
            flash.classList.add('active');
            action(e);
          },
          onMouseEnter: () => showTip(tipData),
          onMouseLeave: hideTip,
        },
        iconImg,
        hotkey,
        label,
        cdCurtain,
        flash,
        sr
      );

      return { btn, cdCurtain, cdTimer: cdCurtain.firstChild, iconImg, flash };
    };

    // Slot 1 (X=136): Chiêu 1 - Cửu Thiên Lôi Kiếm / Đánh thường (Phím 1 / Chuột Trái)
    // BẮT BUỘC chứa chuỗi "Đánh thường" để khớp 100% bộ kiểm thử tự động của dự án
    this.strikeSlot = createVlcmSlot({
      slotClass: 'vlcm-slot-1',
      iconSrc: '/ui/vlcm/designed/skill_1_strike.png',
      hotkeyText: '1',
      shortLabel: 'Đánh thường',
      title: 'Cửu Thiên Lôi Kiếm (Đánh thường · Phím 1 / Chuột Trái)',
      srText: 'Đánh thường',
      action: () => activity.use('strike'),
      tipData: {
        name: 'Cửu Thiên Lôi Kiếm',
        hotkey: 'Phím 1 / Chuột Trái (M1)',
        type: 'Kiếm Pháp · Công Kích Chính',
        stats: 'Sát thương: 20 · Phạm vi: 2.2m · Hồi chiêu: 0.5s',
        desc: 'Dẫn Cửu Thiên Lôi Điện vào kiếm phong, xuất chiêu như sấm sét chớp nhoáng trảm phá hư không.',
      },
    });
    this.attackBtn = this.strikeSlot.btn;

    // Slot 2: Vạn Kiếm Quy Tông
    this.slashQSlot = createVlcmSlot({
      slotClass: 'vlcm-slot-3',
      iconSrc: '/ui/vlcm/designed/skill_3_van_kiem.png',
      hotkeyText: '2',
      shortLabel: 'Kiếm khí',
      title: 'Vạn Kiếm Quy Tông (Kim Long Xuất Hải · Phím 2)',
      action: () => activity.use('slashQ'),
      tipData: {
        name: 'Vạn Kiếm Quy Tông',
        hotkey: 'Phím 2',
        type: 'Tuyệt Kỹ Trấn Phái · Kiếm Tông',
        stats: 'AOE: nổ tại điểm ngắm ≤8.5m, bán kính 4m · 16 sát thương/mục tiêu · Hồi 0.5s',
        desc: 'Triệu hoán ngàn vạn phi kiếm hộ thân hợp nhất cùng Hoàng Kim Cự Long càn quét đại địa.',
      },
    });
    this.slashQBtn = this.slashQSlot.btn;

    // Slot 3: Bát Quái Hộ Thể
    this.shieldSlot = createVlcmSlot({
      slotClass: 'vlcm-slot-4',
      iconSrc: '/ui/vlcm/designed/skill_4_shield.png',
      hotkeyText: '3',
      shortLabel: 'Hộ thể',
      title: 'Bát Quái Hộ Thể (Trận Đồ Hộ Thân · Phím 3)',
      action: () => activity.use('shield'),
      tipData: {
        name: 'Bát Quái Hộ Thể',
        hotkey: 'Phím 3',
        type: 'Pháp Trận · Phòng Ngự',
        stats: 'Giảm 60% sát thương trong 1.6s · Hồi chiêu: 0.5s',
        desc: 'Hiển hóa Thái Cực Bát Quái trận đồ với tứ đại phi kiếm hộ thân xoay quanh ngăn chặn ám chiêu.',
      },
    });
    this.shieldBtn = this.shieldSlot.btn;

    // Slot 4: Ngự Kiếm Phi Thần
    this.dashSlot = createVlcmSlot({
      slotClass: 'vlcm-slot-5',
      iconSrc: '/ui/vlcm/designed/skill_5_dash.png',
      hotkeyText: '4',
      shortLabel: 'Lướt né',
      title: 'Ngự Kiếm Phi Thần (Lướt kiếm thần tốc · Phím 4)',
      action: () => activity.use('dash'),
      tipData: {
        name: 'Ngự Kiếm Phi Thần',
        hotkey: 'Phím 4',
        type: 'Thân Pháp · Thuấn Di',
        stats: 'Lướt 3.5m · Né đòn trong 0.25s · Hồi chiêu: 0.5s',
        desc: 'Chân đạp kiếm quang lướt gió xé toạc cự ly trong chớp mắt, thoát khỏi vòng vây hiểm trở.',
      },
    });
    this.dashBtn = this.dashSlot.btn;

    // =========================================================================
    // 6. CÁC NÚT PHỤ TRỢ ĐẤU TRƯỜNG & KHUNG CHÍNH (DESIGNED WUXIA HUD)
    // =========================================================================

    // Khung Bottom Console chính: Quả cầu tím ở giữa và các kỹ năng
    this.skills = h(
      'div',
      { class: 'pk-skills' },
      this.attackBtn,
      this.slashQBtn,
      this.shieldBtn,
      this.dashBtn,
      // 7. Bảng tooltip chiêu thức
      this.tooltip
    );

    // =========================================================================
    // 7. BÀN PHÍM TƯƠNG TÁC THỜI GIAN THỰC (KEYBOARD EVENT VISUALIZER)
    // =========================================================================
    this.keyMap = {
      Digit1: this.attackBtn,
      Digit2: this.slashQBtn,
      Digit3: this.shieldBtn,
      Digit4: this.dashBtn,
    };

    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, [role="dialog"]')) return;
      const btn = this.keyMap[e.code] || this.keyMap[e.key];
      if (btn) btn.classList.add('key-pressed');
    });

    window.addEventListener('keyup', (e) => {
      const btn = this.keyMap[e.code] || this.keyMap[e.key];
      if (btn) btn.classList.remove('key-pressed');
    });

    // Tâm ngắm phép thuật
    this.reticle = h('div', { class: 'pk-reticle', 'aria-hidden': true, hidden: true }, '✦');

    // Banner thông báo khai chiến & đại thắng
    this.banner = h('div', { class: 'pk-banner' }, '');

    this.root = h(
      'section',
      { class: 'pk-hud', 'aria-label': 'Võ Lâm Chi Mộng HUD' },
      this.topHud,
      this.skills,
      this.reticle,
      this.banner
    );
    this.root.hidden = true;
    document.body.append(this.root);

    // Khởi tạo trạng thái tự do dùng kỹ năng
    this.updateFreeRoam();
  }

  showBanner(text, duration = 2000) {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.banner.textContent = text;
    this.banner.classList.add('show');
    this.bannerTimeout = setTimeout(() => {
      this.banner.classList.remove('show');
      this.bannerTimeout = null;
    }, duration);
  }

  updateFreeRoam(cooldowns = {}) {
    this.topHud.hidden = false;
    const state = this.activity.status;
    this.aName.textContent = this.app.myName ?? 'Bạn';
    this.aBar.style.width = pct(state.hp, state.maxHp);
    this.aBuffer.style.width = pct(state.hp, state.maxHp);
    this.aHpText.textContent = `${state.hp} / ${state.maxHp}`;
    const now = this.app.net.now();
    this.status.textContent = state.protectedUntil > now
      ? `BẢO HỘ ${Math.ceil((state.protectedUntil - now) / 1000)}s`
      : state.satKhiUntil > now ? `SÁT KHÍ ${Math.ceil((state.satKhiUntil - now) / 1000)}s` : '';
    this.skills.hidden = false;
    this.reticle.hidden = true;
    const updateSlot = (slot, cdKey) => {
      const cd = Math.max(0, (cooldowns[cdKey] ?? 0) - now);
      const onCd = cd > 0;
      slot.btn.disabled = onCd;
      if (onCd) {
        // Tổng thời gian hồi = lần đầu thấy chiêu đang hồi; --cd (1 → 0) điều khiển vệt tối quét tròn trong CSS.
        slot.cdTotal = Math.max(slot.cdTotal ?? 0, cd);
        slot.cdCurtain.style.setProperty('--cd', (cd / slot.cdTotal).toFixed(3));
        slot.cdCurtain.hidden = false;
        slot.cdTimer.textContent = (cd / 1000).toFixed(1);
        slot.btn.dataset.cooldown = `${(cd / 1000).toFixed(1)}s`;
      } else {
        slot.cdTotal = 0;
        slot.cdCurtain.hidden = true;
        slot.cdTimer.textContent = '';
        slot.btn.dataset.cooldown = '';
      }
    };

    updateSlot(this.strikeSlot, 'strike');
    updateSlot(this.slashQSlot, 'slashQ');
    updateSlot(this.shieldSlot, 'shield');
    updateSlot(this.dashSlot, 'dash');
  }

}
