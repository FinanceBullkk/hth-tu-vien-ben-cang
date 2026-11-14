// HUD bãi đá: dải dưới đáy dùng chung lớp .crh như máy gạt cần. Gồm ba loại đá (kèm kho đá thường), thanh lực có vùng
// Khá/Chuẩn, vạch máu của tảng đang đập, nút lớn Lấy đá / Đập (cũng là phím Space), ví, bảng tỉ lệ ngọc gập được,
// và màn ngọc giữa màn hình khi đá vỡ. Chỉ vẽ; luật và tiền ở server. CSS ở stone.css.
import { GEM_TIER_NAMES, GRADE_LABEL, STONE, STONE_GEMS, STONE_KINDS, STONE_WEIGHT_TOTAL } from '../../../shared/stone.js';
import { h } from './dom.js';

const REVEAL_MS = 2800;
const GRADE_MS = 650;

const pct = (w) => {
  if (!w) return '–';
  const p = (w / STONE_WEIGHT_TOTAL) * 100;
  return `${p < 1 ? p.toFixed(1) : Math.round(p)}%`;
};

const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class StoneHud {
  constructor({ onKind, onAct, onExit }) {
    this.stockText = h('span', { class: 'stone-stock' });
    this.kinds = STONE_KINDS.map((spec, i) => {
      const sub = h('small');
      const btn = h('button', { class: `stone-kind k${i}`, type: 'button', role: 'radio', onclick: () => onKind(i), title: `Phím ${i + 1}` },
        h('b', {}, spec.name), sub);
      return { btn, sub };
    });
    this.needle = h('i', { class: 'stone-needle' });
    this.power = h('div', { class: 'stone-power', role: 'img', 'aria-label': 'Thanh lực: bấm khi kim nằm trong vùng vàng' },
      h('span', { class: 'stone-zone good', style: `left:${STONE.goodMin * 100}%;width:${(STONE.perfectMin - STONE.goodMin) * 100}%` }),
      h('span', { class: 'stone-zone perfect', style: `left:${STONE.perfectMin * 100}%;width:${(1 - STONE.perfectMin) * 100}%` }),
      this.needle);
    this.hp = h('div', { class: 'stone-hp', 'aria-label': 'Độ cứng còn lại của tảng đá' });
    this.gradeTag = h('em', { class: 'stone-grade', hidden: true });
    this.actLabel = h('b');
    this.actBtn = h('button', { class: 'stone-act', type: 'button', onclick: onAct }, this.actLabel, h('kbd', {}, 'Space'));
    this.teu = h('b', { class: 'crh-teu' });
    this.msg = h('p', { class: 'crh-msg', 'aria-live': 'polite' });
    this.odds = h('details', { class: 'stone-odds' },
      h('summary', {}, 'Tỉ lệ ngọc'),
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Ngọc'), h('th', {}, 'TEU'), STONE_KINDS.map((k) => h('th', {}, k.name)))),
        h('tbody', {}, [...STONE_GEMS.keys()].reverse().map((g) => h('tr', {},
          h('td', {}, h('i', { class: 'stone-dot', style: `background:${STONE_GEMS[g].color}` }), STONE_GEMS[g].name),
          h('td', {}, String(STONE_GEMS[g].teu)),
          STONE_KINDS.map((k) => h('td', {}, pct(k.weights[g]))))))),
      h('small', {}, `Đá thường miễn phí, cứ ${STONE.freeRegenMs / 60_000} phút thêm một tảng (tối đa ${STONE.freeMax}); `
        + `đập mọi nhát đều Chuẩn được thêm ${STONE.deftBonus} TEU. Đá mua bằng TEU hoàn vốn trung bình khoảng 95%, đập khéo chỉ nhanh hơn.`));
    this.root = h('section', { class: 'crh stone-hud', hidden: true, 'aria-label': 'Bãi đá' },
      h('div', { class: 'crh-top' }, h('strong', { class: 'crh-title' }, 'Bãi đá'), this.stockText,
        h('button', { class: 'crh-btn ghost', type: 'button', onclick: onExit }, 'Rời bãi')),
      h('div', { class: 'stone-kinds', role: 'radiogroup', 'aria-label': 'Loại đá' }, this.kinds.map((k) => k.btn)),
      h('div', { class: 'crh-bar' }, h('div', { class: 'stone-meter' }, this.power, this.hp, this.gradeTag),
        this.actBtn, h('span', { class: 'crh-wallet' }, this.teu, ' TEU')),
      this.msg, this.odds);
    this.revealTag = h('em');
    this.revealName = h('b');
    this.revealTeu = h('span');
    this.revealBonus = h('small');
    this.revealEl = h('div', { class: 'crh-reveal stone-reveal', hidden: true, 'aria-live': 'polite' },
      this.revealTag, this.revealName, this.revealTeu, this.revealBonus);
    document.body.append(this.root, this.revealEl);
    this.revealTimer = 0;
    this.gradeTimer = 0;
  }

  show() {
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
    this.revealEl.hidden = true;
  }

  setMessage(text, tone = '') {
    this.msg.textContent = text;
    this.msg.dataset.tone = tone;
  }

  /** Kim thanh lực (0..1); null khi chưa có đá trên đe. */
  setPower(v) {
    this.power.classList.toggle('idle', v == null);
    this.needle.style.left = `${(v ?? 0) * 100}%`;
  }

  /** Chữ Chuẩn/Khá/Yếu nảy lên trên thanh lực sau mỗi nhát. */
  flashGrade(grade) {
    this.gradeTag.textContent = `${GRADE_LABEL[grade]}!`;
    this.gradeTag.dataset.grade = grade;
    this.gradeTag.hidden = true;
    void this.gradeTag.offsetWidth; // Chạy lại hoạt ảnh khi hai nhát liền nhau.
    this.gradeTag.hidden = false;
    clearTimeout(this.gradeTimer);
    this.gradeTimer = setTimeout(() => { this.gradeTag.hidden = true; }, GRADE_MS);
  }

  /** Màn ngọc giữa màn hình: bậc hiếm, tên ngọc theo màu, số TEU và thưởng khéo tay. */
  reveal(gem, gain, bonus = 0) {
    const info = STONE_GEMS[gem];
    this.revealTag.textContent = GEM_TIER_NAMES[info.tier];
    this.revealName.textContent = info.name;
    this.revealName.style.color = info.color;
    this.revealTeu.textContent = gain > 0 ? `+${gain} TEU` : 'Không được gì';
    this.revealBonus.textContent = bonus ? `Khéo tay +${bonus}` : '';
    this.revealEl.dataset.tier = String(info.tier);
    this.revealEl.dataset.tone = gain > 0 ? 'win' : 'lose';
    clearTimeout(this.revealTimer);
    this.revealEl.hidden = true;
    void this.revealEl.offsetWidth;
    this.revealEl.hidden = this.root.hidden;
    this.revealTimer = setTimeout(() => { this.revealEl.hidden = true; }, info.tier >= STONE.shoutTier ? REVEAL_MS * 1.5 : REVEAL_MS);
  }

  /**
   * kind: loại đá đang chọn; stone: tảng đang trên đe ({hp, maxHp}) hoặc null; busy: đang chờ server;
   * stock/nextAt: kho đá thường; now: giờ server để đếm ngược.
   */
  render({ kind, teu, stone, busy, stock, nextAt, now }) {
    this.kinds.forEach(({ btn, sub }, i) => {
      const spec = STONE_KINDS[i];
      const on = i === kind;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-checked', String(on));
      btn.disabled = Boolean(stone) && !on;
      sub.textContent = spec.price ? `${spec.price} TEU` : `Miễn phí · còn ${stock}`;
      btn.classList.toggle('broke', spec.price ? (teu ?? 0) < spec.price : stock < 1);
    });
    this.stockText.textContent = stock >= STONE.freeMax ? `Kho đá thường đầy (${stock})` : `Tảng mới sau ${clock(nextAt - now)}`;
    const maxHp = stone?.maxHp ?? STONE_KINDS[kind].hp;
    const hp = stone?.hp ?? 0;
    if (this.hp.childElementCount !== maxHp) this.hp.replaceChildren(...Array.from({ length: maxHp }, () => h('i')));
    [...this.hp.children].forEach((pip, i) => pip.classList.toggle('on', i < hp));
    this.actLabel.textContent = stone ? 'Đập!' : 'Lấy đá';
    this.actBtn.classList.toggle('strike', Boolean(stone));
    this.actBtn.disabled = busy;
    this.teu.textContent = String(teu ?? 0);
  }
}
