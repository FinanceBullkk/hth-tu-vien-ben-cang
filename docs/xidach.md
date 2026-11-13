# Xì dách (luật miền Nam)

Bàn chung tối đa 5 khách đấu với Bà Năm nhà cái (NPC) ở sân trước thiền đường, phía đông trục chính
(`XIDACH_ZONE` trong `shared/layout.js`); bàn bầu cua đối xứng phía tây. Cược bằng TEU thật.

## Luật

- Bộ 52 lá, xáo mới mỗi ván bằng `crypto.randomInt`.
- Át tính theo số lá: 2 lá là 11, 10 hoặc 1; 3 lá là 10 hoặc 1; từ 4 lá chỉ tính 1. Lấy tổng cao nhất không quá 21.
- Bài đặc biệt, cao xuống thấp: **xì bàn** (đôi Át) > **xì dách** (Át + 10/J/Q/K) > **ngũ linh** (5 lá không quá 21) > bài thường.
- Khách dưới 16 điểm là **non**: không được dằn, hết giờ mà vẫn dưới 16 thì thua.
- **Quắc** (quá 21) thì thua, trừ khi nhà cái cũng quắc thì hoà. Bằng điểm thì hoà; cùng loại bài đặc biệt cũng hoà.
- Bài đặc biệt ăn **x2 hai chiều**: khách thắng bằng nó được gấp đôi, nhà cái thắng bằng nó thu gấp đôi.
  Vì vậy lúc cược, server giữ 2 lần tiền cược; chấm xong hoàn phần dư.
- Nhà cái rút khi dưới 17, và rút tiếp khi đang 17–18 "mềm" (có Át đang tính 10/11); luôn đạt ít nhất 15.
- Chip 1/5/10 TEU, tối đa 20 TEU một tay.

### Vì sao nhà cái rút như vậy

Mô phỏng bằng chính code luật (`shared/xidach.js`), mỗi cấu hình 400 nghìn tới 1 triệu ván:

| Cấu hình | Người chơi thường | Chiến thuật tốt nhất dò được |
| --- | --- | --- |
| Bài đặc biệt chỉ x2 cho khách, nhà cái dừng ở 15–18 | lời 4–11% | lời tới 11% |
| x2 hai chiều, nhà cái dừng ở 17 cứng | lỗ ~2% | lời ~0,3–0,9% |
| x2 hai chiều, nhà cái rút tiếp 17–18 mềm (đang dùng) | lỗ 1–4% | lỗ ~0,3% |

Cấu hình đầu là máy in TEU. Test `nhà cái có lợi thế` trong `test/xidach.test.js` chạy mô phỏng có hạt giống
để giữ kết luận này khi ai đó sửa luật.

## Vòng đời một ván

`idle` -> có người cược -> `betting` (8 giây, khách khác vào thêm, tối đa 5 ghế) -> chia 2 lá mỗi người và nhà cái
-> `playing` (lần lượt từng khách theo ghế, mỗi người 15 giây; dằn, quắc, đủ 5 lá hay hết giờ thì sang người kế;
khách xì bàn/xì dách được bỏ qua) -> `dealer` (nhà cái lật lá úp, rút từng lá cách 0,7 giây)
-> `checking` (nhà cái xét từng nhà theo ghế, mỗi giây một nhà: lật bài, chấm, trả tiền ngay người đó) -> `result` (3 giây) -> `idle`.
Nhà cái có xì bàn/xì dách thì lật ngay sau khi chia, không ai được rút, đi xét luôn. Cược lúc `idle` hoặc `result` mở ván mới.
Xét lần lượt chỉ là cách trình bày: nhà cái vẫn rút theo đúng luật cố định trước khi xét, nên lợi thế nhà cái không đổi.
Mọi mốc thời gian và giới hạn nằm trong `XIDACH` ở `shared/xidach.js`.

## TEU và bảng tuần

Dùng chung `server/table-stake-store.js` với bầu cua: giữ tiền ở bảng `xidach_pending`, ghi `teu_log` với lý do
`xidach:bet|return|win`. Bảng TEU tuần tính lãi/lỗ ròng cả tuần của các dòng `baucua:*` và `xidach:*`.
Server tắt giữa ván thì hoàn ngay; sập đột ngột thì lần khởi động sau hoàn mọi dòng còn treo.

## Giao thức

| Sự kiện | Hướng | Nội dung |
| --- | --- | --- |
| `xidach:bet` | client -> server | `{ amount: 1\|5\|10 }`, ack `{ ok, bet, seat, teu, state }` |
| `xidach:clear` | client -> server | rút cược khi còn đang nhận cược |
| `xidach:hit` / `xidach:stand` | client -> server | ack `{ ok, cards, stood }`; chỉ người đang tới lượt; dằn dưới 16 bị từ chối |
| `xidach:state` | server -> cả phòng | `server/xidach-view.js`: `turn` (sid người đang tới lượt, `endsAt` là hạn lượt), `checking` (sid vừa xét), bài nhà cái (lá úp là -1), ghế khách chỉ có số lá tới khi được xét; ghế đã xét có `cards`, `kind`, `total`, `net`, `outcome` |
| `xidach:hand` | server -> khách | `{ round, cards, stood }` bài của chính mình |
| `xidach:act` | server -> cả phòng | `{ sid, action: 'hit'\|'stand'\|'timeout', count }` ai vừa rút/dằn/hết giờ; không kèm lá, quắc vẫn báo là "hit" |
| `xidach:payout` | server -> khách | `{ round, outcome, mult, bet, net, kind, teu }` |

Hello trả thêm `snapshot.xidach` (kèm `mine` là ghế, tiền cược và bài của người đó) để vào lại giữa ván vẫn chơi tiếp.

## Hiệu ứng

- Bàn 3D (`scene/xidach-table-model.js`): mặt bán nguyệt kiểu sòng bài, cạnh thẳng phía nhà cái, đệm da bọc cung phía khách,
  khay chip của nhà cái, hộp bài (shoe) cạnh tay nhà cái. Mặt dạ (`scene/xidach-felt-texture.js`) vẽ canvas: thớ dạ, chữ in vàng
  chạy theo cung ("Xì dách · trả gấp đôi", luật nhà cái rút và non), vòng đặt cược trước từng ghế, ấn HTH giữa bàn.
- Lá bài (`scene/card-textures.js`, `card-suit-paths.js`, `card-court-figure.js`): một bộ ảnh canvas dùng chung cho bàn 3D và bảng
  chơi; góc chỉ số hai đầu, chất xếp theo bố cục bài thật, J Q K có hình người hai đầu, mặt lưng đỏ viền trắng có ấn HTH.
  Chất vẽ bằng đường cong nên máy nào cũng giống nhau. Chip 3D (`scene/casino-chip-materials.js`) có sọc cạnh và mặt in mệnh giá.
- Bàn 3D (`scene/card-motion.js`): mỗi lá bay từ chồng bài của nhà cái tới đúng chỗ theo vòng cung, các lá cùng lượt cách
  nhau 0,13 giây; lá úp lật ra (lá thứ hai của nhà cái, bài khách lúc chấm) bằng một vòng lật quanh sống lá. Có tiếng lá rơi, tiếng lật.
- Nhân vật: đứng ở bàn thì hai tay cầm quạt bài; rút thì với tay ra chồng bài; bong bóng "Rút!" / "Dằn! (3 lá)" cho cả phòng thấy.
- Nhà cái xét tới nhà nào (`activities/xidach-effects.js`): bong bóng kết quả trên đầu người đó ("Xì dách! +20", "Quắc · −10",
  "19 điểm · hoà"), người thắng có tiền vàng bay lên.
- Mặt bàn 3D (`scene/xidach-table-fx.js`): chồng chip cược trước chỗ từng khách; vòng giờ nổi trên chỗ người đang tới lượt;
  khi xét thì dấu mộc (THẮNG, THUA, HOÀ, XÌ DÁCH, NGŨ LINH, QUẮC, NON) đóng trên tay bài, chip người thua trượt về nhà cái,
  nhà cái đẩy chip thưởng sang người thắng.
- Nặn bài (`ui/xidach-cards.js`): chia hai lá thì lá đầu ngửa, lá thứ hai úp; lá rút thêm ngửa luôn. Kéo lá úp lên thì hé dần từ dưới lên, quá 60% thì lật hẳn, chạm một cái
  cũng lật. Điểm hiện "Nặn bài" tới khi nặn xong; bàn 3D chỉ ngửa những lá đã thấy. Tới lúc xét thì tự lật hết.
- Bảng chơi: vòng giờ vàng chạy quanh ô người đang tới lượt (và quanh dòng "Bạn"), ô ghế khác hiện "chờ lượt / đang rút / đã dằn",
  nháy xanh khi họ rút, đỏ khi họ dằn; dấu mộc đóng lên ô khi được xét; tiếng chuông nhỏ khi tới lượt mình.

## Mã

- `shared/xidach.js`: bài, tính điểm, phân loại, so bài, chấm tiền, luật rút của nhà cái.
- `server/xidach.js` (vòng đời bàn), `server/xidach-view.js` (những gì được phát cho cả phòng).
- `client/src/activities/xidach.js`, `ui/xidach-panel.js`, `ui/xidach.css` (dùng chung khung với `ui/baucua.css`),
  `scene/xidach-table.js`, `scene/xidach-table-model.js`, `scene/xidach-felt-texture.js`, `scene/card-textures.js`, `scene/table-dealer.js` (NPC nhà cái dùng chung với bầu cua).
- `test/xidach.test.js`.
