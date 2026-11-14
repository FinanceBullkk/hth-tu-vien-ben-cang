// Bảng ở Trạm giao thương, neo cạnh phải như Sạp Kim Bảo. Hai chế độ:
// - Sảnh: lời mời đang chờ, người đang đứng ở trạm để mời.
// - Phiên: chọn món và TEU muốn đưa, xem đối phương đưa gì, cả hai cùng chốt thì đổi.
// Đề nghị gom lại rồi gửi sau 300 ms; bản hiển thị luôn chỉnh theo trade:state server gửi về. Đóng bảng giữa phiên là huỷ.
import { SHOP_SECTIONS, isPaid, isTradable, itemName, parseItemId } from '../../../shared/shop.js';
import { TRADE } from '../../../shared/trade.js';
import { h } from './dom.js';
import { openModal } from './modal.js';
import { itemSwatch } from './shop-panel.js';

const SEND_DELAY_MS = 300;
const SLOT_ORDER = SHOP_SECTIONS.map((s) => s.slot);
const SLOT_LABEL = Object.fromEntries(SHOP_SECTIONS.map((s) => [s.slot, s.label]));

const sortItems = (ids) => ids
  .map((id) => ({ id, ...parseItemId(id) }))
  .filter((it) => it.slot)
  .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.index - b.index);

/** Ô món: nút bấm chọn được (phía mình) hoặc chỉ để xem (phía đối phương). */
function itemCard(it, { on = false, disabled = false, onClick = null } = {}) {
  const props = onClick
    ? { class: `shopx-card${on ? ' on' : ''}`, type: 'button', disabled, 'aria-pressed': String(on), onClick }
    : { class: 'shopx-card trade-their' };
  return h(onClick ? 'button' : 'div', props,
    itemSwatch(it.slot, it.index, false),
    h('span', { class: 'shopx-name' }, itemName(it.slot, it.index)),
    h('span', { class: 'shopx-price' }, SLOT_LABEL[it.slot]));
}

const button = (label, cls, onClick) => h('button', { class: `btn ${cls}`, type: 'button', onClick }, label);
const personRow = (name, ...actions) => h('div', { class: 'trade-row' }, h('b', {}, name), h('span', { class: 'trade-row-actions' }, actions));

export function openTradePanel(app, trade, onClosed) {
  const { wallet } = app;
  const body = h('div', { class: 'shopx-list trade-body' });
  const foot = h('div', { class: 'shopx-foot' });
  let mode = '';
  let lobbyKey = '';
  let draft = { items: new Set(), teu: 0 };
  let pending = false; // Có thay đổi chưa được server xác nhận.
  let sendTimer = 0;
  let sendSeq = 0;
  let busy = false;
  let refs = null;

  // ---------- Sảnh ----------
  const renderLobby = () => {
    const invites = trade.pendingInvites();
    const people = trade.nearby();
    const key = JSON.stringify([invites.map((i) => i.sid), people.map((p) => p.sid)]);
    if (key === lobbyKey) return; // Không dựng lại khi không đổi, để nút không biến mất giữa lúc bấm.
    lobbyKey = key;
    // h() bỏ qua con null, replaceChildren thì không: gói cả sảnh trong một h().
    body.replaceChildren(h('div', {},
      h('p', { class: 'muted small' }, 'Mời một người đang đứng ở trạm để trao đổi đồ ngoại hình và TEU. Hai bên cùng chốt mới đổi, không mất phí.'),
      invites.length ? h('section', {}, h('h3', { 'data-hanzi': '請' }, 'Lời mời'),
        invites.map((inv) => personRow(inv.name,
          button('Nhận', 'primary', () => trade.respond(inv.sid, true)),
          button('Từ chối', 'ghost', () => trade.respond(inv.sid, false))))) : null,
      h('section', {}, h('h3', { 'data-hanzi': '人' }, 'Đang ở trạm'),
        people.length
          ? people.map((p) => personRow(p.name, button('Mời giao dịch', '', () => trade.invite(p.sid))))
          : h('p', { class: 'muted small' }, 'Chưa có ai khác đứng ở trạm. Rủ bạn bè ra đây nhé!')),
    ));
    foot.replaceChildren();
  };

  // ---------- Phiên ----------
  const scheduleSend = () => {
    pending = true;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(async () => {
      sendTimer = 0;
      const seq = ++sendSeq;
      const res = await trade.offer([...draft.items], draft.teu);
      if (seq !== sendSeq || sendTimer) return; // Còn lượt gửi mới hơn đang chờ.
      pending = false;
      if (!res?.ok) draft = null; // Server từ chối: quay về đề nghị server đang giữ.
      render();
    }, SEND_DELAY_MS);
    render();
  };

  const buildSession = () => {
    const teuInput = h('input', { class: 'trade-teu-input', type: 'number', min: 0, step: 1, inputMode: 'numeric', 'aria-label': 'Số TEU bạn đưa' });
    teuInput.addEventListener('input', () => {
      const v = Math.floor(Number(teuInput.value));
      draft.teu = Number.isFinite(v) ? Math.max(0, Math.min(v, TRADE.maxTeu, wallet.teu)) : 0;
      scheduleSend();
    });
    teuInput.addEventListener('blur', () => render());
    refs = {
      teuInput,
      mineGrid: h('div', { class: 'shopx-grid' }),
      theirsGrid: h('div', { class: 'shopx-grid' }),
      theirsTeu: h('p', { class: 'trade-teu-line' }),
      themHead: h('h3', { 'data-hanzi': '彼' }),
      meBadge: h('span', { class: 'trade-ready' }, '✓ Đã chốt'),
      themBadge: h('span', { class: 'trade-ready' }, '✓ Đã chốt'),
      note: h('p', { class: 'shopx-status' }),
      readyBtn: button('Chốt đổi', 'primary', async () => {
        busy = true;
        render();
        await trade.ready(!trade.state?.me.ready);
        busy = false;
        render();
      }),
    };
    body.replaceChildren(
      h('section', {}, h('h3', { 'data-hanzi': '我' }, 'Bạn đưa', refs.meBadge), refs.mineGrid,
        h('label', { class: 'trade-teu' }, 'TEU đưa thêm', teuInput, h('small', {}, `tối đa ${TRADE.maxTeu}`))),
      h('section', {}, refs.themHead, refs.theirsGrid, refs.theirsTeu),
    );
    foot.replaceChildren(refs.note, h('div', { class: 'shopx-actions' }, button('Huỷ giao dịch', 'ghost', () => trade.cancel()), refs.readyBtn));
  };

  const updateSession = () => {
    const s = trade.state;
    if (!pending || !draft) draft = { items: new Set(s.me.items), teu: s.me.teu };
    const mine = sortItems([...wallet.owned].filter((id) => isPaid(id) && isTradable(id))); // Hào quang chí tôn không trao đổi.
    const full = draft.items.size >= TRADE.maxItems;
    refs.mineGrid.replaceChildren(...(mine.length
      ? mine.map((it) => itemCard(it, {
        on: draft.items.has(it.id),
        disabled: !draft.items.has(it.id) && full,
        onClick: () => {
          if (draft.items.has(it.id)) draft.items.delete(it.id);
          else draft.items.add(it.id);
          scheduleSend();
        },
      }))
      : [h('p', { class: 'muted small' }, 'Bạn chưa có món trả phí nào để đổi, đưa TEU cũng được.')]));
    if (document.activeElement !== refs.teuInput) refs.teuInput.value = String(draft.teu);
    refs.teuInput.max = String(Math.min(TRADE.maxTeu, wallet.teu));
    refs.themHead.replaceChildren(`${s.them.name} đưa`, refs.themBadge);
    refs.theirsGrid.replaceChildren(...(s.them.items.length
      ? sortItems(s.them.items).map((it) => itemCard(it))
      : [h('p', { class: 'muted small' }, 'Chưa đặt món nào.')]));
    refs.theirsTeu.textContent = s.them.teu ? `+ ${s.them.teu} TEU` : '';
    refs.meBadge.hidden = !s.me.ready;
    refs.themBadge.hidden = !s.them.ready;
    const wearing = [...draft.items].some((id) => {
      const it = parseItemId(id);
      return it && app.profile[it.slot] === it.index;
    });
    refs.note.textContent = s.notice
      || (pending ? 'Đang gửi đề nghị…'
        : s.me.ready ? `Đã chốt, chờ ${s.them.name} chốt…`
          : s.them.ready ? `${s.them.name} đã chốt. Xem kỹ rồi chốt nhé.`
            : wearing ? 'Món đang mặc sẽ được cởi ra khi đổi xong.'
              : 'Đổi đề nghị thì cả hai phải chốt lại.');
    const empty = !s.me.items.length && !s.me.teu && !s.them.items.length && !s.them.teu;
    refs.readyBtn.textContent = s.me.ready ? 'Bỏ chốt' : 'Chốt đổi';
    refs.readyBtn.disabled = busy || pending || (empty && !s.me.ready);
  };

  const render = () => {
    const next = trade.state ? 'session' : 'lobby';
    if (next !== mode) {
      mode = next;
      lobbyKey = '';
      pending = false;
      clearTimeout(sendTimer);
      if (mode === 'session') buildSession();
    }
    if (mode === 'session') updateSession();
    else renderLobby();
  };

  const offTrade = trade.onChange(render);
  const offWallet = wallet.onChange(render);
  const tick = setInterval(() => mode === 'lobby' && renderLobby(), 1000);
  const modal = openModal({
    title: 'Trạm giao thương',
    content: [body, foot],
    className: 'shopx trade',
    onClose: () => {
      offTrade();
      offWallet();
      clearInterval(tick);
      clearTimeout(sendTimer);
      if (trade.state) trade.cancel();
      onClosed?.();
    },
  });
  modal.el.classList.add('modal-dock');
  render();
  return { close: () => modal.close() };
}
