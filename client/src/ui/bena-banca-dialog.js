// Quầy Bena Banca bên hồ câu: thẻ "Bán cá" gom cá trong túi theo phẩm chất để bán từng nhóm hay bán hết,
// thẻ "Cần câu" bán cần và thính. Chỉ hiển thị: bán qua bag:sell, mua qua fish:buy (bag-actions.js);
// giá đã chốt lúc câu, quyền sở hữu và số TEU đều do server quyết định.
import { FISH_RARITY } from '../../../shared/fish-catalog.js';
import { itemRarity } from '../../../shared/fish-bag.js';
import { FISH_RODS, THINH } from '../../../shared/fish-gear.js';
import { buyGear, sellItems } from './bag-actions.js';
import { openBag } from './bag-panel.js';
import { h } from './dom.js';
import { openModal } from './modal.js';

const CONFIRM_MS = 3000;
const PRECIOUS = 4; // Sử thi trở lên: bấm hai lần mới bán, như trong túi đồ

const pct = (v) => Math.round(v * 100);

/** Một dòng mô tả cần: vùng xanh, độ tụt, may mắn với cá quý. */
function rodNote(rod) {
  const luck = [4, 5].map((r) => {
    const v = rod.luck[r] ?? 1;
    return `${FISH_RARITY[r].name} ${v === 0 ? 'không kéo nổi' : `×${v}`}`;
  });
  return `Vùng xanh +${pct(rod.half - 1)}%, cá tụt chậm ${pct(1 - rod.drain)}% · ${luck.join(' · ')}`;
}

/** Cá chưa khoá trong túi, gom theo phẩm chất: [{ rarity, ids, value }], phẩm chất thấp trước. */
function groupSellable(items) {
  const groups = new Map();
  for (const it of items) {
    if (it.locked) continue;
    const r = itemRarity(it);
    const g = groups.get(r) ?? { rarity: r, ids: [], value: 0 };
    g.ids.push(it.id);
    g.value += it.price;
    groups.set(r, g);
  }
  return [...groups.values()].sort((a, b) => a.rarity - b.rarity);
}

/**
 * Mở quầy. onSold(res) chạy sau mỗi lần bán được (để Bena cảm ơn); trả về api của hộp thoại.
 * @param {'sell'|'gear'} tab
 */
export function openBenaBanca(app, { tab = 'sell', onSold } = {}) {
  const { bag, wallet } = app;
  let tabNow = tab === 'gear' ? 'gear' : 'sell';
  let armed = null; // khoá nút đang chờ bấm lần hai
  let armTimer = 0;
  let busy = false;

  const tabs = {
    sell: h('button', { type: 'button', class: 'bena-tab', onClick: () => setTab('sell') }, 'Bán cá'),
    gear: h('button', { type: 'button', class: 'bena-tab', onClick: () => setTab('gear') }, 'Cần câu & thính'),
  };
  const quote = h('p', { class: 'bena-quote' });
  const coin = h('span', { class: 'bena-coin' });
  const body = h('div', { class: 'bena-body' });
  const content = h('div', { class: 'bena' },
    h('div', { class: 'bena-hero' }, h('span', { class: 'bena-cat', 'aria-hidden': 'true' }, '🐈'), quote),
    h('div', { class: 'bena-bar' }, h('nav', { class: 'bena-tabs' }, tabs.sell, tabs.gear), coin),
    body);
  const modal = openModal({ title: 'Bena Banca', content, className: 'bena-modal', onClose: () => { unsubBag(); unsubWallet(); clearTimeout(armTimer); } });
  const unsubBag = bag.onChange(() => render());
  const unsubWallet = wallet.onChange(() => render());

  function setTab(next) {
    tabNow = next;
    armed = null;
    render();
  }

  /** Bấm lần đầu thì đổi nút thành "bấm lần nữa"; lần hai trong 3 giây mới chạy. */
  function confirmOr(key, needConfirm, run) {
    if (needConfirm && armed !== key) {
      armed = key;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { armed = null; render(); }, CONFIRM_MS);
      render();
      return;
    }
    armed = null;
    run();
  }

  async function act(fn) {
    if (busy) return;
    busy = true;
    render();
    try {
      await fn();
    } finally {
      busy = false;
      render();
    }
  }

  const sell = (ids) => act(async () => {
    const res = await sellItems(app, ids);
    if (res?.ok) onSold?.(res);
  });
  const buy = (item) => act(() => buyGear(app, item));

  function sellView() {
    const groups = groupSellable(bag.items);
    const locked = bag.items.filter((it) => it.locked).length;
    const total = groups.reduce((sum, g) => sum + g.value, 0);
    quote.textContent = groups.length
      ? 'Bena trả đúng giá đã chốt lúc câu, cá khoá thì Bena không đụng tới nha.'
      : 'Túi chưa có cá để bán. Ra hồ thả câu rồi quay lại nha!';
    const rows = groups.map((g) => {
      const key = `r${g.rarity}`;
      const info = FISH_RARITY[g.rarity] ?? FISH_RARITY[1];
      const ask = armed === key;
      return h('div', { class: 'bena-row' },
        h('span', { class: 'bena-dot', style: `background:${info.color}` }),
        h('div', { class: 'bena-row-text' },
          h('b', { style: `color:${info.color}` }, `${info.name} ${'★'.repeat(g.rarity)}`),
          h('small', {}, `${g.ids.length} con · ${g.value} TEU`)),
        h('button', {
          type: 'button', class: `bena-btn${ask ? ' ask' : ''}`, disabled: busy,
          onClick: () => confirmOr(key, g.rarity >= PRECIOUS, () => sell(g.ids)),
        }, ask ? 'Bấm lần nữa' : `Bán +${g.value}`));
    });
    const hasPrecious = groups.some((g) => g.rarity >= PRECIOUS);
    const askAll = armed === 'all';
    return [
      h('p', { class: 'bena-sum' }, groups.length
        ? `Trong túi ${bag.items.length}/${bag.capacity} món · bán được ${total} TEU${locked ? ` · ${locked} món đang khoá` : ''}`
        : `Túi ${bag.items.length}/${bag.capacity} món${locked ? ` · ${locked} món đang khoá` : ''}`),
      ...rows,
      h('div', { class: 'bena-foot' },
        groups.length ? h('button', {
          type: 'button', class: `bena-btn warm${askAll ? ' ask' : ''}`, disabled: busy,
          onClick: () => confirmOr('all', hasPrecious, () => sell(groups.flatMap((g) => g.ids))),
        }, askAll ? `Có cá ${FISH_RARITY[PRECIOUS].name}+, bấm lần nữa` : `Bán hết +${total} TEU`) : '',
        h('button', { type: 'button', class: 'bena-link', onClick: () => { modal.close(); openBag(app, 'fish'); } }, 'Mở túi chọn từng con')),
    ];
  }

  function gearView() {
    const { teu } = wallet;
    quote.textContent = bag.rod >= FISH_RODS.length - 1
      ? 'Cần phượng hoàng rồi á? Bạn là cao thủ thiệt rồi. Mua thêm thính không?'
      : 'Cần xịn kéo cá êm hơn, hay dính cá quý hơn. Coi thử nè!';
    const owns = (rod) => rod.tier === 0 || wallet.has(rod.item) || rod.tier <= bag.rod;
    const buyBtn = (item, price) => h('button', { type: 'button', class: 'bena-btn', disabled: busy || teu < price, onClick: () => buy(item) }, `${price} TEU`);
    const rows = FISH_RODS.filter((r) => r.tier > 0).map((rod) => {
      const color = FISH_RARITY[rod.rarity]?.color;
      return h('div', { class: 'bena-row' },
        h('span', { class: 'bena-rod', style: `background:#${rod.color.toString(16).padStart(6, '0')}` }),
        h('div', { class: 'bena-row-text' }, h('b', { style: `color:${color}` }, rod.name), h('small', {}, rodNote(rod))),
        owns(rod) ? h('span', { class: 'bena-owned' }, rod.tier === bag.rod ? 'Đang dùng' : 'Đã có') : buyBtn(rod.item, rod.price));
    });
    return [
      ...rows,
      h('div', { class: 'bena-row' },
        h('span', { class: 'bena-dot', style: 'background:#e8c07a' }),
        h('div', { class: 'bena-row-text' }, h('b', {}, `${THINH.name} ×${THINH.pack}`), h('small', {}, `Cá cắn nhanh, dễ ra cá quý. Còn ${bag.thinh} nắm`)),
        buyBtn(THINH.item, THINH.price)),
    ];
  }

  function render() {
    for (const [key, btn] of Object.entries(tabs)) btn.classList.toggle('on', key === tabNow);
    coin.textContent = `${wallet.teu} TEU`;
    body.replaceChildren(...(tabNow === 'sell' ? sellView() : gearView()));
  }

  render();
  return modal;
}

/** Bắt chuyện với Bena (phím E hoặc bấm vào cô): cô chào, mở quầy, bán được cá thì cô cảm ơn. */
export function visitBenaBanca(app, tab) {
  const npc = app.world.benaBanca;
  npc.talk();
  return openBenaBanca(app, { tab, onSold: (res) => npc.cheer(res.gained) });
}
