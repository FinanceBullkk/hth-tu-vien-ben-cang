// Hoạt ảnh một lá bài 3D trên bàn: bay từ chồng bài tới chỗ (vòng cung, xoay nhẹ) và lật úp thành ngửa.
// Trạng thái hoạt ảnh nằm trong mesh.userData.anim; bàn gọi stepCard mỗi khung cho lá đang chuyển động.
// Lá là mặt phẳng nằm ngửa (rotation.x = -π/2, thứ tự XYZ) nên lật quanh trục y cục bộ là lật quanh sống lá.

export const DEAL_GAP_S = 0.13; // Các lá chia trong cùng một lượt bay cách nhau chừng này.
const FLY_S = 0.38;
const FLIP_S = 0.42;
const ARC_H = 0.14; // Độ cao vòng cung khi bay.

/** Bay từ from (toạ độ trong khung của hàng bài) tới (tx, ty, 0), sau delay giây. */
export const flyAnim = (from, tx, ty, delay) => ({ kind: 'fly', t: -delay, dur: FLY_S, fx: from.x, fy: from.y, fz: from.z, tx, ty });

/** Lật lá đang úp thành lá card, sau delay giây. */
export const flipAnim = (card, ty, delay) => ({ kind: 'flip', t: -delay, dur: FLIP_S, card, ty, swapped: false });

/**
 * Chạy một bước. material(card) cho vật liệu mặt lá; onLand khi lá vừa nằm xuống; onFlip lúc đổi mặt.
 * Xong thì gỡ anim khỏi userData.
 */
export function stepCard(mesh, dt, { material, onLand, onFlip }) {
  const a = mesh.userData.anim;
  a.t += dt;
  if (a.t < 0) return;
  const p = Math.min(1, a.t / a.dur);
  if (a.kind === 'fly') {
    const e = 1 - (1 - p) ** 3;
    mesh.visible = true;
    mesh.position.set(a.fx + (a.tx - a.fx) * e, a.fy + (a.ty - a.fy) * e + Math.sin(p * Math.PI) * ARC_H, a.fz * (1 - e));
    mesh.rotation.z = (1 - e) * 1.4;
    if (p >= 1) {
      mesh.rotation.z = 0;
      mesh.userData.anim = null;
      onLand?.();
    }
    return;
  }
  // 0 → 90° (thấy mặt sau), đổi vật liệu, -90° → 0 (thấy mặt trước). Mặt phẳng một mặt nên không quay quá 90°.
  mesh.rotation.y = p < 0.5 ? p * Math.PI : (p - 1) * Math.PI;
  mesh.position.y = a.ty + Math.sin(p * Math.PI) * 0.07;
  if (p >= 0.5 && !a.swapped) {
    a.swapped = true;
    mesh.material = material(a.card);
    onFlip?.();
  }
  if (p >= 1) {
    mesh.rotation.y = 0;
    mesh.position.y = a.ty;
    mesh.userData.anim = null;
  }
}
