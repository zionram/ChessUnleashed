# Chess Unleashed: Human-Readable Project Guide

**Current status:** Beta-ready foundation with several experimental systems  
**Audience:** beta testers, collaborators, developers, and future AI assistants who need a human-level explanation of the project.

---

## Table of Contents

1. [What Chess Unleashed Is](#1-what-chess-unleashed-is)
2. [The Current Beta in Plain English](#2-the-current-beta-in-plain-english)
3. [How to Install and Run It](#3-how-to-install-and-run-it)
4. [Main Menu Overview](#4-main-menu-overview)
5. [Playing Games](#5-playing-games)
6. [Changing the Look of the Game](#6-changing-the-look-of-the-game)
7. [Piece Sets and Custom Images](#7-piece-sets-and-custom-images)
8. [Packages: Save, Load, and Extract Sets](#8-packages-save-load-and-extract-sets)
9. [Sounds, Music, and Audio Controls](#9-sounds-music-and-audio-controls)
10. [Events, Sounds, and Animations](#10-events-sounds-and-animations)
11. [Bots and Stockfish](#11-bots-and-stockfish)
12. [Custom Games and Rule Builder](#12-custom-games-and-rule-builder)
13. [Multiplayer and Server Features](#13-multiplayer-and-server-features)
14. [Profiles and Identity](#14-profiles-and-identity)
15. [Save/Resume vs Packages](#15-saveresume-vs-packages)
16. [What Is Stable, Experimental, and Planned](#16-what-is-stable-experimental-and-planned)
17. [Beta Testing Checklist](#17-beta-testing-checklist)
18. [For Future Developers and AI Assistants](#18-for-future-developers-and-ai-assistants)
19. [Glossary](#19-glossary)

---

## 1. What Chess Unleashed Is

Chess Unleashed is a modular chess and custom-game platform. It starts with Standard Chess, but it is being built to support much more: custom pieces, custom visuals, custom sounds, named animations, custom event triggers, rule-builder tools, bots, multiplayer foundations, and shareable experience packages.

The core idea is not just “play chess.” The core idea is:

> Build, customize, package, share, and play chess-like experiences.

That means a player can use normal chess, but a creator can also build a themed set, add sounds, create events, attach animations, test custom rules, and eventually share the whole thing as a package.

Chess Unleashed should be understood as an existing working application, not a greenfield prototype. New development should build on the current systems instead of rebuilding them.

---

## 2. The Current Beta in Plain English

The current beta is useful for testing the main app, Standard Chess, bots, custom pieces, package sharing, sounds, events, and early custom game tools.

### What works now

- Standard Chess gameplay.
- Piece movement animation for Standard Chess.
- Stockfish browser-worker bot support.
- Built-in and registered bot management.
- Custom visual themes and piece sets.
- Custom image upload for pieces and backgrounds.
- Package Manager with Load Package, Save Package, and Extract Package.
- Packages save real media files in a zip, not giant text blobs.
- Imported package media persists in the Electron desktop app.
- Sound Editor for event-triggered sounds.
- Audio Controller with waveform/progress bar.
- Event Builder for simple custom events and some tactical events.
- Animation Builder for named reusable animations.
- Event-triggered sound and animation rules.
- Custom Game/Rule Builder MVP, including a Checkers-style template and local runtime foundation.
- Electron Windows packaging for beta distribution.

### What is still experimental or incomplete

- Advanced tactical event detection such as pins, traps, and no-safe-move logic.
- Full custom multiplayer game support.
- Official online server/accounts/rankings.
- Full cloud save.
- Final polished onboarding.
- Custom Game animation support may be limited.
- Browser/dev-mode durable asset handling may be session-only compared with Electron.

---

## 3. How to Install and Run It

There are two types of users: normal beta testers and developers.

### For normal beta testers

Beta testers should use the packaged Windows app.

The easiest distribution method is:

1. Go to the GitHub Releases page for the project.
2. Download the portable `.exe` or installer.
3. Put the portable `.exe` in its own folder.
4. Double-click it.
5. If Windows SmartScreen appears, choose **More info → Run anyway**.

Normal users should not need to run `npm`, `node`, or developer commands.

### For developers

Developers can clone the repository and run:

```powershell
npm install
npm run dev
```

For Electron testing:

```powershell
npm run build
npm run electron
```

For packaging:

```powershell
npm run dist:portable
npm run dist
```

Do not commit `node_modules/`, `dist/`, `release/`, portable `.exe` files, or large engine binaries.

---

## 4. Main Menu Overview

The current top-level menu order is:

1. **Let’s Play**
2. **Environment**
3. **Tools**
4. **Advanced**

### Let’s Play

This is where users start games: Standard Chess, Play vs Bot, Custom Game, and Multiplayer flows.

### Environment

This is where users change the appearance and audio environment:

- Look
- Pieces
- Board
- Squares
- Paths
- Layers
- Themes
- Animation
- Platform UI
- Sound / Audio Settings
- Load / Save Sets or Package Manager entry points

### Tools

This contains working utility tools such as Bots, Chat, and other supporting panels.

### Advanced

Advanced is split into gameplay tools and system tools.

**Advanced → Gaming** includes tools like:

- Sound Editor
- Event Builder
- Animation Builder
- Event Log

**Advanced → System** includes tools like:

- Troubleshooter
- Validation
- Settings Builder
- Reset System

The Event Log and Troubleshooter are intentionally separate. Event Log is for gameplay/system actions. Troubleshooter is for errors and support/debug reports.

---

## 5. Playing Games

### Standard Chess

Standard Chess is the protected core game mode. It should remain stable and should not be changed casually. It uses the existing chess rules and game flow.

Standard Chess supports:

- legal move handling
- captures
- promotion behavior
- game end flow
- timers
- bot play
- movement animation
- profile-aware turn labels and game-end messages

### Play vs Bot

Play vs Bot lets the player choose a side and play against a bot/engine. Stockfish can be used through the browser-worker engine path.

### Custom Game

Custom Game is separate from Standard Chess. It uses approved custom rulesets created through the Rule Builder. The current custom game system supports a local runtime foundation with step/jump movement, captures, forced captures, multi-jump, promotion, basic win detection, reset, and end behavior.

Custom Game is powerful but still an MVP/foundation, not a full replacement for every future variant idea.

---

## 6. Changing the Look of the Game

Chess Unleashed has a template-driven visual system. Visuals should not be hardcoded. The template/draft/apply model is important:

- **Draft** means the user is editing or previewing changes.
- **Applied** means the change is actually active.
- **Live game state** should not be mixed into visual packages.

Users can customize things like:

- board visuals
- backgrounds
- layers
- squares
- paths
- pieces
- app/platform UI
- welcome panel color
- movement animation defaults

The app is designed to support rich, themed experiences without rebuilding the chess logic.

---

## 7. Piece Sets and Custom Images

The Piece Set workflow is meant to be understandable:

1. **Choose Source**
   - Use a built-in set.
   - Upload custom pieces.
2. **Arrange Draft**
   - Assign images to pieces.
   - Mix built-in fallback pieces and custom images when supported.
   - Manage variants/extra styles.
   - Preview the draft on the board.
3. **Finalize**
   - Apply the piece set.
   - Save the piece set if supported.
   - Keep the workflow clear about what is staged, drafted, and finalized.

The user should be able to upload a set of pieces or individual images. The app can try to auto-detect filenames like `wp`, `wq`, `black-king`, or similar names. Files that cannot be detected should remain available for manual assignment instead of being discarded.

Important wording:

- **Stage** means prepare it.
- **Apply to Draft** means update the preview/draft without ending the workflow.
- **Finalize** means the user is done arranging and ready to apply/save.
- **Reset Draft** means return the draft preview to the current applied state.

Custom images should not be hidden by built-in SVG pieces after they are applied. If a slot is not custom, built-in fallback can still be used.

---

## 8. Packages: Save, Load, and Extract Sets

Chess Unleashed uses an ExperiencePackage system for reusable configurations and assets. This is one of the most important systems in the app.

### What a package is

A package is a shareable `.zip` file. It can contain:

- `manifest.json`
- `experience.json`
- real media files under `assets/`
- visual settings
- piece images
- board/background assets
- sounds/music
- sound rules
- custom events
- animation definitions
- animation rules
- custom rulesets
- bot/profile/multiplayer settings where supported

A package is not a saved game in progress.

### Real files, not giant JSON

The package system should save media as real files inside the zip. For example:

```text
my-package.zip
  manifest.json
  experience.json
  assets/
    pieces/
      white-queen.gif
    boards/
      board-background.png
    audio/
      capture.mp3
```

The JSON should reference files like:

```json
"image": "package://assets/pieces/white-queen.gif"
```

It should not embed giant base64 media strings.

### Save Package workflow

The Package Manager should work like this:

1. Choose categories.
2. Click **Prepare Package**.
3. Watch status/progress:
   - gathering settings
   - collecting media
   - preparing zip
   - package ready
4. Click **Save Package** or **Save Zip**.

This prevents the screen from freezing just because the user opened the package screen.

### Load Package workflow

Import/Load should read lightweight package metadata first, then hydrate media only when applying. In the Electron app, imported media is stored durably in the user data folder and referenced with stable `local-asset://` links.

### Extract Package workflow

Extract Package is the opposite of loading into the app. It creates a human-readable folder layout, such as:

```text
Themes/
  Package Name/
    manifest.json
    experience.json
    pieces/
    boards/
    frames/
    backgrounds/
    audio/
      songs/
      effects/
    ui/
    events/
    animations/
    rules/
    bots/
    README_PACKAGE_CONTENTS.md
```

Extracting does not apply the package to the app. It is for inspection, editing, or manual sharing.

---

## 9. Sounds, Music, and Audio Controls

The Sound Editor is a rule-based system. It is not just a list of uploaded files.

The basic idea is:

> When this event happens, play this sound.

Sound Editor includes:

- Sound Rules
- Sound Library
- Add/Edit Sound Rule flow
- event/category filters
- playback behavior options
- Custom Events support

Playback behavior can include options like:

- allow overlapping sound effects
- play once until reset
- stop other sound effects before playing
- lower background music while playing
- pause background music while playing
- resume music after the sound ends

The Audio Controller is separate from Sound Editor. It handles playback, playlists, background music, and waveform/progress display.

---

## 10. Events, Sounds, and Animations

Chess Unleashed has an event-driven customization system.

### Event Builder

Event Builder creates reusable custom events. It uses layered complexity:

- **Simple** for guided event creation.
- **Advanced** for condition groups like ALL/ANY.
- **System** for raw definitions, IDs, diagnostics, and JSON preview.

Examples of events:

- piece moved
- piece captured
- promotion
- check
- checkmate
- panel opened
- piece attacked
- simple fork

Advanced tactical events like pins, trapped pieces, and no-safe-move logic are planned/future and should not pretend to be active until detection exists.

### Sound Rules

Sound Rules connect events to sounds.

Example:

> Custom Event: Queen Captured → Play `blunder.mp3`

### Animation Builder

Animation Builder creates named reusable animations. Built-in protected presets include:

- Snap / No Animation
- Slide
- Fast Slide
- Bounce
- Hop
- Shake
- Pulse
- Capture Pop
- Promotion Glow
- Board Flash

Users can create, duplicate, edit, save, and preview custom animations.

### Animation Rules

Animation Rules connect events to animations.

Example:

> Custom Event: Simple Fork → Play `royal-fork-shake`

Animations use transient overlays and should not mutate game state or block normal movement.

---

## 11. Bots and Stockfish

Chess Unleashed supports built-in bots and registered bots.

Stockfish is supported through a browser-worker UCI engine path:

```text
/engines/stockfish/stockfish-18-lite-single.js
```

Expected files:

```text
public/engines/stockfish/stockfish-18-lite-single.js
public/engines/stockfish/stockfish-18-lite-single.wasm
```

The Windows Stockfish `.exe` is not the same thing and should not be committed to GitHub. Browser-worker Stockfish is what the app uses for packaged play.

Tools → Bots can manage bot registration, testing, editing, and built-in bot display. Computer Opponent / Play vs Bot uses the selected bot/engine for gameplay.

---

## 12. Custom Games and Rule Builder

The Rule Builder is the foundation for custom chess-like games.

Current capabilities include:

- locked Standard Chess metadata
- custom ruleset drafts
- editable metadata
- piece definitions
- movement rules
- capture/jump metadata
- win conditions
- turn order
- Checkers template
- sandbox preview/test play
- approval flow
- Custom Game runtime for approved supported rulesets

Standard Chess must stay separate from custom rules. Users can build custom games, but they should not accidentally modify the protected Standard Chess core.

The Custom Game MVP supports a useful local runtime but is not yet every possible variant engine.

---

## 13. Multiplayer and Server Features

Chess Unleashed has multiplayer foundations including LAN/server-source support and compliance/asset matching concepts.

Current multiplayer-related concepts include:

- local/home server
- custom server source
- future official server
- server-source configuration
- host/guest asset compliance
- host asset request/response foundation
- LAN/WebSocket room model from earlier project work

Multiplayer should be treated as functional/foundation-level depending on the feature. Official public matchmaking/server accounts are planned, not fully complete.

---

## 14. Profiles and Identity

The profile system allows local player identity:

- display name
- avatar/profile image support
- guest-style identity
- profile-aware turn labels
- profile-aware game-end messages
- matchup display foundations

Official profiles, accounts, rankings, and unique database-backed identifiers are future plans. Current profile identity is local/guest-oriented.

---

## 15. Save/Resume vs Packages

This distinction is critical.

### ExperiencePackage

ExperiencePackage is for reusable setup:

- visuals
- pieces
- sounds
- events
- animations
- custom rulesets
- package categories
- reusable configuration

It is for sharing and applying experiences.

### Game Snapshot

Game Snapshot is for a game in progress:

- board position
- pieces/state
- turn
- move history
- result
- timers if supported
- custom game runtime state if supported

These systems must not be mixed.

A theme/package should not secretly overwrite someone’s active game in progress. A resume snapshot should not be treated like a shareable theme package.

---

## 16. What Is Stable, Experimental, and Planned

### Stable/current foundations

- Standard Chess core.
- Electron packaged app loading.
- Stockfish browser-worker support.
- Template-driven visuals.
- Settings ownership model.
- ExperiencePackage zip format.
- Durable imported asset storage in Electron.
- Package Manager Save/Load/Extract.
- Sound Rules and Audio Controller.
- Event Builder foundation.
- Animation Builder foundation.
- Standard Chess movement animation.

### Experimental/foundation

- Custom Game runtime.
- Multiplayer/compliance/asset syncing.
- Advanced event-action workflows.
- Animation event overlays.
- Browser/dev package asset persistence.
- Rule Builder beyond supported movement/win conditions.

### Planned/future

- official server
- official profiles/accounts/ranking
- cloud save
- deeper tactical event detection
- full keyframe/timeline animation scripting
- custom multiplayer games
- custom game bot support
- final onboarding and public beta polish

---

## 17. Beta Testing Checklist

Before sending a build to testers, run these checks:

### Packaged app

- Build the app.
- Create portable/installer build.
- Launch packaged app.
- Confirm the real UI opens, not a white screen.

### Standard Chess

- Start a normal game.
- Move pieces.
- Capture a piece.
- Test promotion if practical.
- Test movement animation.
- Disable animation and confirm snap behavior still works.

### Stockfish

- Confirm Stockfish appears as a bot.
- Test the bot.
- Start Play vs Bot.
- Confirm Stockfish makes a live move.

### Piece Sets

- Upload custom piece images.
- Confirm filename detection works when possible.
- Confirm unrecognized images remain assignable.
- Apply to draft.
- Finalize/apply.
- Confirm board preview/game uses expected pieces.

### Packages

- Save a package with GIF pieces, background image, and MP3/WAV audio.
- Open the zip and confirm real files exist under assets.
- Extract the package and inspect the human-readable folder layout.
- Import the package.
- Restart the app and confirm imported media still works.

### Events, sound, and animation

- Create/test a simple event.
- Attach a sound.
- Attach an animation.
- Trigger the event in gameplay.
- Confirm the sound and animation fire.

### Troubleshooting

- Check Event Log for gameplay/system actions.
- Check Troubleshooter for errors.
- Make sure errors do not crash the app.

---

## 18. For Future Developers and AI Assistants

Chess Unleashed must be treated as existing functioning software. Do not rebuild major systems unless explicitly asked.

Rules for future work:

- Make minimal, scoped, incremental changes.
- Do not create duplicate state.
- Do not create duplicate systems.
- Do not refactor broadly unless requested.
- Do not reuse prompt IDs for different directives.
- Do not add duplicate panel titles.
- Use center-panel workflows for complex tools.
- Avoid browser/window prompts when the game should show an in-app modal/panel.
- Build must pass after code changes.
- If uncertain, mark “needs verification” instead of guessing.

Ownership boundaries:

- `SettingsContext` owns persistent values.
- `SettingsRegistry` owns metadata only.
- `SettingsTemplateRegistry` owns layout/navigation metadata only.
- `ConfigValidation` owns validation only.
- Template system owns game visuals only.
- `ExperiencePackage` owns reusable packages/config/assets/rules/events/sounds.
- Game Snapshot owns live game-in-progress state.
- Event Log records gameplay/system actions.
- Troubleshooter records errors/debug reports.
- Sound Editor manages event-to-sound rules.
- Event Builder manages custom events.
- Animation Builder manages named animations.
- Sound Rules connect events to sounds.
- Animation Rules connect events to animations.

If another AI is working on the project, it should read the `docs/` folder first, especially:

- `00_PROJECT_OVERVIEW.md`
- `01_ARCHITECTURE_RULES.md`
- `15_DO_NOT_REBUILD.md`
- `17_FILE_RESPONSIBILITY_MAP.md`
- `18_AI_HANDOFF_PROTOCOL.md`
- `QA_CHECKLIST.md`

---

## 19. Glossary

**Applied**  
The current active configuration.

**Draft**  
A staged or preview configuration that has not been finalized.

**ExperiencePackage**  
A reusable zip package containing settings, assets, rules, events, sounds, animations, and other shareable configuration.

**Game Snapshot**  
A saved in-progress game state. It is separate from ExperiencePackage.

**Hydration**  
The import step that turns package asset references into usable in-app media. In Electron, this should use durable local asset storage.

**Local asset**  
An imported media file stored by the app and referenced with a stable `local-asset://` URL.

**Package Manager**  
The Load Package / Save Package / Extract Package workflow.

**Sound Rule**  
A rule that plays audio when an event fires.

**Animation Rule**  
A rule that plays a named animation when an event fires.

**Event Builder**  
The tool used to create named custom events.

**Animation Builder**  
The tool used to create named reusable animations.

**Rule Builder**  
The tool used to create custom game/ruleset definitions.

**Troubleshooter**  
The system for error/debug logs, separate from Event Log.

**Event Log**  
The system for gameplay/system action history, separate from Troubleshooter.

---

## Final Note

Chess Unleashed is not just a chessboard. It is becoming a creator platform for chess-like experiences. The safest development path is to keep existing systems intact, improve the user workflows step by step, and document every major system clearly enough that future developers and AI assistants do not accidentally rebuild what already works.
