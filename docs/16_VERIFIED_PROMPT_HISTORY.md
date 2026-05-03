# Verified Prompt History

Status: Current summary, not a full commit log

This file summarizes recent verified prompts so future AI/dev handoffs understand what changed.

The current codebase remains the source of truth.

## Documentation

- DOCS-002_CODEX_AUDIT: Created current codebase intake.
- DOCS-005_PROJECT_DOCUMENTATION_REFRESH: Refreshed project documentation after major system changes.
- DOCS-006_FINAL_RELEASE_DOC_REFRESH: Refreshed release-candidate docs and added v1.0 release notes.

## Packaging / Electron / Package Manager

- C.4.P-200_PACKAGING_AUDIT: Fixed Windows beta packaging path and documented beta builds.
- C.4.P-201_PACKAGING_STOCKFISH_DEFAULT: Added bundled Stockfish worker as a default bot entry when available.
- C.4.P-202_208_PACKAGE_ASSETS_FIX: Changed package export to real zip assets instead of giant base64 JSON.
- C.4.P-274_280_BATCH: Added durable imported asset storage for Electron and `local-asset://` references.
- C.4.P-281_288_BATCH: Stabilized Package Manager save flow with Prepare Package -> Package Ready -> Save Package.
- C.4.P-289_294_BATCH: Added Extract Package workflow for human-readable extracted package output.
- C.4.P-295_310_BATCH: Fixed beta QA issues, including package wording, zip save paths, and package asset correctness.
- C.4.P-331_336_BATCH: Added Electron startup splash screen with real loading UI.
- C.4.P-337_342_BATCH: First pass on Package Manager Load/Extract diagnostics.
- C.4.P-343_PACKAGE_MANAGER_DEBUG_FIX: Final Package Manager debug fix. Load/Extract status, duplicate title warning, and live game state exclusion are the authoritative current behavior.

## Piece Sets / Visuals

- C.4.P-191_196_BATCH: Added piece movement animation settings and Standard Chess slide animation.
- C.4.P-209_214_BATCH: Clarified Piece Set staging UX.
- C.4.P-227_232_BATCH: Added Source -> Arrange -> Finalize Piece Set workflow.
- C.4.P-233_FIX: Preserved Arrange Draft preview after Apply to Draft.
- C.4.P-295_310_BATCH: Fixed Piece Set reset/staging/save zip behavior and Piece/Layer draft merge issues.
- C.4.P-311_318_BATCH: Added welcome sidebar container color controls and frame sizing/lock modes.

## Events / Sound / Animation

- C.4.P-111_116_BATCH: Reworked Sound Editor into Sound Rules plus Sound Library.
- C.4.P-117_FIX: Added sound preview controls in Sound Rule editor.
- C.4.P-118_122_BATCH: Added Event Builder foundation.
- C.4.P-123_130_BATCH: Connected simple custom events to Event Log and Sound Rules.
- C.4.P-131_138_BATCH: Improved Event Builder usability and tactical placeholders.
- C.4.P-139_145_BATCH: Added attacked-piece and simple fork tactical event support.
- C.4.P-146_152_BATCH: Polished tactical custom events with Sound Rules and Event Log visibility.
- C.4.P-153_160_BATCH: Added Audio Controller playlists/background music and wave/progress foundation.
- C.4.P-161_164_BATCH: Polished WaveProgressBar behavior.
- C.4.P-171_178_BATCH: Added Simple / Advanced / System Event Builder layers.
- C.4.P-179_184_BATCH: Polished layered Event Builder.
- C.4.P-185_190_BATCH: Connected Event Builder "Attach Sound" workflow.
- C.4.P-234_242_BATCH: Added Animation Builder foundation.
- C.4.P-243_252_BATCH: Connected Animation Rules to custom events.
- C.4.P-253_258_BATCH: Polished Event -> Sound -> Animation workflow.
- C.4.P-259_266_BATCH: Polished Animation Builder layout and preview.
- C.4.P-267_272_BATCH: Moved Animation Builder into center-panel workflow.
- C.4.P-311_318_BATCH: Moved Event Builder to readable center panel and added close behavior.
- C.4.P-319_328_BATCH: Fixed local-player movement animation and stateful check/in-check audio pause/resume.
- C.4.P-329_FIX: Delayed bot/opponent response until player movement animation completes.

## Bots

- C.4.P-085_092_BATCH: Added worker/URL UCI adapter foundation and host asset transfer foundation.
- C.4.P-093_096_BATCH: Integrated worker UCI bots into live bot gameplay.
- C.4.P-097_099_BATCH: Clarified Let’s Play bot side-selection flow.
- C.4.P-100_FIX: Added edit support for registered custom bots.
- C.4.P-104_RECOVERY and C.4.P-105_ACCESS_FIX: Restored full Computer Opponent controller and access path.
- C.4.P-201_PACKAGING_STOCKFISH_DEFAULT: Added default Stockfish worker entry.

## Custom Games

- C.4.P-050 through C.4.P-084: Built Custom Game ruleset metadata, import/export, approval, sandbox, local runtime, management, identity/history/snapshot readiness, and MVP polish.

## Save/Resume

- C.4.P-106_110_BATCH: Added Game Snapshot resume foundation.
- C.4.P-167_170_BATCH: Updated package/category handling and clarified Save/Resume versus ExperiencePackage.
- C.4.P-343_PACKAGE_MANAGER_DEBUG_FIX: Confirmed Package Manager excludes live game state by default.

## Obsidian Workspace / Launcher Windows — 2026-05-03

- C5.P-044_WORKSPACE_FLOATING_DOCKS: Added/verified workspace-container direction, right dock floating over workspace background, right dock activator, and glass dock styling. User clarified docks should float over the workspace/background layer, not necessarily cover the chessboard by default.
- C5.P-045_LEFT_LAUNCHER_ATTEMPT: Initial attempt failed to produce true floating tabbed launcher windows. It reused right-dock or second-sidebar behavior.
- C5.P-046_FIX_LEFT_LAUNCHER_ROUTING: Clarified that left launcher category windows must not route into the right dock. Still not sufficient because old launcher panel render path remained.
- C5.P-047_FIX_FLOATING_TABBED_CATEGORY_WINDOW: Narrowed target to converting launcher submenu panel into a floating tabbed category window. Diagnosis continued.
- C5.P-048_FIX_LAUNCHER_WINDOW_TABS: Correctly removed `DynamicMenu` from active launcher window content and rendered first-level children as tabs. Reported DONE: Launcher window tabs replace vertical DynamicMenu rows.

Verified discoveries and direct fixes:

- `launcher-sub-panel` in `src/App.tsx` was the old wrong second-sidebar surface.
- `launcher-category-window` is the intended floating launcher surface.
- `launcher-sub-panel` should not remain in active launcher JSX or CSS.
- `DynamicMenu` should remain for the root left icon launcher only.
- DynamicMenu border warning was fixed by using explicit `borderTop`, `borderRight`, `borderBottom`, and `borderLeft`.
- Launcher category window was made draggable by title bar in a direct patch.
- Initial draggable patch inserted duplicate launcher helpers in outer `function App()` and caused `ReferenceError: activeLauncherItem is not defined`.
- Scope fix removed the duplicate helper block from outer `App()` and kept launcher state/effects inside `MainLayout`.
- User verified the corrected draggable launcher patch worked.

Current verified launcher state:

- left root icon opens a detached floating category window
- first-level children appear as tabs
- nested children appear inside selected tab
- leaf action/overlay items remain reachable
- title bar drag works
- right dock remains independent

Remaining:

- resize handle
- position persistence decision
- reusable FloatingWindow component decision
- future dockable/detachable window system
- future movable non-dockable board-stage object
