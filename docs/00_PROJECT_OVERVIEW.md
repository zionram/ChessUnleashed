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
- Workspace Action Registry: centralized actionId -> view/component mapping for launcher embedding and workspace view registration.
- Floating launcher/workspace windows: tools can open in floating windows, dock to the workspace, and docked panels should provide a consistent Undock control.
- Built-in Obsidian theme folder: bundled default theme source under `src/assets/default-themes/obsidian/` with `experience.json` as the source of truth for the built-in default.

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
- Obsidian built-in default theme was converted from a loose zip reference into a bundled default-theme folder source.
- Workspace visual chrome defaults, including HUD safe areas and window defaults, are expected to come from the active template where supported.
- Move Assist now has a separate intended control for showing/hiding the board-side engine assist window, while badges remain controlled by training wheels.
- Docked workspace panels should include an icon-only Undock control.

## Important Boundaries

- ExperiencePackage is for reusable setup/config/assets/rules/events/sounds.
- Game Snapshot is for a game in progress.
- SettingsContext owns persistent settings/config values.
- SettingsRegistry owns metadata only.
- SettingsTemplateRegistry owns layout/navigation metadata only.
- ConfigValidation owns validation only.
- Template system owns game visuals and visual layout defaults where those defaults are part of an applied template.
- WorkspaceActionRegistry owns actionId -> view/component registration for launcher/workspace embedding.
- Standard Chess must remain stable and separate from Custom Game work.
- Event Log and Troubleshooter are separate systems.
- Sound Rules and Animation Rules are event actions, not event definitions.

## Key Entry Files

- `src/App.tsx`: app shell, window/dock state, center workspace rendering, launcher/docked panel rendering. It should consume registered workspace action configs instead of duplicating action->view mappings.
- `src/registry/WorkspaceActionRegistry.tsx`: source of truth for actionId -> workspace view/component mapping and workspace view registration.
- `src/config/menuSchema.ts`: menu hierarchy and route labels.
- `src/context/SettingsContext.tsx`: persistent settings/config source of truth.
- `src/context/GameContext.tsx`: Standard Chess runtime, event emission, bots, and snapshots.
- `src/packages/ExperiencePackage.ts`: package import/export/asset/extract logic.
- `src/runtime/GameSnapshot.ts`: game snapshot model/helper.
- `src/assets/default-themes/obsidian/experience.json`: built-in Obsidian theme source.
- `src/assets/default-themes/obsidianDefaultTheme.ts`: loader/normalizer for the built-in Obsidian theme. It must not invent a competing theme definition.
- `electron/main.js`: packaged app loading, splash, local asset protocol, and Electron IPC.
