# PR1: nới gò và dời các cụm

Ưu tiên cao. Chỉ đổi bố cục; kiến trúc và trang trí để PR2–PR4. Luật chơi và giao thức không đổi.

## Bố cục mới (tọa độ game, z âm là bắc)

- Tường sân: tây x=-66.3, bắc z=-46.3, đông x=30.1 (tường chắn dốc cảng), nam z=30 (cổng ở giữa).
- Nội viện: thiền đường (0,-32); sân đạo trường x ±9.7, z -24..-3, để trống; hai hành lang x ±11.6, z -22..-8.
  Hồ sen (-21,-34), bảo tháp (21,-36), vườn đá x 15..27, z -26..-18.
- Tiền sân tây: gác chuông (-15,4), cây bồ đề (-14,19).
- Phố chợ: quán trà (-30,22), Sạp Kim Bảo (-42,23), trạm giao thương (-50,18).
- Kim Ngân Phường: tường x -64..-28, z -28..10; cổng đông z -7..-1, cổng nam x -49..-43.
  Cột tây bầu cua (-52,-14), tài xỉu (-52,0); cột đông xì dách (-40,-14), cò quay (-40,0);
  khách đứng phía lối giữa x=-46. Hành lang máy gạt cần x=-62, z -14..0 (3 máy như cũ).
- Phía đông giữ nguyên: hồ câu, tấu nhạc, đầu hồ, bảng ước, sư chú giữ cổng.

## Việc

- [x] `shared/layout.js`: hằng số mới, tường khu sòng, đường dạo, cây, đèn, `SITE`.
- [x] `shared/camera-colliders.js`: tường khu sòng, tường nam dài hơn.
- [x] `client/src/scene/terrain.js`: mặt gò phẳng theo `SITE`, rừng chừa vùng mới.
- [x] `client/src/scene/monastery.js`, `campus-ground.js`: tường bao, nền sân, sân lát khu sòng và phố chợ.
- [x] `client/src/scene/casino-quarter.js`: tường khu sòng, cột cổng, Tụ Bảo Bồn (bản thô, PR3 làm đẹp).
- [x] `client/src/scene/sky.js`: khung bóng đổ phủ cả gò; `particles.js` rơi hoa theo `BOUNDS`.
- [x] `client/campus-preview.html`: góc nhìn toàn cảnh và mặt bằng theo gò mới.
- [x] Test: `campus-layout.test.js` thêm kiểm tra cổng khu sòng thông, bàn không chồng nhau.

## Kiểm tra

`npm test`, `npm run build`, mở `campus-preview.html` xem mặt bằng và toàn cảnh, đi thử bằng menu "Chơi gì?".

## Rủi ro

- Bóng đổ mờ hơn vì khung rộng hơn: chấp nhận ở PR1, cân nhắc bóng bám theo người chơi sau.
- Test có tọa độ cứng: chạy toàn bộ và sửa theo hằng số trong layout.
- Lời ước gắn theo slot cành cây, dời cây không mất dữ liệu.
