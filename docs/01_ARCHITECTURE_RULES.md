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
- Never patch `App.tsx` or another source file from an older/generated copy when the user has a newer current file in play.
- When a registry or source-of-truth file exists, preserve it and extend it instead of reintroducing inline mappings.

## Ownership Boundaries

- `SettingsContext` owns persistent values.
- Settings registry files own metadata only.
- `SettingsTemplateRegistry` owns layout/navigation metadata only.
- Config validation owns validation only.
- Template/theme system owns game visuals and template-owned visual layout defaults.
- `WorkspaceActionRegistry` owns actionId -> workspace view/component mapping and registration.
- `ExperiencePackage` owns reusable setup/config/assets/rules/events/sounds.
- Game Snapshot owns live game-in-progress state.
- Event Log records gameplay/system actions.
- Troubleshooter records errors/debug reports.
- Sound Editor manages event-to-sound rules.
- Event Builder manages reusable custom event definitions.
- Animation Builder manages reusable named animations.
- Animation Rules connect events to animations.
- Sound Rules connect events to sounds.
- Floating/docked window shell behavior belongs to shared window/layout code, not individual views.

## Source-of-Truth Rules

- Built-in theme defaults should come from the theme folder source, especially `src/assets/default-themes/<theme-id>/experience.json`.
- Loader files such as `obsidianDefaultTheme.ts` may normalize and validate theme data, but must not define a competing theme by hardcoding unrelated fallback visuals.
- LocalStorage/saved settings must not silently overwrite built-in reset/default theme values during a default reset.
- App shell CSS must not own placement truth for template-controlled HUD/window defaults.
- App shell code must not duplicate workspace action/component mappings already defined in `WorkspaceActionRegistry`.

## UI Rules

- Panel shell/menu registry owns the main panel title.
- Views should not render duplicate top-level titles matching the panel title.
- Complex editors should use center-panel workflows where possible.
- Simple/Advanced/System layering is used for tools that expose both friendly and technical controls, but the "Do Something Cool" Event Builder workflow should ask only enough information for the next choice.
- Browser prompts should not be used for destructive in-app actions when center modal/panel patterns exist.
- Docked panels should have a consistent Undock control.
- Dock/Close/Undock button events should not bubble into drag/focus/tab routing.

## Persistence Rules

- Settings/config persistence belongs in `SettingsContext`.
- Runtime game persistence belongs in Game Snapshot helpers.
- ExperiencePackage must not include live game-in-progress state.
- Imported binary media should not be stored as giant JSON/base64 strings.
