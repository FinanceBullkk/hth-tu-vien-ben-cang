// Quầy Bena Banca bên hồ câu: chân dung cô kèm lời thoại, ví TEU, hai thẻ "Bán cá" (bena-banca-sell-view.js)
// và "Cần câu & thính" (bena-banca-gear-view.js). Chỉ hiển thị: bán qua bag:sell, mua qua fish:buy (bag-actions.js);
// giá đã chốt lúc câu, quyền sở hữu và số TEU đều do server quyết định.
import { buyGear, sellItems } from './bag-actions.js';
import { countTo, floatText } from './bag-effects.js';
import { openBag } from './bag-panel.js';
import { benaPortraitSvg } from './bena-banca-portrait.js';
import { renderGearView } from './bena-banca-gear-view.js';
import { renderSellView } from './bena-banca-sell-view.js';
import { h } from './dom.js';
import { inkIcon } from './ink-icons.js';
import { openModal } from './modal.js';

const CONFIRM_MS = 3000;
const SOLD_MS = 260; // thẻ vừa bán loé lên rồi thu lại trước khi vẽ lại
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  let teuShown = wallet.teu;

  const tabBtn = (key, icon, label) => h('button', { type: 'button', class: 'bena-tab', role: 'tab', onClick: () => setTab(key) }, inkIcon(icon), h('span', {}, label));
  const tabs = { sell: tabBtn('sell', 'fish', 'Bán cá'), gear: tabBtn('gear', 'shop', 'Cần câu & thính') };
  const portrait = h('span', { class: 'bena-face' });
  portrait.innerHTML = benaPortraitSvg(); // SVG dựng từ hằng số trong mã
  const quote = h('p', { class: 'bena-quote' });
  const teuEl = h('b', {}, String(teuShown));
  const coin = h('span', { class: 'bena-coin', title: 'TEU đang có' }, inkIcon('coin'), teuEl, h('small', {}, 'TEU'));
  const body = h('div', { class: 'bena-body', role: 'tabpanel' });
  const content = h('div', { class: 'bena' },
    h('div', { class: 'bena-hero' }, portrait, quote),
    h('div', { class: 'bena-bar' }, h('nav', { class: 'bena-tabs', role: 'tablist' }, tabs.sell, tabs.gear), coin),
    body);
  const modal = openModal({ title: 'Bena Banca', content, className: 'bena-modal', onClose: () => { unsubBag(); unsubWallet(); clearTimeout(armTimer); } });
  const unsubBag = bag.onChange(() => render());
  const unsubWallet = wallet.onChange(() => {
    // Số TEU chạy dần tới số mới, bán được thì chữ +TEU bay lên từ ví.
    if (wallet.teu > teuShown) floatText(content, coin, `+${wallet.teu - teuShown}`);
    countTo(teuEl, teuShown, wallet.teu);
    teuShown = wallet.teu;
    render();
  });

  function setTab(next) {
    tabNow = next;
    armed = null;
    render();
  }

  /** Bấm lần đầu thì đổi nút thành "bấm lần nữa"; lần hai trong 3 giây mới chạy. */
  function press(key, needConfirm, run) {
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

  const sell = (ids, cards) => act(async () => {
    const res = await sellItems(app, ids, {
      beforeRemove: () => {
        for (const card of cards) card.classList.add('selling');
        return wait(SOLD_MS);
      },
    });
    if (res?.ok) onSold?.(res);
  });
  const buy = (item) => act(() => buyGear(app, item));
  const openFullBag = () => { modal.close(); openBag(app, 'fish'); };

  function render() {
    for (const [key, btn] of Object.entries(tabs)) {
      btn.classList.toggle('on', key === tabNow);
      btn.setAttribute('aria-selected', String(key === tabNow));
    }
    const view = tabNow === 'sell'
      ? renderSellView(bag, { busy, armed, press, sell, openBag: openFullBag })
      : renderGearView(bag, wallet, { busy, buy });
    quote.textContent = view.quote;
    body.replaceChildren(...view.nodes);
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
