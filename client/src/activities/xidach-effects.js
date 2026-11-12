// Hiệu ứng quanh bàn xì dách mà cả phòng cùng thấy: nhân vật với tay khi rút, bong bóng "Rút!"/"Dằn!" trên đầu,
// lúc chấm thì bong bóng kết quả cho từng người và tiền vàng bay lên trên đầu người thắng.
// Chỉ dùng dữ liệu công khai (sid, hành động, số lá; bài chỉ có lúc chấm), không cần biết bài người khác.
import * as THREE from 'three';
import { KIND_LABEL } from '../../../shared/xidach.js';
import { floater } from '../ui/floater.js';

const SHOW_DISTANCE = 26; // Xa hơn thì không bắn tiền bay lên màn hình cho đỡ rối.
const _pos = new THREE.Vector3();

/** Một khách vừa rút hay dằn (tin "xidach:act"). */
export function actEffect(app, { sid, action, count }) {
  const avatar = app.avatarOf?.(sid);
  if (!avatar) return;
  if (action === 'hit') {
    avatar.reach();
    avatar.say(count >= 5 ? 'Rút lá thứ năm!' : 'Rút!', 1300);
  } else {
    avatar.say(`Dằn! (${count} lá)`, 1600);
  }
}

/** Chữ kết quả ngắn cho một ghế lúc chấm: "Xì dách! +20", "Quắc · −10", "19 điểm · hoà". */
export function seatResultText(seat) {
  const money = seat.net > 0 ? `+${seat.net}` : seat.net < 0 ? `−${-seat.net}` : 'hoà';
  const kind = KIND_LABEL[seat.kind];
  if (seat.kind === 'xiban' || seat.kind === 'xidach' || seat.kind === 'ngulinh') return `${kind}! ${money}`;
  return `${kind || `${seat.total} điểm`} · ${money}`;
}

/** Lúc chấm bài: bong bóng kết quả trên đầu từng khách, tiền vàng bay lên trên đầu người thắng. */
export function resultEffects(app, state) {
  for (const seat of state.seats ?? []) {
    const avatar = app.avatarOf?.(seat.sid);
    if (!avatar) continue;
    avatar.say(seatResultText(seat), 3800);
    if (!(seat.net > 0)) continue;
    avatar.root.getWorldPosition(_pos);
    if (_pos.distanceTo(app.camera.position) > SHOW_DISTANCE) continue;
    _pos.y += 1.3;
    floater(app, _pos, `+${seat.net} 🪙`, 0, 'coin');
    floater(app, _pos, '🪙', 0.18, 'coin');
    floater(app, _pos, '🪙', 0.36, 'coin');
  }
}
