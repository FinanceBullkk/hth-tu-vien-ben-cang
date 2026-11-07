# Công pháp và aura

Hoàn thành Nhịp sen nhận công pháp bằng điểm chính xác (0–100) do server chấm.
Không có điểm thụ động/offline. Bỏ dở hoặc mất kết nối trước khi lưu không nhận điểm.
Gửi lại yêu cầu hoàn thành không cộng thêm lần nữa.

| Tầng | Công pháp tích lũy | Hiệu ứng |
| --- | ---: | --- |
| Khởi khí | 0 | Aura gốc |
| Tụ linh | 300 | Thêm lớp hình thái đầu tiên |
| Kết đan | 1.000 | Thêm lớp thứ hai |
| Hóa cảnh | 2.500 | Đủ ba lớp hình thái |

Sen kim tạo cánh sen, Lưu ly tạo sóng nước, Tinh hà tạo quỹ đạo sao,
Hỏa diễm tạo lửa dâng, Đào hoa tạo cánh hoa rơi, Bích ngọc tạo trúc,
Nguyệt bạch tạo trăng khuyết, Hắc ám tạo xoáy khí.
Hiệu ứng tồn tại cả khi đi lại, rõ hơn khi ngồi thiền; giữ màu và aura gốc.

Công pháp là tổng điểm thiền đã lưu, bao gồm lịch sử trước tính năng này.
Đổi aura ở màn vào game giữ tiến độ chung. Chọn Không vẫn tích điểm nhưng không hiện hiệu ứng.
Sổ an và kết quả Nhịp sen hiển thị điểm cùng mốc kế tiếp.

Server gửi `cultivationTier` trong snapshot và `{ sid, tier }` qua
`cultivation:update` khi lưu kết quả. Điểm cụ thể chỉ có trong Sổ và kết quả cá nhân.
Không thêm cột DB. Tối đa 288 hạt bổ sung/nhân vật, chế độ nhẹ tối đa 144,
gom trong một draw call; không tạo texture hay tải tài nguyên ngoài.

Kiểm tra: `node --test test/cultivation.test.js test/rhythm.test.js`, `npm test`, `npm run build`.
