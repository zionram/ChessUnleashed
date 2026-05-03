# Do Not Rebuild

Status: Active project rule, updated with workspace-window cautions

Chess Unleashed is existing functioning software. Future work should be small, scoped, and compatible with current ownership boundaries.

## Global Rules

- Do not rebuild working systems.
- Do not create duplicate state.
- Do not create duplicate systems.
- Do not refactor broadly unless explicitly requested.
- Do not inspect unrelated files unless needed.
- Prompt IDs must not be reused for different directives.
- Build must pass after code changes.
- Documentation-only changes do not require a build unless docs are part of the build.
- Use in-app panels/modals instead of browser/window prompts.
- Do not add duplicate panel titles.
- Use center-panel tools for complex workflows.

## Ownership Boundaries

- `SettingsContext` owns persistent values.
- `SettingsRegistry` owns metadata only.
- `SettingsTemplateRegistry` owns layout/navigation metadata only.
- `ConfigValidation` owns validation only.
- Template system owns game visuals only.
- `ExperiencePackage` owns reusable setup/config/assets/rules/events/sounds.
- Game Snapshot owns live game-in-progress state.
- Event Log records gameplay/system actions.
- Troubleshooter records errors/debug reports.
- Sound Editor manages event-to-sound rules.
- Event Builder manages reusable custom event definitions.
- Animation Builder manages reusable named animations.
- Animation Rules connect events to animations.
- Sound Rules connect events to sounds.

## Workspace / Launcher Window Rules — 2026-05-03

- Do not restore `launcher-sub-panel`.
- Do not create a duplicate left launcher system.
- Do not route left launcher category windows into the right dock.
- Do not use `DynamicMenu` recursively inside `launcher-category-window`.
- Do not create a global window manager until explicitly requested.
- Do not add drag/resize logic outside the component scope that owns the state.
- `activeLauncherItem` belongs inside `MainLayout`, not the outer provider-only `App()` wrapper.
- Keep `DynamicMenu` limited to the root icon launcher unless explicitly changing the old recursive menu behavior elsewhere.
- Launcher category windows should be floating, tabbed, and independent from the right dock.

## Systems Not To Replace

- Standard Chess/chess runtime.
- GameContext live Standard Chess path.
- Custom Game runtime without explicit scope.
- ExperiencePackage format and category routing.
- Electron packaging from scratch.
- UCI worker adapter / bot architecture.
- Sound Editor and AudioContext architecture.
- Event Builder and CustomEventRuntime architecture.
- Animation Builder and movement animation path.
- Theme/Piece template data model.
- Right dock / `ViewManager` architecture unless explicitly scoped.
- Existing Overlay architecture unless explicitly scoped.

## Package Rule

Do not mix runtime Game Snapshot state into ExperiencePackage exports by default.

Packages are reusable; snapshots are games in progress.

## Media Rule

Do not put GIF/PNG/MP3/WAV/MIDI binary data into JSON/localStorage as giant base64 strings.

Use package assets, durable asset storage, or file references through the existing helpers.

## Vite / React Warning Rule

Do not edit `node_modules/.vite/deps` or `react-dom_client.js`.

If React reports a style warning, fix the source component style object.

If cache is stale, clear Vite cache instead:

```bat
rmdir /s /q node_modules\.vite
npm.cmd run dev
```
