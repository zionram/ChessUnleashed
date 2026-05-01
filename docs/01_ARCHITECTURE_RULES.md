# Architecture Rules

Status: Current

Chess Unleashed must be treated as a live, working codebase. New work should be minimal, scoped, and compatible with existing systems.

## Non-Negotiable Project Rules

- Do not rebuild working systems.
- Do not create duplicate state.
- Do not create duplicate systems.
- Do not refactor broadly unless explicitly requested.
- Prompt IDs must not be reused for different directives.
- Build must pass after code changes.
- Use center-panel tools for complex workflows.
- Avoid browser/window prompts when an in-game modal or panel is expected.
- Do not add duplicate panel titles.
- Do not inspect unrelated files unless necessary.
- Preserve user and generated changes in a dirty worktree.

## Ownership Boundaries

- `SettingsContext` owns persistent values.
- Settings registry files own metadata only.
- `SettingsTemplateRegistry` owns layout/navigation metadata only.
- Config validation owns validation only.
- Template/theme system owns game visuals only.
- `ExperiencePackage` owns reusable setup/config/assets/rules/events/sounds.
- Game Snapshot owns live game-in-progress state.
- Event Log records gameplay/system actions.
- Troubleshooter records errors/debug reports.
- Sound Editor manages event-to-sound rules.
- Event Builder manages reusable custom event definitions.
- Animation Builder manages reusable named animations.
- Animation Rules connect events to animations.
- Sound Rules connect events to sounds.

## UI Rules

- Panel shell/menu registry owns the main panel title.
- Views should not render duplicate top-level titles matching the panel title.
- Complex editors should use center-panel workflows where possible.
- Simple/Advanced/System layering is used for tools that expose both friendly and technical controls.
- Browser prompts should not be used for destructive in-app actions when center modal/panel patterns exist.

## Persistence Rules

- Settings/config persistence belongs in `SettingsContext`.
- Runtime game persistence belongs in Game Snapshot helpers.
- ExperiencePackage must not include live game-in-progress state.
- Imported binary media should not be stored as giant JSON/base64 strings.

