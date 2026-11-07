# Local mic playback

Cause: normal voice intentionally sends audio only to other peers; user wanted to hear their own microphone for testing.

Added **Thử mic** beside the voice toggle. It disables network voice, records three seconds locally, stops capture and plays the recording. Cancellation, playback completion, page hide and disconnect release capture and discard its temporary Blob URL. No upload or persisted audio.

PASS: build, syntax and diff checks; existing Chromium desktop/mobile voice smoke check plus local recording/playback/cancel assertions. Synthetic audio used for automation; physical microphone/speaker sound was not independently verified.

Live localhost page shows the new **Thử mic** control and completed local playback status. No deployment, dependency change or server logic change.
