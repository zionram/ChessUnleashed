# QA Checklist

Status: Release-candidate checklist

Run this before publishing a new beta executable.

## Packaged App Smoke Test

- Build with `npm run build`.
- Package with `npm run dist:portable`.
- Launch the portable executable.
- Confirm splash screen appears quickly with real loading/status UI.
- Confirm the main app opens to the real UI, not a blank screen.
- Double-click repeatedly and confirm duplicate instances are not confusing if single-instance lock is active.

## Standard Chess

- Start a Standard Chess local game.
- Make legal moves.
- Test captures.
- Test promotion if feasible.
- Confirm local/player movement animates when enabled and in scope.
- Confirm bot/opponent movement animates.
- Confirm bot response waits until player animation finishes when animation is active.
- Confirm Snap/no animation avoids unnecessary delay.

## Stockfish / Bots

- Open Tools -> Bots.
- Confirm Training Bot and Random Bot exist.
- Confirm Stockfish default worker appears when bundled files are present.
- Test Stockfish worker path.
- Start Play vs Bot and confirm Stockfish can move.
- Confirm invalid worker path gives friendly failure.

## Custom Game / Rule Builder

- Open Rule Builder.
- Create or load Checkers template.
- Validate and approve if needed.
- Test Play sandbox.
- Start approved sandbox-playable Custom Game from Let's Play.
- Confirm movement, captures, promotion, forced capture, multi-jump, win detection where supported.
- Mark any custom-game issue as beta feedback.

## Piece Set / Theme Editor

- Choose a built-in set and stage it.
- Upload multiple custom piece images.
- Confirm recognized filenames auto-stage.
- Confirm unrecognized uploads remain available for manual assignment.
- Apply to Draft without losing preview.
- Reset Draft and confirm board preview returns to applied state.
- Apply Piece Set.
- Save Piece Set and confirm output uses zip package pipeline, not blob JSON.
- Switch to Layer Editor during a draft and confirm piece/layer changes do not overwrite each other.

## Package Manager

- Open Package Manager and confirm no duplicate panel title warning.
- Save Package with categories including pieces, background/GIF if available, MP3/WAV audio if available, events, sounds, and animations.
- Confirm output is a `.zip`.
- Inspect zip if feasible:
  - `manifest.json`
  - `experience.json`
  - real files under `assets/`
  - no giant `data:image` or `data:audio` JSON blobs for new media exports
- Load Package and confirm visible status: reading, parsing, preview ready, applying.
- Apply selected categories.
- Extract Package and confirm readable output folders plus README.
- Restart app and confirm imported Electron media still works through durable storage.

## Event -> Sound

- Create a simple custom event.
- Attach a sound rule.
- Trigger/test the event.
- Confirm Event Log records custom event and sound feedback.
- Create a check/in-check rule with pause music and resume enabled.
- Confirm background music pauses while check is active and resumes when check ends.

## Event -> Animation

- Create or select an active event.
- Attach an animation.
- Select target behavior.
- Trigger/test the event.
- Confirm overlay animation fires without blocking moves.
- Confirm normal movement animation still works.

## Audio

- Add supported audio files: MP3/WAV/OGG/M4A/MIDI where supported.
- Confirm invalid file such as `.docx` is rejected with friendly error.
- Confirm Audio Controller play/pause/stop/next/previous.
- Confirm WaveProgressBar displays progress and seek behavior where supported.
- Confirm unsupported waveform states degrade safely.

## UI / Appearance

- Change welcome panel/sidebar container color.
- Set welcome frame/border to accent, custom, transparent/none, and reset default.
- Test frame sizing/lock modes while resizing the window.
- Confirm Event Builder center panel has readable background and working close button.

## Multiplayer

- Start local server if applicable.
- Host and join locally if feasible.
- Test host compliance/asset matching messages.
- Mark multiplayer issues as Needs verification if network environment blocks testing.
