# Đóng góp cho dự án

## Setup máy mới

Cần Git và Node.js 24 (xem `.nvmrc`).

```bash
git clone https://github.com/FinanceBullkk/hth-tu-vien-ben-cang.git
```

```bash
cd hth-tu-vien-ben-cang
```

```bash
npm ci
```

```bash
npm run dev
```

Mở `http://localhost:5173`. Lần chạy đầu, server tự tạo `config.json` với khoá admin riêng của máy đó.

`config.json` và `data/` không nằm trong git, nên mỗi máy có khoá admin và dữ liệu riêng. Đừng commit hai thứ này. Muốn dùng dữ liệu thật trên máy khác thì tắt server rồi chép `data/hth.db` bằng tay.

## Quy trình làm việc

1. `main` luôn phải chạy được. Không code trực tiếp trên `main`.
2. Lấy code mới rồi tạo nhánh cho từng việc, đặt tên `feat/...`, `fix/...` hoặc `chore/...`:

   ```bash
   git switch main
   ```

   ```bash
   git pull
   ```

   ```bash
   git switch -c feat/ten-tinh-nang
   ```

3. Trước khi rời máy, push cả phần đang làm dở lên nhánh để máy kia làm tiếp được.
4. Chạy `npm test` trước khi mở PR.
5. Mở PR vào `main`, chờ CI xanh rồi squash merge.

## Khi sửa code

- Server là nguồn sự thật: client chỉ gửi ý định, server kiểm tra lại mọi thứ.
- Không gửi `playerId` cho người chơi khác và không đặt nó trên URL.
- Mô hình và font nằm trong game: model tĩnh dựng bằng Blender (`tools/blender/`) và export GLB cùng nguồn vào `client/public/models/` — luôn kèm bản code dự phòng khi file chưa tải được. Nhạc nền là file MP3 cùng nguồn trong `client/public/music/`, phát bằng thẻ `<audio>`; không nhúng trình phát bên ngoài.
- Đổi hành vi ở server thì thêm hoặc sửa test trong `test/`.

Xem thêm phần "Dành cho dev" trong `README.md`.
