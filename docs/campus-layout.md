# Quy hoạch khuôn viên — 07/11/2026

## Bố cục

- Trục nhìn tam quan–thiền đường thông thoáng; đường đá uốn nhẹ qua sân cỏ.
- Tây: quán trà ở sân trước, bồ đề ở sân giữa, gác chuông và hồ sen phía sau.
- Bắc: thiền đường cùng hai hành lang có mái; hồ/cầu vòm bên tây, bảo tháp bên đông.
- Đông: sân đầu hồ, bảng ước bằng vôi/gỗ có mái ngói và hồ câu.
- Đường dạo CatmullRom rộng 2.1–3.8 m nối các cụm; sân lát lớn tập trung trước thiền đường.
- Cây, đá và đèn bố trí lệch; bụi trúc che mép sân, hoa đào làm điểm nhấn.
  Chỉ giữ một hàng cờ/dây đèn ở tiền sân.

## Màu và ánh sáng

- Mái xanh ngọc, tường kem, gỗ ấm; nền cỏ và rừng xanh sáng ít bão hòa.
- Trời xanh nhạt và nắng kem; đêm xanh lam có ánh trăng, giữ đường đi dễ thấy.
- Preview dùng cùng `DayNight` với game; giữ nguyên chu kỳ đồng bộ server.
- GLB lưu màu linear bằng lớp `FLOAT_COLOR`. Lớp byte cũ hiểu màu linear như sRGB,
  gây chuyển đổi lần hai và làm mái xỉn tối. Đã dựng lại sáu mô hình khuôn viên.
- Đất phía ngoài cổng hạ dưới bậc thềm ở cả hai mức chất lượng địa hình.

## Nguồn và ràng buộc

`shared/layout.js` giữ tọa độ, đường đi, va chạm, vùng mái và điểm đến trong menu.
`client/src/scene/campus-ground.js` dựng mặt sân và đường từ dữ liệu đó.
`client/src/scene/campus-galleries.js` dựng hành lang và bụi trúc cùng tọa độ va chạm.
Mặt lát cao tối đa 0.04 m; bậc thiền đường, sàn chuông, quán trà và cầu giữ độ cao cũ.
Mô hình GLB và fallback dùng cùng tọa độ. Lời ước vẫn gắn theo slot, không chuyển dữ liệu DB.

Tham khảo bố cục Qinghe trong Where Winds Meet: kiến trúc xen cây, đường dạo mềm,
không gian có nhiều lớp; bảng màu sáng theo yêu cầu riêng của dự án.
[Giới thiệu chính thức NetEase](https://www.neteasegames.com/news/20250701/37000_1244308.html).
Không nhập tài nguyên của trò chơi tham khảo.

## Kiểm tra

- `npm run build`
- `npm test`
  Khi kiểm tra nhiều worktree cùng lúc, đặt `HTH_TEST_PORT` thành cổng trống riêng
  (ví dụ PowerShell: `$env:HTH_TEST_PORT='13911'; npm test`).
- `node --test test/campus-layout.test.js`: trục đi không bị chặn, điểm hoạt động hợp lệ,
  đường cong và hành lang đi được, cầu vòm khớp hồ và va chạm.
- `node --test test/campus-visuals.test.js`: màu mái GLB khớp linear palette,
  raycast địa hình không che bậc cổng ở cả hai mức chất lượng.
- `node tools/blender/inspect_glb.js`: sáu mô hình đều có vertex colors.
- Khi Vite đang chạy, mở `http://localhost:5173/campus-preview.html`: toàn cảnh, mặt bằng,
  góc từ cổng, vườn trà; kéo xoay và cuộn phóng to. Chọn nắng sớm hoặc ánh trăng.
  Trang dùng mô hình, địa hình và ánh sáng thật, không kết nối server hoặc ghi dữ liệu.
  Đây là trang kiểm tra dev, không nằm trong build phát hành; cổng có thể đổi theo Vite.

Thay đổi bản đồ cần cập nhật client và server cùng phiên bản khi triển khai.
