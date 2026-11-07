# Nghiên cứu thiền và công pháp kiểu Võ Lâm Chi Mộng

Thời điểm: 07/11/2026, Asia/Saigon. Phạm vi: nghiên cứu cơ chế bản web gốc và khả năng áp dụng vào HTH; chưa triển khai.

## Kết luận

Có thể thêm, phù hợp bối cảnh tu viện và tận dụng phần thiền sẵn có. Điểm hấp dẫn cần giữ: ngồi luyện có tiến triển lâu dài, đủ tài nguyên nâng tầng võ học, người khác thấy thay đổi trên nhân vật.

Đề xuất bản đầu: một công pháp, năm tầng, thiền thụ động theo phiên ngắn, tiến độ lưu lâu dài. Phần thưởng là danh hiệu và hiệu ứng theo tầng. Chưa cần hệ chiến đấu, cây kinh mạch, nhiều loại tiền hay xác suất nâng cấp.

## Nguồn và mức chắc chắn

Tra cứu 5 truy vấn, đọc trực tiếp 4 bài có nội dung liên quan; ưu tiên nguồn VLCM/VNG. Nguồn lịch sử từ 2011–2012 dùng để nghiên cứu bản gốc, không khẳng định thông số còn đúng ở bản vận hành năm 2026. Không dùng Google AI Overview làm bằng chứng.

| Cơ chế | Bằng chứng | Mức chắc chắn |
| --- | --- | --- |
| Ngồi thiền nhận kinh nghiệm và Chân khí | Bài chính thức 10/11/2011 mô tả Võ Lâm Lệnh trong 7 ngày nhân đôi kinh nghiệm và Chân khí khi ngồi thiền [1] | Cao |
| Chân khí dùng nâng võ công, xung mạch | Hai bài cộng đồng cùng thời mô tả trực tiếp [3][4] | Vừa; chưa đọc được cẩm nang chính thức cho riêng hai thao tác này |
| Ngồi thiền và Bế Quan Tu Luyện được liệt kê riêng | Bài cộng đồng 23/11/2011 [3] | Vừa; không gộp thành một chế độ |
| Khí Hải tăng thuộc tính, dùng tiền và Chân khí | Bài chính thức 29/06/2012: cần mạch Chân Long, mỗi lần 2.500.000 đồng và 5.000 Chân khí [2] | Cao cho phiên bản được mô tả |
| Nâng Khí Hải có thể thất bại; thất bại tăng chúc phúc | Mô tả chính thức [2] | Cao; không suy rộng thành mọi loại nâng võ học |
| Số khí mỗi giây, phím bắt đầu, thưởng song tu, quy tắc offline | Chưa đủ bằng chứng trực tiếp | Chưa xác minh; không đưa thành luật gốc |

Các truy vấn dùng tên game kết hợp tọa thiền/Chân khí, tu luyện, bế quan và ngồi/Chân khí; hai truy vấn giới hạn miền `vlcm.zing.vn`.

Điểm cần hiểu: thiền là nguồn tạo tài nguyên. Nâng võ học là nơi tiêu tài nguyên. Cảm giác “thiền tăng công pháp” đến từ liên kết hai hệ này; không có bằng chứng rằng ngồi thiền tự tăng mọi công pháp cùng lúc.

## HTH hiện có gì

Đối chiếu working tree, chưa kiểm tra bản Docker đang chạy:

- `server/meditation.js`: giữ chỗ chiếu, kiểm tra khoảng cách, giờ bắt đầu và người cùng thiền; phát trạng thái sen.
- `server/rhythm.js`: Nhịp sen dùng luật nhịp chung; hoàn thành lưu điểm và thưởng TEU. Chỉ ngồi lên chiếu chưa tạo tiến độ công pháp.
- `client/src/activities/index.js`: vào thiền đang mở `RhythmActivity`; cần lựa chọn riêng nếu thêm thiền thụ động.
- `client/src/player/avatar.js`, `client/src/scene/meditation-garden.js`: có dáng ngồi, hào quang, sen và nhịp sáng. Tận dụng trước khi làm hiệu ứng mới.
- `server/db.js`, `client/src/ui/book.js`: có SQLite, Sổ an, thống kê thiền, TEU và mở màu áo. Chưa thấy dữ liệu tiến độ công pháp trong các phần đã kiểm tra.
- README ghi định hướng thư giãn, nhưng mã hiện có Bảng tuần TEU/cá/đầu hồ. Không lấy câu “không xếp hạng” trong README làm mô tả đầy đủ hành vi hiện tại.

Đây là tính năng xuyên client, server và DB; không chỉ thêm thanh tiến độ giao diện. Không cần thư viện mới.

## Thiết kế đề xuất cho HTH

Toàn bộ tên, số và phần thưởng dưới đây là đề xuất mới, không phải thông số VLCM.

### Vòng chơi

1. Tại chiếu, chọn **Tĩnh tu** hoặc **Nhịp sen**. Tĩnh tu ngồi yên, khí sáng luân chuyển, có thanh tiến độ; Nhịp sen giữ trò nhịp điệu hiện có.
2. Tĩnh tu tích **tu vi** cho một công pháp đầu tiên, tên tạm **Tĩnh Tâm Quyết**. Chọn tu vi không tiêu để bản đầu chỉ cần một loại tiến độ; nếu sau này có nhiều công pháp để phân bổ, mới cần ví Chân khí và thao tác tiêu khí.
3. Đạt mốc thì hiện **Đột phá**, bấm nhận tầng mới. Thành công chắc chắn; hiệu ứng ngắn, nhẹ, có giảm chuyển động.
4. Sổ an hiển thị tầng, tiến độ và phần thưởng kế tiếp. Nhân vật có danh hiệu/hiệu ứng tương ứng, có thể tắt hiệu ứng.

### Nhịp tiến triển để thử

- Phiên tối đa 5 phút; 1 phút hợp lệ nhận 10 tu vi; tự kết thúc để nhả chiếu.
- Giới hạn đề xuất 150 tu vi/ngày, tính ngày theo múi giờ game. Không phạt bỏ ngày, không mất chuỗi.
- Năm tầng có tổng mốc tu vi: 10, 50, 150, 350, 750. Tầng đầu sau một phút; tối thiểu năm ngày chạm tầng cuối nếu nhận đủ giới hạn mỗi ngày. Các mốc cần thử với người chơi trước khi chốt.
- Phần thưởng minh họa: danh hiệu Nhập môn; vòng khí; sen nhiều lớp; tư thế kết ấn; hiệu ứng đột phá mới. Không khóa lại trang phục/hiệu ứng người chơi vốn đã dùng được.
- Ngắt giữa phiên vẫn giữ tu vi đã ghi nhận; không tính thời gian mất mạng. Bản đầu chưa có bế quan offline.
- Tu vi tách TEU để tránh biến ngồi chờ thành nguồn tiền mua đồ vượt các trò khác.

### So sánh phạm vi

| Hướng | Giá trị | Chi phí/rủi ro | Khuyến nghị |
| --- | --- | --- | --- |
| Gắn tu vi vào Nhịp sen hiện có | Ít thay đổi, có tiến triển lâu dài | Vẫn phải bấm liên tục; không đáp ứng cảm giác ngồi luyện | Chỉ chọn nếu ưu tiên làm rất nhỏ |
| Tĩnh tu riêng + một công pháp | Có nghỉ ngơi, nâng tầng và thay đổi nhìn thấy | Cần quản lý thời gian, lưu tiến độ, chống nhận trùng | Bản đầu nên chọn |
| Nhiều công pháp, kinh mạch, chiến đấu, bế quan offline | Gần hệ RPG hơn | Kinh tế và cân bằng lớn, vượt nhu cầu đã nêu | Chỉ thêm sau khi chốt mục đích sức mạnh |

Đồng tu đáng thêm sau: nhiều người ngồi gần có hiệu ứng cộng hưởng. Nếu thưởng tiến độ, cần giới hạn hệ số và xử lý nhiều tài khoản; chưa đưa vào bản đầu. Bonus từ Nhịp sen cũng để sau khi đo nhịp chơi, tránh thêm hai nguồn thưởng ngay.

## Ghép vào kiến trúc và các điểm phải giữ

- Một module luật dùng chung `shared/cultivation.js`; một module server cho tiến độ là đủ. Tái dùng giữ chỗ chiếu và hoạt ảnh; không tạo hệ vị trí hay tài khoản riêng.
- Server quyết định thời gian hợp lệ, giới hạn ngày, tầng và thưởng. Client gửi ý định bắt đầu/dừng/đột phá; không gửi số tu vi cần cộng.
- Dùng vòng quét server đang có. Ghi nhận từng mốc bằng giao dịch SQLite, cập nhật con trỏ thời gian cùng tiến độ để một mốc chỉ được nhận một lần. Không ghi DB hay gửi gói mỗi khung hình.
- Lưu tiến độ cộng dồn, phần thời gian chưa đủ mốc, ngày và lượng đã nhận trong ngày, tầng đã nhận. Migration phải giữ nguyên dữ liệu cũ.
- Chặn hai chế độ thiền cùng chạy, ngăn chuyển trò để giữ phiên cộng thưởng, xử lý một danh tính mở nhiều tab, rời chiếu, bị kick, reconnect và server restart. Cắt phiên khi mất kết nối; không cộng bù thời gian offline.
- Chỉ đồng bộ `sid`, tầng công khai và trạng thái hiệu ứng cho người khác; không phát `playerId`. Chat không được lưu.
- Hiệu ứng dùng asset cùng nguồn, tránh thêm đèn đổ bóng, tái dùng vật liệu. Có giảm chuyển động và điều khiển dùng được trên điện thoại/bàn phím.
- README hiện quy định mất localStorage được coi là người mới. Khi tiến độ dài hạn có giá trị, phải nêu rõ giới hạn này; khôi phục tài khoản là quyết định sản phẩm riêng.

Kiểm tra cần có khi triển khai: thời gian giả từ client, nhận/đột phá lặp, nhiều tab, đổi ngày, chạm giới hạn giữa phiên, ngắt kết nối, restart, tranh chiếu, đổi hoạt động; kiểm tra migration và phần thưởng không bị mất/nhân đôi. Sau đó chạy test phù hợp, toàn bộ `npm test`, build và kiểm tra mobile trước phát hành.

## Nguồn tham khảo

1. VLCM/VNG, 10/11/2011, [VLCM xuất hiện thêm vật phẩm mới](https://vlcm.zing.vn/tin-tuc/tin-tuc/vlcm-xuat-hien-them-vat-pham-moi.html). Bằng chứng trực tiếp về ngồi thiền nhận kinh nghiệm/Chân khí và hệ số Võ Lâm Lệnh.
2. VLCM/VNG, 29/06/2012, [Tính năng mới: Khí Hải](https://vlcm.zing.vn/tin-tuc-2015/tin-tuc/tinh-nang-moi-khi-hai.html). Điều kiện, chi phí, thuộc tính và chúc phúc.
3. Diễn đàn KingGame, 23/11/2011, [Chia Sẽ Kinh Nghiệm “Săn” Chân Khí](https://kinggame.forumtwilight.com/t16956-chia-se-kinh-nghiem-san-chan-khi?change_theme). Nguồn cộng đồng; dùng đối chiếu luồng tài nguyên, không coi số liệu là chuẩn chính thức.
4. Diễn đàn Rosei, trang hiển thị 30/11/2011, [Võ lâm chi mộng - Kiếm chân khí?!](https://rsband.forumvi.com/t41-vo-lam-chi-mong-kiem-chan-khi). Nguồn cộng đồng bổ sung về nâng kỹ năng, xung mạch và bế quan.

## Bước tiếp theo và câu hỏi chưa chốt

Chốt giá trị công pháp trước khi viết code, rồi làm một vòng hoàn chỉnh: ngồi, tích tu vi, nhận tầng, hiện phần thưởng, lưu lại sau reconnect.

- Công pháp chỉ mở danh hiệu/hiệu ứng, hay cần tác động gameplay? Nếu cần sức mạnh, phải xác định dùng trong hoạt động nào.
- Có muốn nhận tiến độ khi đóng game? Đề xuất bản đầu chỉ tính lúc kết nối và đang tĩnh tu.
- Giữ Nhịp sen cạnh Tĩnh tu, hay thay toàn bộ trò thiền? Đề xuất giữ cả hai lựa chọn.
