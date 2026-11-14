# VFX: tham chiếu Pinterest và bộ nguyên liệu

Ngày 08/11/2026. Chủ dự án yêu cầu dùng Pinterest để giải quyết thiếu ý tưởng về
shape, chất liệu và tạo hình. Đây là hướng dựng thử; chưa phải bản hình đã duyệt.
Giữ nhận diện tám aura hiện có theo `avatar-appearance.md`.

## Nguồn đã xem

- [Board Game VFX của kyroku](https://www.pinterest.com/kyroku/game-vfx/): nơi tìm mẫu.
- [Star breathing](https://www.pinterest.com/pin/451134087695575677/): ảnh ghép có
  lửa đỏ–cam–vàng, thân cong, đầu nhọn, nhánh tách và khoảng rỗng trong mảng lửa.
  Tài khoản đăng ảnh ghép không đủ để xác định tác giả gốc hay quyền dùng asset.
- [VFX, 京沅](https://www.pinterest.com/pin/451134087695582631/): dải vàng chữ S phía
  trên sen và trăng, cùng các mảng khí xanh/tím có đầu nhọn và thân rộng–hẹp rõ.
  Pin dẫn tới [ArtStation](https://www.artstation.com/artwork/DxVRKE).
- [SongJian Cheng — Justice online, A Dungeon boss skill VFX](https://songjiancheng.artstation.com/projects/nEvKYe?album_id=1993433):
  tác giả giới thiệu bộ kỹ năng boss Công Tôn Đại Nương. Trang có GIF đánh thường,
  đâm, sóng lan, kiếm khí chữ thập, trói và bẫy. Khung đánh thường đã xem có cung
  kiếm khí hồng mỏng, trong, bao quanh nhân vật nhưng không che hình nhân vật.
  Chưa phân tích đủ chu kỳ từng GIF để kết luận timing chính xác.

Các link tìm kiếm Võ Lâm/tiên hiệp người dùng cung cấp giữ vai trò tìm thêm mẫu;
chưa dùng kết quả chưa xem làm bằng chứng tạo hình.

## Chẩn đoán hiện trạng

`client/src/player/avatar-effect.js` có cache CanvasTexture và nhiều texture tự
vẽ bằng gradient, gồm glow, petal, kiếm, đài sen và rune. Có thể giữ bộ khung và
cache này. Điểm cần thử cải thiện là nét vật liệu: độ rộng biến thiên, cạnh bị
khuyết, hướng chảy và phân bố sáng; tăng số hạt không tự giải quyết được chúng.

## Bộ nguyên liệu tối thiểu cần author

| Nguyên liệu | Shape và chất liệu | Cách dựng đề xuất |
| --- | --- | --- |
| Dải khí | Chữ S, bụng rộng, cổ thắt, đầu nhọn, đuôi đứt | Dải mesh cong + mask xám thuôn; cuộn UV dọc chiều dài |
| Lưỡi lửa | Nhánh lớn và nhánh nhỏ lệch nhau, có khe tối | Mask nét lửa riêng; thân đỏ bằng alpha blend, lõi vàng sáng hẹp |
| Mép tan | Vết khuyết có hướng, nhiều cỡ; không mờ đều cả hình | Noise xám để xói alpha, tăng xói ở đuôi |
| Cánh sen | Lòng cong, gốc hẹp, đầu nhọn, gân ít | Giữ geometry sen, thêm mask gân và độ sáng lệch giữa lòng/viền |
| Cung nước/kiếm | Cung hở, mép dẫn rõ, phần theo sau mỏng | Dải mesh thuôn + mask vệt; tránh vòng tròn sáng đều |
| Điểm nhấn | Tàn lửa, giọt, cánh hoa; mỗi loại có hình riêng | Sprite atlas nhỏ, dùng chung; chỉ bổ trợ shape chính |

Ảnh/GIF Pinterest là tham chiếu tạo hình, không phải texture dùng trực tiếp.
Nếu tìm được asset gốc tải về, kiểm tra định dạng và giấy phép trước khi tích hợp.
Asset thực tế phục vụ cùng nguồn theo quy tắc repo; không hotlink Pinterest.

## Áp dụng tám hệ

| Aura | Giữ nhận diện | Hướng nâng chất liệu |
| --- | --- | --- |
| Sen kim | Đài sen | Gân cánh mảnh, sáng chọn lọc ở viền, cánh nở lệch nhịp |
| Lưu ly | Long khí và nước | Dải chữ S nối tiếp, đầu rõ, thân trong, đuôi tan thành giọt |
| Tinh hà | Ngân hà và sao | Dải bụi rộng–hẹp, cụm sao không đều, sao chổi có đuôi |
| Hỏa diễm | Hỏa liên | Lửa chẻ nhánh theo pin Star breathing, đỏ làm thân, vàng làm lõi |
| Đào hoa | Cánh đào và sương | Cánh hoa đọc rõ silhouette, xoay lật, sương chỉ làm nền |
| Bích ngọc | Trúc, lá và ngọc | Nét dài thanh, cụm lá lệch, vệt gió hở và mảnh |
| Nguyệt bạch | Trăng khuyết | Một cung chính rõ, dải bạc phụ mỏng, chừa khoảng rỗng |
| Hắc ám | Hắc viêm | Mảng tối có thân, cạnh tím hẹp, xoáy lệch thay glow tím phủ đều |

## Mẫu thử đầu tiên: Hỏa diễm

Chọn Hỏa diễm vì pin lửa cho shape cụ thể nhất để đối chiếu. Giữ hỏa liên hiện có,
thử một lưỡi lửa chính và hai nhánh phụ, lệch độ dài và pha. Chuyển động đề xuất:
tụ ở gốc, vươn theo đường cong, nhánh phụ theo trễ, đuôi xói rồi tan. Đây là nhịp
đề xuất cho aura thường trực, không phải timing trích từ ảnh tĩnh.

Tiêu chí trước khi nhân sang hệ khác:

- Tắt glow vẫn nhận ra lửa nhờ shape và khe giữa nhánh.
- Nền sáng vẫn thấy đỏ/cam; nền tối không cháy trắng cả mảng.
- Góc trước, sau, nghiêng đều đọc rõ đầu và thân nhân vật.
- Ở khoảng cách camera chơi thật vẫn nhận ra hỏa liên, không chỉ thấy đốm sáng.
- Clip có đủ pha tụ, vươn, tan; không chỉ xoay đều cùng một hình.
- Kiểm tra reduced motion và mức chất lượng thấp; đo draw call/frame time trước
  và sau trên cùng cảnh trước khi tăng số lớp.

Lượt nghiên cứu chưa sửa renderer. Lượt tiếp theo đã thêm ba lựa chọn độc lập
ID 9–11: Xích diễm, Kim long, Kiếm vũ; xem `avatar-appearance.md`. Tám aura cũ
giữ nguyên. Chưa triển khai game.

Sau đó từng hệ đã được nâng thành pháp tướng riêng theo đúng bảng "Áp dụng tám hệ"
(#67–#88, xem `git log`). Ngày 14/11/2026: Sen kim — hệ cuối còn nền inline cũ — nâng
thành **Cửu Phẩm Kim Liên**, module riêng `client/src/player/vfx/sen-kim-aura.js`: đài sen
ba tầng cuốn ngược ôm chân, gân cánh mảnh có dòng khí chảy, viền fresnel chọn lọc, cánh nở
lệch nhịp, hoạt lộ lăn gân rồi rụng, bụi vàng dâng; bồ nhụy hé lộ sau lưng. Lớp inline
vẽ tay canvas và chuỗi aura-signature/aura-manifestation/aura-flow/aura-sigil (từ V9–V10,
chỉ còn hệ 1 dùng) được thanh lý.

## Thần bài (effect 13): tham chiếu và bài học

Ngày 14/11/2026, qua bốn bản; chủ dự án chấm từng bản:

1. Đạo cụ phẳng (lá bài, phỉnh vẽ trên tấm phẳng): "cơ bản quá".
2. Pháp tướng 3D dày lớp — quạt Thùng Phá Sảnh, lốc bài, xúc xắc, phỉnh, bàn cò quay, cao trào
   tất tay: chỉ bị chê "bay nhanh quá". Đây là hướng đúng.
3. Bản 2 làm rất chậm, thay lốc bài bằng vành bài: "nghiệp dư".
4. Tối giản kiểu Art Deco (hào quang nan quạt, ba lá bài kình lực, lá Át khổng lồ): "xấu hơn", "cơ bản".

Bản hiện tại lấy bản 2 làm gốc, tốc độ khoảng 60%, nhịp 10 giây; nâng chất liệu vàng (phản chiếu
studio nhiều dải đèn, vân xước, kim tuyến lóe), quầng sáng sau lá bài, sao lóe; thêm pháp tướng phía
sau **Vận Mệnh Luân** (bánh xe vận mệnh vàng khổng lồ, đèn sòng bài chạy đuổi, quay vòng may mắn lúc
tất tay; mờ khi nhìn từ sau lưng để không che nhân vật của chính người chơi).

Bài học cho các aura "chí tôn":

- Chủ dự án muốn **hoành tráng, dày lớp, ra chất chủ đề ngay khi nhìn**; tối giản và tiết chế bị chê.
- Chuyển động phải **vừa**: động nhưng không lộn nhào loạn (bản quá nhanh và bản quá chậm đều bị chê).
- Chất lượng chất liệu quyết định cảm giác "đắt": vàng cần phản chiếu nhiều dải sáng và lấp lánh,
  không để vàng phẳng một màu.
- Vật lớn phía sau lưng phải mờ đi khi camera ở sau lưng (`onBeforeRender` đo hướng camera).
- Hoành tráng nằm ở **vài khối lớn** (bánh xe, quạt bài, mặt bàn), không ở số lượng vật nhỏ bay quanh:
  lốc 30 lá, phỉnh tung, mưa tiền, hạt dày bị chê "lộn xộn, nhìn như rác". Lúc thường chỉ để vài vật bay
  có trật tự (ba xúc xắc); vật đông chỉ hiện lúc cao trào và phải xếp hàng ngay ngắn (vòng trận bài).

Tham chiếu đã xem: [sketchbook realtimevfx — lá bài vỡ, lật theo lực cản](https://realtimevfx.com/t/bravepotatos-vfx-sketchbook/20382);
hình tượng *God of Gamblers* (1989); ngôn ngữ Art Deco sòng bài (vàng trên đen, tia nan quạt).
