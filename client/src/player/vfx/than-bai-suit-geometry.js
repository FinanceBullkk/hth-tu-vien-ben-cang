import * as THREE from 'three';
import { traceSuit } from '../../scene/card-suit-paths.js';

// Bốn chất bài đúc vàng 3D cho hào quang Thần bài: dùng lại đúng đường cong chất bài của lá bài
// (card-suit-paths.js), vạch lên ShapePath rồi đùn khối có vát mép. Hình đứng thẳng trong mặt xy, tâm ở gốc.
const SIZE = 0.32, DEPTH = 0.1;

// Bộ chuyển API canvas → ShapePath (lật trục y vì canvas trục y hướng xuống). arc chỉ dùng cho vòng tròn đầy
// (lá chuồn), xấp xỉ bằng bốn cung Bézier bậc ba bắt đầu từ điểm đang đứng.
class SuitTracer {
  constructor() { this.path = new THREE.ShapePath(); }
  moveTo(x, y) { this.path.moveTo(x, -y); }
  lineTo(x, y) { this.path.lineTo(x, -y); }
  quadraticCurveTo(a, b, x, y) { this.path.quadraticCurveTo(a, -b, x, -y); }
  bezierCurveTo(a, b, c, d, x, y) { this.path.bezierCurveTo(a, -b, c, -d, x, -y); }
  closePath() {}
  arc(cx, cy, r) {
    const k = 0.5523 * r, y = -cy;
    this.path.bezierCurveTo(cx + r, y + k, cx + k, y + r, cx, y + r);
    this.path.bezierCurveTo(cx - k, y + r, cx - r, y + k, cx - r, y);
    this.path.bezierCurveTo(cx - r, y - k, cx - k, y - r, cx, y - r);
    this.path.bezierCurveTo(cx + k, y - r, cx + r, y - k, cx + r, y);
  }
}

/** Bốn khối chất ♠ ♣ ♦ ♥ (cùng thứ tự SUITS), cao SIZE, dày DEPTH, tâm ở gốc. */
export function createSuitGeometries(lowQuality = false) {
  return [0, 1, 2, 3].map((suit) => {
    const tracer = new SuitTracer();
    traceSuit(tracer, suit);
    // Mỗi đường con là một khối riêng (thân bích + cuống, ba cánh chuồn): tránh bị hiểu nhầm thành lỗ thủng.
    const shapes = tracer.path.subPaths.map(sub => new THREE.Shape(sub.getPoints(lowQuality ? 6 : 12)));
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH / SIZE, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: lowQuality ? 1 : 3, curveSegments: lowQuality ? 6 : 12,
    });
    geo.translate(0, 0, -DEPTH / SIZE / 2).scale(SIZE, SIZE, SIZE);
    geo.computeVertexNormals();
    return geo;
  });
}
