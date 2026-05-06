# Menu And UI Structure

Status: Current

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
  - Opens the Package/Appearance workflow depending on current view wiring.

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

## Floating Launcher / Tool Palette

Current verified UI direction:

- The left Tool Palette floats over the background instead of behaving like a fixed side panel.
- The Tool Palette is draggable by its header.
- The Tool Palette is resizable horizontally and vertically.
- Collapsed mode becomes a clean icon-only rail.
- Selected launcher icons must remain visible.
- Redundant launcher side arrows should not return. When removing them, do not accidentally hide SVG internals.
- The launcher should behave like a floating control surface, not a static navigation list.

## Let’s Play Overlay

Current verified behavior:

- The Let’s Play overlay opens centered and above the background from both the New button and the left palette.
- The Let’s Play overlay uses the restored dark/glass theme.
- The Let’s Play overlay scrollbar matches the dark/glass UI style.

## Workspace Cleanup

Current verified cleanup:

- Redundant right workspace quick buttons for History, Layers, and Squares were removed.
- The inner redundant Workspace button/tab was removed.

## Board Glass Shell Movement

Current verified behavior:

- The chessboard glass shell is draggable by grabbing the glass around the board.
- Double-clicking the board glass shell resets the board position.
- Board dragging must not interfere with dragging pieces or squares.

## Floating Tool Control Panel Direction

Current next task / known UI gap:

- Environment launcher tabs currently show “Open” cards for tools like Pieces.
- Desired behavior: Environment → Look → Pieces should render the actual Pieces controls inside the floating launcher window.
- The same pattern should apply to Board, Animation, Platform UI, Sound, Packages, and similar tool areas.
- “Dock” should be a small secondary option inside the tool interface, not the main action.
- The tab should not just say “Open this workspace tool.”
- Do not add fake controls. If the interface looks functional, it must be wired to real state or real existing actions.

## Rules For Future UI Work

- Do not duplicate menu entries after moving a tool.
- Use links/buttons from related settings pages instead of duplicate menu items.
- Keep complex workflows out of cramped side panels when they require table/edit/preview layouts.
- Preserve existing action IDs unless the task explicitly requires a migration.
- Prefer floating glass panels, compact icon rails, dark/glass styling, and real controls in floating windows.
- Reduce fixed side-panel clutter where a floating tool panel can use the existing architecture cleanly.
