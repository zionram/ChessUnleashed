# Sound and Audio System

Status: Current

Chess Unleashed separates sound files, sound rules, background music, and audio playback controls.

## Sound Editor

Sound Editor is rules-first. It manages what event plays what sound.

Current concepts:

- Sound Library: uploaded sound files.
- Sound Rules: event-to-sound mappings.
- Built-in events and Custom Events.
- Per-rule playback behavior.
- Preview/Stop controls inside the Add/Edit Sound Rule overlay.

Sound files should be referenced by IDs/paths, not duplicated as file blobs in rule data.

## Playback Behavior

Sound Rules support behavior options such as:

- allow overlap with other effects
- play only once until reset
- stop other sound effects before playing
- lower background music while playing
- pause background music while playing
- resume music after sound ends
- loop while active / stop when event condition ends for supported stateful events

Check/in-check is currently the supported stateful case. A check sound can pause background music while check is active, stop when the check condition ends, and resume music if configured.

## Audio Controller

The Audio Controller handles background music/playlists:

- current track
- play/pause/stop
- previous/next
- repeat modes
- shuffle if available
- volume
- recent sound-rule feedback

## WaveProgressBar

`WaveProgressBar` is shared by Audio Controller and Audio settings. It provides a functional progress/wave bar with current time, duration, progress, and seek behavior where supported. Unsupported media such as MIDI should degrade safely.

## Upload Validation

Audio upload should reject unsupported files, such as `.docx`, with a friendly message. Supported audio types include common browser-playable audio formats and intentionally supported MIDI formats where implemented.

## Related Files

- `src/views/SoundEditorView.tsx`
- `src/context/AudioContext.tsx`
- `src/views/AudioView.tsx`
- `src/components/layout/AudioController.tsx`
- `src/components/audio/WaveProgressBar.tsx`
- `src/events/EventTriggerSystem.ts`
