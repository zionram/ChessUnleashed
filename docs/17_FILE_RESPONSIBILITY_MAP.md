# File Responsibility Map

Status: Current, targeted verification

This map lists high-value ownership files. It is not a full source inventory.

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | View registration, panel placement, center tool rendering, active Custom Game runtime rendering. |
| `src/config/menuSchema.ts` | Top-level menu order and nested menu/tool routes. |
| `src/context/SettingsContext.tsx` | Persistent settings/config source of truth, defaults, registered bots, profiles, events, animations, rulesets, imported asset metadata. |
| `src/context/GameContext.tsx` | Standard Chess runtime, game actions, bot integration, event emission, tactical payloads, standard game snapshots. |
| `src/runtime/GameSnapshot.ts` | Runtime game snapshot model/helper; separate from ExperiencePackage. |
| `src/packages/ExperiencePackage.ts` | Package creation/import/apply, asset manifest, zip assets, durable asset hydration, package extraction. |
| `src/packages/ExperienceCompliancePolicy.ts` | Multiplayer host compliance policy foundation. |
| `src/views/ImportExportView.tsx` | Package Manager UI: Load Package, Save Package, Extract Package. |
| `src/views/ThemeEditorView.tsx` | Visual/theme editing and guided Piece Set workflow. |
| `src/views/RuleBuilderView.tsx` | Custom ruleset metadata builder, validation, templates, sandbox entry. |
| `src/views/CustomGameRuntimeView.tsx` | Local Custom Game runtime for approved sandbox-playable rulesets. |
| `src/rules/RulePackages.ts` | RulePackage/custom ruleset types, validators, templates/helpers. |
| `src/views/EventBuilderView.tsx` | Custom Event Builder UI, templates, tests, attach sound/animation workflows. |
| `src/events/CustomEventRuntime.ts` | Custom event validation/status/evaluation helpers. |
| `src/views/EventLogView.tsx` | Gameplay/system event history UI. |
| `src/views/TroubleshooterView.tsx` | Error/debug report UI. |
| `src/utils/ErrorLog.ts` | Local troubleshooter/error log helper. |
| `src/views/SoundEditorView.tsx` | Sound Rules and Sound Library UI. |
| `src/context/AudioContext.tsx` | Audio profile/state, sound playback, music/playlist/rule playback behavior. |
| `src/views/AudioView.tsx` | Environment Sound/Audio settings view. |
| `src/components/layout/AudioController.tsx` | Compact/background audio controller UI. |
| `src/components/audio/WaveProgressBar.tsx` | Shared waveform/progress/seek UI. |
| `src/views/AnimationSettingsView.tsx` | Environment animation default settings. |
| `src/views/AnimationBuilderView.tsx` | Center workflow for named animation definitions. |
| `src/components/animation/AnimationPreviewCard.tsx` | Shared animation preview UI. |
| `src/views/BotsView.tsx` | Tools → Bots management, add/edit/remove/test registered bots. |
| `src/views/ComputerOpponentView.tsx` | Full Computer Opponent controller/sidebar. |
| `src/engines/UciWorkerAdapter.ts` | Browser-worker UCI engine adapter. |
| `src/views/MultiplayerView.tsx` | Multiplayer server-source UI and host/join controls. |
| `src/views/ProfileView.tsx` | Local profile UI. |
| `src/views/LetsPlaySetupView.tsx` | Let’s Play setup, Standard/Bot/Multiplayer/Custom Game entry flows. |
| `electron/main.js` | Electron production load, local asset protocol, durable asset IPC, local server startup. |
| `electron/preload.js` | Safe renderer bridge for durable asset storage. |
| `server/chessServer.js` | Local multiplayer server. |
| `package.json` | Build/dev/package scripts and Electron builder config. |

## Needs Verification Before Editing

- Any helper not listed here may still be important. Use targeted `rg` searches before modifying.
- Some files may contain multiple historical responsibilities due to incremental feature work.

