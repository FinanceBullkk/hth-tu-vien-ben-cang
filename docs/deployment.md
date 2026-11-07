# Deployment

## Current target

Cloudflare named Tunnel on this Windows host. Public URL:
`https://game.hthlogistics.top/`. Porkbun manages registration; Cloudflare
manages DNS and the Tunnel. `hth-tunnel-fixed` connects through Docker network
`hth-net` with `--restart unless-stopped`. Its token is stored in Docker volume
`hth-tunnel-credentials`, mounted read-only. Keep this volume private and back
it up securely; never commit the token. A second owner-restricted copy exists
at `%LOCALAPPDATA%\HTH-TuVien\tunnel\token` on this PC.

Game container: `hth-tu-vien-ben-cang` on Docker network `hth-net`, with
`TRUST_PROXY=1`. Only `127.0.0.1:3000` is published on the host. Persistent DB,
join code, admin key, and shared radio clock are in Docker volume
`hth-tu-vien-ben-cang-data`. The tunnel forwards to
`http://hth-tu-vien-ben-cang:3000`.

## Operate (PowerShell)

```powershell
docker ps --filter name=hth
docker logs hth-tunnel-fixed --tail 30
curl.exe --noproxy '*' https://game.hthlogistics.top/api/health
```

Add `?code=<joinCode>` only when sending an invitation. Never share the admin
key. Updating game image
requires rebuilding and recreating the game container on `hth-net` with the
same volume, localhost port, and `TRUST_PROXY=1`; keep `hth-tunnel-fixed` running.

Stop public access without stopping the local game:

```powershell
docker stop hth-tunnel-fixed
```

Start it again with `docker start hth-tunnel-fixed`. Domain remains unchanged.

## Latest release: 2026-11-07 Dau ho

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
