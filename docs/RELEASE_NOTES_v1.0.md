# Chess Unleashed v1.0 Release Candidate Notes

Status: release candidate / beta-ready

Chess Unleashed v1.0 is a modular chess and custom-game platform in active beta development. This release candidate is intended for tester distribution through a packaged Windows portable executable.

## Major Included Systems

- Standard Chess gameplay.
- Play vs Bot with built-in bots and registered browser-worker UCI engines.
- Default Stockfish worker entry when bundled files are present.
- Custom Game / Rule Builder foundation with approved local custom games.
- Guided Piece Set workflow for built-in SVG sets and custom piece images.
- Theme/layer/frame/background customization.
- Package Manager with Load Package, Save Package, and Extract Package.
- Real-file `.zip` package assets under `assets/`, not giant media JSON.
- Durable imported asset storage in Electron through app-managed user data.
- Runtime Game Snapshot save/resume foundation, separate from packages.
- Event Builder with Simple / Advanced / System layers.
- Event Log and Troubleshooter as separate tools.
- Sound Editor with Sound Rules and Sound Library.
- Audio Controller with playlists/background music and waveform/progress UI.
- Animation Settings with movement scope controls.
- Animation Builder with reusable named animations.
- Event-triggered Sound Rules and Animation Rules.
- Multiplayer server-source and compliance foundation.
- Profile identity foundation.
- Electron splash screen with real loading/status UI.
- About / Support page with donation link placeholder.

## Recent Release-Candidate Fixes (Latest)

- Package Manager Load Package and Extract Package now work with visible status/error handling.
- Duplicate Package Manager title warning was removed.
- ExperiencePackage no longer includes live game state by default.
- Package saving/loading/extracting uses real-file zip asset handling.
- Piece Set Save uses the package zip pipeline.
- Audio upload validation rejects invalid files such as `.docx`.
- Piece Set and Layer draft edits merge without overwriting each other.
- Event Builder opens as a readable center-panel tool with close behavior.
- Welcome sidebar container color controls were added.
- Frame sizing/lock modes were added for more stable board attachment.
- Local/player movement animation path was fixed.
- Bot/opponent response waits until player movement animation finishes.
- Check/in-check sound rules can pause/resume background music correctly.
- Electron packaged startup splash screen was added.
- Stockfish worker path fixed for packaged Electron: no longer uses absolute /engines/ path that fails under file:// protocol; resolves relative to app dist folder instead.
- Applied package categories (visuals, pieces, sounds, events, animations, bots, rulesets) now show "Package applied and saved." confirmation. Persistence through SettingsContext and AudioContext localStorage is verified correct.
- Builtin bot configs (including Stockfish path) are synced from current defaults on load, so path migrations apply to existing installations.
- LAN multiplayer server hostname fallback fixed for packaged Electron (window.location.hostname is empty under file:// protocol; now defaults to localhost).
- Package settings applied via the Environment > Packages path now correctly persist all categories (sound library, sound rules, events, animations, bots, rulesets, etc.). This was a legacy path that was missing ~10 categories.
- AI Package Builder added under Tools > AI Package Builder: paste AI-generated JSON, validate, preview categories/warnings, apply selected categories or save as draft .json file.

## Known Limitations

- Custom rules/custom game system still needs deeper user testing.
- Deeper tactical events such as pin, trapped piece, and no-safe-move are future work.
- Official server, accounts, cloud profiles, and rankings are future work.
- Multiplayer may need broader network and packaged-app testing.
- Custom multiplayer games are experimental/not complete.
- Custom-game bots are not complete.
- Browser/dev durable asset persistence may be session-only.
- Full package QA with very large GIF/MP3/background packages still needs manual verification.

## Packaging Instructions

Run from the project root:

```powershell
npm run build
npm run dist:portable
```

Then upload the portable executable through GitHub Releases.

Do not commit:

- `dist/`
- `release/`
- `node_modules/`
- large `.exe` files
- Stockfish Windows `.exe` binaries

Stockfish browser-worker path:

`/engines/stockfish/stockfish-18-lite-single.js`

## Tester Notes

Please report:

- crashes or blank startup screens
- Package Manager Load/Save/Extract failures
- missing imported GIF/PNG/MP3/WAV assets after restart
- Stockfish test/play failures
- Custom Game or Rule Builder issues
- Event -> Sound issues
- Event -> Animation issues
- audio waveform or upload validation issues
- multiplayer/server connection issues

Recommended tester focus:

- Package Manager with media-heavy themes.
- Stockfish bot setup and live play.
- Custom Game / Rule Builder with Checkers.
- Event/Sound/Animation workflow.
- Electron packaged app startup and splash behavior.
