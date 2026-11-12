// Chữ/biểu tượng nhỏ bay lên tại một điểm trong cảnh rồi tự biến mất (tim khi vuốt mèo, vẫy tay, tiền thắng bàn bài).
import { $, h } from './dom.js';

/** position: THREE.Vector3 trong cảnh; text: chuỗi hiển thị; delay: giây chờ trước khi bay; className thêm cho kiểu riêng. */
export function floater(app, position, text, delay = 0, className = '') {
  const vec = position.clone().setY(position.y + 0.8);
  vec.project(app.camera);
  if (vec.z > 1) return; // Sau lưng camera thì thôi.
  const el = h('div', { class: `floater${className ? ` ${className}` : ''}` }, text);
  el.style.left = `${(vec.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-vec.y * 0.5 + 0.5) * window.innerHeight}px`;
  el.style.animationDelay = `${delay}s`;
  $('hud').append(el);
  setTimeout(() => el.remove(), 1600 + delay * 1000);
}
