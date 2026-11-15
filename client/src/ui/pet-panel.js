// Bảng thú cưng (nút trên HUD hoặc phím P): ô xem thú 3D, thông tin và thân thiết, dắt/cất, cho ăn cá,
// sổ chín thú (có rồi thì sáng, chưa có thì mờ) và ô ấp trứng linh thú.
import { BOND_TIERS, PET, PETS, PET_RARITY, bondTier } from '../../../shared/pets.js';
import { h } from './dom.js';
import { openModal } from './modal.js';
import { eggSection } from './pet-panel-egg.js';
import { renderFeedList } from './pet-panel-feed.js';
import { mountPetPortrait } from './pet-portrait.js';

// Biểu tượng nhỏ trên thẻ, đúng thứ tự PETS.
const PET_GLYPHS = ['🐱', '🐶', '🐰', '🐼', '🐢', '🦊', '🕊️', '🦄', '🐉'];

function bondMeter(bond) {
  const tier = bondTier(bond);
  const next = BOND_TIERS[tier + 1];
  const from = BOND_TIERS[tier].at;
  const pct = next ? ((bond - from) / (next.at - from)) * 100 : 100;
  return h('div', { class: 'pet-bond' },
    h('div', { class: 'pet-bond-head' },
      h('span', {}, '♥'.repeat(tier) || '♡', ' ', BOND_TIERS[tier].name),
      h('b', {}, next ? `${bond} / ${next.at}` : `${bond} · tối đa`)),
    h('span', { class: 'pet-bond-meter' }, h('u', { style: `width:${pct.toFixed(1)}%` })),
    h('small', {}, next ? `Thêm ${next.at - bond} thân thiết để thành ${next.name}.` : 'Bé là tri kỷ của bạn, hào quang vàng luôn theo bên.'));
}

export function openPets(app) {
  const { pets } = app;
  const firstOwned = () => pets.mine.list[0]?.kind ?? 0;
  let selected = pets.mine.active >= 0 ? pets.mine.active : firstOwned();
  let feeding = false;
  let busy = false;

  const view = h('div', { class: 'pet-view' });
  const info = h('div', { class: 'pet-info' });
  const stage = h('div', { class: 'pet-stage' }, view, info);
  const feedBox = h('div', { class: 'pet-feed', hidden: true });
  const grid = h('div', { class: 'pet-grid' });
  const portrait = mountPetPortrait(view);
  const owned = (kind) => pets.mine.list.find((p) => p.kind === kind) ?? null;

  const summon = async (kind) => {
    if (busy) return;
    busy = true;
    const res = await app.net.call('pet:summon', { kind });
    busy = false;
    if (!res?.ok) app.hud.toast(res?.error ?? 'Chưa gọi được bé, thử lại nhé.');
    else pets.applyMine({ active: res.active });
  };

  const renderInfo = () => {
    const spec = PETS[selected];
    const rarity = PET_RARITY[spec.rarity];
    const mine = owned(selected);
    const active = pets.mine.active === selected;
    portrait.show(selected, mine ? bondTier(mine.bond) : 0);
    stage.style.setProperty('--rc', rarity.color);
    stage.classList.toggle('locked', !mine);
    const actions = [];
    if (mine) {
      const toggle = h('button', { class: `btn${active ? '' : ' primary'}`, type: 'button' }, active ? 'Cất về' : 'Dắt đi');
      toggle.addEventListener('click', () => summon(active ? -1 : selected));
      const feed = h('button', { class: `btn${feeding ? ' on' : ''}`, type: 'button', disabled: !active || mine.bond >= PET.bondMax }, 'Cho ăn cá');
      feed.title = active ? '' : 'Dắt bé ra trước rồi mới cho ăn được';
      feed.addEventListener('click', () => {
        feeding = !feeding;
        render();
      });
      actions.push(toggle, feed);
    }
    info.replaceChildren(...[
      h('div', { class: 'pet-title' },
        h('h3', {}, spec.name),
        h('span', { class: 'pet-rarity', style: `--rc:${rarity.color}` }, rarity.name)),
      h('p', { class: 'pet-blurb' }, spec.blurb),
      mine ? bondMeter(mine.bond) : h('p', { class: 'pet-missing' }, 'Chưa có bé này. Ấp trứng linh thú để thử vận may nhé.'),
      mine?.hatched > 1 ? h('small', { class: 'pet-hatched' }, `Đã nở ${mine.hatched} lần`) : null,
      actions.length ? h('div', { class: 'pet-actions' }, actions) : null,
    ].filter(Boolean));
    const canFeed = feeding && mine && active;
    feedBox.hidden = !canFeed;
    if (canFeed) {
      renderFeedList(feedBox, app, mine, (res) => {
        pets.patchMine(res.kind, { bond: res.bond });
        if (res.up) app.hud.toast(`${spec.name} giờ là ${BOND_TIERS[res.tier].name} của bạn!`, { ms: 3500 });
      });
    }
  };

  const renderGrid = () => {
    grid.replaceChildren(...PETS.map((spec, kind) => {
      const mine = owned(kind);
      const card = h('button', {
        class: `pet-card${mine ? '' : ' locked'}${kind === selected ? ' on' : ''}`,
        type: 'button',
        style: `--rc:${PET_RARITY[spec.rarity].color}`,
        'aria-pressed': String(kind === selected),
      },
      h('span', { class: 'pet-card-glyph' }, PET_GLYPHS[kind] ?? '🐾'),
      h('span', { class: 'pet-card-name' }, spec.name),
      h('small', {}, mine ? '♥'.repeat(bondTier(mine.bond)) || PET_RARITY[spec.rarity].name : 'Chưa có'),
      pets.mine.active === kind ? h('em', { class: 'pet-card-out' }, 'Đang dắt') : null);
      card.addEventListener('click', () => {
        selected = kind;
        render();
      });
      return card;
    }));
  };

  const egg = eggSection(app, stage, (res) => {
    pets.applyMine(res);
    selected = res.kind;
    feeding = false;
    render();
    // Chưa dắt bé nào (thường là bé đầu tiên): dắt ra luôn cho người chơi thấy ngay ngoài sân.
    if (pets.mine.active < 0) summon(res.kind);
  });

  const render = () => {
    renderInfo();
    renderGrid();
    egg.render();
  };

  const count = h('span', { class: 'pet-count' });
  const renderCount = () => { count.textContent = `${pets.mine.list.length}/${PETS.length} bé`; };
  const offPets = pets.onChange(() => { render(); renderCount(); });
  const offBag = app.bag.onChange(() => { if (feeding) renderInfo(); });
  const offWallet = app.wallet.onChange(() => egg.render());
  renderCount();

  openModal({
    title: 'Thú cưng',
    wide: true,
    className: 'pet-modal',
    content: h('div', { class: 'pet' },
      h('div', { class: 'pet-top' }, stage, egg.el),
      feedBox,
      h('div', { class: 'pet-grid-head' }, h('h3', {}, 'Sổ thú'), count),
      grid),
    onClose: () => {
      portrait.stop();
      offPets();
      offBag();
      offWallet();
    },
  });
  render();
}
