# Deployment

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

## Releasing from the dev machine

Builds must come from a clean export, never the shared working checkout:
`git archive --format=tar.gz <commit>`, copy to `pc-chinh`, extract, run
`npm test` in a `node:24` container, run a candidate container on a copy of
the data volume, then cutover with the runtime flags under Operate. SSH into
`pc-chinh` lands in cmd.exe: keep remote commands simple, do not pipe into
`tail`/`grep` remotely (run pipes on the dev side), and use SSH
`ServerAliveInterval` for long builds.

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

## Latest release: 2026-11-07 camera free look, campus activities and auras

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
