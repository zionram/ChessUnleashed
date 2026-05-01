# QA Checklist

Status: Manual verification checklist

## Packaged App Smoke Test

- Run `npm run build`.
- Run `npm run dist:portable` or `npm run dist`.
- Launch packaged app.
- Confirm real game UI opens, not a blank screen.
- Confirm no missing core menu groups.

## Standard Chess Test

- Start Standard Chess.
- Move pieces normally.
- Capture a piece.
- Promote a pawn if practical.
- Confirm movement animation works.
- Disable animation and confirm pieces move without animation.

## Stockfish Bot Test

- Confirm Stockfish appears in Tools → Bots and Computer Opponent engine selector.
- Test bot with `/engines/stockfish/stockfish-18-lite-single.js`.
- Start Play vs Bot.
- Confirm Stockfish makes a live move.
- Confirm invalid worker path fails with friendly error.

## Custom Game Test

- Create/load Checkers template in Rule Builder.
- Validate and approve if needed.
- Start from Let’s Play → Custom Game.
- Move supported pieces.
- Test capture, forced capture, multi-jump, promotion, reset, and win detection where practical.
- Confirm Standard Chess still works afterward.

## Piece Set Custom Image Test

- Open Environment → Look → Pieces.
- Upload multiple piece images.
- Confirm recognized filenames auto-stage.
- Confirm unrecognized uploads remain available.
- Apply to Draft and confirm Arrange preview remains visible.
- Finalize/apply piece set.
- Confirm board preview/game uses expected pieces.

## Save Package Test With Media

- Include GIF pieces, MP3/WAV audio, and background/board images.
- Open Package Manager.
- Choose categories.
- Click Prepare Package.
- Confirm progress/status appears.
- Confirm Package Ready appears.
- Save Package.
- Inspect zip contains real files under `assets/`, not giant media JSON.

## Extract Package Test

- Use Extract Package.
- Choose package zip.
- Confirm preview shows package name/categories/asset counts.
- Prepare extracted output.
- Confirm extracted zip/folder includes `Themes/[package-name]/`, `manifest.json`, `experience.json`, media folders, and `README_PACKAGE_CONTENTS.md`.
- Confirm extracting does not apply package settings.

## Import Package Test

- Load package zip.
- Confirm preview opens quickly.
- Apply selected categories only.
- Confirm missing categories are not errors.
- Confirm unsupported/missing assets show friendly warnings.

## Restart Imported Assets Test

- Import package with GIF/PNG/MP3/WAV assets in Electron.
- Restart app.
- Confirm imported piece images still display.
- Confirm imported audio still plays.
- Confirm no giant base64 media blobs are stored in settings.

## Event To Sound Test

- Create or select active custom event.
- Attach sound.
- Trigger event in supported gameplay.
- Confirm sound plays.
- Confirm Event Log entry is readable.

## Event To Animation Test

- Create or select active custom event.
- Attach animation.
- Trigger event in Standard Chess.
- Confirm animation overlay/playback appears.
- Confirm normal piece movement animation still works.
- Confirm future-only events do not pretend to fire.

## Audio Waveform Test

- Add music/audio files to playlist.
- Play/pause/stop.
- Confirm progress updates.
- Seek in wave/progress bar.
- Confirm unsupported/MIDI files degrade safely.

## Multiplayer / Server Test

- Confirm local/home server source works if available.
- Confirm custom server URL can be set/tested.
- Confirm host/join flow still works.
- Confirm host compliance messages appear when required.
- Confirm applying host assets respects force/override policy.

