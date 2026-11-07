// Lời dẫn câu cá bằng chữ thường ngày, và mở dần khái niệm theo số cá đã bắt:
// lần đầu chỉ cần biết chạm vào nước; mồi, bóng cá, lắc cần lần lượt được giới thiệu sau mỗi con.
import { store } from '../ui/dom.js';

const CATCHES_KEY = 'fishCatches';

export const catchesSoFar = () => Number(store.get(CATCHES_KEY)) || 0;

export function noteCatch() {
  const total = catchesSoFar() + 1;
  store.set(CATCHES_KEY, String(total));
  return total;
}

export const baitUnlocked = (total) => total >= 1;

export function coachLines(isTouch) {
  const tap = isTouch ? 'Chạm' : 'Bấm';
  const drag = isTouch ? 'Kéo ngón tay qua lại' : 'Rê chuột qua lại';
  return {
    aim: `${tap} vào mặt nước để thả câu`,
    waiting: (total) => (total >= 3 ? `Chờ cá cắn… ${tap.toLowerCase()} để lắc cần cho nhanh` : 'Chờ cá cắn…'),
    bite: 'Cá cắn rồi!',
    fight: `${drag}, giữ chấm trắng trong vùng xanh`,
    pullLeft: '← Kéo sang trái',
    pullRight: 'Kéo sang phải →',
    escaped: `Cá thoát mất rồi. ${tap} vào nước để thả lại nhé`,
    // Tip sau con cá thứ n, hiện tới khi người chơi thả câu tiếp.
    tips: {
      1: 'Giỏi lắm! Đổi mồi ở dưới để gặp loài khác nhé',
      2: 'Thấy bóng đen dưới nước chứ? Thả trúng bóng dễ ra cá to',
      3: `Sốt ruột thì ${tap.toLowerCase()} lúc đang chờ để lắc cần, cá cắn nhanh hơn`,
      4: 'Mở Sổ an để xem gợi ý các loài còn thiếu',
    },
  };
}
