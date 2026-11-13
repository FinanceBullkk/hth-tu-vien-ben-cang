# Tài xỉu và cò quay

Hai bàn đỏ đen thứ ba và thứ tư, ngay sau bầu cua và xì dách, phía thiền đường, giữa hai hành lang
(`TAIXIU_ZONE`, `COQUAY_ZONE` trong `shared/layout.js`). Cược bằng TEU thật, tiền cá nhân.

## Lối chơi (tham khảo Gamble With Your Friends)

- **Bàn là trò chơi.** Vào bàn là góc máy hạ xuống ngang tầm mắt ngay chỗ đứng, nhân vật của mình ẩn trên máy mình
  (người khác vẫn thấy). Rê chuột lên bạt thì ô sáng, bấm là đặt chip vào đúng ô đó. HUD chỉ là dải mỏng ở đáy.
- **Người cược to nhất ván được tự tung.** Hết giờ cược, người đặt nhiều TEU nhất (bằng nhau thì ai đặt trước) có 5 giây:
  giữ chuột hoặc Space để lấy đà (thanh lực lên đầy trong 1,1 giây rồi dao động), thả ra là tung xúc xắc / búng bi.
  Không tung kịp thì bàn tự tung. Lực chỉ đổi cách diễn (độ vồng, độ xoáy, số vòng bi chạy), không đổi kết quả.
- **Kết quả bốc trước, diễn tới đúng chỗ.** Server bốc lúc tung; mọi máy diễn cùng một cú: xúc xắc bay từ tay, nảy trong
  khay rồi nằm đúng mặt; bi chạy ngược chiều mâm, xoắn vào và nằm đúng ô rồi quay theo mâm.
- Bảng cầu (các ván gần nhất) nằm trên HUD và biển tên bàn; nhà cái NPC hô theo pha.

## Luật

| Bàn | Cửa | Ăn | Tối đa / người / ván | Hoàn vốn |
| --- | --- | --- | --- | --- |
| Tài xỉu | Xỉu (4–10), Tài (11–17); ra bộ ba thì cả hai thua | 1 ăn 1 | 30 | 210/216 (lợi 2,8%) |
| Tài xỉu | Bão (bộ ba bất kỳ) | 1 ăn 30 | 3 | 186/216 (lợi 13,9%) |
| Cò quay | Số đơn 0–36 | 1 ăn 35 | 5 | 36/37 (lợi 2,7%) |
| Cò quay | Tá 1–12, 13–24, 25–36 | 1 ăn 2 | 20 | 36/37 |
| Cò quay | Đỏ, Đen, Chẵn, Lẻ, 1–18, 19–36; ra 0 thì thua | 1 ăn 1 | 30 | 36/37 |

- Chip 1/5/10, tối đa 50 TEU một người một ván. Bánh xe châu Âu một số 0, thứ tự ô chuẩn (`WHEEL_ORDER`).
- Test `nhà cái luôn lợi thế` / `nhà cái lợi đúng 1/37` duyệt hết mọi kết quả để giữ các con số trên khi ai đó sửa luật.

## Vòng đời một ván

`idle` -> có người cược -> `betting` (tài xỉu 10 s, cò quay 12 s) -> `throwing` (≤ 5 s) -> `rolling` (2,6 s / 6 s)
-> `result` (4 s) -> `idle`. Hết giờ cược mà không còn ai cược (rút hết) thì về `idle`, không tung.
Cược lúc `idle` hoặc `result` mở ván mới ngay. Mốc giờ trong `TAIXIU`, `COQUAY` ở `shared/`.

## Mã

- `shared/casino-bets.js`: chấm cược chung (cửa trúng nhận cược × (1 + pays)), tính hoàn vốn.
- `shared/taixiu.js`, `shared/coquay.js`: cửa, giới hạn, mốc giờ, bốc và chấm.
- `server/casino-round-table.js`: lõi chung (giữ tiền, pha, chọn người tung, chia tiền, hoàn khi tắt/sập).
  `server/taixiu.js`, `server/coquay.js` chỉ khai báo luật. Tiền giữ trong `taixiu_pending`, `coquay_pending`
  qua `TableStakeStore`; `teu_log` lý do `taixiu:*`, `coquay:*`; bảng tuần tính lãi/lỗ ròng như bầu cua.
- Client: `scene/casino-felt-table.js` (bàn, bạt canvas có vùng bấm, chồng chip, nhà cái), `scene/taixiu-table.js`,
  `scene/coquay-table.js` + `scene/coquay-wheel.js`, `activities/casino-round-activity.js` (điều khiển chung),
  `activities/taixiu.js`, `activities/coquay.js` (cấu hình), `ui/casino-round-hud.js`.

## Giao thức

| Sự kiện | Hướng | Nội dung |
| --- | --- | --- |
| `<trò>:bet` | client -> server | `{ target, amount: 1\|5\|10 }`, ack `{ ok, bets, teu, state }` |
| `<trò>:clear` | client -> server | rút hết cược khi còn nhận cược |
| `<trò>:throw` | client -> server | `{ power: 0..1 }`, chỉ người tung, chỉ trong `throwing` |
| `<trò>:state` | server -> cả phòng | `{ phase, round, endsAt, totals, bettors, thrower: {sid,name}, power, result, history }`; không có playerId, không có ai cược bao nhiêu |
| `<trò>:payout` | server -> người cược | `{ round, result, stake, payout, net, teu }` |

`<trò>` là `taixiu` hoặc `coquay`. Hello trả `snapshot.taixiu`, `snapshot.coquay` (kèm `mine`, `isThrower`)
để vào lại giữa ván vẫn cược, vẫn tung được.
