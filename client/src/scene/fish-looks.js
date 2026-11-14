// Ngoại hình từng loài trong Sổ cá, dùng chung cho mô hình 3D (fish-model.js) và hình minh hoạ SVG (ui/fish-portrait.js).
// Mọi số đo tính trên thân dài 1: h là chiều cao, w là bề ngang. size là chiều dài hiển thị (mét) khi treo trên cần.
// kind: 'fish' là cá thường; 'slipper', 'shoe', 'box' là đồ thất lạc vướng câu.
// tail: 'fork' đuôi chẻ, 'round' đuôi tròn, 'shark' thùy trên dài, 'clavus' đuôi cụt của cá mặt trăng.
// pattern: 'stripes' sọc dọc trên lưng, 'lines' sọc ngang dưới bụng, 'spots' đốm, 'dots' chấm phát sáng.
export const FISH_LOOKS = {
  com: { kind: 'fish', size: 0.22, h: 0.2, w: 0.13, back: '#4f7387', side: '#a9c2cc', belly: '#eef4f4', fin: '#8fa9b4', tail: 'fork', dorsal: 0.12 },
  doi: { kind: 'fish', size: 0.42, h: 0.24, w: 0.17, back: '#56604f', side: '#9aa394', belly: '#e2e5d8', fin: '#6f7a66', tail: 'fork', dorsal: 0.14 },
  thu: { kind: 'fish', size: 0.58, h: 0.22, w: 0.15, back: '#2f6a78', side: '#9fc0c6', belly: '#eef3f2', fin: '#3d6f78', tail: 'fork', dorsal: 0.13, pattern: 'stripes', mark: '#173944' },
  dep: { kind: 'slipper', size: 0.3, color: '#5b8fc7', strap: '#3f73ad' },
  hong: { kind: 'fish', size: 0.46, h: 0.36, w: 0.15, back: '#a8262f', side: '#e0606a', belly: '#f8cdbf', fin: '#c8414a', tail: 'fork', dorsal: 0.2 },
  mu: { kind: 'fish', size: 0.56, h: 0.32, w: 0.2, back: '#5a4130', side: '#97764f', belly: '#dcc9a6', fin: '#6d5038', tail: 'round', dorsal: 0.16, pattern: 'spots', mark: '#3a2a1c' },
  voa: { kind: 'fish', size: 0.36, h: 0.3, w: 0.13, back: '#6d7a3d', side: '#c7c27a', belly: '#f2ecc6', fin: '#d6b44a', tail: 'fork', dorsal: 0.16 },
  giay: { kind: 'shoe', size: 0.32, color: '#4a2c1a', sole: '#1e1510' },
  ngu_van: { kind: 'fish', size: 0.68, h: 0.27, w: 0.2, back: '#1f3550', side: '#8ea5b8', belly: '#f1f3f4', fin: '#2b4766', tail: 'fork', dorsal: 0.14, pattern: 'lines', mark: '#2f4a68' },
  nham: { kind: 'fish', size: 1.3, h: 0.2, w: 0.17, back: '#5d6870', side: '#8d989e', belly: '#e9ecec', fin: '#56616a', tail: 'shark', dorsal: 0.3, snout: 0.6 },
  ngu_duong: { kind: 'fish', size: 1.5, h: 0.3, w: 0.24, back: '#16233d', side: '#7b8fa6', belly: '#eef1f3', fin: '#e2b93b', tail: 'fork', dorsal: 0.16 },
  container: { kind: 'box', size: 0.6, color: '#d9632b', rib: '#a8461b' },
  long_den: { kind: 'fish', size: 0.32, h: 0.28, w: 0.15, back: '#1f2033', side: '#3a3c5a', belly: '#6d6f8e', fin: '#2c2e48', tail: 'fork', dorsal: 0.14, pattern: 'dots', mark: '#9ff2ff', glow: '#5fd8ff' },
  trang: { kind: 'fish', size: 0.95, h: 1.0, w: 0.16, back: '#8a929b', side: '#c3cad0', belly: '#eef0f2', fin: '#9aa3ab', tail: 'clavus', dorsal: 0.55 },
  chep_vang: { kind: 'fish', size: 0.52, h: 0.32, w: 0.2, back: '#c47a12', side: '#f2b630', belly: '#fde7a4', fin: '#f08a1c', tail: 'round', dorsal: 0.18, glow: '#ffcf5a' },
  // Sử thi
  rong_huyet: { kind: 'fish', size: 0.9, h: 0.24, w: 0.12, back: '#6e1010', side: '#d4313a', belly: '#f6b08a', fin: '#a81c26', tail: 'round', dorsal: 0.1, pattern: 'spots', mark: '#ff8a6a', glow: '#ff4a3a' },
  tam_hoang: { kind: 'fish', size: 1.6, h: 0.16, w: 0.16, back: '#36434b', side: '#7d8a90', belly: '#e2e5df', fin: '#46535a', tail: 'shark', dorsal: 0.12, snout: 0.8, pattern: 'lines', mark: '#c9cfc9' },
  koi_bach: { kind: 'fish', size: 0.55, h: 0.3, w: 0.2, back: '#f1ede4', side: '#ffffff', belly: '#fff7e6', fin: '#e8e2d4', tail: 'round', dorsal: 0.16, pattern: 'spots', mark: '#d9a23a', glow: '#fff3c0' },
  kiem: { kind: 'fish', size: 1.8, h: 0.22, w: 0.16, back: '#1a2a48', side: '#6f86a8', belly: '#e8edf2', fin: '#22345a', tail: 'fork', dorsal: 0.34, snout: 1 },
  ket_sat: { kind: 'box', size: 0.5, color: '#5d6670', rib: '#3c444c' },
  // Huyền thoại
  ly_ngu: { kind: 'fish', size: 1.1, h: 0.3, w: 0.2, back: '#b01c10', side: '#f0a326', belly: '#ffe7a8', fin: '#e2471c', tail: 'round', dorsal: 0.2, pattern: 'lines', mark: '#ffe08a', glow: '#ffb83a' },
  nguyet_ngu: { kind: 'fish', size: 0.7, h: 0.34, w: 0.14, back: '#3f55a0', side: '#b9c8f2', belly: '#f2f5ff', fin: '#8fa6e8', tail: 'fork', dorsal: 0.22, pattern: 'dots', mark: '#eaf6ff', glow: '#bcd8ff' },
  ruong_vang: { kind: 'box', size: 0.55, color: '#c8901e', rib: '#7a4f12' },
};

const FALLBACK = FISH_LOOKS.doi;

export const fishLook = (id) => FISH_LOOKS[id] ?? FALLBACK;
