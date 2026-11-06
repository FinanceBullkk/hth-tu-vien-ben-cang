# HTH – Tu viện bên cảng

Game web 3D nhiều người chơi, dùng nội bộ cho nhân viên HTH Logistics: lên tu viện cạnh cảng container để thỉnh chuông, ngồi thiền, viết lời ước, rút quẻ vận đơn và trò chuyện trong giờ nghỉ. Không thắng thua, không xếp hạng, không thu tiền.

## Chạy game

Cần Node.js 22 trở lên.

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

## Mã vào cửa

Game có một mã dùng chung cho cả công ty, không phải tài khoản từng người. Trang admin hiển thị sẵn link dạng `https://.../?code=ABC234`: gửi link đó vào nhóm Zalo, bấm vào là tự điền mã.

Khi nghi lộ mã, vào trang admin đổi mã mới rồi gửi lại link. Người đang chơi vẫn ở lại, ai vào mới hoặc rớt mạng phải dùng mã mới. Nếu cần đẩy hết mọi người ra, khởi động lại server sau khi đổi mã.

## Đổi nội dung (không cần biết lập trình)

**Cách dễ nhất là dùng trang admin:** mở `http://<địa chỉ server>:3000/admin?key=<adminKey>`. Khoá `adminKey` nằm trong file `config.json`. Mọi thay đổi ở đây có hiệu lực ngay, không cần khởi động lại.

| Muốn đổi | Vào đâu trên trang admin |
| --- | --- |
| Giờ chuông, câu thông báo | Mục **Sự kiện chuông**. Bấm "+ Lịch hằng ngày" hoặc "+ Lịch một lần", rồi **Lưu lịch** |
| Từ cấm | Mục **Từ lọc**, mỗi dòng một từ, rồi **Lưu từ lọc** |
| Câu chúc quẻ, câu khen sau thiền, lời chào | Mục **Nội dung**, mỗi dòng một câu, rồi **Lưu nội dung** |
| Ẩn một lời ước | Mục **Lời ước**, bấm **Ẩn**. Bấm **Bỏ ẩn** để hiện lại |
| Mời một người ra khỏi game | Mục **Người đang online**, bấm **Kích** (vào lại được sau 1 phút) |

**Cũng có thể sửa trực tiếp file `config.json`** bằng Notepad, rồi khởi động lại server. Giữ nguyên dấu ngoặc kép và dấu phẩy. Nếu file sai định dạng, server sẽ báo lỗi và không chạy, nên không làm hỏng dữ liệu.

Lưu ý khi thêm từ lọc: có dấu và không dấu là **hai từ riêng**. Bộ lọc cố ý phân biệt dấu để không chặn nhầm những chữ vô hại như "lớn" hay "các bạn". Vì vậy đừng thêm từ không dấu có nghĩa thường, ví dụ "lon" sẽ chặn cả "lon bia".

Trong câu thông báo chuông, viết `{time}` thì game tự thay bằng giờ thật.

Tên và lời nói của thầy trụ trì nằm ở đầu file `client/src/scene/abbot.js`. Sửa xong phải chạy lại `npm run build`.

## Cấu hình

| Trường trong `config.json` | Biến môi trường | Ý nghĩa |
| --- | --- | --- |
| `port` | `PORT` | Cổng chạy server, mặc định 3000 |
| `adminKey` | `ADMIN_KEY` | Khoá trang admin, tối thiểu 24 ký tự |
| `dbPath` | `DB_PATH` | Đường dẫn file dữ liệu, mặc định `data/hth.db` |
| `timezone` | `TZ_GAME` | Múi giờ tính "hôm nay" và giờ chuông |
| `dayCycleMinutes` | | Độ dài một vòng hoàng hôn → đêm, mặc định 20 phút |
| `joinCode` | | Mã vào cửa. `"auto"` thì tự tạo ở lần chạy đầu, `""` thì tắt mã. Đổi được trên trang admin |
| `codeAttemptsPer10Min` | | Số lần nhập sai mã từ một IP trong 10 phút, mặc định 20 |
| `maxPlayers` | | Số người online tối đa, mặc định 60 |
| `maxConnections` | | Số kết nối mạng tối đa, mặc định 200 |
| `maxConnectionsPerIp` | | Số kết nối từ một IP, mặc định 40. Cả văn phòng thường chung một IP nên đừng đặt quá thấp |
| `wishesPerIpPerDay` | | Lời ước mỗi ngày từ một IP, mặc định 100 |
| `newPlayersPerMinute` | | Lượt vào mới mỗi phút từ một IP, mặc định 40. Cả văn phòng thường chung một IP nên đừng đặt quá thấp |
| `wishesPerDayTotal` | | Tổng lời ước toàn game mỗi ngày, mặc định 300 |
| | `TRUST_PROXY=1` | Đọc IP thật từ `X-Forwarded-For`. Chỉ bật khi game đứng sau proxy tin cậy như Tailscale Funnel và cổng không mở trực tiếp |

### Mở game ra internet

Dùng Cloudflare Tunnel, chạy trong container riêng nên không phải cài gì lên máy và không mở cổng nào:

```bash
docker run -d --name hth-tunnel --restart unless-stopped --network hth-net --cap-drop ALL --security-opt no-new-privileges --memory 256m --pids-limit 128 cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://hth:3000
```

Xem link:

```bash
bash scripts/link.sh
```

Đây là tunnel thử: link đổi mỗi khi container hoặc máy khởi động lại, và Cloudflare không cam kết dùng lâu dài. Muốn link cố định thì cần tài khoản Cloudflare và một tên miền. Nhớ chạy container game với `-e TRUST_PROXY=1` để giới hạn theo IP hoạt động đúng.

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

Chạy HTTP trong LAN là đủ. Chỉ hai tính năng cần HTTPS:

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
shared/          Dùng chung client + server: bố cục sân, va chạm, hằng số giao thức
server/
  index.js       Express + Socket.IO, phục vụ client đã build
  rooms.js       Phòng chung: người online, gói vị trí 10 lần/giây, chat, kết nối lại
  wishes.js      Lời ước và quẻ vận đơn
  bell.js        Chuông cá nhân, lịch và sự kiện chuông
  meditation.js  Giữ chỗ chiếu, nhịp thở chung
  admin.js       API và trang admin (giao diện ở admin-ui/)
  filter.js      Lọc từ có phân biệt dấu
  db.js          SQLite
client/src/
  scene/         Tu viện, cảng, địa hình, trời, hạt, con vật, lời ước 3D
  player/        Nhân vật, điều khiển, camera, người chơi trên máy
  net/           Socket, đồng bộ đồng hồ, nội suy người khác
  activities/    Mỗi hoạt động một file
  ui/            HUD, chat, Sổ, Bảng ước, hộp thoại
  audio/         Toàn bộ âm thanh tạo bằng Web Audio
  share/         Ảnh chia sẻ và ảnh vận đơn
```

### Vài quyết định kỹ thuật

- **`playerId` là bí mật.** Nó thay mật khẩu cho Sổ cá nhân nên không bao giờ gửi cho người khác. Dữ liệu realtime dùng `sid` số riêng, REST đọc `playerId` từ header chứ không đặt trên URL.
- **Server là nguồn sự thật.** Client chỉ gửi ý định. Server kiểm tra giới hạn tần suất, độ dài, từ cấm và kẹp vị trí trong sân.
- **Đồng hồ.** Client ước lượng giờ server kiểu NTP. Ngày đêm, xe đầu kéo, con mèo, nhịp thở và đếm ngược đều tính từ giờ server nên mọi máy thấy giống nhau mà không tốn băng thông.
- **Không có request ra ngoài.** Toàn bộ mô hình dựng bằng code, âm thanh tạo bằng Web Audio, font dùng của hệ thống. CSP trên server chặn luôn mọi kết nối ra ngoài.
- **Chat không được lưu ở đâu cả.** Server chỉ phát rồi quên.
