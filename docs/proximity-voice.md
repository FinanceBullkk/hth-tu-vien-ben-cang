# Proximity voice

Goose Goose Duck style nearby conversation. No meetings or voting mechanics.

## Controls

- HUD shows only a microphone icon. Click it to expand/collapse voice controls; clicking outside or pressing Escape closes them. A slash indicates muted capture, gold indicates voice joined, and green indicates transmission. Controls remain available by keyboard and on touch screens.
- Click **Bật voice**, then allow microphone access. Default mode is **Giữ để nói**: hold **V** or the touch button. Release to mute.
- To hear your own mic, click **Thử mic** even while voice is off. It disables voice, records three seconds in browser memory, releases capture, then plays that recording locally. **Hủy thử mic**, leaving the page, or disconnecting discards the recording. Nothing is uploaded; playback completion also discards it. Normal voice never echoes your own microphone.
- Choose **Mic mở** for continuous speech. **Tắt nghe** silences received voice and your microphone. Voice volume is separate from music/game effects and saved locally.
- Full volume within 3 m; fades to silence at 18 m. Existing links close beyond 22 m to avoid reconnect churn at the audible boundary. A speaking player's name glows green.
- Each participant has at most six nearby connections. In dense groups some neighbors will not be connected. Existing links take priority to avoid churn.
- Voice stays off until explicitly enabled each session. Clicking **Tắt voice**, changing tabs, leaving the page, losing the game connection, being kicked, or opening the same player in another tab releases microphone capture. Returning/reconnecting requires enabling voice again.
- Losing focus, entering a text field/modal, or playing rhythm/meditation mutes transmission. Open-mic mode resumes after these conditions clear. Deafen also mutes transmission.
- Voice panel stays visible during minigames so capture can always be stopped. Live voice is not recorded or stored; only the explicit local mic test temporarily records in browser memory.

## Network setup

Microphone requires HTTPS or `localhost`. LAN `http://192.168.x.x` works for the game but cannot request a mic. Use the HTTPS game URL for voice.

WebRTC carries audio; the existing Socket.IO server relays signaling only. Both participants must have passed the game's join-code admission and opted into voice. Server authorizes nearby pairs using current positions, strips unneeded fields, restricts SDP to audio, bounds messages/rates, and revokes each pair on disconnect or distance. New pairs receive new tokens, so stale signals cannot attach to a later session.

Default ICE list is empty: no external STUN/TURN provider is contacted. Local host candidates may connect on a shared reachable network. Cross-network voice usually needs STUN and a reachable TURN server for restrictive NAT/firewalls. Cloudflare Tunnel carries game HTTP/WebSocket traffic; it does **not** relay WebRTC audio.

Optional server environment variables:

| Variable | Meaning |
| --- | --- |
| `VOICE_STUN_URLS` | Comma-separated `stun:` / `stuns:` service URLs |
| `VOICE_TURN_URLS` | Comma-separated `turn:` / `turns:` URLs, including transport/port where needed |
| `VOICE_TURN_SECRET` | Shared secret matching coturn `use-auth-secret` / `static-auth-secret`; keep outside source control |

Authenticated voice participants receive HMAC temporary TURN credentials valid for 24 hours, never the shared secret. Toggle voice to renew credentials in sessions exceeding that period. Configure TURN quotas/expiry at the relay. Use your own service or a provider supporting this credential scheme. No infrastructure is provisioned by this change.

Peer-to-peer transport can reveal network addresses to participating peers. Distance attenuation/cleanup is game behavior, not protection against a modified client retaining an already established media path. Use an SFU with server-side media routing if adversarial isolation or larger voice groups become necessary.

## Verification

Run Node.js 24, matching `.nvmrc` and the installed native SQLite module:

```sh
npm run build
npm test
node test/voice-browser-check.mjs
```

Browser check uses an already installed Playwright package, without adding a production dependency. Set `PLAYWRIGHT_MODULE` to its `index.mjs` file URL if not resolvable from the project. It starts an isolated game server with temporary config/DB and two separate Chromium instances, including a mobile viewport. A synthetic audio source crosses real WebRTC connections. Checks include default silence, push-to-talk, received RTP bytes and speech indication, deafen, distance teardown, explicit disable, disconnect, and late permission cancellation. Screenshot is saved under `plans/reports/`.

This local check does not prove physical microphone/speaker quality, iOS/Safari operation, or connectivity between different internet networks. Validate those with two devices and configured TURN before treating public voice as ready.
