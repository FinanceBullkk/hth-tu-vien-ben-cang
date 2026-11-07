# Proximity voice

Status: complete locally. Inline implementation and review per repository instruction. Public/device acceptance remains open.

Reviewed scope: Goose Goose Duck style proximity voice, no meeting/voting mechanics.

- [x] Native WebRTC audio; Socket.IO signals only after admission and voice opt-in.
- [x] Server selects nearby pairs, limits each participant to six peers, revokes pairs on distance/disconnect/kick/session replacement.
- [x] Mic off by default; push-to-talk V or hold button, optional open mic, deafen and volume, nearby speaking indicators.
- [x] Stop capture on loss, hidden tab, explicit disable; silence during meditation/rhythm activities.
- [x] HTTPS/error guidance; optional operator-configured STUN and TURN with temporary credentials; no external service by default.
- [x] Tests for admission, signal validation, bounded peers, distance, cleanup and client capture lifecycle; build and existing suite.
- [x] Document setup and verification limits. No deployment or network configuration changes.

Review: reuse native browser APIs and existing audio context; no dependency needed. Mesh ceiling is six neighbors, not room-wide sixty-player voice. Different networks require working ICE infrastructure; Cloudflare HTTP Tunnel does not relay WebRTC media.

Validation: Node 24.14.1 build PASS; full suite 54/54 PASS; two isolated Chromium instances (desktop and mobile viewport) with synthetic audio over real WebRTC PASS. See [report](../reports/implementation-261107-0043-proximity-voice.md). Physical devices/Safari/TURN across networks OPEN.
