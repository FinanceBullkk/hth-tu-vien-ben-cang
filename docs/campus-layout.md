# Quy hoạch khuôn viên — 07/11/2026

## Bố cục

- Trục tam quan–thiền đường rộng 6 m; không đặt công trình giữa trục.
- Tây: quán trà ở sân trước, cây bồ đề ở sân giữa, gác chuông phía sau.
- Bắc: thiền đường ở giữa, hồ sen/cầu vòm bên tây, bảo tháp/vườn đá bên đông.
- Đông: sân đầu hồ, bảng ước và hồ câu. Giữ một container có mái ngói làm bảng ước;
  bỏ container phụ để mở lối xuống hồ.
- Nền xanh chia các cụm; sân lát riêng cho chuông, tháp, đầu hồ và trước thiền đường.
  Đường dạo rộng 2.4 m nối các cụm, một lối ngang rộng 3 m xuyên sân giữa.
- Giảm từ ba hàng cờ/dây đèn xuống một hàng ở tiền sân. Cây và đèn trục chính đặt theo cặp.

## Nguồn và ràng buộc

`shared/layout.js` giữ tọa độ, đường đi, va chạm, vùng mái và điểm đến trong menu.
`client/src/scene/campus-ground.js` dựng mặt sân và đường từ dữ liệu đó.
Mặt lát cao tối đa 0.04 m; bậc thiền đường, sàn chuông, quán trà và cầu giữ độ cao cũ.
Mô hình GLB và fallback dùng cùng tọa độ. Lời ước vẫn gắn theo slot, không chuyển dữ liệu DB.

## Kiểm tra

- `npm run build`
- `npm test`
- `node --test test/campus-layout.test.js`: trục đi không bị chặn, điểm hoạt động hợp lệ,
  cầu vòm khớp hồ và va chạm.
- Khi Vite đang chạy, mở `http://localhost:5173/campus-preview.html`: toàn cảnh, mặt bằng,
  góc từ cổng; kéo xoay và cuộn phóng to. Trang dùng mô hình thật với ánh sáng kiểm tra ban ngày,
  không kết nối server hoặc ghi dữ liệu. Đây là trang kiểm tra dev, không nằm trong build phát hành.

Thay đổi bản đồ cần cập nhật client và server cùng phiên bản khi triển khai.
