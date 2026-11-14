// Bốn chất bài vẽ bằng đường cong canvas (không dựa vào font, để máy nào cũng ra cùng một hình, không thành emoji).
// Mỗi hình nằm trong ô vuông đơn vị tâm (0, 0), cạnh 1; người gọi scale theo cỡ muốn vẽ.

function heart(g) {
  g.moveTo(0, 0.46);
  g.bezierCurveTo(-0.14, 0.32, -0.5, 0.1, -0.5, -0.16);
  g.bezierCurveTo(-0.5, -0.42, -0.18, -0.52, 0, -0.26);
  g.bezierCurveTo(0.18, -0.52, 0.5, -0.42, 0.5, -0.16);
  g.bezierCurveTo(0.5, 0.1, 0.14, 0.32, 0, 0.46);
}

function diamond(g) {
  g.moveTo(0, -0.5);
  g.quadraticCurveTo(0.14, -0.2, 0.38, 0);
  g.quadraticCurveTo(0.14, 0.2, 0, 0.5);
  g.quadraticCurveTo(-0.14, 0.2, -0.38, 0);
  g.quadraticCurveTo(-0.14, -0.2, 0, -0.5);
}

/** Cuống loe ở đáy bích và chuồn. */
function stem(g) {
  g.moveTo(-0.05, 0.12);
  g.quadraticCurveTo(-0.04, 0.4, -0.2, 0.5);
  g.lineTo(0.2, 0.5);
  g.quadraticCurveTo(0.04, 0.4, 0.05, 0.12);
  g.closePath();
}

function spade(g) {
  g.moveTo(0, -0.5);
  g.bezierCurveTo(0.16, -0.3, 0.5, -0.12, 0.5, 0.12);
  g.bezierCurveTo(0.5, 0.34, 0.2, 0.42, 0.02, 0.22);
  g.lineTo(-0.02, 0.22);
  g.bezierCurveTo(-0.2, 0.42, -0.5, 0.34, -0.5, 0.12);
  g.bezierCurveTo(-0.5, -0.12, -0.16, -0.3, 0, -0.5);
  g.closePath();
  stem(g);
}

function club(g) {
  for (const [x, y] of [[0, -0.25], [-0.25, 0.05], [0.25, 0.05]]) {
    g.moveTo(x + 0.21, y);
    g.arc(x, y, 0.21, 0, Math.PI * 2);
  }
  g.moveTo(-0.1, -0.05);
  g.lineTo(0.1, -0.05);
  g.lineTo(0.1, 0.12);
  g.lineTo(-0.1, 0.12);
  g.closePath();
  stem(g);
}

// Cùng thứ tự với SUITS trong shared/xidach.js: ♠ ♣ ♦ ♥.
const SHAPES = [spade, club, diamond, heart];

/** Vạch đường viền một chất lên đối tượng có API kiểu canvas (moveTo, lineTo, bezierCurveTo, quadraticCurveTo,
    arc, closePath) — dùng lại cùng hình chất cho khối 3D đúc vàng của hào quang Thần bài. */
export function traceSuit(g, suit) {
  SHAPES[suit](g);
}

/** Tô một chất tại (x, y), cao size px; flip = true thì quay ngược (nửa dưới lá bài). */
export function drawSuit(g, suit, x, y, size, color, flip = false) {
  g.save();
  g.translate(x, y);
  if (flip) g.rotate(Math.PI);
  g.scale(size, size);
  g.beginPath();
  SHAPES[suit](g);
  g.fillStyle = color;
  g.fill('nonzero');
  g.restore();
}
