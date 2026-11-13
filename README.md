# HTH – Tu viện bên cảng

Game web 3D nhiều người chơi, dùng nội bộ cho nhân viên HTH Logistics: lên tu viện cạnh cảng container để thỉnh chuông, ngồi thiền, câu cá, viết lời ước, rút xăm và trò chuyện trong giờ nghỉ. Không thắng thua, không xếp hạng, không thu tiền.

Không biết chơi gì? Bấm nút **Chơi gì?** ở góc trên, chọn một trò là game đưa bạn tới và bắt đầu ngay.

## Chạy game

Cần Node.js 24 trở lên.

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

Cửa sổ dòng lệnh sẽ in ra link để mở game, ví dụ `http://192.168.1.10:3000`. Gửi link đó cho cả nhà qua Zalo là vào được, không cần cài gì thêm.

Lần chạy đầu tiên, server tự tạo file `config.json` với một khoá admin ngẫu nhiên, đồng thời in link trang admin ra màn hình. Hãy lưu link này lại.

### Chạy lâu dài

Với pm2:

```bash
pm2 start server/index.js --name hth
```

Với Docker:

```bash
docker build -t hth .
```

```bash
docker network create hth-net
```

```bash
docker run -d --name hth --restart unless-stopped --network hth-net -p 127.0.0.1:3100:3000 -v hth-data:/app/data --cap-drop ALL --security-opt no-new-privileges --memory 768m --pids-limit 256 hth
```

Dữ liệu và `config.json` đều nằm trong volume `hth-data`, nên xoá container hay build lại image không làm mất dữ liệu.

Lệnh trên chỉ mở game cho chính máy chủ (`127.0.0.1`). Muốn mở ra LAN, đổi thành `-p <IP LAN của máy>:3100:3000`. Lưu ý: cổng Docker publish sẽ đi vòng qua `ufw`, nên luôn ghi rõ IP, đừng để `-p 3100:3000` vì như vậy sẽ mở trên mọi địa chỉ, kể cả IPv6 công khai.

Xem khoá admin:

```bash
docker exec hth node -p "require('/app/data/config.json').adminKey"
```

Cập nhật lên bản mới: chép mã mới lên máy, chạy `docker build -t hth .`, rồi `docker rm -f hth` và chạy lại lệnh `docker run` ở trên.

## Audition chuông và thiền

- **Audition chuông:** nhập chuỗi **phím mũi tên**, rồi bấm **Space** khi vạch trắng tới tâm vùng vàng. Điện thoại có bốn phím chạm và nút **Chốt nhịp**. Có Perfect, Good, Miss và combo.
- Login và trong game đều dùng bản *Where Winds Meet Character Creation Song*, với âm lượng giảm 50%. Server giữ một mốc phát chung trong game; mỗi máy vào sẽ phát cùng đoạn. Nhạc MP3 được phục vụ từ game. Nút **Nhạc** mở bảng phát/tạm dừng và chỉnh âm lượng; mức âm lượng được lưu trên máy. Nếu trình duyệt chặn phát tự động, bấm **Phát nhạc**. Đóng bảng không dừng nhạc. Phách minigame chạy độc lập.
- Tới gần gác chuông, chơi 16 chuỗi trong khoảng 40 giây. Chốt đúng làm chuông ngân; đồng nghiệp chốt cùng nhịp làm âm dày hơn. Server kiểm tra cả chuỗi và thời điểm nhận Space.
- **Thiền:** bấm **Space** để ngồi ngay tại chỗ; đứng cạnh chiếu trống trong thiền đường thì ngồi lên chiếu. Ngồi yên và thở chậm để tích Chân khí; tầng tự tăng tại 0 / 50 / 150 / 350 / 750 khí: Tụ khí, Dẫn khí, Ngưng khí, Hóa khí, Viên mãn. Bấm quả cầu hoặc di chuyển để đứng dậy; khí đã tích được giữ lại. Mất mạng ngừng tích khí, không cộng offline.

## Tỉ võ tự do

Trên bản đồ, bấm phím 1 hoặc chuột trái để đánh thường; phím 2 gọi kiếm trận AOE tại điểm ngắm (tầm 8,5 m, bán kính 4 m), phím 3 bật hộ thể, phím 4 lướt né. E tương tác với điểm gần người chơi; Space ngồi thiền ngay tại chỗ (gần chiếu trống thì ngồi lên chiếu). Đánh thường, kiếm trận và lướt theo hướng con trỏ; khi khóa chuột thì theo tâm màn hình. Cả bốn chiêu hồi sau 0,5 giây. Bốn nút dưới màn hình dùng được trên điện thoại. Không cần khiêu chiến hay vào võ đài. Alt + bấm vào người khác để vẫy tay; trên điện thoại chạm người để mở nút vẫy tay.

Khi bị hạ, nhân vật hồi sinh tại cổng với đầy HP và khiên bảo hộ 30 giây. Trong thời gian đó không nhận sát thương. Chủ động đánh thường hoặc dùng kiếm khí sẽ mất khiên ngay và hiện dấu **Sát khí** trong 60 giây; lướt và hộ thể không phá khiên.

Màn vào game có nút **Mặc bộ Lee Sin · Long quyền** để chọn cùng lúc đầu trụi băng mắt, võ tăng bang thân, băng quyền và hào quang Long quyền (món nào chưa mua thì nút báo thiếu, xem mục Sạp Kim Bảo). Có thể đổi từng món trong **Đổi trang phục**; lựa chọn được nhớ trên trình duyệt khi bấm **Vào**.

## TEU và Sạp Kim Bảo

TEU là điểm chung của tu viện: câu cá, giải đố của sư chú Mặc Vũ, đầu hồ, Audition chuông và tấu nhạc đều được TEU. Số TEU đang có hiện ngay dưới số người online ở góc trái; được cộng thì số nảy lên kèm `+N`. Bảng tuần chỉ tính TEU kiếm được, tiêu bao nhiêu cũng không bị trừ hạng.

- **Sạp Kim Bảo:** quầy mái đỏ của bà chủ Kim Bảo cạnh lối đi tới quán trà. Tới gần bấm **E**, bấm vào bà chủ, hoặc bấm nút cửa hàng trên menu, bấm vào số TEU cũng được.
- **Thử đồ miễn phí:** bấm một món là nhân vật mặc thử ngay (chỉ máy mình thấy). Đủ TEU thì bấm **Mua**, rồi **Mặc bộ này** để cả tu viện cùng thấy. Đóng bảng khi chưa lưu thì nhân vật về lại bộ đang mặc.
- **Tủ đồ:** nút tủ đồ trên menu (hoặc thẻ **Tủ đồ** trong sạp) để thay đồ ngay khi đang chơi, không cần ra màn vào game. Tủ chỉ hiện đồ miễn phí và đồ đã mua.
- **Hàng bán:** hào quang Tinh hà, Nguyệt bạch (30), Hỏa diễm, Hắc ám (40), Xích diễm (50), Long quyền, Kiếm vũ (60), Kim long (80); trang phục 25–35; Phất trần 20, Băng quyền 30; mũ và kiểu tóc 15–35; sáu màu áo quý 25–40 TEU. Giá nằm trong `shared/shop.js`.
- **Đồ cũ được giữ:** ai đang mặc một món nay phải mua thì được giữ món đó miễn phí; màu áo quý đã mở trước đây vẫn còn. Các món khác vẫn miễn phí như cũ.

Sổ an giờ chia bốn thẻ: **Tổng quan** (số liệu, túi tiền, lối tắt sang sạp), **Tu luyện**, **Sổ cá**, **Kỷ niệm** (lời ước và quẻ đã rút).

## Đầu hồ

Tới sân cạnh bãi container, bấm **Chơi đầu hồ** rồi chọn đối thủ. Mỗi trận tối đa 2 phút, dẫn 50 điểm hoặc chạm 250 điểm trước là thắng; hết giờ thì so điểm.

- **Mỗi lượt:** đưa tâm vào vòng đang trôi, giữ cho vòng đầy rồi bấm chuột hoặc **Space**. Ném khi chưa đầy hoặc để hết 10 giây ngắm là trượt. Tâm lắc nhẹ như người say, còn đối thủ ném ngay sau bạn.
- **Hai tâm:** có lượt phải giữ cả tâm chuột lẫn tâm phím (**WASD** hoặc mũi tên) trong hai vòng riêng. Trên điện thoại, ngón đầu lái tâm chính, ngón hai lái tâm phụ, vòng đầy là tự ném.
- **Combo:** trúng liên tiếp lần lượt được 10, 15, 15, 20, 25, 30, 35, 45, 50 điểm và giữ mức 50 từ đó. Trượt là combo về 0.
- **Thưởng:** thắng A Phi, Lục Vân, Kiếm Tôn Vô Danh được hạng B, A, S (3, 5, 8 TEU). Thua hoặc hoà được hạng C (1 TEU). Rời sân giữa trận không lưu điểm.

## Bầu cua

Bàn bầu cua ở sân trước thiền đường, phía tây trục chính (bàn xì dách đối xứng phía đông). Bấm **Chơi gì?** rồi chọn **Bầu cua**, hoặc đứng quanh bàn bấm **E**. Cả sân chơi chung một bàn: ai đặt cược đầu tiên thì mở ván, có 8 giây cho mọi người đặt, rồi Chú Tư nhà cái xóc đĩa 2 giây và mở bát cho cả bàn. Ba viên xúc xắc hiện to giữa màn hình kèm số TEU thắng/thua; ván mới mở ngay khi có người cược tiếp.

- **Đặt cược:** chọn chip 1, 5 hoặc 10 TEU rồi bấm ô Nai, Bầu, Gà, Cá, Cua, Tôm (hoặc phím **1–6**). Tối đa 30 TEU một mặt và 50 TEU một ván. Còn đang đếm ngược thì **Rút cược** hoàn lại đủ. **Cược lại** đặt đúng như ván trước, **Gấp đôi** đặt thêm bằng cược đang có. Đầu bảng có đồng hồ đếm ngược và kết quả các ván trước.
- **Trả thưởng:** ra `n` viên trùng mặt bạn cược thì nhận lại tiền cược cộng `n` lần tiền cược. Không trùng là mất. Nhà cái lợi khoảng 8%, nên chơi lâu thì TEU có xu hướng hao dần.
- **Bảng tuần:** bầu cua tính lãi/lỗ ròng cả tuần: thắng cộng, thua trừ. Cược nhiều không tự đẩy ai lên hạng.
- Đi ra xa bàn là tự thôi chơi; cược đã đặt vẫn được chấm và trả vào ví. Server có khởi động lại giữa ván thì tiền cược được hoàn.
- Chi tiết và giao thức xem `docs/baucua.md`.

## Xì dách

Bàn xì dách ở sân trước thiền đường, phía đông trục chính. Bấm **Chơi gì?** rồi chọn **Xì dách**, hoặc đứng quanh bàn bấm **E**. Tối đa 5 người cùng đấu với Bà Năm nhà cái, luật miền Nam.

- **Cược:** bấm chip +1/+5/+10 (hoặc phím **1–3**) trong 8 giây nhận cược, tối đa 20 TEU một tay. **Cược lại** đặt đúng tiền ván trước. Server giữ **gấp đôi** tiền cược phòng nhà cái ăn x2, chấm xong hoàn phần dư.
- **Nặn bài:** chia hai lá, lá đầu ngửa, lá thứ hai úp; kéo lá úp lên để hé dần, kéo quá nửa hoặc chạm một cái là lật hẳn. Lá rút thêm tới tay là ngửa luôn.
- **Rút / dằn:** lần lượt từng người theo ghế, mỗi người 15 giây (vòng giờ vàng chạy quanh người đang tới lượt): rút (**R**) hoặc dằn (**F**). Dưới 16 là non, không được dằn; hết giờ mà vẫn non thì thua.
- **Xét bài:** nhà cái rút xong thì đi xét từng nhà: lật bài, đóng dấu (THẮNG, THUA, QUẮC, XÌ DÁCH…), chip của người thua về nhà cái, người thắng được đẩy chip sang và nhận tiền ngay.
- **Át:** 2 lá tính 11, 10 hoặc 1; 3 lá tính 10 hoặc 1; từ 4 lá chỉ tính 1.
- **Bài đặc biệt:** xì bàn (đôi Át) > xì dách (Át + 10/J/Q/K) > ngũ linh (5 lá không quá 21). Thắng bằng bài đặc biệt ăn x2; nhà cái thắng bằng bài đặc biệt cũng thu x2.
- **Hoà:** bằng điểm, cùng loại bài đặc biệt, hoặc cả hai cùng quắc.
- **Nhà cái:** rút khi dưới 17 và rút tiếp khi 17–18 có Át đang tính 10/11. Nhà cái lợi chút ít nên chơi lâu TEU vẫn hao; bảng tuần tính lãi/lỗ ròng như bầu cua.
- Bài người khác úp tới lúc chấm. Chi tiết, con số mô phỏng và giao thức xem `docs/xidach.md`.

## Tài xỉu và cò quay

Hai bàn ngay sau bầu cua và xì dách, phía thiền đường: tài xỉu phía tây, cò quay phía đông. Bấm **Chơi gì?** rồi chọn bàn, hoặc đứng quanh bàn bấm **E**.

- **Ngồi vào là thấy bàn:** góc máy hạ xuống ngang tầm mắt, nhà cái đối diện. Rê chuột lên mặt bạt thì ô sáng, bấm (hoặc chạm) là đặt chip vào ô đó. Chọn chip 1/5/10 ở dải dưới đáy; **Rút cược** hoàn đủ khi còn đang nhận cược.
- **Ai cược to nhất được tung:** hết giờ cược, người đặt nhiều TEU nhất ván có 5 giây: **giữ chuột hoặc Space** để lấy đà, **thả ra** là tung xúc xắc hoặc búng bi. Không kịp thì bàn tự tung. Lực tung chỉ đổi cách bay, kết quả server bốc.
- **Tài xỉu:** ba viên. Xỉu 4–10, Tài 11–17 ăn 1 ăn 1; ra bộ ba thì cả hai thua. Bão (bộ ba bất kỳ) ăn 1 ăn 30, tối đa 3 TEU. Phím **1–3**: Xỉu, Tài, Bão.
- **Cò quay:** bánh xe châu Âu 0–36. Số đơn ăn 35 (tối đa 5 TEU một số), tá ăn 2, đỏ/đen/chẵn/lẻ/nhỏ/lớn ăn 1; ra 0 thì cửa ngoài thua. Phím **1–4**: Đỏ, Đen, Chẵn, Lẻ.
- Tối đa 50 TEU một ván. Nhà cái lợi chút ít (2,7–2,8%, riêng Bão 13,9%) nên chơi lâu TEU vẫn hao; bảng tuần tính lãi/lỗ ròng như bầu cua. Chi tiết và giao thức xem `docs/taixiu-coquay.md`.

## Câu cá

Bấm nút **Chơi gì?** ở góc trên rồi chọn **Câu cá**, hoặc tự đi tới bờ hồ góc đông nam sân. Không tốn gì, ai đứng bờ nào cũng thấy nhau câu. Bấm **Về bờ**, **Esc** hoặc phím đi để rời hồ.

- **Thả câu:** chạm vào mặt nước chỗ muốn thả. Chạm đâu cũng được, kể cả hơi lệch ra bờ.
- **Chờ:** cá sẽ tự cắn. Chạm thêm để lắc cần thì cá cắn sớm hơn.
- **Giữ cá:** cá cắn là vòng cung hiện ra, điện thoại rung nhẹ. Rê chuột hoặc kéo ngón tay để giữ chấm trắng trong vùng xanh. Lệch lâu sẽ có chữ nhắc kéo về bên nào. Đầy vòng là cá tự về tay.
- **Người mới:** chưa bắt đủ 3 loài thì vùng xanh rộng và tụt rất chậm. Lần đầu chỉ cần làm theo chữ trên màn hình; mồi, bóng cá, lắc cần được giới thiệu dần sau mỗi con.
- **Mồi:** bột, giun hoặc rau (bấm chữ dưới màn hình hoặc phím **Q**). Mỗi mồi có nhóm cá riêng.
- **Bóng cá:** bóng đen bơi dưới mặt hồ, mọi máy thấy giống nhau. Bóng càng to càng dễ ra cá hiếm, ai thả trúng trước được. Chỗ nước gợn mạnh thường có bóng lớn.
- **Thưởng:** thường, quý, hiếm được 1, 2, 4 TEU; ở trong vùng xanh từ 80% thời gian được thêm 1 TEU.
- **Sổ cá:** trong Sổ an có đủ 15 loài. Loài chưa bắt hiện gợi ý mồi, giờ và cỡ bóng. Đủ 5, 10 và 15 loài được thưởng 5, 10 và 25 TEU.

## Trò chuyện bằng mic

Voice gần kiểu Goose Goose Duck: vào game thì kết nối voice và xin quyền mic; mic ban đầu tắt. Bấm nút hình mic để bật nói liên tục, bấm lại để tắt. Người đang nói hiện cạnh nút mic và sáng tên trên nhân vật. Nút **⋯** mở cài đặt để chọn giữ **V** hoặc nút **Giữ để nói**, tắt nghe và chỉnh âm lượng. Đứng gần nghe rõ, xa dần nhỏ tiếng, từ 18 m thì im; tối đa 6 kết nối gần mỗi người. Tắt voice hoặc rời tab sẽ nhả mic.

Mic cần HTTPS hoặc localhost. Khác mạng có thể cần TURN; Cloudflare Tunnel không chuyển tiếp tiếng WebRTC. Xem [thiết lập voice](docs/proximity-voice.md).

## Đổi nội dung (không cần biết lập trình)

**Cách dễ nhất là dùng trang admin:** mở `http://<địa chỉ server>:3000/admin?key=<adminKey>`. Khoá `adminKey` nằm trong file `config.json`. Mọi thay đổi ở đây có hiệu lực ngay, không cần khởi động lại.

| Muốn đổi | Vào đâu trên trang admin |
| --- | --- |
| Giờ chuông, câu thông báo | Mục **Sự kiện chuông**. Bấm "+ Lịch hằng ngày" hoặc "+ Lịch một lần", rồi **Lưu lịch** |
| Từ cấm | Mục **Từ lọc**, mỗi dòng một từ, rồi **Lưu từ lọc** |
| Câu chúc khi rút xăm, lời chào | Mục **Nội dung**, mỗi dòng một câu, rồi **Lưu nội dung** |
| Ẩn một lời ước | Mục **Lời ước**, bấm **Ẩn**. Bấm **Bỏ ẩn** để hiện lại |
| Mời một người ra khỏi game | Mục **Người đang online**, bấm **Kích** (vào lại được sau 1 phút) |

**Cũng có thể sửa trực tiếp file `config.json`** bằng Notepad, rồi khởi động lại server. Giữ nguyên dấu ngoặc kép và dấu phẩy. Nếu file sai định dạng, server sẽ báo lỗi và không chạy, nên không làm hỏng dữ liệu.

Lưu ý khi thêm từ lọc: có dấu và không dấu là **hai từ riêng**. Bộ lọc cố ý phân biệt dấu để không chặn nhầm những chữ vô hại như "lớn" hay "các bạn". Vì vậy đừng thêm từ không dấu có nghĩa thường, ví dụ "lon" sẽ chặn cả "lon bia".

Trong câu thông báo chuông, viết `{time}` thì game tự thay bằng giờ thật.

Tên và lời nói của Zoeyy Gay nằm ở đầu file `client/src/scene/abbot.js`. Sửa xong phải chạy lại `npm run build`.

## Cấu hình

| Trường trong `config.json` | Biến môi trường | Ý nghĩa |
| --- | --- | --- |
| `port` | `PORT` | Cổng chạy server, mặc định 3000 |
| `adminKey` | `ADMIN_KEY` | Khoá trang admin, tối thiểu 24 ký tự |
| `dbPath` | `DB_PATH` | Đường dẫn file dữ liệu, mặc định `data/hth.db` |
| `timezone` | `TZ_GAME` | Múi giờ tính "hôm nay" và giờ chuông |
| `dayCycleMinutes` | | Độ dài một vòng hoàng hôn → đêm, mặc định 20 phút |
| `maxPlayers` | | Số người online tối đa, mặc định 60 |
| `maxConnections` | | Số kết nối mạng tối đa, mặc định 200 |
| `maxConnectionsPerIp` | | Số kết nối từ một IP, mặc định 40. Cả văn phòng thường chung một IP nên đừng đặt quá thấp |
| `wishesPerIpPerDay` | | Lời ước mỗi ngày từ một IP, mặc định 100 |
| `newPlayersPerMinute` | | Lượt vào mới mỗi phút từ một IP, mặc định 40. Cả văn phòng thường chung một IP nên đừng đặt quá thấp |
| `wishesPerDayTotal` | | Tổng lời ước toàn game mỗi ngày, mặc định 300 |
| | `TRUST_PROXY=1` | Đọc IP thật từ `X-Forwarded-For`. Chỉ bật khi game đứng sau proxy tin cậy như Tailscale Funnel và cổng không mở trực tiếp |

### Mở game ra internet

Game trên máy Windows này mở tại `https://game.hthlogistics.top/` qua Cloudflare Tunnel cố định. Xem [docs/deployment.md](docs/deployment.md) để vận hành.

Tunnel chạy trong container riêng, không mở cổng router. Game dùng `TRUST_PROXY=1` và chỉ xuất cổng local `127.0.0.1:3000`. Token Tunnel nằm ngoài repo trong Docker volume riêng.

Tailscale Funnel cũng chạy được nhưng đo thực tế rất chậm (khứ hồi khoảng 3 giây, kết nối hay rớt), nên không dùng cho game này.

### Chặn container đi sang dịch vụ khác

Game không cần gọi vào mạng nội bộ. Trên máy còn dịch vụ khác thì nên bật luật này, nó chỉ áp dụng cho mạng `hth-net` và tự bật lại khi khởi động máy:

```bash
sudo bash scripts/install-firewall.sh
```

Gỡ bằng cách thêm `--remove` vào cuối lệnh.

## Sao lưu

Dữ liệu nằm gọn trong một file `data/hth.db`. Sao lưu chỉ cần chép file này khi server đang tắt. Muốn xoá sạch dữ liệu thử nghiệm: tắt server, xoá thư mục `data`, chạy lại.

Mất `localStorage` trên một máy thì người chơi đó được coi là người mới, đây là thiết kế đã chốt (không có khôi phục tài khoản).

## HTTPS

Chạy HTTP trong LAN dùng được các hoạt động cơ bản. Các tính năng cần HTTPS:

- **Trò chuyện bằng mic.** Trình duyệt chỉ cho xin quyền mic trên HTTPS hoặc localhost.
- **Lắc điện thoại khi rút quẻ.** Không có HTTPS thì dùng chạm giữ.
- **Nút Chia sẻ trực tiếp sang ứng dụng khác.** Không có HTTPS thì dùng nút tải ảnh về rồi gửi tay.

## Dành cho dev

Setup máy mới và quy trình làm việc xem ở [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
npm run dev
```

Lệnh này chạy server ở cổng 3000 và Vite ở cổng 5173 với hot reload. Mở `http://localhost:5173`.

```bash
npm test
```

Bộ test khởi động server thật trên DB tạm, gồm: lọc từ, va chạm và khả năng đi hết sân, chat, lời ước, restart giữ dữ liệu, chuông, thiền, sự kiện chuông, admin, kết nối lại.

```bash
npm run loadtest -- --bots 20 --seconds 30 --url http://localhost:3000 --admin <adminKey>
```

Lệnh này giả lập người chơi và in CPU server cùng độ trễ chat.

### Cấu trúc mã

```text
shared/          Dùng chung client + server: bố cục sân, va chạm, hằng số giao thức, luật nhịp, câu cá, đầu hồ, voice
server/
  index.js       Express + Socket.IO, phục vụ client đã build
  rooms.js       Phòng chung: người online, gói vị trí 20 lần/giây, chat, kết nối lại, định tuyến sự kiện
  wishes.js      Lời ước và quẻ vận đơn
  bell.js        Chuông cá nhân, lịch và sự kiện chuông
  fishing.js     Câu cá: định giờ cắn, roll loài, tự mô phỏng pha giằng co
  meditation.js  Giữ chỗ chiếu, nhịp thở chung
  rhythm.js      Minigame Audition chuông
  riddle.js      Đố thuật ngữ với Mặc Vũ
  pitch.js       Đầu hồ đấu với NPC
  baucua.js      Bầu cua: bàn chung, đặt cược TEU, xóc và trả thưởng
  xidach.js      Xì dách: bàn chung đấu nhà cái NPC, chia/rút/dằn, chấm (xidach-view.js: những gì được phát chung)
  table-stake-store.js  Giữ/trả/hoàn TEU của các bàn đỏ đen, hoàn cược treo khi khởi động lại
  voice.js       Ghép cặp và chuyển tín hiệu voice theo khoảng cách
  admin.js       API và trang admin (giao diện ở admin-ui/)
  filter.js      Lọc từ có phân biệt dấu
  limits.js      Giới hạn theo IP
  db.js          SQLite
client/src/
  scene/         Tu viện, cảng, địa hình, trời, hạt, con vật, lời ước 3D, sân chơi của từng hoạt động
  player/        Nhân vật, trang phục, điều khiển, camera, người chơi trên máy
  net/           Socket, đồng bộ đồng hồ, nội suy người khác
  activities/    Mỗi hoạt động một file
  ui/            HUD, chat, Sổ, Bảng ước, hộp thoại, bảng điều khiển minigame
  audio/         Hiệu ứng Web Audio, trình phát nhạc MP3, voice
  share/         Ảnh chia sẻ và ảnh vận đơn
```

### Vài quyết định kỹ thuật

- **`playerId` là bí mật.** Nó thay mật khẩu cho Sổ cá nhân nên không bao giờ gửi cho người khác. Dữ liệu realtime dùng `sid` số riêng, REST đọc `playerId` từ header chứ không đặt trên URL.
- **Server là nguồn sự thật.** Client chỉ gửi ý định. Server kiểm tra giới hạn tần suất, độ dài, từ cấm và kẹp vị trí trong sân.
- **Đồng hồ.** Client ước lượng giờ server kiểu NTP. Ngày đêm, xe đầu kéo, con mèo, nhịp thở và đếm ngược đều tính từ giờ server nên mọi máy thấy giống nhau mà không tốn băng thông.
- **Tài nguyên cùng nguồn.** Mô hình tĩnh dựng bằng Blender trong `tools/blender/`, export GLB cùng nguồn (`client/public/models/`), font dùng của hệ thống. Voice dùng WebRTC giữa người chơi; chỉ gọi STUN/TURN khi người vận hành cấu hình.
- **Chat không được lưu ở đâu cả.** Server chỉ phát rồi quên.
