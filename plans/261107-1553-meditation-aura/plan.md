# Meditation aura progression

Approved direction: preserve selected aura; meditation unlocks visual tiers.

Reviewed implementation plan:
- Derive cultivation from saved server-scored meditation results; no new migration.
- Share tier only in public snapshots/events. Keep exact points in private book/results.
- Add eight themed particle paths with three unlocked layers; retain existing aura.
- Show progress in book and meditation results. Test thresholds, rewards and visuals.
- Run tests/build, inspect diff, commit, push, PR and merge after green CI.

Global cultivation persists when changing cosmetic aura. No passive/offline reward.

Implemented: server progress, snapshot/event sync, eight paths, private UI and tests.
Initial validation: 89/89 tests, Vite build and browser WebGL render passed.
Windows install: `npm ci --ignore-scripts`; packaged SQLite native addon verified.
Fixed existing admin sendFile failure when checkout lives beneath `.codex`.
Final validation: 90/90 tests and build passed after merging latest main.
Browser check: eight auras rendered, no shader errors, stable geometry across tiers.
Inline review complete; no unresolved questions. Git delivery follows CI gate.
