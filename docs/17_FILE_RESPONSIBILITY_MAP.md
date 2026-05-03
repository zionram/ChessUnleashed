# File Responsibility Map

Status: Current, targeted verification, updated for launcher-window work

This map lists high-value ownership files. It is not a full source inventory.

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | View registration, panel placement, center tool rendering, active Custom Game runtime rendering, floating left launcher dock, right workspace dock shell, `launcher-category-window` rendering, launcher tab content, launcher overlay handling, and launcher window drag state. |
| `src/App.css` | App shell styling, panel/dock styling, Obsidian glass mode, launcher window/tab/action-card styling, scrollbars, and inline-style override polish. |
| `src/config/menuSchema.ts` | Top-level menu order and nested menu/tool routes. Source metadata for launcher category tabs. |
| `src/components/menu/DynamicMenu.tsx` | Root left icon launcher rendering and older recursive menu rendering. Should not render `launcher-category-window` contents. |
| `src/components/layout/ViewManager.tsx` | Right dock workspace tab manager. Not the destination for left launcher category windows. |
| `src/components/layout/Overlay.tsx` | In-app overlay/modal surface used by launcher overlay items and other UI. |
| `src/context/SettingsContext.tsx` | Persistent settings/config source of truth, defaults, registered bots, profiles, events, animations, rulesets, and imported asset metadata. |
| `src/context/GameContext.tsx` | Standard Chess runtime, game actions, bot integration, event emission, tactical payloads, animation timing gates, and standard game snapshots. |
| `src/runtime/GameSnapshot.ts` | Runtime game snapshot model/helper; separate from ExperiencePackage. |
| `src/packages/ExperiencePackage.ts` | Package creation/import/apply, asset manifest, zip assets, durable asset hydration, package extraction, and runtime-state stripping. |
| `src/packages/ExperienceCompliancePolicy.ts` | Multiplayer host compliance policy foundation. |
| `src/views/ImportExportView.tsx` | Package Manager UI: Load Package, Save Package, Extract Package, progress/status/error display. |
| `src/views/ThemeEditorView.tsx` | Visual/theme editing and guided Piece Set workflow. |
| `src/views/LayersView.tsx` | Layer/frame/background editing, draft layer changes, and board overlay color-layer controls. |
| `src/views/PlatformAppearanceView.tsx` | Platform UI appearance settings, including welcome panel/sidebar color controls. |
| `src/views/WelcomeView.tsx` | Welcome/tips panel UI and welcome sidebar container styling consumption. |
| `src/views/AnimationSettingsView.tsx` | Environment animation defaults, movement scope controls, active-status feedback. |
| `src/views/AnimationBuilderView.tsx` | Center workflow for named animation definitions. |
| `src/components/animation/AnimationPreviewCard.tsx` | Shared animation preview UI. |
| `src/components/board/ChessBoard.tsx` | Board rendering, Standard Chess visual movement animation, board overlays, optional board overlay color tint, overlay image order, and frame/layer rendering. |
| `src/views/RuleBuilderView.tsx` | Custom ruleset metadata builder, validation, templates, and sandbox entry. |
| `src/views/CustomGameRuntimeView.tsx` | Local Custom Game runtime for approved sandbox-playable rulesets. |
| `src/rules/RulePackages.ts` | RulePackage/custom ruleset types, validators, templates, helpers. |
| `src/views/EventBuilderView.tsx` | Center-panel Custom Event Builder UI, templates, tests, attach sound/animation workflows. |
| `src/events/CustomEventRuntime.ts` | Custom event validation/status/evaluation helpers. |
| `src/events/EventBus.ts` | Event bus foundation. |
| `src/events/EventLogger.ts` | Event Log helper. |
| `src/events/EventTriggerSystem.ts` | Event-triggered action plumbing. |
| `src/views/EventLogView.tsx` | Gameplay/system event history UI. |
| `src/views/TroubleshooterView.tsx` | Error/debug report UI. |
| `src/utils/ErrorLog.ts` | Local troubleshooter/error log helper. |
| `src/views/SoundEditorView.tsx` | Sound Rules and Sound Library UI, including upload validation. |
| `src/context/AudioContext.tsx` | Audio profile/state, sound playback, background music, playlist/rule playback behavior, stateful check audio. |
| `src/views/AudioView.tsx` | Environment Sound/Audio settings view. |
| `src/components/layout/AudioController.tsx` | Compact/background audio controller UI. |
| `src/components/audio/WaveProgressBar.tsx` | Shared waveform/progress/seek UI. |
| `src/views/BotsView.tsx` | Tools -> Bots management, add/edit/remove/test registered bots. |
| `src/views/ComputerOpponentView.tsx` | Full Computer Opponent controller/sidebar. |
| `src/engines/UciWorkerAdapter.ts` | Browser-worker UCI engine adapter. |
| `src/views/LetsPlaySetupView.tsx` | Let's Play setup, Standard/Bot/Multiplayer/Custom Game entry flows. |
| `src/views/MultiplayerView.tsx` | Multiplayer server-source UI and host/join controls. |
| `src/views/ProfileView.tsx` | Local profile UI. |
| `src/views/AboutSupportView.tsx` | About / Support information view. |
| `electron/main.js` | Electron production load, splash window, local asset protocol, durable asset IPC, local server startup. |
| `electron/preload.js` | Safe renderer bridge for durable asset storage and splash/status IPC. |
| `electron/splash.html` | Real splash loading/status UI. |
| `server/chessServer.js` | Local multiplayer server. |
| `package.json` | Build/dev/package scripts and Electron builder config. |

## Launcher Window Notes — 2026-05-03

- `src/App.tsx` owns the current launcher category window implementation.
- `src/App.css` owns the current launcher window/tabs/card glass styling.
- `DynamicMenu.tsx` is not the launcher window content renderer.
- `ViewManager.tsx` is not the launcher window content renderer.
- The old `launcher-sub-panel` surface should not be restored.
- If `activeLauncherItem` appears inside outer `function App()`, that is likely a bug. It belongs in `MainLayout`.

## Needs Verification Before Editing

- Any helper not listed here may still be important.
- Use targeted `rg` searches before modifying.
- Some files contain multiple historical responsibilities due to incremental feature work.
- Current code overrides old documentation when there is a mismatch.
