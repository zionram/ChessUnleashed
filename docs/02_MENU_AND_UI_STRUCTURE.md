# Menu And UI Structure

Status: Current, with Obsidian Workspace launcher-window update

The current menu structure is defined in `src/config/menuSchema.ts`. Views are registered and positioned in `src/App.tsx`.

## Top-Level Menu Order

1. Let’s Play
2. Environment
3. Tools
4. Advanced

## Environment

- Look
  - Pieces
  - Board
  - Squares
  - Paths
  - Layers
  - Themes
  - Animation
  - Platform UI
- Sound
  - Audio Settings
  - Load / Save Sets
- opens the Package/Appearance workflow depending on current view wiring.

## Tools

- Chat
- Bots
- Import / Export
- Rule Builder
- History
- Stats
- Analysis
- Move Assist

## Advanced

- Gaming
- Sound Editor
- Event Builder
- Animation Builder
- Event Log
- System
- Troubleshooter
- Validation
- Settings Builder
- Reset System

## Panel Placement

Verified in `src/App.tsx`:

- Sound Editor opens as a center workflow.
- Animation Builder opens as a center workflow.
- Custom Game runtime renders in the center when an active custom ruleset is started.
- Registered views include profile, bots, multiplayer, rule builder, event builder, event log, troubleshooter, audio, platform appearance, animation settings, and animation builder.

## Obsidian Workspace Launcher Update — 2026-05-03

The left menu is moving from a nested sidebar menu model toward a floating launcher-window model.

Current direction:

- The left side should behave as a compact icon launcher / tool palette.
- Clicking a root launcher item, such as Environment, Tools, or Advanced, should open a floating category window.
- The floating category window should render first-level children as horizontal tabs.
- Nested children should appear inside the selected tab as grouped cards, nested tabs, or compact buttons.
- The right dock / `ViewManager` is separate and must not be reused as the destination for left launcher category windows.
- The chessboard should remain centered and usable; floating windows may overlay the workspace background but should not be designed to cover the board by default.

Important implementation distinction:

- `DynamicMenu` remains acceptable for the root left icon launcher.
- `DynamicMenu` should not be used recursively for the content inside `launcher-category-window`.
- `launcher-category-window` is the intended floating launcher surface.
- `launcher-sub-panel` was the old wrong second-sidebar implementation and should not be restored.

Current verified launcher behavior:

- Root left launcher icons open floating category windows.
- First-level children render as horizontal tabs.
- Nested children render inside the selected tab.
- Leaf action items remain reachable.
- Overlay items open with the existing `Overlay` pattern.
- The launcher window can be dragged by its title bar.

## Rules For Future UI Work

- Do not duplicate menu entries after moving a tool.
- Use links/buttons from related settings pages instead of duplicate menu items.
- Keep complex workflows out of cramped side panels when they require table/edit/preview layouts.
- Preserve existing action IDs unless the task explicitly requires a migration.
- Do not route left launcher category windows into the right dock.
- Do not restore `launcher-sub-panel`.
- Keep launcher-window changes scoped to `src/App.tsx`, `src/App.css`, `src/components/menu/DynamicMenu.tsx`, and `src/config/menuSchema.ts` unless verification proves another file is involved.
