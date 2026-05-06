# Do Not Rebuild

Status: Active project rule.

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
- Online service adapters/translators own provider-specific command/state translation.

## Systems Not To Replace

- Standard Chess/chess runtime.
- GameContext live Standard Chess path.
- Custom Game runtime without explicit scope.
- ExperiencePackage format and category routing.
- Electron packaging from scratch.
- UCI worker adapter / bot architecture.
- FICS adapter/translator architecture.
- Floating window / launcher / docked workspace architecture.
- Sound Editor and AudioContext architecture.
- Event Builder and CustomEventRuntime architecture.
- Animation Builder and movement animation path.
- Theme/Piece template data model.

## FICS / Online Rules

- Do not change `ChessBoard.tsx` to match FICS syntax. The board sends generic move intent.
- FICS command syntax belongs in `FicsGameTranslator.ts`.
- FICS socket/session handling belongs in `FicsAdapter.ts` and Electron IPC/preload boundaries.
- FICS must not own visuals, templates, pieces, or package/theme systems.
- Browser mode cannot use raw FICS TCP unless a future relay server is added.

## Package Rule

Do not mix runtime Game Snapshot state into ExperiencePackage exports by default. Packages are reusable; snapshots are games in progress.

## Media Rule

Do not put GIF/PNG/MP3/WAV/MIDI binary data into JSON/localStorage as giant base64 strings. Use package assets, durable asset storage, or file references through the existing helpers.
