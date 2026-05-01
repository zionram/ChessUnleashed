# Chess Unleashed Project Overview

Status: Current

Chess Unleashed is existing functioning software, not a greenfield prototype. It is a chess app and customization platform with Standard Chess, custom game foundations, configurable visuals/audio/events/animations, bot engines, multiplayer server-source settings, package import/export, and Electron beta packaging.

The core rule is incremental work only: preserve working systems, make scoped changes, and do not rebuild major architecture unless explicitly requested.

## Current Major Systems

- Standard Chess gameplay: current live chess path remains separate from Custom Game runtime.
- Custom Game / Rule Builder: custom ruleset metadata, Checkers template, sandbox testing, approved local custom game runtime.
- Piece Set / Theme Editor: guided piece source, arrange draft, finalize/apply workflow.
- ExperiencePackage: reusable setup/config/assets/rules/events/sounds in `.zip` packages with real media files.
- Package Manager: Load Package, Save Package, Extract Package.
- Durable imported asset storage: Electron persists imported package media under app-managed user data and resolves `local-asset://` references.
- Event Builder: reusable custom event definitions with simple and limited tactical runtime support.
- Event Log: gameplay/system action history.
- Troubleshooter: error/debug report history.
- Sound Editor: event-to-sound rules plus Sound Library.
- Audio Controller: background music, playlists, waveform/progress bar.
- Animation Settings: user defaults for movement animation.
- Animation Builder: reusable named animation definitions.
- Animation Rules: connect events to named animations.
- Bots: built-in bots, registered bots, and browser-worker UCI engines such as Stockfish.
- Multiplayer: server-source settings, host compliance policy, asset matching foundation.
- Profile system: local guest player identity foundation.
- Save/Resume: runtime Game Snapshot storage separate from ExperiencePackage.
- Electron packaging: beta desktop distribution flow.

## Important Boundaries

- ExperiencePackage is for reusable setup/config/assets/rules/events/sounds.
- Game Snapshot is for a game in progress.
- SettingsContext owns persistent settings/config values.
- Standard Chess must remain stable and unmodified by Custom Game work.
- Event Log and Troubleshooter are separate systems.
- Sound Rules and Animation Rules are event actions, not event definitions.

## Key Entry Files

- `src/App.tsx`: view registration, center/right/left panel rendering, active custom game runtime.
- `src/config/menuSchema.ts`: current top-level menu hierarchy.
- `src/context/SettingsContext.tsx`: persistent settings source of truth.
- `src/context/GameContext.tsx`: Standard Chess runtime, event emission, bot integration, snapshots.
- `src/packages/ExperiencePackage.ts`: package import/export/asset/extract logic.
- `electron/main.js`: packaged app loading, local asset protocol, bundled server startup.

