// HUD câu cá tối giản: mặt nước là chính, màn hình chỉ có một dòng lời dẫn theo từng pha.
// Không có nút hành động: chạm ở đâu trên màn hình cũng được, kể cả trên điện thoại.
import { BAITS, FISH, fishForBait } from '../../../shared/fish.js';
import { GOLDEN_HOUR, TROPHY, streakBonus } from '../../../shared/fish-bonus.js';
import { $, h } from './dom.js';
import { fishPortraitSvg } from './fish-portrait.js';
import { FishingArcGauge } from './fishing-arc-gauge.js';
import { FishingSuppliesView } from './fishing-supplies.js';

const NEEDLE_SPAN_PX = 520; // quãng kéo tương ứng toàn bộ vòng cung
const BAIT_NOTE_MS = 3500;
const CATCH_MS = 4600;

const mmss = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const pointerOf = (e) => ({ x: e.clientX, y: e.clientY, clientX: e.clientX, touch: e.pointerType === 'touch' });

export class FishingPanel {
  constructor({ onPress, onMove, onRelease, onBait, onExit, onBuy, onThinh }) {
    this.gauge = new FishingArcGauge();
    this.supplies = new FishingSuppliesView({ onBuy, onThinh });
    this.tally = h('p', { class: 'fish-tally' });
    this.company = h('p', { class: 'fish-company' });
    this.golden = h('p', { class: 'fish-golden' });
    this.hint = h('p', { class: 'fish-hint', role: 'status' });
    this.baitNote = h('p', { class: 'fish-bait-note' });
    this.catchEl = h('div', { class: 'fish-catch', hidden: true });
    this.baitButtons = new Map(BAITS.map((bait) => [bait.id, h('button', {
      type: 'button',
      onClick: () => { onBait(bait.id); this.root.focus({ preventScroll: true }); },
    }, bait.name.replace('Mồi ', ''))]));
    this.baits = h('div', { class: 'fish-baits', role: 'group', 'aria-label': 'Chọn mồi' },
      h('span', {}, 'Mồi'), ...this.baitButtons.values(), this.supplies.thinhBtn);

    this.root = h('section', { class: 'fish-hud', hidden: true, tabIndex: -1, 'aria-label': 'Câu cá ở hồ' },
      h('div', { class: 'fish-corner' }, this.tally, this.golden, this.company, this.supplies.orders),
      h('div', { class: 'fish-top-right' }, this.supplies.shopBtn, h('button', { type: 'button', class: 'fish-exit', onClick: onExit }, 'Về bờ')),
      this.supplies.shop,
      this.gauge.root,
      this.catchEl,
      h('div', { class: 'fish-dock' }, this.baitNote, this.hint, this.baits),
    );
    $('rhythmLayer').append(this.root);

    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, .fish-shop')) return;
      this.root.setPointerCapture(e.pointerId);
      this.root.focus({ preventScroll: true });
      onPress(pointerOf(e));
    });
    this.root.addEventListener('pointermove', (e) => onMove(pointerOf(e)));
    this.root.addEventListener('pointerup', (e) => {
      if (!e.target.closest('button, .fish-shop')) onRelease();
    });
    this.root.addEventListener('pointercancel', () => {});
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  #span() {
    return Math.min(NEEDLE_SPAN_PX, innerWidth * 0.8);
  }

  /** Vị trí ngang trên màn hình thành 0..1 quanh giữa màn hình (chuột). */
  spanValue(clientX) {
    const span = this.#span();
    return Math.min(1, Math.max(0, (clientX - (innerWidth - span) / 2) / span));
  }

  /** Quãng kéo bằng điểm ảnh thành độ dịch trên vòng cung (cảm ứng). */
  spanDelta(dx) {
    return dx / this.#span();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.root.hidden = false;
    this.catchEl.hidden = true;
    this.root.focus({ preventScroll: true });
    document.body.classList.add('rhythm-playing');
  }

  hide() {
    this.supplies.toggleShop(false);
    clearTimeout(this.catchTimer);
    clearTimeout(this.noteTimer);
    clearTimeout(this.hintTimer);
    if (this.root.contains(document.activeElement) && this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.root.hidden = true;
    document.body.classList.remove('rhythm-playing');
  }

  /** baitsOpen: chỉ cho chọn mồi lúc chuẩn bị thả, và người mới chưa cần thấy khái niệm này. */
  mode(name, baitsOpen = false) {
    this.root.dataset.mode = name;
    this.gauge.root.hidden = name !== 'fighting' && name !== 'reeling';
    this.baits.classList.toggle('off', !baitsOpen);
    for (const button of this.baitButtons.values()) button.disabled = !baitsOpen;
  }

  /** Dòng lời dẫn duy nhất. coach: chữ to hơn khi đang cầm tay chỉ việc. fadeAfter: tự mờ sau ngần ấy ms. */
  setHint(text, { coach = false, fadeAfter = 0 } = {}) {
    clearTimeout(this.hintTimer);
    this.hint.textContent = text;
    this.hint.classList.toggle('coach', coach);
    this.hint.classList.remove('faded');
    if (fadeAfter) this.hintTimer = setTimeout(() => this.hint.classList.add('faded'), fadeAfter);
  }

  setBait(baitId, announce = false) {
    for (const [id, button] of this.baitButtons) button.classList.toggle('on', id === baitId);
    if (!announce) return;
    this.baitNote.textContent = `Hay cắn: ${fishForBait(baitId).join(', ')}`;
    this.baitNote.classList.add('on');
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this.baitNote.classList.remove('on'), BAIT_NOTE_MS);
  }

  setTally(count, teu) {
    this.tally.textContent = count ? `${count} con · +${teu} TEU` : '';
  }

  /** Banner Giờ cá vàng: đang mở thì đếm ngược tới lúc đóng, sắp mở (dưới 10 phút) thì báo trước. */
  setGolden({ on, endsIn, startsIn }, streak = 0) {
    const soon = !on && startsIn <= 10 * 60_000;
    const parts = [];
    if (on) parts.push(`Giờ cá vàng ×${GOLDEN_HOUR.teuFactor} TEU · còn ${mmss(endsIn)}`);
    else if (soon) parts.push(`Giờ cá vàng sau ${mmss(startsIn)}`);
    if (streak >= 2) parts.push(`Chuỗi câu đẹp ${streak}`);
    this.golden.textContent = parts.join(' · ');
    this.golden.classList.toggle('on', on);
  }

  setCompany(names) {
    const shown = names.slice(0, 3).join(', ');
    const more = names.length > 3 ? ` +${names.length - 3}` : '';
    this.company.textContent = names.length ? `Cùng câu: ${shown}${more}` : '';
  }

  hideCatch() {
    this.catchEl.hidden = true;
  }

  showCatch({ fish, teu, isNew, record, species, milestone, grade, orderDone, bonus }) {
    const streak = bonus?.streak ?? 0;
    const notes = [
      bonus?.trophy ? `Cá khủng ×${TROPHY.teuFactor}` : '',
      bonus?.golden ? `Giờ cá vàng ×${GOLDEN_HOUR.teuFactor}` : '',
      streakBonus(streak) ? `Chuỗi ${streak} +${streakBonus(streak)}` : '',
      orderDone ? `Xong đơn bếp chùa +${orderDone.teu} TEU` : '',
      isNew ? `Sổ cá ${species}/${FISH.length}` : '',
      record ? 'Kỷ lục mới' : '',
      milestone ? `Đủ ${milestone.count} loài, thưởng ${milestone.teu} TEU` : '',
      grade === 'perfect' ? 'Câu đẹp' : '',
    ].filter(Boolean);
    this.catchEl.hidden = false;
    this.catchEl.dataset.rarity = String(fish.rarity);
    const art = h('span', { class: 'fish-catch-art' });
    art.innerHTML = fishPortraitSvg(fish.id);
    this.catchEl.replaceChildren(
      isNew ? h('span', { class: 'fish-catch-new' }, 'Loài mới') : '',
      !isNew && bonus?.trophy ? h('span', { class: 'fish-catch-new trophy' }, 'Cá khủng') : '',
      art,
      h('span', { class: 'fish-catch-stars' }, '★'.repeat(fish.rarity)),
      h('b', {}, fish.name),
      h('span', {}, `${fish.weight.toLocaleString('vi-VN')} kg · +${teu} TEU`),
      notes.length ? h('small', {}, notes.join(' · ')) : '',
    );
    clearTimeout(this.catchTimer);
    this.catchTimer = setTimeout(() => this.hideCatch(), CATCH_MS);
  }
}
