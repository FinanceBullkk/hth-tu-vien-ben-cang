# Thiền tích Chân khí và aura năm tầng

Thiết kế đã được người dùng chấp thuận: tích Chân khí khi ngồi thiền, tự lên tầng, aura lớn dần; đứng dậy giữ aura nhỏ. Người dùng đã yêu cầu commit, push và deploy ngày 2026-11-07.

- [x] Server: lưu thời gian thiền trong SQLite, quy đổi 6 giây/Chân khí, tầng tại 0/50/150/350/750; không nhận offline hoặc trùng tab.
- [x] Client: Tĩnh tu mặc định, vẫn mở được Nhịp sen; số khí, tiến độ, năm lớp hiệu ứng, giảm chuyển động, đồng bộ người khác.
- [x] Test thời gian/lưu dữ liệu/vòng đời; build, kiểm tra giao diện desktop/mobile; cập nhật README.

Review trước triển khai: một số tích lũy duy nhất; tầng suy ra từ Chân khí. Giới hạn kích thước aura, không thêm đèn/bóng. Giữ nguyên thay đổi trang phục đang có trong shared/protocol.js. Thông số cân bằng là mặc định ban đầu, không thêm giới hạn ngày hay phần thưởng TEU.

## Kết quả

- Nhánh riêng `feat/meditation-cultivation`, worktree tách khỏi phiên sửa trang phục.
- `npm test`: 96/96 đạt. `npm run build`: đạt.
- Kiểm tra trình duyệt desktop và 390x844: nhận khí, vào lại, đứng dậy, Sổ an, chuyển Nhịp sen; không có lỗi console. Trang thử đủ năm tầng đã được xoá.
- Sửa đường dẫn sendFile của admin để chạy trong worktree nằm dưới thư mục `.codex`; test admin đạt.
- Đã commit/push `20cefcc`, `67c898e`; deploy riêng theo yêu cầu tại `http://localhost:3992/`, container `hth-meditation-preview`, dữ liệu thử riêng. Không thay bản public. Chi tiết trong `docs/deployment.md`. Không còn câu hỏi mở.
