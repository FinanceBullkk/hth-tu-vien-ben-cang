# Login menu music

Reviewed scope: use the supplied Where Winds Meet MP3 on the welcome screen only.
Reuse native HTML audio, existing volume preference and button styles. No dependencies.

- [x] Copy the supplied file into same-origin public music assets.
- [x] Loop login music; retry blocked autoplay on interaction; provide an accessible pause/play button.
- [x] Keep login music through admission errors; stop on successful entry before starting game music.
- [x] Check lifecycle behavior, build, and review the scoped diff inline.

Validation: `npm run build` passed. Source and built MP3 SHA-256 match.
Native browser check at `tools/check-login-music.html` passed playback, loop, pause,
keyboard, resume and cleanup. Real welcome screen started music after input focus;
successful admission removed login controls and started Blissful Retreat.

No deployment requested.

## Track replacement

Reviewed scope: replace login source with the supplied Character Creation Song.
Keep looping, admission cleanup and the 50% volume reduction unchanged.

- [x] Copy the new MP3, change its URL and update asset documentation.
- [x] Build, verify built asset hash against the supplied file, review scoped change.

Validation: local build passed; supplied and built MP3 SHA-256 match; volume multiplier remains 0.5.

## Game background music

Reviewed scope: use Character Creation Song for login and shared in-game radio.
Preserve room clock and controls; apply the same 0.5 volume gain to in-game playback.
Measured file duration: 1757.959546 seconds; rounded server fallback: 1758 seconds.

- [x] Update in-game source, title, duration fallback, volume gain and documentation.
- [x] Build, run server regression checks and review the scoped changes inline.

Validation: build passed; server regression suite passed 25/25 with Node.js 24.14.1.
The PATH-first Volta Node.js 20 invocation cancelled before startup; direct supported runtime passed.

## Ambient noise

User identifies continuous wind/water hiss. Four filtered white-noise loops mix
directly into the effects master, independent of the music slider.
Reviewed fix: route these loops through a shared 0.1 gain before the master;
retain spatial changes, mute behavior and full event-effect levels.

- [x] Attenuate continuous ambience only; verify actual offline audio output and build.

Validation: browser OfflineAudioContext check passed, measured RMS is 0.100 of the
previous mix; bell remains audible with ambience gain zero. Final build and scoped
whitespace checks passed. No live deployment performed.
