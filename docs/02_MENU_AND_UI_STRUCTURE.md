# Menu And UI Structure

Status: Current

The current menu structure is defined in `src/config/menuSchema.ts`. Workspace action/view registration is centralized in `src/registry/WorkspaceActionRegistry.tsx`. App shell rendering in `src/App.tsx` should consume registry results instead of duplicating actionId -> view/component mappings.

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
  - Background
  - Animation
  - Platform UI
- Sound
  - Audio Settings
- Packages
  - Load / Save Sets
  - Package/Appearance workflow depending on current view wiring

## Tools

- Chat
- Bots
- Package Manager / Import Export
- Rule Builder
- History
- Stats
- Analysis
- Move Assist
- FICS Online

## Advanced

- Gaming
  - Sound Editor
  - Event Builder
  - Animation Builder
  - Event Log
  - FICS Console
  - AI Package Builder
- System
  - Troubleshooter
  - Validation
  - Settings Builder
  - Reset System

## Panel Placement

Verified/expected from current architecture:

- Sound Editor opens as a center/embedded workflow when active.
- Event Builder opens as a center/embedded workflow.
- Animation Builder opens as a center/embedded workflow.
- Custom Game runtime renders in the center when an active custom ruleset is started.
- Floating launcher windows should render actual controls for registered workspace actions, not just "Open" cards.
- Dockable floating windows should dock into the right workspace panel and docked panels should provide an Undock control.
- Docked panel Undock should be icon-only in the header, with tooltip/aria label preserving meaning.
- Workspace HUD/status strips should default to safe visible positions and not load under the side workspace/palette.

## Workspace Action Registry

`src/registry/WorkspaceActionRegistry.tsx` is the source of truth for launcher/workspace embedding:

- actionId -> viewId
- actionId -> component
- default registration metadata
- workspace view registration

`App.tsx` must not maintain a separate action-to-view list. If a launcher tab shows an "Open" card for a registered tool, first verify `WorkspaceActionRegistry` and the render path before adding new mappings.

## Move Assist / Analysis Relationship

- Move Assist is the user-facing control area for board assistance, pressure badges, hover identity helpers, and the board-side assist window toggle.
- Analysis remains the deeper evaluation panel.
- If future UI consolidation happens, preserve existing Analysis behavior unless explicitly migrating it into Move Assist.

## Rules For Future UI Work

- Do not duplicate menu entries after moving a tool.
- Use links/buttons from related settings pages instead of duplicate menu items.
- Keep complex workflows out of cramped side panels when they require table/edit/preview layouts.
- Preserve existing action IDs unless the task explicitly requires a migration.
- Do not add a view-specific Dock/Undock implementation when a shared floating/docked window shell can own it.
