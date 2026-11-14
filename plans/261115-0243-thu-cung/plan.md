# Thú cưng (ấp trứng, đi theo, cho ăn cá)

Chủ dự án chốt (15/11/2026): đi theo + cho ăn cá tăng thân thiết; có thú bằng ấp trứng ngẫu nhiên; trộn thú đời thường + linh thú.

## Luật (`shared/pets.js`)
- 9 thú, id = chỉ số mảng (chỉ nối thêm cuối): Mèo mướp, Chó cỏ, Thỏ trắng (Thường) · Gấu trúc con, Rùa ngọc (Quý) · Hồ ly chín đuôi, Hạc tiên (Linh thú) · Kỳ lân con, Rồng con (Thần thú).
- Trứng linh thú 25 TEU. Trọng số phần nghìn theo bậc: 580/270/110/40, chia đều trong bậc.
- Bảo hiểm: 12 trứng liền không ra Linh thú trở lên thì trứng thứ 12 chắc chắn Linh thú/Thần thú.
- Trùng thú: cộng thân thiết theo bậc (15/25/50/100).
- Thân thiết 0–300, bậc 0/40/120/300: Mới quen, Thân quen, Gắn bó, Tri kỷ. Bậc cao có hiệu ứng (tim, vòng sáng, hào quang vàng).
- Cho ăn: cá trong túi (chưa khoá) cho thú đang dắt; cộng theo phẩm chất cá 4/8/16/40/90.

## Server
- `server/pet-store.js`: bảng `pets`, cột `players.pet` (thú đang dắt +1), `players.pet_pity`; transaction ấp trứng (trừ TEU + bốc + lưu) và cho ăn (xoá cá + cộng thân thiết).
- `server/pets.js`: `hatch`, `summon`, `feed`, `state`, `load`; phát `player:pet`, `pet:fed`.
- `server/rooms.js`: đăng ký `pet:hatch|summon|feed`, snapshot `pets`, `publicPlayer.pet/petTier`.

## Client
- `client/src/scene/pet-models.js` (+ file con nếu dài): dựng 9 thú bằng code, thần thú có hiệu ứng sáng.
- `client/src/player/pet-follower.js`: thú đi theo chủ, ngồi khi chủ đứng, bay với thú bay, ăn, tim, hiệu ứng bậc.
- `client/src/player/pets.js`: quản lý thú của mọi người theo sid, nối sự kiện mạng.
- `client/src/ui/pet-panel.js` + `pet.css`: danh sách thú, ấp trứng (hoạt cảnh nở), dắt/cất, cho ăn cá.
- Nút HUD "Thú cưng", phím P.

## Test
- `test/pets.test.js`: bốc thú, bảo hiểm, trừ TEU, thiếu TEU, trùng thú, cho ăn (cá khoá, cá người khác, chưa dắt thú), dắt thú chưa có, dữ liệu giả, broadcast.

## Trạng thái
- [x] shared + server + test
- [x] client model + follower + panel
- [x] npm test, build, xem trong trình duyệt
- [ ] README, PR, merge
