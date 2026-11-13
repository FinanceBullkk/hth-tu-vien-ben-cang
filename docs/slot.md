# Máy gạt cần

Dãy ba máy slot trong hành lang có mái phía tây (`SLOT_ZONE` trong `shared/layout.js`), giữa hai cột khoang giữa,
lưng máy sát mép ngoài hành lang, mặt máy quay về phía đông nhìn ra sân sòng. Cược bằng TEU thật, tiền cá nhân.

## Lối chơi

- **Máy là trò chơi.** Vào máy là góc máy hạ ngang tầm mắt trước mặt máy (`slotShot`), nhân vật mình ẩn trên máy mình.
  Bấm lên máy, nút **Gạt cần** trên HUD hoặc Space để gạt; 1/2/3 đổi mức cược. HUD là dải mỏng ở đáy.
- **Mỗi lần gạt là một ván riêng**, chấm xong ngay ở server: không có pha, không có ván chung, không cần `sweep`.
- **Kết quả bốc trước, diễn tới đúng chỗ.** Ack trả ba hình; client kéo cần, quay ba cuộn rồi dừng lần lượt đúng hình đó.
  Ví trừ cược ngay; phần thắng chỉ cộng khi cuộn cuối dừng trên màn hình (không theo đồng hồ thật, có mốc dự phòng).
- **Cả sân thấy máy quay.** Server phát `slot:spin` cho mọi người; máy tương ứng quay trên màn hình người khác.

## Luật

Ba cuộn, một đường thưởng giữa. Mỗi cuộn bốc độc lập theo trọng số (tổng 34). `×n` là số lần tiền cược được trả về.

| Hình | Trọng số | Ba hình | Đôi (hai ô bất kỳ) |
| --- | --- | --- | --- |
| 🍑 Đào | 12 | ×5 | – |
| 🍊 Quýt | 9 | ×10 | ×1 |
| 🏮 Đèn lồng | 6 | ×20 | ×1 |
| 🧧 Lì xì | 4 | ×40 | ×2 |
| 💰 Túi vàng | 2 | ×80 | ×3 |
| 🐉 Rồng | 1 | ×200 (nổ hũ, 1/39 304) | ×8 |

- Mức cược 1/5/10 TEU mỗi lần gạt (đúng khay chip các bàn khác).
- Hoàn vốn kỳ vọng 95,6%, khoảng 35% lượt có ăn (gồm cả hoà vốn), khoảng 12% lượt có lãi.
  `expectedReturn()` trong `shared/slot.js` duyệt hết 216 tổ hợp; test giữ con số này khi ai đó sửa bảng.
- Dải hình vẽ trên cuộn (10 ô mỗi cuộn, client) chỉ để nhìn, không ảnh hưởng tỉ lệ.

## Giao thức

| Sự kiện | Chiều | Dữ liệu |
| --- | --- | --- |
| `action:start` | client → server | `{ kind: 'slot' }` (mã hoạt động 13) |
| `slot:spin` | client → server (ack) | gửi `{ amount }`; ack `{ ok, machine, reels, mult, kind, symbol, stake, payout, net, teu }` |
| `slot:spin` | server → mọi người | `{ sid, m, reels, mult }`; từ ×40 trở lên thêm `{ name, payout }` |

Server kiểm tra: mức cược đúng một trong ba chip (không ép kiểu), đang ở hoạt động `slot`, đứng trong tầm một máy
(`slotMachineAt` + dung sai 1,2 m), cách lần gạt trước ít nhất 1,7 giây, đủ TEU. Tin phát chung không có `playerId`.

## Tiền

Đi qua `TableStakeStore('slot')` như các bàn đỏ đen: trừ cược (giữ trong `slot_pending`, ghi `slot:bet`) rồi chấm ngay
(`slot:return` + `slot:win`). Chấm hỏng thì hoàn ngay; server sập đúng giữa hai bước thì lần khởi động sau hoàn lại.
Bảng tuần tính lãi/lỗ ròng theo tiền tố `slot:` (`TABLE_GAMES`).

## Mã

- `shared/slot.js`: hình, trọng số, bảng thưởng, `symbolAt`, `lineOf`, `settleSpin`, `expectedReturn`.
- `server/slot.js`: `Slot.spin`.
- `client/src/scene/slot-machines.js` (dãy máy), `slot-machine-model.js` (thân máy, cần gạt), `slot-machine-reels.js`
  (cuộn quay), `slot-machine-lights-and-coins.js` (đèn chạy, xu), `slot-machine-textures.js` (canvas).
- `client/src/activities/slot.js`, `slot-camera-shot.js`; `client/src/ui/slot-hud.js`, `slot.css`.
- `test/slot.test.js`.
