# Proximity voice

Goose Goose Duck style nearby conversation. No meetings or voting mechanics.

## Controls

- Entering starts voice and requests microphone permission, with capture muted. The microphone button toggles continuous speech; slash means muted, green means unmuted, and glow means transmitting. Names of nearby speakers appear beside the button and glow above their avatars.
- Click **⋯** to open settings; clicking outside or pressing Escape closes them. Choose **Giữ để nói** to hold **V** or the touch button after unmuting. Release to stop transmission.
- To hear your own mic, click **Thử mic** even while voice is off. It disables voice, records three seconds in browser memory, releases capture, then plays that recording locally. **Hủy thử mic**, leaving the page, or disconnecting discards the recording. Nothing is uploaded; playback completion also discards it. Normal voice never echoes your own microphone.
- Choose **Mic mở** for continuous speech. **Tắt nghe** silences received voice and your microphone. Voice volume is separate from music/game effects and saved locally.
- Full volume within 3 m; fades to silence at 18 m. Existing links close beyond 22 m to avoid reconnect churn at the audible boundary. A speaking player's name glows green.
- Each participant has at most six nearby connections. In dense groups some neighbors will not be connected. Existing links take priority to avoid churn.
- Voice connects on entry with muted capture. Clicking **Tắt voice**, changing tabs, leaving the page, losing the game connection, being kicked, or opening the same player in another tab releases microphone capture. Returning/reconnecting requires enabling voice again.
- Losing focus, entering a text field/modal, or playing rhythm/meditation mutes transmission. Open-mic mode resumes after these conditions clear. Deafen also mutes transmission.
- Voice panel stays visible during minigames so capture can always be stopped. Live voice is not recorded or stored; only the explicit local mic test temporarily records in browser memory.

## Network setup

Microphone requires HTTPS or `localhost`. LAN `http://192.168.x.x` works for the game but cannot request a mic. Use the HTTPS game URL for voice.

WebRTC carries audio; the existing Socket.IO server relays signaling only. Both participants must have joined the game and opted into voice. Server authorizes nearby pairs using current positions, strips unneeded fields, restricts SDP to audio, bounds messages/rates, and revokes each pair on disconnect or distance. New pairs receive new tokens, so stale signals cannot attach to a later session.

Default ICE list is empty: no external STUN/TURN provider is contacted. Local host candidates may connect on a shared reachable network. Cross-network voice usually needs STUN and a reachable TURN server for restrictive NAT/firewalls. Cloudflare Tunnel carries game HTTP/WebSocket traffic; it does **not** relay WebRTC audio.

Optional server environment variables:

| Variable | Meaning |
| --- | --- |
| `VOICE_STUN_URLS` | Comma-separated `stun:` / `stuns:` service URLs |
| `VOICE_TURN_URLS` | Comma-separated `turn:` / `turns:` URLs, including transport/port where needed |
| `VOICE_TURN_SECRET` | Shared secret matching coturn `use-auth-secret` / `static-auth-secret`; keep outside source control |
| `VOICE_CLOUDFLARE_KEY_ID` | Cloudflare Realtime TURN app token ID |
| `VOICE_CLOUDFLARE_API_TOKEN` | Matching TURN app API token; server only, never sent to clients |

Authenticated voice participants receive HMAC temporary TURN credentials valid for 24 hours, never the shared secret. Toggle voice to renew credentials in sessions exceeding that period. Configure TURN quotas/expiry at the relay. Use your own service or a provider supporting this credential scheme. No infrastructure is provisioned by this change.

When both Cloudflare variables are configured, Cloudflare replaces the custom
STUN/coturn list. The server requests 24-hour credentials over HTTPS, caches them
per player for 23 hours, and only then enables voice. Failed requests leave voice
off; disabling or disconnecting during a request cancels that join. Repeated join
attempts have a five-second cooldown. The API token stays on the server. Toggle
voice after 24 hours to renew credentials. Enable Cloudflare Realtime and create
a TURN app in its dashboard before configuring these variables.
The provider request has an eight-second deadline; the client waits twelve
seconds for the voice acknowledgement so a slow credential request can finish.

### Production deployment

Create a Docker environment file outside the repository on the production runner,
readable only by the operator and runner account. Include the two Cloudflare
variables, or `VOICE_STUN_URLS`, `VOICE_TURN_URLS`, and `VOICE_TURN_SECRET`, as
`NAME=value` lines. Never paste its
contents into logs or commit it. The TURN endpoint must be reachable from the
public internet; a LAN/Tailscale address or Cloudflare Tunnel URL is insufficient
for ordinary players outside that network.

Set the GitHub Actions repository variable `HTH_VOICE_ENV_FILE` to the absolute
path of that file. For a manually authorized local deployment, set the same
environment variable before running `scripts/deploy.mjs`. Both candidate and
production containers receive the file through Docker `--env-file`; a missing
file or invalid ICE configuration fails the candidate before production stops.
Without this variable, deployments still use the default empty ICE list. Keep
the repository variable configured for subsequent releases too.

After deployment, verify two devices on different networks (for example Wi-Fi
and mobile data), within 3 m in game, both with voice enabled and **Mic mở**.
Confirm sound in both directions. A local browser test alone cannot certify TURN
reachability, relay authentication, or the relay's UDP firewall/port range.

Peer-to-peer transport can reveal network addresses to participating peers. Distance attenuation/cleanup is game behavior, not protection against a modified client retaining an already established media path. Use an SFU with server-side media routing if adversarial isolation or larger voice groups become necessary.

## Verification

Run Node.js 24, matching `.nvmrc` and the installed native SQLite module:

```sh
npm run build
npm test
node test/voice-browser-check.mjs
```

To verify the Cloudflare relay instead of a local direct connection, load the
private environment file with Node's `--env-file` and set `VOICE_RELAY_ONLY=1`
before running the browser check. It forces relay candidates in both test
browsers and asserts the selected ICE paths are relayed before checking audio.
Never enable relay-only mode for ordinary unit tests or expose API tokens in logs.

Browser check uses an already installed Playwright package, without adding a production dependency. Set `PLAYWRIGHT_MODULE` to its `index.mjs` file URL if not resolvable from the project. It starts an isolated game server with temporary config/DB and two separate Chromium instances, including a mobile viewport. A synthetic audio source crosses real WebRTC connections. Checks include default silence, push-to-talk, received RTP bytes and speech indication, deafen, distance teardown, explicit disable, disconnect, and late permission cancellation. Screenshot is saved under `plans/reports/`.

This local check does not prove physical microphone/speaker quality, iOS/Safari operation, or connectivity between different internet networks. Validate those with two devices and configured TURN before treating public voice as ready.
