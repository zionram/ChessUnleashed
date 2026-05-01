# Sound And Audio System

Status: Current

Sound and audio are split into sound effects/rules and background music/audio control.

## Sound Editor

`src/views/SoundEditorView.tsx` is rules-first. It manages event-to-sound behavior rather than a raw file list-first workflow.

Current concepts:

- Sound Rules
- Sound Library
- built-in event triggers
- custom event triggers from Event Builder
- category filtering
- rule add/edit/delete
- sound preview in rule editor
- playback behavior settings

Sound rules reference sound file IDs/names and should not duplicate binary file data.

## Playback Behavior

Sound Rules can configure:

- allow overlap with other sound effects
- play only once until reset
- stop other sound effects before playing
- lower background music while playing
- pause background music while playing
- resume music after sound ends

## Audio Controller

Current audio controller functionality includes:

- current background track
- playlist support
- play/pause/stop
- next/previous
- repeat/loop/play-through modes
- volume
- waveform/progress bar
- recent sound-rule feedback

`WaveProgressBar` is used by both Audio Controller and Audio settings.

## MIDI And Unsupported Files

MIDI files may be listed safely, but browser playback/waveform support may be limited. Unsupported waveform states should degrade with friendly labels instead of crashing.

## Related Files

- `src/views/SoundEditorView.tsx`
- `src/views/AudioView.tsx`
- `src/context/AudioContext.tsx`
- `src/components/layout/AudioController.tsx`
- `src/components/audio/WaveProgressBar.tsx`

