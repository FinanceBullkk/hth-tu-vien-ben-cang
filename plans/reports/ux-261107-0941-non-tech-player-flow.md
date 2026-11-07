# Luồng người chơi không quen game

Đối tượng: nhân viên văn phòng, mở link Zalo, thường trên điện thoại, vài phút giờ nghỉ.
Cách làm: đi lại hành trình bằng DB trống, xoá localStorage, click chuột thật.

## Nguyên tắc đã áp dụng

- Mỗi lúc chỉ một việc, nói bằng chữ thường ngày.
- Thao tác tự nhiên nhất: chạm vào chỗ muốn làm.
- Không phạt người chậm tay; lần đầu gần như chắc thành công.
- Khái niệm mở dần theo số cá đã bắt (`activities/fishing-coach.js`).
- Bấm gì cũng có phản hồi: không có trạng thái "tưởng bị đơ".

## Thay đổi theo hành trình

| Bước | Trước | Sau |
|---|---|---|
| Màn chào | Nút Vào khuất dưới 5 nhóm tuỳ chọn trên điện thoại | Tên → Vào; thay đồ thu gọn, không bắt buộc |
| Vào game | Bảng nhạc tự bật, mic đè thẻ hướng dẫn | Không tự bật; thẻ hướng dẫn nằm trên mic |
| Tìm trò chơi | Tự đi bộ khám phá | Nút Chơi gì?: chọn là được đưa tới và bắt đầu |
| Thả câu | Giữ, rê, nhả cùng lúc | Chạm vào nước; chạm lệch vẫn rơi xuống nước gần nhất |
| Con cá đầu | Khó như người cũ, thấy ngay mồi, bóng, lắc cần | Chế độ dễ tới khi đủ 3 loài; chỉ một dòng lời dẫn |
| Giằng co | "Vệt ngọc", không biết kéo về đâu | "Vùng xanh", lệch thì hiện ← Kéo sang trái; ngón tay kéo tương đối |
| Kéo cá lên | Bấm thêm trong 8s, chậm là mất | Đầy vòng tự về tay |
| Sau con cá | Thẻ cá rồi hết | Mỗi con giới thiệu một điều mới: mồi, bóng cá, lắc cần, Sổ an |
| Rời hồ | Chỉ Về bờ/Esc, WASD không phản hồi | Bấm phím đi là về bờ |

Lỗi có sẵn đã sửa: biểu tượng 📜 của sư chú dính góc màn hình (animation CSS đè transform của CSS2DRenderer).

## Chưa kiểm chứng

- Chưa có người thật chơi thử; nên nhờ 3–5 đồng nghiệp ít chơi game thử mà không chỉ gì, xem họ vấp ở đâu.
- Cảm ứng thật: mới kiểm tra logic kéo tương đối và bố cục ở khổ 375×812, chưa chạy trên điện thoại thật.
- Độ khó chế độ dễ và chế độ thường là số tự cân.

## Câu hỏi chưa rõ

- Menu Chơi gì? dịch chuyển tức thời thay vì đi bộ: có làm giảm cảm giác dạo sân không?
- Các trò khác (chuông, thiền, đầu hồ) chưa được rà luồng như câu cá.
