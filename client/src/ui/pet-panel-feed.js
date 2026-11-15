// Khung cho ăn trong bảng thú cưng: liệt kê cá chưa khoá trong túi, cá quý xếp trước, mỗi con ghi thân thiết được cộng.
// Bấm một con là gửi pet:feed; server xoá cá và cộng thân thiết, client chỉ áp kết quả.
import { FISH_RARITY, fishById } from '../../../shared/fish-catalog.js';
import { BOND_TIERS, PET, PETS, feedGain } from '../../../shared/pets.js';
import { h } from './dom.js';

const fishRarity = (it) => fishById(it.ref)?.rarity ?? 1;

/** Cá cho ăn được: cá trong túi, chưa khoá; cá quý trước, cùng phẩm chất thì rẻ trước để giữ con đắt. */
export function feedableFish(items) {
  return items
    .filter((it) => it.kind === 'fish' && !it.locked)
    .sort((a, b) => fishRarity(b) - fishRarity(a) || a.price - b.price || a.id - b.id);
}

/**
 * Vẽ danh sách vào box. pet: { kind, bond } của thú đang dắt. onFed(res) chạy khi server nhận.
 */
export function renderFeedList(box, app, pet, onFed) {
  const items = feedableFish(app.bag.items);
  const name = PETS[pet.kind].name;
  if (pet.bond >= PET.bondMax) {
    box.replaceChildren(h('p', { class: 'pet-feed-empty' }, `${name} đã là ${BOND_TIERS.at(-1).name} rồi, không cần cho ăn thêm.`));
    return;
  }
  if (!items.length) {
    box.replaceChildren(h('p', { class: 'pet-feed-empty' }, 'Túi chưa có cá nào (hoặc đang khoá hết). Ra hồ câu vài con rồi quay lại nhé.'));
    return;
  }
  let busy = false;
  const rows = items.map((it) => {
    const fish = fishById(it.ref);
    const rarity = fishRarity(it);
    const btn = h('button', { class: 'pet-feed-row', type: 'button', style: `--rc:${FISH_RARITY[rarity]?.color ?? '#e6dfcf'}` },
      h('span', { class: 'pet-feed-name' }, fish?.name ?? 'Cá lạ', h('small', {}, ` ${'★'.repeat(rarity)}`)),
      h('span', { class: 'pet-feed-gain' }, `+${Math.min(feedGain(rarity), PET.bondMax - pet.bond)} ♥`),
      h('span', { class: 'pet-feed-price' }, `bán được ${it.price} TEU`));
    btn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      btn.disabled = true;
      const res = await app.net.call('pet:feed', { id: it.id });
      busy = false;
      if (!res?.ok) {
        btn.disabled = false;
        app.hud.toast(res?.error ?? 'Chưa cho ăn được, thử lại nhé.');
        return;
      }
      app.bag.remove([it.id]);
      onFed(res);
    });
    return btn;
  });
  box.replaceChildren(
    h('p', { class: 'pet-feed-hint' }, `Chọn một con cá cho ${name}. Cá quý thêm nhiều thân thiết hơn, nhưng cá đã ăn thì không bán được nữa.`),
    h('div', { class: 'pet-feed-list' }, rows),
  );
}
