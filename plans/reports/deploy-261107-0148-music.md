# Music deployment

- Target: https://game.hthlogistics.top/
- Release: hth:music-261107-0148; latest tag updated.
- Scope: deployed previous running source plus client/index.html, client/src/audio/audio.js,
  client/src/ui/hud.js and server/rooms.js. Concurrent cargo-throw edits excluded.
- Character Creation Song used by login and game; music gain 0.5; ambience gain 0.1.
- Local Node 24 suite: 61/61. Exact staging server suite: 25/25.
- Candidate used separate DB/config snapshot; admission and 1758-second radio metadata passed.
- Production health, page, MP3 HEAD, bundle hash and public WebSocket clock sync passed.
- Public browser rendered login and switched to playing music after clicking the control.
- Bundle: /assets/index-DzSaLyUy.js; SHA256 edb141e9148cd35966bd56f8491e305d83039ee7baa3663a32353459829ffe90.
- DB quick_check ok; 15 players and 3 wishes retained. Existing persistent volume,
  localhost port 3000, hth-net, proxy setting and resource/security limits retained.
- Rollback container hth-pre-music-261107-0148 stopped and preserved; image tagged
  hth:pre-music-261107-0148. Cutover backup: data volume backups/cutover-music-261107-0148/.
- Candidate container and test volume removed. No commit or push performed.

Open: no deployment blockers.
