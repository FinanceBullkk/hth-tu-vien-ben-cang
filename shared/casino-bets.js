// Phần chấm cược dùng chung cho các bàn "đặt cửa rồi chờ kết quả" (tài xỉu, cò quay).
// Mỗi bàn mô tả các cửa bằng một mảng: pays là tỉ lệ ăn (1 là 1 ăn 1), max là TEU tối đa một người đặt vào cửa đó mỗi ván.
// Cược của một người là mảng số TEU theo đúng thứ tự cửa; id cửa là chỉ số nên chỉ được nối thêm cửa mới vào cuối.

export const CASINO_CHIPS = [1, 5, 10];

/** Mệnh giá hợp lệ: đúng một trong các chip. Không ép kiểu: chuỗi "5" bị loại. */
export const isCasinoChip = (v) => CASINO_CHIPS.includes(v);

export const sumBets = (bets) => bets.reduce((sum, v) => sum + v, 0);

/**
 * Chấm một người. wins(target) cho biết cửa đó có trúng với kết quả ván này không.
 * Cửa trúng nhận lại cược × (1 + pays); cửa trượt mất cược.
 * profit là lãi ròng (không âm), returned là phần tiền cược được hoàn (payout - profit).
 */
export function settleBets(bets, targets, wins) {
  let payout = 0;
  for (let i = 0; i < targets.length; i++) {
    if (bets[i] > 0 && wins(i)) payout += bets[i] * (1 + targets[i].pays);
  }
  const stake = sumBets(bets);
  const profit = Math.max(0, payout - stake);
  return { stake, payout, net: payout - stake, profit, returned: payout - profit };
}

/** Hoàn vốn kỳ vọng của 1 TEU đặt vào một cửa, duyệt qua mọi kết quả đồng khả năng. Dùng trong test và docs. */
export function expectedReturn(target, targets, outcomes, winsFor) {
  let total = 0;
  for (const outcome of outcomes) if (winsFor(target, outcome)) total += 1 + targets[target].pays;
  return total / outcomes.length;
}
