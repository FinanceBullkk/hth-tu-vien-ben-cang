# Proximity voice implementation — 2026-11-07

PASS locally. Not deployed or committed. Existing unrelated edits preserved.

## Delivered

- Native audio-only WebRTC, existing Socket.IO for authenticated signaling. No new dependency.
- Server-controlled nearby peer graph, six-peer ceiling, per-pair tokens, signaling validation/rate bounds, immediate cleanup on kick/disconnect/session replacement.
- Explicit voice opt-in, default push-to-talk V/touch, open-mic mode, deafen, separate volume, remote speech/name indicator. Full volume within 3 m; silent from 18 m; connection closes beyond 22 m.
- Capture released on disable, hidden page, disconnect or late permission cancellation. Focus/text/modal/rhythm/meditation conditions mute transmission.
- Optional configured STUN/TURN; HMAC temporary TURN credentials. Setup and privacy/acceptance limits in `docs/proximity-voice.md`.

## Validation

- PASS: Node 24.14.1, `npm run build`.
- PASS: full native test suite, 54/54, no skipped/cancelled tests; log `voice-test-output.log`.
- PASS: `node test/voice-browser-check.mjs` using bundled Playwright. Two isolated Chromium instances, one mobile viewport; actual WebRTC negotiation, received RTP bytes and speech meter from synthetic audio. Default mute, PTT down/up, open mic/text-field mute, deafen, touch cancellation, distance teardown, capture release, denied permission and delayed permission cancellation verified. No browser exceptions. Screenshot `voice-mobile.png`.
- PASS: inline review and `git diff --check` (only existing CRLF normalization warnings).

## Existing blockers corrected

Server called nonexistent `Fishing.start()` / `stop()` despite fishing already being swept by Room; removed those calls. Two integration assertions were stale relative to existing work: pier deliberately exceeds original yard bounds, and rhythm now uses per-note `idx` / `note` rather than a whole `notes` array. Updated assertions to cover the current contracts; targeted checks then full suite passed.

Initial shell selected Node 20; used installed Node 24, matching `.nvmrc`, for final validation. One overlapping test run hit port 3911; stopped the duplicate run and reran the complete suite serially with a clean pass.

## OPEN

Physical microphone/speaker quality, Safari/iOS, permission UI on real devices and TURN connectivity between distinct internet networks. No STUN/TURN service configured or deployed. Mesh volume/distance is game behavior, not adversarial media isolation; SFU needed for that or larger voice groups. No unresolved product question blocking this local implementation.
