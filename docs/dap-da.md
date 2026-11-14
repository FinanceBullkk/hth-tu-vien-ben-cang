# Đập đá

Bãi đá cạnh bãi container (`STONE_YARD` trong `shared/layout.js`): dãy bốn đe đá giữa lối ra sân đầu hồ và lối ven hồ
câu, đống đá thô và xe cút kít ở đầu đông, bảng gỗ "Bãi đá · Tìm ngọc" sau dãy đe. Người đập đứng phía nam đe, quay
mặt về bắc. Mỗi người một tảng riêng trên đe mình đứng; đập vỡ ra một viên ngọc, giá ngọc cộng thẳng vào TEU.
Mục đích chính là cho người chơi một đường kiếm TEU đều tay (đá thường miễn phí), kèm một trò gacha (đá mua bằng TEU).

## Lối chơi

- **Vào bãi:** đứng trước đe bấm E, hoặc menu **Chơi gì? → Đập đá** (đưa tới đe thứ hai). Góc máy đứng sau đe, hơi lệch
  trái, nhìn chéo xuống tảng đá; nhân vật mình ẩn đi (người khác vẫn thấy mình đứng ở đe). HUD là dải ở đáy.
- **Lấy đá:** chọn loại (phím 1–3) rồi **Lấy đá**. Đang có tảng chưa vỡ thì không đổi loại được.
- **Đập:** kim thanh lực chạy 0 → 1 → 0 theo giờ server, bắt đầu từ lúc đặt đá. Bấm Đập/Space: client vung búa và hiện
  chữ chấm thử ngay, server chấm lại từ đúng thời điểm đó (cùng công thức nên khớp).
- **Vỡ:** đá văng mảnh, ngọc bay lên trong quầng sáng màu ngọc; từ Bích ngọc có cột sáng, từ Lam ngọc thêm vòng sóng,
  từ Hồng ngọc thêm tia màu ngọc. Tên ngọc và số TEU hiện sau một nhịp, ví cộng cùng lúc.

## Luật

| Loại đá | Giá | Độ cứng | Chu kỳ thanh lực | Ít nhát nhất |
| --- | --- | --- | --- | --- |
| Đá thường | miễn phí (kho) | 8 | 1,3 giây | 3 |
| Đá ngọc | 10 TEU | 10 | 1,1 giây | 4 |
| Linh thạch thô | 30 TEU | 12 | 0,95 giây | 4 |

- Nhát đập: lực từ 0,86 trở lên là **Chuẩn** (trừ 3), từ 0,62 là **Khá** (trừ 2), thấp hơn là **Yếu** (trừ 1).
- Kho đá thường: 1 tảng mỗi 3 phút, tối đa 12. Kho đầy thì đồng hồ đứng; lấy một tảng từ kho đầy thì bắt đầu đếm.
  Người chưa có dòng trong DB coi như kho đầy.
- Thưởng khéo tay: đá thường mà mọi nhát đều Chuẩn được thêm 1 TEU. Đá mua bằng TEU không có thưởng khéo tay: đập khéo
  chỉ nhanh hơn, không đổi hoàn vốn.

Bảng ngọc (phần nghìn, `weights` trong `shared/stone.js`):

| Ngọc | TEU | Đá thường | Đá ngọc | Linh thạch thô |
| --- | --- | --- | --- | --- |
| Đá vụn | 0 | – | 280 | 300 |
| Thạch anh | 1 | 700 | – | – |
| Mã não | 3 | 220 | 300 | – |
| Bích ngọc | 8 | 70 | 230 | 220 |
| Lam ngọc | 20 | 9 | 130 | 250 |
| Hồng ngọc | 50 | 1 | 52 | 160 |
| Linh thạch cực phẩm | 200 | – | 8 | 70 |

- Đá thường trung bình 2,15 TEU một tảng (2,15 + 1 nếu đập khéo). Kho đầy 12 tảng là khoảng 26–38 TEU; người ghé đều
  trong ngày được chừng 45–60 TEU mỗi giờ, thấp hơn câu cá chăm chỉ nhưng không phải ngồi canh.
- Đá ngọc hoàn vốn 95,4%, linh thạch thô 95,9% (`expectedValue()`; test giữ trong khoảng 94–97% khi ai sửa bảng).
- Từ Hồng ngọc trở lên (`STONE.shoutTier`) thì cả sân được báo tên người đập.

## Giao thức

| Sự kiện | Chiều | Dữ liệu |
| --- | --- | --- |
| `action:start` | client → server | `{ kind: 'stone' }` (mã hoạt động 14) |
| `stone:start` | client → server (ack) | gửi `{ kind }`; ack `{ ok, kind, hp, maxHp, startAt, stock, nextAt, teu }`; đang có đá thì `{ ok, repeat, kind, hp, maxHp, startAt }` |
| `stone:hit` | client → server (ack) | gửi `{ t }` (giờ server client ước lượng lúc bấm); ack `{ ok, grade, hp }`, vỡ thì thêm `{ broke, kind, gem, gain, bonus, net, teu }` |
| `stone:place` | server → mọi người | `{ sid, s, k }` (đe, loại đá) |
| `stone:hit` | server → mọi người | `{ sid, s, k, c, g }` (độ nứt 0..1, chữ chấm) |
| `stone:break` | server → mọi người | `{ sid, s, k, gem }`; ngọc quý thêm `{ name, teu }` |
| `stone:auto` | server → người đập | kết quả như ack khi vỡ, kèm `auto: true` (server đập nốt vì người chơi rời bãi) |

Snapshot lúc vào phòng có `stoneStock: { stock, nextAt }` của mình và `stones: [{ sid, s, k, c }]` đang nằm trên đe.

Server kiểm tra: loại đá là số nguyên trong bảng (không ép kiểu), đang ở hoạt động `stone`, đứng trong tầm một đe
(`stoneSpotAt` + dung sai 1,2 m), cách lần lấy đá trước 300 ms, đủ TEU hoặc còn đá trong kho. Nhát đập: `t` là số thật
trong cửa sổ [lúc nhận − 600 ms, lúc nhận + 150 ms], không trước lúc đặt đá, cách nhát trước ít nhất 380 ms. Cửa sổ bù
trễ cho phép client gian lận chọn `t` đẹp, nhưng cái lợi tối đa chỉ là đập nhanh hơn và 1 TEU khéo tay cho đá thường
(kho tích theo giờ giới hạn sẵn); đá mua bằng TEU không có lợi gì. Tin phát chung không có `playerId`.

## Tiền

- Đá thường: lấy từ kho (`stone_stock`, `server/stone-stock-store.js`) và cộng TEU (`stone:free`) trong transaction.
- Đá mua: đi qua `TableStakeStore('stone')` như máy gạt cần: trừ tiền đá lúc lấy (giữ trong `stone_pending`, ghi `stone:bet`),
  chấm khi vỡ (`stone:return` + `stone:win`). Chấm hỏng thì hoàn ngay; server tắt khi đá chưa vỡ thì lần khởi động sau hoàn lại.
- Bảng tuần tính lãi/lỗ ròng theo tiền tố `stone:` (`TABLE_GAMES`): đá thường cộng, đá mua tính ròng.
- Không đẩy ví (`db.onTeu`) lúc chấm: client tự cộng khi ngọc đã bay lên trên màn hình.
- Rời bãi, đổi hoạt động, mất kết nối hay bị kích khi đá chưa vỡ: `StoneYard.leave` đập nốt (không thưởng khéo tay),
  trả ngọc vào ví, phát `stone:break` cho cả sân và gửi `stone:auto` cho người đập nếu còn kết nối.

## Mã

- `shared/stone.js`: ngọc, loại đá, bảng trọng số, thanh lực, chấm nhát, kho đá thường, hoàn vốn.
- `server/stone.js` (`StoneYard`), `server/stone-stock-store.js` (kho đá thường).
- `client/src/scene/stone-yard.js` (bãi, đe, biển), `stone-anvil.js` (đá nứt, búa, mảnh), `stone-gem-reveal.js` (màn ngọc),
  `stone-yard-models.js` (hình và vật liệu dùng chung).
- `client/src/activities/stone.js`, `stone-camera-shot.js`; `client/src/ui/stone-hud.js`, `stone.css`.
- `test/stone.test.js`.
