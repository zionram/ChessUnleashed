# Chess Unleashed Project Overview

Status: Release candidate / beta-ready, with active experimental systems.

Chess Unleashed is existing functioning software, not a greenfield prototype. It is a modular chess and custom-game platform with Standard Chess, visual/theme editing, custom rules, events, sound rules, animation rules, bot engines, multiplayer settings, internet chess integration, reusable packages, runtime save/resume, and Electron desktop packaging.

The project rule is incremental work only: preserve working systems, make scoped changes, and do not rebuild major architecture unless explicitly requested.

## Current Major Systems

- Standard Chess gameplay: current live chess path using the existing chess runtime.
- Main board runtime: supports local Standard Chess, bots, LAN paths, and the first FICS-driven online board bridge.
- Custom Game / Rule Builder: metadata builder, Checkers template, sandbox testing, approval, and local custom runtime. Needs deeper user testing.
- Piece Set / Theme Editor: guided Source -> Arrange -> Finalize workflow with built-in SVG sets and custom images.
- Visual template system: owns board/piece/layer/frame/background visuals and must remain separate from gameplay state.
- Layers / Board / Background controls: board overlays, frame layer, and background behavior exist; Background is planned to move to its own higher-level Environment -> Look tab because it is no longer just a board sub-layer.
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
- Engine / bot translation layer: UI-level bot settings are translated to engine-specific options at the boundary; do not hardcode bot-specific assumptions into GameContext/UI controls.
- Multiplayer: LAN/local server settings, host compliance policy, host asset matching foundation, and packaged Electron local server support. Needs broader testing.
- FICS / Internet Chess Server integration: Electron TCP bridge, Online/Console dockable FICS window, guest/account login flow, seek/play/observe support, Style 12 parser, command registry/translator, main-board observe/play bridge, FICS clocks, board-orientation options, and external FICS registration link. This is experimental and should be validated with live server tests.
- Floating window and workspace docking system: launcher windows can detach/dock, nested tabs can detach/dock, windows can dock into stacked workspace panels, and docked panels can coexist visibly.
- Movable lower HUD/status strips: lower activity/control HUD strips can be moved, hidden, and restored. Polish pass pending.
- Registered view theming foundation: shared wrapper/class direction started for registered views; some views still need class-based cleanup instead of broad CSS overrides.
- Profile system: local player identity foundation.
- Electron packaging: splash screen, portable build flow, safe preload bridges, FICS TCP bridge, local asset protocol, and beta distribution notes.

## Recent Feature Additions / Changes

- FICS Online is available through Let’s Play -> Online -> Open FICS as one dockable FICS window with Online and Console tabs.
- FICS Console can connect to freechess.org through Electron TCP, show raw server text, and send raw commands.
- FICS Online supports guest/account login, seek/open seeks, play seek, match player, observe game/player, current-game controls, chat/say, and challenge handling where parseable.
- FICS Style 12 data drives an observe/play preview and can update the main board.
- FICS command translation is registry-style: standardized intents such as `move`, `seekGame`, `playSeek`, `observeGame`, `resign`, `offerDraw`, and `say` translate to FICS commands in the FICS boundary.
- Main board FICS move sending must remain translator-driven. Do not change `ChessBoard.tsx` to match FICS command syntax.
- FICS clock display can override local timer visibility when FICS is active.
- FICS board orientation can be fixed so observed games do not flip every move.
- Electron preload was moved to CommonJS (`preload.cjs`) so the preload bridge actually loads in Electron.
- FICS shutdown guard was added so late socket close events do not send IPC messages to destroyed windows.
- Floating launcher windows now support multiple open windows, tab detach, nested tab detach, visual drag feedback, dock-back to tab rows, drag-to-workspace, and stacked docked workspace panels.
- Lower HUD/status-control strips are movable/optional, with hover-only close controls.
- First theming infrastructure pass started; some broad CSS rules may need cleanup into explicit semantic classes.
- Packaging/optimization concern is open: release size and startup time need a measured audit before optimization work.

## Important Boundaries

- ExperiencePackage is for reusable setup/config/assets/rules/events/sounds.
- Game Snapshot is for a game in progress.
- SettingsContext owns persistent settings/config values.
- SettingsRegistry owns metadata only.
- SettingsTemplateRegistry owns layout/navigation metadata only.
- ConfigValidation owns validation only.
- Template system owns game visuals only.
- Standard Chess must remain stable and separate from Custom Game work.
- FICS is an online provider boundary. It may drive online game state through translators/adapters, but it must not own Chess Unleashed visuals/templates/pieces.
- Event Log and Troubleshooter are separate systems.
- Sound Rules and Animation Rules are event actions, not event definitions.

## Key Entry Files

- `src/App.tsx`: view registration, launcher/windowing, docked workspace panels, HUD strips, FICS hub opening.
- `src/config/menuSchema.ts`: menu hierarchy and route labels.
- `src/context/SettingsContext.tsx`: persistent settings/config source of truth.
- `src/context/GameContext.tsx`: Standard Chess runtime, event emission, bots, FICS online board bridge, and snapshots.
- `src/components/board/ChessBoard.tsx`: board rendering and generic board interaction; must not become provider-specific.
- `src/services/online/fics/FicsAdapter.ts`: FICS connection/session adapter and app-facing command methods.
- `src/services/online/fics/FicsGameTranslator.ts`: FICS Style 12 translation, normalized online state, and registry-style FICS command translation.
- `src/services/online/fics/FicsProtocolParser.ts`: raw FICS text/Style 12/games/sought parsing.
- `src/views/FicsOnlineView.tsx`: normal FICS user controls.
- `src/views/FicsConsoleView.tsx`: FICS developer/raw console.
- `src/packages/ExperiencePackage.ts`: package import/export/asset/extract logic.
- `src/runtime/GameSnapshot.ts`: game snapshot model/helper.
- `electron/main.js`: packaged app loading, splash, local asset protocol, TCP bridges, local server, Electron IPC.
- `electron/preload.cjs`: safe renderer bridge for assets, LAN, splash/status, and FICS IPC.
