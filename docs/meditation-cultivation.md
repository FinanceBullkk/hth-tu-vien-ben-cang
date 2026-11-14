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

## Chân khí từ tĩnh tu

Chân khí là tiến độ riêng với công pháp Nhịp sen. Bấm **Thiền tại chỗ** ở sân hoặc
trong menu **Chơi gì?** để ngồi ngay chỗ đang đứng. Server giữ nguyên vị trí của
người chơi, không nhận vị trí hay khí do client tự khai. Chọn **Ngồi thiền** trong
menu vẫn đưa tới chiếu trong thiền đường; chỉ chiếu mới mở trò Nhịp sen.

Mỗi 6 giây ngồi online nhận 1 Chân khí, lưu trong cột `cultivation_ms` đã có.
Đứng dậy, mất mạng hoặc đổi tab lưu cả thời gian lẻ; không cộng thời gian offline.
Các tầng Tụ khí / Dẫn khí / Ngưng khí / Hóa khí / Viên mãn bắt đầu ở 0 / 50 / 150 /
350 / 750 khí. Sổ an và bảng tĩnh tu hiển thị tiến độ này.

`action:start` với `kind: 'meditate'` không gửi `mat` là ngồi tại chỗ. Server dùng
`mat: -1` nội bộ để giữ các luật khóa di chuyển, chat và hoạt động khác; các id chiếu
thật vẫn giữ nguyên. Mọi người đang tĩnh tu đều được tính khí; snapshot chiếu và
hoa sen chỉ chứa những người ngồi trên chiếu thật.

Kiểm tra thêm trên desktop và mobile: build rồi chạy
`node test/meditation-anywhere-browser-check.mjs` (cần Playwright có sẵn,
có thể truyền `PLAYWRIGHT_MODULE`). Kiểm tra cả nút mặc bộ Lee Sin, lưu trang phục
qua tải lại, thiền không dịch chuyển, nhận khí và đứng dậy.
