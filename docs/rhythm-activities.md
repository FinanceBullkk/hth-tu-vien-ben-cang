# Rhythm activities

Both activities use an Audition-style arrow sequence followed by a Space judgement.
Touch controls provide the same four arrows and judgement button. No hold/release
interaction is required.
The server keeps a persistent radio start time and sends it at join. Each client
plays the same-origin MP3 at the matching offset (see `docs/asset-pipeline.md`).
If the browser blocks autoplay, a click starts playback. Closing the panel does not
stop the music. A short local percussion pulse marks the 96 BPM judgement window
independently of the music.

- Tempo: 96 BPM; four beats per round. Enter 3–5 arrows, then judge on beat four.
- Bell: 16 rounds, 40 seconds after the count-in. Successful rounds ring the bell;
  simultaneous successful players add depth to the shared sound.
- Meditation: 24 rounds, 60 seconds after the count-in. Successful rounds open
  lotus petals and pulse the occupied mat. Other seated players share light links.
- Perfect: within 110 ms of the target. Good: within 240 ms. Otherwise Miss.
- Points: 100 per Perfect, 60 per Good. Consecutive successes build the combo.
  The personal book retains a normalized 0–100 accuracy score in the existing DB.

## Server contract

`rhythm:start` accepts `{ kind: 'bell' | 'meditate' }`. Bell requires proximity;
meditation requires an occupied mat belonging to that player. Starts align to the
shared musical clock, with a count-in, and return a player-bound session ID.

`rhythm:hit` accepts `{ id, round, notes }`. The server validates the session,
position, round window, arrow values and expected sequence, then grades receipt
time. Client scores and client timestamps are ignored. Repeated hits are idempotent.
Network latency therefore affects timing; the first version targets localhost/LAN.

`rhythm:finish` accepts `{ id }`. Early completion is rejected. Missing rounds count
as Miss. Completion writes once, even after acknowledgement retries. Exiting or
disconnecting cancels the active session. Existing saved data and admin phrases
remain compatible. No leaderboard is introduced.

## Verification

Run `npm test` on Node 24 and build with `npm run build`.
Tests cover timing boundaries, forged scores, duplicate hits/saves, invalid input,
proximity, mat ownership, shared effects and the existing multiplayer flows.
