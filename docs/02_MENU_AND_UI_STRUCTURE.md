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

## Rules For Future UI Work

- Do not duplicate menu entries after moving a tool.
- Use links/buttons from related settings pages instead of duplicate menu items.
- Keep complex workflows out of cramped side panels when they require table/edit/preview layouts.
- Preserve existing action IDs unless the task explicitly requires a migration.

