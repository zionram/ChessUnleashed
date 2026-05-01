# Chess Unleashed Project Overview

Status: Release candidate / beta-ready

Chess Unleashed is existing functioning software, not a greenfield prototype. It is a modular chess and custom-game platform with Standard Chess, visual/theme editing, custom rules, events, sound rules, animation rules, bot engines, multiplayer settings, reusable packages, runtime save/resume, and Electron desktop packaging.

The project rule is incremental work only: preserve working systems, make scoped changes, and do not rebuild major architecture unless explicitly requested.

## Current Major Systems

- Standard Chess gameplay: current live chess path using the existing chess runtime.
- Custom Game / Rule Builder: metadata builder, Checkers template, sandbox testing, approval, and local custom runtime. Needs deeper user testing.
- Piece Set / Theme Editor: guided Source -> Arrange -> Finalize workflow with built-in SVG sets and custom images.
- ExperiencePackage / Package Manager: Load Package, Save Package, and Extract Package using real `.zip` files and media under `assets/`.
- Durable imported asset storage: Electron persists imported package media under app-managed user data and resolves `local-asset://` references.
- Save/Resume: runtime Game Snapshot storage separate from ExperiencePackage.
- Event Builder: center-panel custom event builder with simple events, limited tactical events, test mode, Sound Rule attachment, and Animation Rule attachment.
- Event Log: gameplay/system action history.
- Troubleshooter: error/debug report history only.
- Sound Editor: event-to-sound rules plus Sound Library.
- Audio Controller: background music, playlists, wave/progress bar, and sound-rule feedback.
- Animation Settings: movement animation defaults, scope controls, and active-state feedback.
- Animation Builder: center-panel named animation definition workflow.
- Animation Rules: connect events to named animations.
- Bots: built-in bots, registered bots, default Stockfish browser-worker entry, and worker/URL UCI adapter support.
- Multiplayer: server-source settings, host compliance policy, and host asset matching foundation. Needs broader testing.
- Profile system: local player identity foundation.
- Electron packaging: splash screen, portable build flow, and beta distribution notes.

## Recent Release-Candidate Fixes

- Package Manager Load Package and Extract Package now provide visible status/error messages.
- Duplicate Package Manager title warning was fixed.
- ExperiencePackage exports exclude live game-in-progress state by default.
- Package save/load/extract paths use real-file zip asset handling instead of base64 media JSON.
- Electron startup splash screen uses real HTML/CSS loading UI.
- Local player movement animation now uses the same Standard Chess animation path as opponent/bot moves.
- Bot/opponent turn response waits for the player movement animation when animation is active.
- Check/in-check sound rules can pause background music while active and resume it when the condition ends.
- Event Builder runs as a readable center-panel tool with close behavior.
- Welcome sidebar container color and frame/border controls are configurable.
- Frame layer sizing/lock controls were added for more stable board attachment.

## Important Boundaries

- ExperiencePackage is for reusable setup/config/assets/rules/events/sounds.
- Game Snapshot is for a game in progress.
- SettingsContext owns persistent settings/config values.
- SettingsRegistry owns metadata only.
- SettingsTemplateRegistry owns layout/navigation metadata only.
- ConfigValidation owns validation only.
- Template system owns game visuals only.
- Standard Chess must remain stable and separate from Custom Game work.
- Event Log and Troubleshooter are separate systems.
- Sound Rules and Animation Rules are event actions, not event definitions.

## Key Entry Files

- `src/App.tsx`: view registration and panel rendering.
- `src/config/menuSchema.ts`: menu hierarchy and route labels.
- `src/context/SettingsContext.tsx`: persistent settings/config source of truth.
- `src/context/GameContext.tsx`: Standard Chess runtime, event emission, bots, and snapshots.
- `src/packages/ExperiencePackage.ts`: package import/export/asset/extract logic.
- `src/runtime/GameSnapshot.ts`: game snapshot model/helper.
- `electron/main.js`: packaged app loading, splash, local asset protocol, and Electron IPC.
