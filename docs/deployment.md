# Deployment

## Current release: 2026-11-14 Xianxia monastery and casino redesign, 05:08 UTC+7

Deploy run [43516697923](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43516697923)
released main `127a9aa` as `hth:261114-0508-127a9aa`, replacing
`hth:261114-0206-f5ad2bd`. Includes PR #90 (site widened west and north to
about 96×76 m; casino tables and slots moved into the walled Kim Ngân Phường;
market quarter for shop, trade post and tea house), PR #91 (inner court restyled:
great hall on a 1.6 m marble terrace with stairs and rails, red columns, jade
roofs, red palace walls, mountain gate with stone lions), PR #92 (Kim Ngân Phường
in gold and red: Kim Ngân Lâu, pailou gates, lantern strings, red carpet,
floating ingots) and PR #93 (backdrop: karst peaks, cloud sea, floating islands
with waterfalls, cranes, bagua formation and rising qi). Public bundle
`index-CwuO0GGO.js`, confirmed served at `https://game.hthlogistics.top/` with
`/api/health` 200.

Docker tests 399/399. Candidate passed with DB `quick_check` ok (55 players,
24 wishes, 95 fish).

Rollback container `hth-rollback-261114-0508-127a9aa` preserves
`hth:261114-0206-f5ad2bd`. Private backup is in the data volume at
`backups/cutover-261114-0508-127a9aa/`.

## Previous release: 2026-11-14 Kim Long meditation base and ribbon-aura removed, 02:06 UTC+7

Deploy run [43489066801](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43489066801)
released main `f5ad2bd` as `hth:261114-0206-f5ad2bd`, replacing
`hth:261114-0137-d9b6877`. Includes PR #88 (Kim Long gets a meditation base
distinct from Xích Diễm; the unused `ribbon-aura.js` is removed). Public bundle
`index-Daqf9Gck.js`, confirmed served at `https://game.hthlogistics.top/` with
`/api/health` 200.

Docker tests 395/395. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 81 fish).

Rollback container `hth-rollback-261114-0206-f5ad2bd` preserves
`hth:261114-0137-d9b6877`. Private backup is in the data volume at
`backups/cutover-261114-0206-f5ad2bd/`.

## Previous release: 2026-11-14 Xích Diễm, Long Quyền and Kim Long auras rebuilt, 01:37 UTC+7

Deploy run [43484343808](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43484343808)
released main `d9b6877` as `hth:261114-0137-d9b6877`, replacing
`hth:261114-0105-f334c04`. Includes PR #83 (Xích Diễm Lưu Vân becomes Hỏa Vân
Đài: low wide fire-cloud platform, fire ring at the waist), PR #84 (Long Quyền
becomes Hỏa Long Thăng Quyền: fire dragon spiralling up into a fist seal,
cracked-ground shockwave) and PR #86 (Kim Long Nguyệt Ảnh: golden dragon arching
over the head, dragon pearl, half moon, sea of clouds). Effects 9, 10 and 11 now
each have their own module; `ribbon-aura.js` is no longer used by any effect.
Public bundle `index-C4w4boCC.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` 200.

Docker tests 398/398. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 81 fish).

Rollback container `hth-rollback-261114-0137-d9b6877` preserves
`hth:261114-0105-f334c04`. Private backup is in the data volume at
`backups/cutover-261114-0137-d9b6877/`.

## Previous release: 2026-11-14 slot machines and fewer redraws, 01:05 UTC+7

Deploy run [43479145756](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43479145756)
released main `f334c04` as `hth:261114-0105-f334c04`, replacing
`hth:261113-2303-3871ff6`. Includes PR #82 (Gạt cần: three slot machines in
the west gallery facing the casino court; three reels, bets 1/5/10 TEU, three
dragons pay ×200, expected return 95.6%; each spin settled on the server and
seen by the whole court) and PR #80 (fewer redraws; graphics quality steps back
up once the machine is no longer busy). Public bundle `index-D08ElozQ.js`,
confirmed served at `https://game.hthlogistics.top/` with `/api/health` 200.

Docker tests 358/358. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 81 fish). The first attempt, run
[43477974860](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43477974860),
stopped in the Docker test stage before touching production: the host was
slow (suite 149 s against 54 s the run before) and the bầu cua socket test
timed out on a 3 s ack. The retry passed with the same code.

Rollback container `hth-rollback-261114-0105-f334c04` preserves
`hth:261113-2303-3871ff6`. Private backup is in the data volume at
`backups/cutover-261114-0105-f334c04/`.

## Previous release: 2026-11-13 Bích Ngọc, Nguyệt Bạch and Huyền Dạ auras rebuilt, 23:03 UTC+7

Deploy run [43458759105](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43458759105)
released main `3871ff6` as `hth:261113-2303-3871ff6`, replacing
`hth:261113-2229-4a2b348`. Includes PR #77 (Nguyệt Bạch as Cầm Nguyệt Thủy
Kính: off-centre moon, zither strings and a still water mirror), PR #76
(Huyền Dạ as Nhật Thực Huyền Nha: black eclipse behind the head, crow
feathers and ink drawn inward, dark ink-vortex ground) and PR #78 (Bích Ngọc
as Trúc Lâm Phong Quyển: jade bamboo grove with swirling wind and wuxia props).
Each has its own meditation throne. Public bundle `index-Cbjr_ing.js`,
confirmed served at `https://game.hthlogistics.top/` with `/api/health` 200.

Docker tests 342/342. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 77 fish).

Rollback container `hth-rollback-261113-2303-3871ff6` preserves
`hth:261113-2229-4a2b348`. Private backup is in the data volume at
`backups/cutover-261113-2303-3871ff6/`.

## Previous release: 2026-11-13 graphics settings and sharper bầu cua table, 22:29 UTC+7

Deploy run [43449139081](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43449139081)
released main `4a2b348` (PR #75) as `hth:261113-2229-4a2b348`, replacing
`hth:261113-2226-4a2b348`. Two Deploy runs were dispatched for the same commit
while the runner was offline; run
[43441673086](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43441673086)
cut over first at 22:26 (`hth:261113-2027-2a1d28e` → `hth:261113-2226-4a2b348`),
then this run re-released the same commit. Adds the "Đồ hoạ" menu button
(Tự động / Thấp / Vừa / Cao / Rất nét, saved in `hth.graphics`; "Rất nét"
renders up to 4K at 2× density) and draws the bầu cua mat and dice at twice
the pixels. Public bundle `index-lbvkdmza.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` 200.

Docker tests 301/301. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 73 fish).

Rollback containers `hth-rollback-261113-2229-4a2b348` (preserves
`hth:261113-2226-4a2b348`) and `hth-rollback-261113-2226-4a2b348` (preserves
`hth:261113-2027-2a1d28e`). Private backups are in the data volume at
`backups/cutover-261113-2226-4a2b348/` and `backups/cutover-261113-2229-4a2b348/`.

Runner note: the run stayed queued ~1 h because `Runner.Listener` on
`pc-chinh` had been cancelled at 21:10 (window closed, not a network fault).
Restarted by launching the Startup `hth-deploy-runner.cmd` again.

## Previous release: 2026-11-13 four auras rebuilt with distinct forms, 20:27 UTC+7

Deploy run [43433806435](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43433806435)
released main `2a1d28e` as `hth:261113-2027-2a1d28e`, replacing
`hth:261113-1842-0d65438`. Includes PR #69 (shared aura modules split out of
Kiếm Vũ), PR #72 (Lưu Ly Vân Thủy as a whirlpool water wheel of glass drops,
lily pond with koi, wave-crest meditation seat), PR #73 (Tinh Hà as a
multi-axis celestial sphere), PR #71 (Đào Hoa as a moon gate with peach
branch) and PR #70 (Hồng Liên as spread vermilion-bird wings). Each aura now
has its own silhouette instead of sharing Kiếm Vũ's back-disc layout. Public
bundle `index-g46ZYfjs.js`, confirmed served at `https://game.hthlogistics.top/`
with `/api/health` 200.

Docker tests 297/297. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 69 fish).

Rollback container `hth-rollback-261113-2027-2a1d28e` preserves
`hth:261113-1842-0d65438`. Private backup is in the data volume at
`backups/cutover-261113-2027-2a1d28e/`.

## Previous release: 2026-11-13 Kiếm Vũ aura rebuilt as Vạn Kiếm Quy Tông Trận, 18:42 UTC+7

Deploy run [43419140054](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43419140054)
released main `0d65438` (PR #67) as `hth:261113-1842-0d65438`, replacing
`hth:261113-1701-55867be`. Thanh Phong Kiếm Vũ (effect 12) now has its own
layered form: sword wheel with hand-drawn mandala and counter-rotating rune rim,
drifting light arcs, silk sashes, xiangyun clouds, falling sword petals, three
orbiting swords, bagua ground seal and a gentle 12 s breathing cycle with a
slow sword rain; seated it shows a sword throne instead of the borrowed lotus.
Public bundle `index-Db0tOR3-.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` 200 and the Kiếm Vũ code
present in the bundle.

Docker tests 254/254. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 67 fish).

Rollback container `hth-rollback-261113-1842-0d65438` preserves
`hth:261113-1701-55867be`. Private backup is in the data volume at
`backups/cutover-261113-1842-0d65438/`.

## Previous release: 2026-11-13 trading post and fishing additions, 17:01 UTC+7

Deploy run [43405842466](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43405842466)
released main `55867be` as `hth:261113-1701-55867be`, replacing
`hth:261113-1635-2ba3e4c`. Includes PR #65 (big fish, catch streaks, Giờ cá
vàng) and PR #66 (trading post for direct look and TEU trades). Recorded
afterwards from the run history; test counts and candidate details were not
written down at the time.

## Previous release: 2026-11-13 renamed casino table dealers, 16:35 UTC+7

Deploy run [43402508930](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43402508930)
released main `2ba3e4c` (PR #63) as `hth:261113-1635-2ba3e4c`, replacing
`hth:261113-1602-66944f5`. NPC dealers renamed: bầu cua PhucGay, xì dách
Mikumilu, tài xỉu SnowLe, cò quay TheEm. Public bundle: `index-C-vT8igH.js`,
confirmed served at `https://game.hthlogistics.top/` with `/api/health` 200
and all four new names present in the bundle.

Docker tests 235/235. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 67 fish).

Rollback container `hth-rollback-261113-1635-2ba3e4c` preserves
`hth:261113-1602-66944f5`. Private backup is in the data volume at
`backups/cutover-261113-1635-2ba3e4c/`.

## Previous release: 2026-11-13 meditation earns TEU, fishing shop and kitchen orders, 16:02 UTC+7

Deploy run [43397934568](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43397934568)
released main `66944f5` as `hth:261113-1602-66944f5`, replacing
`hth:261113-1524-d3207a8`. Includes three PRs merged since the last release:
#59 (fish leaps out of the water onto the rod, per-species art in cards and
the fish book, bobber dips and fish shadow under it), #60 (fishing gear stall
with rods and bait, daily kitchen fish orders) and #61 (meditation earns TEU:
1 TEU per full minute seated, max 15 TEU per day, counted from `teu_log`
reason `meditate`; partial minutes are dropped on standing up and time while
offline or with the server stalled over 15 s does not count; HUD line
"x/15 TEU hôm nay" under the cultivation orb). Public bundle:
`index-D-Q4lBmX.js`, confirmed served at `https://game.hthlogistics.top/`
with `/api/health` 200.

Docker tests 235/235. Candidate passed with DB `quick_check` ok (52 players,
23 wishes, 62 fish). Meditation TEU checked in a local browser (100 → 101 TEU
after one minute), not on the public site.

Rollback container `hth-rollback-261113-1602-66944f5` preserves
`hth:261113-1524-d3207a8`. Private backup is in the data volume at
`backups/cutover-261113-1602-66944f5/`.

## Previous release: 2026-11-13 tài xỉu and cò quay tables, 15:24 UTC+7

Deploy run [43392988121](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43392988121)
released main `d3207a8` (PR #56) as `hth:261113-1524-d3207a8`, replacing
`hth:261113-1512-9ba0faf`. Two new tables behind bầu cua and xì dách, sharing
server core `CasinoRoundTable`: tài xỉu (Xỉu/Tài 1:1, Bão 1:30 max 3 TEU) and
European roulette cò quay (straight 1:35 max 5, dozens 1:2, outside 1:1).
Players sit at eye level with their own avatar hidden locally, click the 3D
felt to bet, and the round's biggest bettor holds mouse/Space to charge and
releases to throw; dice and ball animate to the server-drawn result. New
socket events `taixiu:*`, `coquay:*` (`bet`, `clear`, `throw`, `state`,
`payout`); stakes held in `taixiu_pending`, `coquay_pending`; weekly board
counts both tables as net profit/loss. Public bundle: `index-CL2zyIYn.js`,
confirmed served at `https://game.hthlogistics.top/` with `/api/health` 200.

Local suite 225/225 and Vite build passed on Node 24; Docker tests 225/225.
Candidate passed with DB `quick_check` ok (52 players, 23 wishes, 53 fish).
UI checked in a local browser at desktop and 375x812, not on the public site.

Rollback container `hth-rollback-261113-1524-d3207a8` preserves
`hth:261113-1512-9ba0faf`. Private backup is in the data volume at
`backups/cutover-261113-1524-d3207a8/`.

## Previous release: 2026-11-13 casino-style layout for bầu cua and xì dách, 15:12 UTC+7

Deploy run [43391379530](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43391379530)
released main `9ba0faf` (PR #55) as `hth:261113-1512-9ba0faf`, replacing
`hth:261113-1130-2d1b1c4`. Client: while playing at either table the camera
locks to a fixed view from the guest side (dealer and table in the top half);
shared table HUD with a large countdown ring, phase callouts, chips flying on
bet and win, animated wallet. Bầu cua: six tiles in one row with bettor count
and pot per tile, last 12 results strip, Repeat and Double buttons. Xì dách:
dealer cards in the header, large Hit/Stand buttons lit only on one's turn,
Repeat split into chips. Server: new `baucua:rebet` (whole bundle accepted or
refused, charged once); `baucua:state` adds `crowd` and `history`. Public
bundle: `index-CLl16pAY.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` 200.

Local suite 207/207 and Vite build passed on Node 24; Docker tests 207/207.
Candidate passed with DB `quick_check` ok (52 players, 23 wishes, 48 fish).
UI checked in a local browser at desktop and 375x812, not on the public site.

Rollback container `hth-rollback-261113-1512-9ba0faf` preserves
`hth:261113-1130-2d1b1c4`. Private backup is in the data volume at
`backups/cutover-261113-1512-9ba0faf/`.

## Previous release: 2026-11-13 100 TEU welcome gift for new players, 11:30 UTC+7

Deploy run [43365987558](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43365987558)
released main `2d1b1c4` (PR #52) as `hth:261113-1130-2d1b1c4`, replacing
`hth:261113-0942-2155bcc` (PR #51, deploy run
[43353949351](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43353949351),
not recorded separately here). A player joining for the first time (no row in
`players`) gets `TEU.welcomeGift` = 100 once, logged in `teu_log` with reason
`welcome` and excluded from the weekly TEU board. Existing players get nothing;
rejoining does not grant it again. Snapshot carries `welcomeGift`, the client
shows a "Quà nhập môn" toast. Public bundle: `index-Cv7QlaDD.js`, confirmed
served at `https://game.hthlogistics.top/` with `/api/health` ok.

Local suite 206/206 and Vite build passed on Node 24; Docker tests 206/206.
Candidate passed with DB `quick_check` ok (52 players, 23 wishes, 48 fish).
Toast not checked in a browser; server behaviour covered by `test/server.test.js`.

Rollback container `hth-rollback-261113-1130-2d1b1c4` preserves
`hth:261113-0942-2155bcc`. Private backup is in the data volume at
`backups/cutover-261113-1130-2d1b1c4/`.

## Previous release: 2026-11-13 xì dách turns, dealer checks, card squeeze and effects, 06:58 UTC+7

Deploy run [43333211851](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43333211851)
released main `92c1a2e` (PR #48 and #49) as `hth:261113-0658-92c1a2e`, replacing
`hth:261113-0138-4aa0cfa`. Server and client change for the xì dách table:
players now act one at a time in seat order (10 s each, `turn` in state,
`xidach:act` with `hit|stand|timeout`); after drawing, the dealer checks each
seat in turn (new phase `checking`, one seat per second, paid at its check).
Dealer drawing rules and house edge are unchanged. Client: cards fly from the
shoe and flip on reveal, avatars hold cards and reach when hitting, bubbles for
hit/stand/result, a timer ring on the active seat, card squeeze for one's own
cards, result stamps and chip stacks that move to the dealer or the winner.
Public bundle: `index-C1h2Ztsd.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` ok.

Local suite 205/205 and Vite build passed on Node 24; Docker tests 205/205.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 48 fish).
Checked in a browser on a temporary DB with a socket bot as second player;
not yet checked with two real players after the cutover.

Rollback container `hth-rollback-261113-0658-92c1a2e` preserves
`hth:261113-0138-4aa0cfa`. Private backup is in the data volume at
`backups/cutover-261113-0658-92c1a2e/`. A round open during rollback is
refunded from `xidach_pending` on the next start.

## Previous release: 2026-11-13 xì dách table and centre-court gambling tables, 01:38 UTC+7

Deploy run [43281849549](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43281849549)
released main `4aa0cfa` (PR #46) as `hth:261113-0138-4aa0cfa`, replacing
`hth:261113-0050-e680ae5`. Server and client change: a shared xì dách table
(southern rules, up to 5 players vs the NPC dealer Bà Năm, real TEU; rules and
simulation numbers in `docs/xidach.md`) and both gambling tables moved to the
forecourt in front of the meditation hall, mirrored on either side of the main
axis (`BAUCUA_ZONE` west, `XIDACH_ZONE` east). New table `xidach_pending` holds
unsettled stakes (2× the bet); on start any left by a crash are refunded. New
socket events `xidach:bet|clear|hit|stand|state|hand|payout`; hello snapshot
gains `xidach`. The weekly TEU board counts net `baucua:*` and `xidach:*` rows.
Public bundle: `index-tOJ6KqXD.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` ok.

Local suite 205/205 and Vite build passed on Node 24; Docker tests 205/205.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 48 fish).
Checked in a browser on a temporary DB at 1280×720 and 375 (touch); not yet
checked with two real players after the cutover.

Rollback container `hth-rollback-261113-0138-4aa0cfa` preserves
`hth:261113-0050-e680ae5`. Private backup is in the data volume at
`backups/cutover-261113-0138-4aa0cfa/`. Rolling back leaves `xidach_pending`
unused and puts the bầu cua table back behind Sạp Kim Bảo; refund any rows
still in `xidach_pending` first if a round was open.

## Previous release: 2026-11-13 bầu cua redesign and shorter rounds, 00:50 UTC+7

Deploy run [43273600242](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43273600242)
released main `e680ae5` (PR #44) as `hth:261113-0050-e680ae5`, replacing
`hth:261112-2327-065aefc`. Bầu cua rounds are now 8 s betting + 2 s roll + 3 s
result (were 20 + 3.5 + 8). Client redesign: red-tarp betting panel with chip
stacks and a countdown bar, a 3×2 mat plus porcelain plate and bowl on the 3D
table, a dealer NPC (`BAUCUA_ZONE.dealer`, a new collision circle) that shakes
the plate, and a centre-screen dice reveal with the player's net result and
sounds. No data or protocol change. Public bundle: `index-COvgsc70.js`,
confirmed served at `https://game.hthlogistics.top/` with `/api/health` ok.

Local suite 189/189 and Vite build passed on Node 24; Docker tests 189/189.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 48 fish).
Checked in a browser on a temporary DB at 1280×720 and 375 (touch); not yet
checked with two real players after the cutover.

Rollback container `hth-rollback-261113-0050-e680ae5` preserves
`hth:261112-2327-065aefc`. Private backup is in the data volume at
`backups/cutover-261113-0050-e680ae5/`.

## Previous release: 2026-11-12 Bầu cua tôm cá shared table, 23:27 UTC+7

Deploy run [43258810166](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43258810166)
released main `065aefc` (PR #42) as `hth:261112-2327-065aefc`, replacing
`hth:261112-1634-bcf26e6`. Server and client change: a shared bầu cua table in
the market corner behind Sạp Kim Bảo (`BAUCUA_ZONE`), bets in real TEU (chips
1/5/10, max 30 per face and 50 per round), server-rolled dice, rounds of 20 s
betting, 3.5 s roll, 8 s result. New socket events `baucua:bet`, `baucua:clear`,
`baucua:state`, `baucua:payout`; hello snapshot gains `baucua`. New table
`baucua_pending` holds unsettled stakes; on start, any stakes left by a crash
are refunded. The weekly TEU board now counts bầu cua as weekly net win/loss
(`baucua:*` rows) and hides players whose weekly total is not positive; other
spending still does not lower rank. Rules and protocol: `docs/baucua.md`.
Public bundle: `index-BLuXOBX9.js`, confirmed served at
`https://game.hthlogistics.top/` with `/api/health` ok.

Local suite 189/189 and Vite build passed on Node 24; Docker tests 189/189.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Checked in a browser on a temporary DB (full round, desktop and 375 touch, camera
drag while the betting panel is open) before release; not yet checked with two
real players after the cutover.

Rollback container `hth-rollback-261112-2327-065aefc` preserves
`hth:261112-1634-bcf26e6`. Private backup is in the data volume at
`backups/cutover-261112-2327-065aefc/`. Rolling back leaves `baucua_pending`
unused; refund any rows still in it before rolling back if a round was open.

## Previous release: 2026-11-12 Kim Bảo shop, in-game wardrobe and TEU wallet, 16:34 UTC+7

Deploy run [43192587763](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43192587763)
released main `bcf26e6` (PR #40) as `hth:261112-1634-bcf26e6`, replacing
`hth:261112-1552-1afd543`. Server and client change: premium cosmetics (8 auras,
5 attires, 2 weapons, 4 hats, 3 hair styles, 6 shirt colours, 15–80 TEU, prices
in `shared/shop.js`) are now bought with TEU at the Sạp Kim Bảo stall NPC near
the tea-house path or from the HUD shop button; a wardrobe changes outfits
in game and broadcasts `player:look`. New table `owned_items`; on first start
a one-time migration (`PRAGMA user_version` 1) grants each player the paid
items they were wearing and converts the old `unlocked` colour bitmask.
Purchases log negative `teu_log` rows; the weekly board counts earnings only
and no longer returns other players' `player_id`. Public bundle:
`index-i5pyyceX.js`, confirmed served at `https://game.hthlogistics.top/`.

Local suite 174/174 and Vite build passed on Node 24; Docker tests 174/174.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Checked in a browser on a temporary DB at desktop and 375 (touch) before
release; not yet checked with two real players after the cutover.

Rollback container `hth-rollback-261112-1634-bcf26e6` preserves
`hth:261112-1552-1afd543`. Private backup is in the data volume at
`backups/cutover-261112-1634-bcf26e6/`. Rolling back to the old image leaves
the `owned_items` table unused; the old code ignores it.

## Previous release: 2026-11-12 ink-style HUD and MMO skill bar, 15:52 UTC+7

Deploy run [43186470687](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43186470687)
released main `1afd543` (PR #38) as `hth:261112-1552-1afd543`, replacing
`hth:261112-1414-d220050`. Client-only UI rework: the PK HUD now sits below the
HUD and dialogs (`z-index: 2`) and hides during activities, so it no longer
covers the play menu, dialogs, the fishing hints or the phone menu and joystick.
HUD buttons use a self-drawn SVG line icon set (`client/src/ui/ink-icons.js`)
instead of emoji, with tooltips instead of labels; the skill bar is an MMO-style
frame with radial cooldown sweeps and the HP bar attached below; phones get a
large attack button with three skills in an arc. Public bundle:
`index-DTHm5lKp.js`, confirmed served at `https://game.hthlogistics.top/`.

Local suite 167/167 and Vite build passed on Node 24; Docker tests 167/167.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Checked in a browser at 1280, 1024, 375 (touch) and 740x360 (touch landscape)
before release; not yet played on a real phone after the cutover.

Rollback container `hth-rollback-261112-1552-1afd543` preserves
`hth:261112-1414-d220050`. Private backup is in the data volume at
`backups/cutover-261112-1552-1afd543/`.

## Previous release: 2026-11-12 camera look-up framing and pointer-lock spikes, 14:14 UTC+7

Deploy run [43173722041](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43173722041)
released main `d220050` (PR #36) as `hth:261112-1414-d220050`, replacing
`hth:261112-1343-a21098e`. Client-only fix: looking up from the ground now slides
the camera along the ground toward the player's feet while aiming at the head,
then tilts toward the sky (up to 53°) with the head still in frame. Pointer-lock
mouse input drops the first two events after locking and Chrome's bogus >150 px
deltas that spun the camera, requests `unadjustedMovement`, and no longer falls
back to hover-to-rotate after one failed lock. Public bundle: `index-Bf7B5vyc.js`.

Local suite 167/167 and Vite build passed on Node 24; Docker tests 167/167.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Not yet played with a real mouse on production after the cutover.

Rollback container `hth-rollback-261112-1414-d220050` preserves
`hth:261112-1343-a21098e`. Private backup is in the data volume at
`backups/cutover-261112-1414-d220050/`.

## Previous release: 2026-11-12 3D spring-arm camera collision, 13:43 UTC+7

Deploy run [43170083773](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43170083773)
released main `a21098e` (PR #34) as `hth:261112-1343-a21098e`, replacing
`hth:261112-1321-b53e4e2`. Client-only change: the follow camera sphere-casts in
3D against walls and roofs with their real heights (`shared/camera-colliders.js`)
instead of a 2D ray that treated every blocker as infinitely tall, so low bridge
rails and the 2.1 m yard wall no longer snap the camera in while rotating.
Public bundle: `index-BS4x3CpX.js`.

Local suite 165/165 and Vite build passed on Node 24; Docker tests 165/165.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Not yet played with a real mouse on production after the cutover.

Rollback container `hth-rollback-261112-1343-a21098e` preserves
`hth:261112-1321-b53e4e2`. Private backup is in the data volume at
`backups/cutover-261112-1343-a21098e/`.

## Previous release: 2026-11-12 camera no longer turns by itself, 13:21 UTC+7

Deploy run [43167585850](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43167585850)
released main `b53e4e2` (PR #32) as `hth:261112-1321-b53e4e2`, replacing
`hth:261112-1314-27d85dd`. Client-only fix: removes the auto-follow camera from
PR #31, which kept turning the camera when walking sideways or diagonally
without the mouse (movement is camera-relative, so each turn changed the run
direction and the camera turned again). Public bundle: `index-Cn7nGZ3t.js`.

Local suite 163/163 and Vite build passed on Node 24; Docker tests 163/163.
Candidate passed with DB `quick_check` ok (50 players, 23 wishes, 42 fish).
Not yet played on production by hand after the cutover.

Rollback container `hth-rollback-261112-1321-b53e4e2` preserves
`hth:261112-1314-27d85dd`. Private backup is in the data volume at
`backups/cutover-261112-1321-b53e4e2/`.

## Previous release: 2026-11-12 smoother camera, 13:14 UTC+7

Deploy runs [43166563663](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43166563663)
(`hth:261112-1313-27d85dd`) and, a minute later,
[43166584707](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43166584707)
released main `27d85dd` (PR #31) as `hth:261112-1314-27d85dd`, replacing
`hth:261112-1113-07d52bb`. Client-only change: zoom glides by ratio, leaving the
welcome screen or a minigame shot blends back behind the player, under roofs the
camera pulls in along the view ray, phones pinch to zoom; it also added a camera
auto-follow that turned out to spin the camera and was removed in PR #32.
Public bundle: `index-DSttCzf4.js`. Candidate DB `quick_check` ok (50 players,
23 wishes, 42 fish).

## Previous release: 2026-11-12 shader warm-up and pinning, 11:13 UTC+7

Deploy run [43153303297](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43153303297)
released main `07d52bb` (PR #29) as `hth:261112-1113-07d52bb`, replacing
`hth:261112-1017-3d78fd8`. Client-only change: shaders for every PK move and 13
avatar variants compile on the welcome screen and stay alive for the session,
so PK casts and players joining or leaving no longer stall frames; a
self-lowered graphics level is remembered per GPU for 7 days. Public bundle:
`index-BNmR_Sr2.js`.

Local suite 158/158 and Vite build passed on Node 24; Docker tests 158/158.
Candidate passed health, page, bundle, Socket.IO and DB `quick_check` (49
players, 23 wishes, 42 fish, no decrease). Production cutover passed localhost
and public checks with the candidate's bundle hash. Not measured on an office
laptop with integrated graphics.

Rollback container `hth-rollback-261112-1113-07d52bb` preserves
`hth:261112-1017-3d78fd8`. Private backup is in the data volume at
`backups/cutover-261112-1113-07d52bb/`.

## Previous release: 2026-11-12 main after D drive recovery, 10:17 UTC+7

Deploy run [43147193947](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43147193947)
released main `3d78fd8` (PR #27, work restored after the D drive loss on
2026-11-11) as `hth:261112-1017-3d78fd8`, replacing `hth:camera-orbit-1109`.
This is the first workflow release since the manual 2026-11-09 releases; their
features (Zoeyy, chat HUD, camera orbit) are in main. Public bundle:
`index-DUMEUq2e.js` (SHA256 `e776365a…777ebf`).

Before the release, production and `hth-tunnel-fixed` had been stopped since
2026-11-10 (Docker Desktop data move); both were restarted with `docker start`
and their existing images and volumes. The earlier candidate run 43130166254
failed only because production was not running. An offline tar backup of the
data volume was taken before restart, outside the repository on `pc-chinh`.

Local suite 154/154 and Vite build passed on Node 24. Candidate run
[43146939540](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/43146939540):
Docker tests 154/154; health, page, bundle, Socket.IO and DB passed. Production
run: candidate, localhost and public checks passed; DB quick_check ok with 49
players, 23 wishes, 42 fish (no decrease). Runtime flags, `hth-net`, volume
and localhost port retained. Public browser check after cutover: skills 1-4
cast, Space meditates in place with the qi orb, E talks to Trụ trì Ethan and
Zoeyy. Voice and other activities were not rechecked.

Rollback container `hth-rollback-261112-1017-3d78fd8` preserves
`hth:camera-orbit-1109`, stopped with `restart=no`. Private backup is in the
data volume at `backups/cutover-261112-1017-3d78fd8/`.

## Previous release: 2026-11-09 camera orbit fix, 15:06 UTC+7

Public image `hth:camera-orbit-1109` adds camera wall collision and 360-degree
orbit fixes from commit `2470949` on `fix/camera-orbit-1109`. Mouse hover rotates
the camera again after meditation ends, even without pointer lock. Built from
the previous production source `D:/hth-chat-voice-release-1109` with only
`client/src/player/camera.js`, `client/src/player/controls.js`, and the new
camera orbit test overlaid. Release source: `D:/hth-camera-orbit-release-1109`.

Branch Docker tests passed 142/142; release Docker tests passed; candidate
health/page passed. Local and public health/page and Socket.IO polling returned
200; public bundle `index-BUq_NKI_.js` matched candidate. SQLite quick_check:
ok. Volume, network, localhost port and runtime hardening retained. Browser
gameplay after cutover was not directly checked.

Rollback container `hth-pre-camera-orbit-1109-1506` uses
`hth:chat-voice-1109`, stopped with `restart=no`. Private online backup:
`backups/cutover-camera-orbit-1109-1506/` in production volume; its DB
quick_check passed. Restore image only unless DB restoration is required.

## Previous release: 2026-11-09 chat HUD and mic control, 14:31 UTC+7

Public image `hth:chat-voice-1109` adds lower-left chat history, Enter-to-chat,
direct mic toggle, and nearby speaker names. Release source:
`D:/hth-chat-voice-release-1109`, built from the running `hth:zoeyy-1109`
image source with only chat/voice client files overlaid from commit `56d8843`.
Clean-branch tests: 141/141; Docker release tests: 138/138; candidate
WebRTC and chat browser checks passed. Public health, page and Socket.IO
returned 200, bundle `index-B42r7Iof.js` matched local, SQLite quick_check
was ok with 45 players retained. Existing runtime flags and data volume kept.
Rollback: stopped `hth-pre-chat-voice-1109-1431` (`hth:zoeyy-1109`);
private backup: `backups/cutover-chat-voice-1109-1431/` in production volume.


## Current target

Cloudflare named Tunnel on the production host `pc-chinh` (Windows, Tailscale
hostname `anhhao.tail028c49.ts.net`, SSH alias `pc-chinh` from the dev machine
`MSI`). Public URL: `https://game.hthlogistics.top/`. Porkbun manages
registration; Cloudflare manages DNS and the Tunnel. `hth-tunnel-fixed`
connects through Docker network `hth-net` with `--restart unless-stopped`. Its
token is stored in Docker volume `hth-tunnel-credentials`, mounted read-only.
Keep this volume private and back it up securely; never commit the token.

Game container: `hth-tu-vien-ben-cang` on Docker network `hth-net` on
`pc-chinh`, with `TRUST_PROXY=1` and `--restart unless-stopped`. Only
`127.0.0.1:3000` is published on the host. Persistent DB, admin key, and
shared radio clock are in Docker volume `hth-tu-vien-ben-cang-data`. The
tunnel forwards to `http://hth-tu-vien-ben-cang:3000`.

Note: a stale copy of the stack (container `hth`, quick tunnel, volume
`hth-data`) used to sit on machine `hao` (`hao.tail028c49.ts.net`). It served
nothing public and was fully removed on 2026-11-07 (containers, volume, images
`hth:1`–`hth:4` and `cloudflared`; its DB snapshot held 15 players / 4 wishes,
superseded by production). Production is only on `pc-chinh`.

## Releasing: the Deploy workflow

Release only through the `Deploy` workflow, from any machine with `gh`:

```bash
gh workflow run deploy -f ref=main
gh workflow run deploy -f ref=<branch> -f candidate_only=true
gh run watch
```

`concurrency: production` queues runs, so two sessions can never cut over at
once. The job runs `scripts/deploy.mjs` on the self-hosted runner and:

1. Checks out the ref with LF line endings into a clean workspace.
2. `docker build --target test`: `npm test` inside the same `node_modules` the
   image ships. A failing test stops here.
3. Builds `hth:<YYMMDD-HHMM>-<sha7>` (labels `hth.deploy=workflow`,
   `hth.commit`).
4. Copies the data volume (minus `backups/`) into a throwaway volume, runs a
   candidate on a localhost port Docker picks, and checks health, page, bundle, Socket.IO
   handshake and DB `quick_check`. The candidate is always removed.
5. Unless `candidate_only`: backs up the DB (SQLite backup API) and config to
   `backups/cutover-<tag>/` inside the data volume, stops production, renames it
   `hth-rollback-<tag>` (`restart=no`), starts the new image with every runtime
   flag below, and checks localhost and the public URL (bundle hash must match
   the candidate). Any failure rolls back automatically.
6. Tags `hth:latest` and keeps only the 3 newest `hth-rollback-*` containers
   and their images. Older objects not created by the workflow are never touched.

The run page shows a summary (image, bundle hash, DB counts, rollback name) to
copy into the release notes below.

Runner: `C:\actions-runner-hth` on `pc-chinh`, name `pc-chinh-hth`, labels
`self-hosted, Windows, hth-prod`, running as user `anhha` because Docker
Desktop only serves that user's session. At logon,
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\hth-deploy-runner.cmd`
waits 60 s (so the webdebit launcher checks for `Runner.Listener.exe` first),
then starts `run.cmd` minimized if this runner is not already running. If runs
stay queued, check that the runner is online in the repo's Settings → Actions →
Runners, or start `C:\actions-runner-hth\run.cmd` on `pc-chinh`.

Manual release (only when the runner is down): never build from the shared
checkout. `git archive` the commit, copy to `pc-chinh`, extract, and run
`set HTH_COMMIT=<sha>` then `node scripts/deploy.mjs` there. SSH lands in cmd.exe: keep remote commands
simple and run pipes on the dev side.

## Operate (PowerShell)

```powershell
docker ps --filter name=hth
docker logs hth-tunnel-fixed --tail 30
curl.exe --noproxy '*' https://game.hthlogistics.top/api/health
```

Never share the admin
key. Updating game image
requires rebuilding and recreating the game container on `hth-net` with the
same volume, localhost port, `TRUST_PROXY=1`, and these runtime flags; keep
`hth-tunnel-fixed` running:

```text
--restart unless-stopped --memory 768m --memory-swap 1536m --pids-limit 256
--cap-drop ALL --security-opt no-new-privileges
```

`docker update` changes only the current container, so every recreate must pass
these flags again.

`hth:latest` may not be the running image. Check the actual image with
`docker ps --filter name=hth` before recreating or rolling back.

## Current release: 2026-11-08 cross-network voice

Deploy run [42465684418](https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/42465684418)
released main `69cf415` as `hth:261108-1605-69cf415` (also `hth:latest`) at
16:08 UTC+7. Public bundle: `index-BhHaAhqA.js`. Cloudflare TURN environment
variables are present in the production container; long-lived credentials
remain server-side.

Docker tests: 141/141 passed. Candidate health, page, bundle, Socket.IO and DB
quick_check passed (27 players, 18 wishes, 33 fish). Workflow production and
public checks passed. The public relay-only browser check passed with actual
TURN candidates on both peers, bidirectional synthetic audio, mic controls,
distance revocation, disconnect cleanup, and retained aura/meditation/melody.
Physical microphones and two devices on separate Internet connections were
not tested. Four public checks produced two complete passes, one TURN
admission failure, and one peer connection timeout. Five direct credential
requests from the container passed. The intermittent failures remain
undiagnosed; the browser check now prints sanitized admission and ICE states
on failure. These results do not prove reliable connectivity on every network.

Rollback container `hth-rollback-261108-1605-69cf415` preserves
`hth:aura-1108-1345`, stopped with `restart=no`. Private backup is in the data
volume at `backups/cutover-261108-1605-69cf415/`.

## Production baseline reconciled: 2026-11-08

Before the voice release, the running container was `hth:aura-1108-1345`,
including the later per-effect startup fix and the full-motion toggle. Its
public bundle was `index-Cuy2F2KH.js`. The running source, not the older release
notes below, was used to reconcile main before deploying voice.

The reconciled sources retain Tau nhac and its audio, free meditation with the
orb HUD and current qi rate, Lee Sin/Long quyen, all signature auras and titles,
and the full-motion preference. The older standalone Sen Kim renderer remains
tested but is not wired over the newer production signature aura.

Cloudflare TURN uses the private environment file referenced by repository
variable `HTH_VOICE_ENV_FILE`. Keep that variable on subsequent deploys. The
file is outside the checkout, readable by the production runner account only
and SYSTEM; do not commit or print its contents. See `proximity-voice.md`.

## Previous workflow release: 2026-11-07 meditation anywhere and Lee Sin quick outfit

Deployed as `hth:261107-1953-5cdb367` (also `hth:latest`) at 19:55 (UTC+7) on
`pc-chinh`, from main `5cdb367` (PR #21) through Deploy run `42374410776`.
Adds **Thiền tại chỗ** to the contextual action and **Chơi gì?** menu, keeping
the server's current position while awarding qi. Real mats still support Nhịp sen.
Adds **Mặc bộ Lee Sin · Long quyền** on welcome to select the existing full outfit.
No DB schema change; partial meditation time and existing progress are retained.

Local suite and Docker test gate: 119/119; Vite build passed. Local browser checks
on desktop and mobile passed outfit selection and persistence after reload,
meditation without travel, qi gain and standing up, with no page errors.
Candidate on a copy of production: health, page, bundle, Socket.IO and DB
`quick_check` passed (25 players, 13 wishes, 25 fish). Cutover from
`hth:261107-1911-65ab644` retained the data volume, network, port and runtime flags.
Public health, bundle `/assets/index-CzHwhGgN.js`, feature strings and WebSocket
clock sync passed after cutover. Public gameplay was not repeated with a player.

Rollback: stopped container `hth-rollback-261107-1953-5cdb367` using the previous
image. Private backup: `backups/cutover-261107-1953-5cdb367/` inside the data volume.
Deploy run: https://github.com/FinanceBullkk/hth-tu-vien-ben-cang/actions/runs/42374410776

## Previous release: 2026-11-07 seated meditation qi and ground aura

Deployed as `hth:261107-1911-65ab644` (also `hth:latest`) at 19:11 (UTC+7) on `pc-chinh`, built
from main `65ab644` (PR #19) through the Deploy workflow. Brings the seated-meditation feature
(tĩnh tu tích Chân khí, 1 qi per 6 s of server-measured sitting time, stored in the new
`cultivation_ms` column, ground aura `cultivation-aura.js` growing with qi tiers) that had only
run on the separate `localhost:3992` preview (`feat/meditation-cultivation` `20cefcc`) and was
never part of any public release. Cherry-picked onto current main; conflicts resolved to keep
both cultivation systems: the existing Nhịp sen points tiers (`avatar-cultivation.js`) and the
new qi tiers (`QI_TIERS`, renamed from the branch's `CULTIVATION_TIERS`). State rows grew from
7 to 8 columns (column 7 stays position age, column 8 is qi).

Test gate in the Docker build: 116/116 (106 previous + 10 new qi tests), including real-socket
qi awarding, tab-switch and reconnect dedupe. Local worktree suite also 116/116 with a passing
Vite build (`index-ByspXpni.js`). Candidate on a copy of the real volume: health, bundle,
DB `quick_check` ok (24 players, 13 wishes, 25 fish). Cutover
`hth:261107-1837-e3cd0b3` → `hth:261107-1911-65ab644` with the same volume, network, port and
runtime flags. Post-cutover public checks: health ok, page serves `index-ByspXpni.js`,
Socket.IO handshake ok, and the served bundle contains the meditation strings. Entry code
state unchanged from before.

Rollback container `hth-rollback-261107-1911-65ab644` is stopped with `restart=no`
(image `hth:261107-1837-e3cd0b3`). Cutover backup is inside the data volume under
`backups/cutover-261107-1911-65ab644/`. The separate meditation preview
(`hth-meditation-preview`, `127.0.0.1:3992`, image `hth:meditation-261107-1524`, synthetic
volume) is untouched and now redundant; remove it separately when no longer wanted.

Note: the two intermediate releases `hth:melody-261107-1748` and `hth:261107-1837-e3cd0b3`
(after the nontoc section below) were deployed by other sessions without recorded release notes;
their rollback container and images remain as listed by `docker ps -a --filter name=hth`.

## Previous release: 2026-11-07 separate hair slot and xianxia hair, hats

Deployed as `hth:nontoc-261107-1702` (also `hth:latest`) at about 17:10 (UTC+7) on `pc-chinh`, built
from a clean export of commit `7558252` (main, PR #14). Splits the avatar look into two free
slots — hair and hat — adding three xianxia hairstyles (Búi trâm ngọc, Song loạn, Bạch phát) and
four hats (Không đội, Đạo quan, Kim quan, Nón lá màn sa). Legacy mixed ids 0–2 of the old hat slot
keep their meaning and are migrated to the hair slot server-side when a client omits `hair`; the
DB gains a `hair` column via migration, no other schema change. Existing ids 3–6 keep theirs —
Đầu trụi băng mắt now ignores the hair slot since it carries its own hair design.

Test gate: 106/106 in a `node:24` container on the clean export, plus the same suite green in the
dev worktree and a passing client build. Candidate on a copy of the real data volume: health,
bundle hash (`index-DNSZSzp1.js`), DB `quick_check` (24 players, 13 wishes, 34 fish) and a browser
run (welcome chip rows, avatar hair/hat state checks, entering the game) passed; pixel screenshots
were not captured because the capture surface timed out on the heavy canvas. Cutover kept the same
volume, `hth-net`, port `127.0.0.1:3000→3000`, `TRUST_PROXY=1` and all runtime flags. Post-cutover:
local and public health passed, public bundle hash matched, Socket.IO WebSocket handshake OK,
`quick_check` ok with the same counts; `CapDrop=ALL` and `NoNewPrivs=1` confirmed.

Rollback container `hth-pre-nontoc-261107-1702` is stopped and preserved with `restart=no`
(image `hth:tempest-261107-1638`). Private cutover backup is inside the data volume at
`backups/cutover-nontoc-261107-1702/`. Candidate container and its volume were removed.

Note: while this cutover happened, another session was preparing an aura release (candidates
`hth:aura-redesign-261107-1705` and `hth:aura-public-261107-1715` were running). Production base
is main `7558252`; the next release must build from main at or after this commit — or from merged
sources containing it — so the hair/hat feature is not silently rolled back.

After moving or restarting Docker, check the site. If the containers stayed stopped,
start them with their existing images and data:

```powershell
docker start hth-tu-vien-ben-cang
docker start hth-tunnel-fixed
```

Stop public access without stopping the local game:

```powershell
docker stop hth-tunnel-fixed
```

Start it again with `docker start hth-tunnel-fixed`. Domain remains unchanged.

## Previous release: 2026-11-07 camera free look, campus activities and auras

Deployed as `hth:tempest-261107-1638` (also `hth:latest`) at about 16:45
(UTC+7) on `pc-chinh`, built from a clean export of commit `417b54e` (main,
PRs #1–#9). Brings the WWM-style camera (right-click toggle free look without
pointer lock, pitch down to −1.3 rad to look at the sky, zoom to 16 m,
camera-facing strafe), removes the join code gate, and includes the campus
activities, proximity voice, auras and attire work. No DB schema change.

The previous running image (`hth:trangphuc-261107-1600`) had no deploy record;
token probes showed its client predated PRs #1–#3, so this release caught
production up with main. Test gate: 91/91 in a `node:24` container on
`pc-chinh`. Candidate on a copy of the real data volume: health, bundle hash
(`index-DB5CUnNC.js`) and DB `quick_check` passed. Cutover kept the same
volume, `hth-net`, port `127.0.0.1:3000→3000`, `TRUST_PROXY=1` and all runtime
flags. Post-cutover: public health and bundle hash passed, Socket.IO handshake
OK, `quick_check` ok with 24 players, 13 wishes, 34 fish retained; `CapEff=0`
and `NoNewPrivs=1` confirmed.

Rollback container `hth-pre-tempest-261107-1638` is stopped and preserved with
`restart=no`. Private cutover backup is inside the data volume at
`backups/cutover-tempest-261107-1638/`. Candidate container and test volume
were removed.

## Previous release: 2026-11-07 campus layout and auras

Deployed as `hth:campus-261107-1155` (also `hth:latest`) at 12:00 (UTC+7), built from a clean export
of commit `5ee7e0d`. Campus areas are rearranged and five auras added. No `server/` change and no DB
schema change. An uncommitted `avatar-effect.js` edit in the working checkout was excluded on purpose.

Exported commit suite in a `node:24` Linux container: 87/87. Candidate on a copy of real data:
health and DB quick_check passed. Candidate on an empty volume, browser run: login, entering the
game, the new campus and the bell activity at its new position, with no console errors. Other
activities and the new auras were not tried in the browser.

Cutover took about 4 seconds, with the same volume, network, port and all runtime flags under
Operate. `CapEff=0` and `NoNewPrivs=1` confirmed. Public health, page, bundle hash
(`index-CmogtFKB.js`), music range request and WebSocket handshake passed. DB quick_check: ok;
16 players, 5 wishes retained. Tunnel unchanged.

Rollback container `hth-pre-campus-261107-1200` is stopped and preserved with `restart=no`; it runs
`hth:wwm-261107-1200` with the same flags. Private cutover backup is inside the data volume at
`backups/cutover-campus-261107-1200/`. Rolling back the DB discards changes made after cutover.

## Previous release: 2026-11-07 Where Winds Meet music

Image: `hth:wwm-261107-1200`, built 2026-11-07 09:45 (UTC+7). `hth:latest` then
pointed to the older `hth:pitch-261107-0910`. Of the three music files in the pitch image, only
`where-winds-meet-character-creation.mp3` remains. This section was written afterwards from the
image and container metadata; the test results and cutover checks of this release were not recorded.
No `cutover-wwm` backup exists in the data volume. `hth:pitch-261107-0910` is available as a
rollback image for the previous release.

Runtime difference: the first `wwm` container was created without the restart policy, resource
limits and hardening of the earlier game containers. On 2026-11-07 at 11:47 (UTC+7) the container
was recreated with the same image, volume, network, port and `TRUST_PROXY=1`, plus all runtime flags
listed under Operate. Local health returned in about 7 seconds. The flags, `CapEff=0` and
`NoNewPrivs=1` were confirmed in the running container. Public health, page, bundle hash, music
range request and WebSocket handshake passed; browser gameplay was not tested. DB quick_check: ok;
16 players, 3 wishes.

Rollback container `hth-pre-hardening-261107-1147` is stopped and preserved with `restart=no`; it
uses the same image without hardening. Private cutover backup is inside the data volume at
`backups/cutover-hardening-261107-1147/`. Keep backups private.

### Incident: 2026-11-07 Docker move

Docker stopped both containers at 10:27 (UTC+7) during the move. The public site returned 530
for about an hour. `hth-tunnel-fixed` did not return on its own despite `unless-stopped`; the cause
is unknown. Both were restored with `docker start` at 11:34. Before restart: DB quick_check ok,
15 players, 3 wishes. After restart: public health, page and Socket.IO polling returned 200; browser
and WebSocket were not tested. The game container had `restart=no`, set to `unless-stopped` with
`docker update` without downtime. Automatic start after a Docker restart has not been tested.

## Previous release: 2026-11-07 Dau ho

Pitch-pot rebuild deployed as `hth:pitch-261107-0910` (also `hth:latest`). Turn-based match
against an NPC: hold cursors inside drifting circles until full, then throw; combo scoring;
win by a 50-point lead or reaching 250. Scoring now evaluates client sample time, clamped to 300 ms.
Built from the previous running image sources plus pitch-related files only. Concurrent
fishing and wish-tree edits in the working checkout were excluded on purpose, so the deployed
source is NOT the working tree. `fishing.test.js` was skipped because it targets those edits.
Staged suite: 63/63. Candidate container: real-socket matches and browser run passed.
Public health, bundle hash and WebSocket clock sync passed. DB quick_check: ok; 15 players,
3 wishes retained. No schema change. Tunnel, runtime limits, volume and port unchanged.

Rollback container `hth-pre-pitch-261107-0910` is stopped and preserved; previous image
is tagged `hth:pre-pitch-261107-0910`. Private cutover backup is inside the data volume
at `backups/cutover-pitch-261107-0910/`.

## Previous release: 2026-11-07 music

Music update deployed as `hth:music-261107-0148` (also `hth:latest`).
Login and in-game radio use Character Creation Song with 0.5 music gain;
continuous wind/leaves/water/sea use 0.1 ambience gain. Radio duration fallback: 1758 seconds.
Deployment was built from the previous running image sources plus four audio-related
file updates, excluding concurrent cargo-throw edits in the working checkout.
Local suite: 61/61; staged server suite: 25/25. Candidate admission and radio passed.
Public health, MP3, bundle hash, WebSocket clock sync and browser music playback passed.
DB quick_check: ok; existing 15 players and 3 wishes retained. Tunnel and runtime limits unchanged.

Rollback container `hth-pre-music-261107-0148` is stopped and preserved; previous image
is tagged `hth:pre-music-261107-0148`. Private cutover backup is inside the data volume
at `backups/cutover-music-261107-0148/`. Candidate container and test volume were removed.

## Previous release: 2026-11-07 FPS

FPS optimization was deployed as `hth:fps-261107-0130`.
Game uses the same volume, network, localhost port and resource limits.
Public health, bundle hash, WebSocket clock sync and browser render passed.
Local suite: 59/59 tests passed. DB quick check: ok; existing 15 players and 3 wishes retained.

Rollback container `hth-pre-fps-261107-0130` is stopped and preserved; previous image
is tagged `hth:pre-fps-261107-0130`. Cutover DB/config backup is inside the data
volume at `backups/cutover-fps-261107-0130/`. Keep backups private. Rolling back
the DB discards changes made after cutover; only restore it if rollback requires it.
