// Ô trứng linh thú trong bảng thú cưng: tỉ lệ, bảo hiểm, nút ấp và hoạt cảnh trứng lắc, nứt, loé sáng theo bậc thú.
// Kết quả do server bốc; hoạt cảnh chỉ kéo dài cho đủ hồi hộp rồi hiện đúng thú server trả về.
import { PET, PETS, PET_RARITY, PET_WEIGHT_TOTAL } from '../../../shared/pets.js';
import { h } from './dom.js';
import { inkIcon } from './ink-icons.js';

const SHAKE_MS = 1100;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const oddsText = () => Object.values(PET_RARITY)
  .map((r) => `${r.name} ${Math.round((r.weight / PET_WEIGHT_TOTAL) * 100)}%`)
  .join(' · ');

/**
 * Dựng ô trứng. stage: phần tử để phủ lớp loé sáng lên khi nở. onHatched(res) chạy sau hoạt cảnh.
 * Trả về { el, render() } để bảng vẽ lại khi ví hay chuồng thú đổi.
 */
export function eggSection(app, stage, onHatched) {
  const shell = h('div', { class: 'pet-egg-shell', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const btn = h('button', { class: 'btn primary pet-egg-btn', type: 'button' });
  const pity = h('p', { class: 'pet-egg-pity' });
  const wallet = h('p', { class: 'pet-egg-wallet' });
  const flash = h('div', { class: 'pet-hatch', hidden: true });
  stage.append(flash);
  let busy = false;

  const render = () => {
    const { pity: count, eggPrice } = app.pets.mine;
    const price = eggPrice ?? PET.eggPrice;
    btn.replaceChildren(busy ? 'Đang nở…' : 'Ấp trứng', h('span', { class: 'pet-egg-price' }, inkIcon('coin'), String(price)));
    btn.disabled = busy || app.wallet.teu < price;
    const left = PET.pityEvery - count;
    pity.textContent = left <= 1
      ? 'Trứng kế tiếp chắc chắn ra Linh thú trở lên!'
      : `Còn ${left} trứng nữa chắc chắn ra Linh thú trở lên.`;
    wallet.textContent = app.wallet.teu < price ? `Bạn có ${app.wallet.teu} TEU, còn thiếu ${price - app.wallet.teu}.` : `Bạn có ${app.wallet.teu} TEU.`;
  };

  const reveal = async (res) => {
    const spec = PETS[res.kind];
    const rarity = PET_RARITY[spec.rarity];
    flash.style.setProperty('--rc', rarity.color);
    flash.className = `pet-hatch r${spec.rarity}`;
    flash.replaceChildren(
      h('b', {}, res.dup ? `${spec.name} đã có` : spec.name),
      h('small', {}, res.dup ? (res.gained ? `Hai bé nhập làm một: +${res.gained} thân thiết` : 'Bé đã là tri kỷ, không cộng thêm') : `Bé mới · ${rarity.name}`),
    );
    flash.hidden = false;
    if (spec.rarity >= 3) app.audio.chime?.(0.12);
    else app.audio.pop?.();
    await wait(1900);
    flash.hidden = true;
  };

  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    render();
    shell.classList.add('shake');
    const [res] = await Promise.all([app.net.call('pet:hatch'), wait(SHAKE_MS)]);
    shell.classList.remove('shake');
    if (!res?.ok) {
      busy = false;
      if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
      app.hud.toast(res?.error ?? 'Chưa ấp được, thử lại nhé.');
      render();
      return;
    }
    app.wallet.apply({ teu: res.teu });
    shell.classList.add('crack');
    onHatched(res);
    await reveal(res);
    shell.classList.remove('crack');
    busy = false;
    render();
  });

  const el = h('section', { class: 'pet-egg' },
    shell,
    h('div', { class: 'pet-egg-text' },
      h('h3', {}, 'Trứng linh thú'),
      h('p', { class: 'pet-egg-odds' }, oddsText()),
      pity,
      wallet),
    btn);
  render();
  return { el, render };
}
