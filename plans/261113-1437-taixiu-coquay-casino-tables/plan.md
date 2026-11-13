# Tài xỉu + Cò quay theo lối "Gamble With Your Friends"

Nhánh `feat/taixiu-coquay`, worktree `.claude/worktrees/taixiu-coquay`.

## Tham khảo được gì (GWYF, Steam app 3892270)

- Bàn 3D chính là trò chơi: đứng ở bàn là thấy bàn, bấm thẳng lên bàn; không có bảng 2D che màn hình.
- Người chơi tự tay tác động: tự ném xúc xắc (vị trí + chuột ảnh hưởng lực ném), tự quay bánh xe.
- Kết quả do RNG chọn trước rồi diễn hoạt tới đúng ô (roulette: bi được dẫn về đúng ô) -> hợp quy tắc server là nguồn sự thật.
- Ván ngắn, thắng/thua rõ bằng hình (xanh/đỏ), có lịch sử kết quả, khán giả xung quanh cùng xem.
- Điểm bị chê: thời gian quá gấp, cảm giác "bịp" khi không thấy kết quả diễn ra -> luôn diễn kết quả trên bàn 3D cho cả sân.

## Áp vào tu viện

- Tiền cá nhân (TEU), không có quỹ chung/nợ chung (chủ dự án chốt).
- Cơ chế xã hội: **người cược lớn nhất ván được tung** (giữ chuột/Space để lấy đà, thả ra để ném/búng bi). Không tung kịp thì tự tung.
- Góc máy cố định nhìn xuống bàn khi chơi; bấm ô trên mặt bạt 3D để đặt chip; chồng chip 3D theo tổng cược.
- HUD gọn ở đáy: pha + đếm ngược, khay chip, cược của mình, lịch sử ván.

## Luật

- Tài xỉu: 3 viên. Xỉu 4–10, Tài 11–17 ăn 1:1, ra bộ ba thì cả hai thua. Bão (bộ ba bất kỳ) ăn 1:30, tối đa 3 TEU. Nhà cái lợi 2,8% (tài/xỉu), 13,9% (bão).
- Cò quay: bánh châu Âu 37 ô. Số đơn 35:1 (tối đa 5 TEU/số), đỏ/đen/chẵn/lẻ/nhỏ/lớn 1:1, tá 2:1. Ra 0 thì cược ngoài thua. Lợi 2,7%.
- Chip 1/5/10, tối đa 50 TEU/ván/người như bầu cua.

## Pha

`idle -> betting (10s) -> throwing (tối đa 5s, người cược lớn nhất) -> rolling (diễn hoạt) -> result (4s) -> idle`

## Việc

- [x] shared/taixiu.js, shared/coquay.js: luật, chấm, giới hạn
- [x] server/casino-round-table.js (lõi chung) + server/taixiu.js, server/coquay.js
- [x] table-stake-store, db, protocol, layout (vùng, vật cản, PLACES), rooms, index
- [x] client: scene bàn 3D (xúc xắc tung, bánh xe + bi), activity chung + hai activity, HUD, main.js
- [x] test/taixiu.test.js, test/coquay.test.js (luật, lợi thế nhà cái, giả mạo, ngắt kết nối, socket)
- [x] docs/taixiu-coquay.md, README

## Rủi ro

- Phiên khác đang sửa bầu cua/xì dách (`feat/casino-table-ux`, góc máy `table-camera-shot.js`): không đụng file của họ; sau này có thể gộp góc máy chung.
