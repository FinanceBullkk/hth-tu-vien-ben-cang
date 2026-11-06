// Tiện ích giao diện: tạo phần tử an toàn (chỉ textContent), lưu localStorage có kiểm soát lỗi.

/** Tạo phần tử. Chuỗi con luôn thành text node nên không thể chèn HTML. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in el && key !== 'list' && key !== 'form') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (id) => document.getElementById(id);

const PREFIX = 'hth.';

/** localStorage có thể ném lỗi ở chế độ riêng tư, nên bọc lại và giữ bản dự phòng trong RAM. */
export const store = {
  mem: new Map(),
  get(key) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      if (v !== null) return v;
    } catch {
      // Bỏ qua, dùng bản trong RAM.
    }
    return this.mem.get(key) ?? null;
  },
  set(key, value) {
    this.mem.set(key, value);
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      // Bỏ qua: mất localStorage thì coi như người mới, đúng theo thiết kế.
    }
  },
  getJson(key) {
    try {
      return JSON.parse(this.get(key));
    } catch {
      return null;
    }
  },
  setJson(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

export function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

/** Xếp hàng tiếng Việt: tải file từ canvas/blob, chung cho ảnh chia sẻ và vận đơn. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
