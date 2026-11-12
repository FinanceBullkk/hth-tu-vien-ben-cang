# Bầu cua tôm cá

Bàn chung ở sân trước thiền đường, phía tây trục chính (`BAUCUA_ZONE` trong `shared/layout.js`); bàn xì dách
đối xứng phía đông (`docs/xidach.md`). Cược bằng TEU thật.

## Luật

- Sáu mặt: Nai, Bầu, Gà, Cá, Cua, Tôm. Ba viên xúc xắc, server gieo bằng `crypto.randomInt`.
- Cược một mặt, ra `n` viên trùng thì nhận lại tiền cược cộng `n` lần tiền cược; không trùng thì mất cược.
- Hoàn vốn kỳ vọng mỗi mặt là 199/216 (nhà cái lợi 7,9%), nên TEU bị rút dần khỏi nền kinh tế.
- Chip 1, 5, 10 TEU. Tối đa 30 TEU một mặt và 50 TEU một người mỗi ván.

## Vòng đời một ván

`idle` -> có người đặt cược đầu tiên -> `betting` (8 giây) -> `rolling` (2 giây xóc) -> `result` (3 giây) -> `idle`.
Đặt cược lúc `idle` hoặc `result` mở ván mới ngay. Bàn không chạy khi không ai cược, nên không tốn băng thông.
Mọi mốc thời gian và giới hạn nằm trong `BAUCUA` ở `shared/baucua.js`.

## Hình ảnh

- Bàn tròn: tấm bạt 3×2 (Nai Bầu Gà / Cá Cua Tôm) trải nửa phía khách, đĩa sứ và bát úp nửa phía nhà cái.
- Chú Tư nhà cái (NPC `scene/table-dealer.js` dùng chung với xì dách, đứng ở `BAUCUA_ZONE.dealer`, là vật cản)
  hô theo pha, hai tay nhấc đĩa xóc khi `rolling`.
- Mở bát: bát nhấc lên nghiêng về phía khách, ô trúng trên bạt sáng vàng; người đang chơi thấy ba viên to giữa màn hình
  (`ui/baucua-reveal.js`) kèm lãi/lỗ của mình, nghe tiếng lắc xúc xắc khi xóc.
- Bảng cược (`ui/baucua-panel.js`) vẽ như tấm bạt đỏ: chip tròn 1/5/10, chồng chip trên ô mình đã cược, thanh thời gian chạy lùi.

## TEU và bảng tuần

- Tiền cược bị trừ ngay khi đặt (`teu_log`, lý do `baucua:bet`, số âm) và ghi giữ vào bảng `baucua_pending`.
  Rút cược khi còn đang đặt thì hoàn đủ (`baucua:return`).
- Sau ván, server trả thưởng theo `playerId`, kể cả người đã rời bàn hay mất kết nối: phần cược hoàn lại ghi `baucua:return`,
  phần lãi ghi `baucua:win`, rồi xoá dòng giữ. Mọi dòng của một ván ghi cùng ngày bắt đầu ván.
- Bảng TEU tuần: các hoạt động khác chỉ cộng phần kiếm được, tiêu ở sạp không trừ hạng. Riêng các bàn đỏ đen tính
  **lãi/lỗ ròng cả tuần** (mọi dòng `baucua:*`, `xidach:*`), thắng cộng, thua trừ. Chỉ cộng ván thắng thì cứ cược nhiều
  là lên hạng dù TEU đang hao. Người có tổng tuần không dương thì không hiện trên bảng.
- Tắt server giữa ván: `BauCua.stop()` hoàn ngay. Server sập đột ngột: lần khởi động sau, `TableStakeStore.recover()` hoàn mọi
  dòng còn trong `baucua_pending`, nên không ai mất cược.

## Giao thức

| Sự kiện | Hướng | Nội dung |
| --- | --- | --- |
| `baucua:bet` | client -> server | `{ symbol: 0..5, amount: 1\|5\|10 }`, ack `{ ok, bets, teu, state }` |
| `baucua:clear` | client -> server | rút toàn bộ cược của mình khi còn đang đặt |
| `baucua:state` | server -> cả phòng | `{ phase, round, endsAt, dice, totals, bettors }`, không có tên hay `playerId` |
| `baucua:payout` | server -> người cược | `{ round, dice, stake, payout, net, teu }` |

Hello trả thêm `snapshot.baucua` (trạng thái bàn kèm `mine` là cược đang đặt của người đó) để vào lại giữa ván vẫn khớp.
Server chỉ nhận cược khi người chơi đang ở hoạt động `baucua` và đứng trong tầm bàn.

## Mã

- `shared/baucua.js`: mặt, hằng số, `settle()`.
- `server/baucua.js`: bàn và vòng đời ván; `server/table-stake-store.js`: giữ/trả/hoàn TEU trong transaction (dùng chung với xì dách).
- `client/src/activities/baucua.js`, `ui/baucua-panel.js`, `ui/baucua.css`, `scene/baucua-table.js`, `scene/baucua-textures.js`.
- `test/baucua.test.js`: luật chấm, pha ván với đồng hồ giả, dữ liệu giả mạo, ngắt kết nối, và một lượt qua socket thật.
