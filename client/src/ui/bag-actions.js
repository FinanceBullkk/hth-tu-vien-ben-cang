// Lệnh túi đồ gửi server: bán món, khoá món, mua cần hay thính. Cập nhật ví, túi và HUD câu cá theo kết quả,
// báo một dòng cho người chơi. Tách khỏi bag-panel.js để bảng chỉ lo vẽ; cũng dùng được từ chỗ khác.
import { THINH } from '../../../shared/fish-gear.js';

/**
 * Bán các món theo id; trả kết quả server (hoặc null khi mất mạng).
 * beforeRemove(res): chạy hiệu ứng trên các ô vừa bán trước khi chúng biến khỏi túi.
 */
export async function sellItems(app, ids, { beforeRemove } = {}) {
  const res = await app.net.call('bag:sell', { ids }).catch(() => null);
  if (res?.ok) await beforeRemove?.(res);
  if (Number.isFinite(res?.teu)) app.wallet.apply({ teu: res.teu });
  if (res?.ok) {
    app.bag.remove(res.sold);
    app.audio.chime?.(0.05);
    app.hud.toast(`Đã bán ${res.sold.length} món, +${res.gained} TEU.`);
  } else app.hud.toast(res?.error || 'Chưa bán được, thử lại nhé.');
  return res;
}

export async function toggleLock(app, item) {
  const res = await app.net.call('bag:lock', { id: item.id, locked: !item.locked }).catch(() => null);
  if (res?.ok) app.bag.setLocked(res.id, res.locked);
  else app.hud.toast(res?.error || 'Chưa khoá được, thử lại nhé.');
  return res;
}

/** Mua cần hay thính ngay trong túi: cùng lệnh với sạp đồ câu bên hồ. */
export async function buyGear(app, item) {
  const res = await app.net.call('fish:buy', { item }).catch(() => null);
  if (res?.rod != null) {
    app.bag.apply({ rod: res.rod, thinh: res.thinh });
    if (Number.isFinite(res.teu)) app.wallet.apply({ teu: res.teu });
    if (res.ok && item.startsWith('rod:')) app.wallet.grant(item);
    // Đang đứng câu thì HUD hồ cũng đổi cần, đổi số thính ngay.
    if (app.activities.current === app.activities.fishing) app.activities.fishing.supplies.apply(res);
  }
  if (res?.ok) {
    app.audio.chime?.(0.06);
    app.hud.toast(item === THINH.item ? `Đã mua ${THINH.pack} nắm thính.` : 'Đã có cần mới, lần quăng tới dùng luôn!');
  } else app.hud.toast(res?.error || 'Chưa mua được, thử lại nhé.');
  return res;
}
