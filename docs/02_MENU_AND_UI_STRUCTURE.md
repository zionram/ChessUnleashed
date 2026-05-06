# Menu And UI Structure

Status: Current, with active windowing/theming polish.

The current menu structure is defined in `src/config/menuSchema.ts`. Views are registered and positioned in `src/App.tsx`.

## Top-Level Menu Order

1. Let’s Play
2. Environment
3. Tools
4. Advanced

## Let’s Play

Let’s Play is the user-facing entry point for starting or joining games.

Current opponent/setup directions:

- Local Player
- Play vs Bot
- LAN
- Online

Online currently includes FICS as the first real internet chess provider:

- Let’s Play -> Online -> Open FICS
- Opens one normal dockable FICS floating window with:
  - Online tab
  - Console tab

FICS should remain reachable from the gameplay flow. Do not hide FICS login/play controls only in global settings.

## Environment

Current Look/Sound/Platform direction:

- Look
  - Pieces
  - Board
  - Squares
  - Paths
  - Layers
  - Themes
  - Animation
  - Platform UI
  - Background planned as a higher-level Look tab, not buried under Board/Layers controls.
- Sound
  - Audio Settings
  - Sound Editor / Sound Rules / Sound Library where currently wired.
- Load / Save Sets opens the Package/Appearance workflow depending on current view wiring.

## Tools

Current and/or registered tools include:

- Chat
- Bots
- FICS Online
- Import / Export
- Rule Builder
- History
- Stats
- Analysis
- Move Assist

## Advanced

Current and/or registered advanced areas include:

- Gaming
- FICS Console
- Sound Editor
- Event Builder
- Animation Builder
- Event Log
- System
- Troubleshooter
- Validation
- Settings Builder
- Reset System
- AI Package Builder / Active Template Audit where currently wired.

## Floating Windows And Docking

Current verified direction:

- Launcher submenu items open in floating windows with real controls, not placeholder “Open this tool” cards.
- Multiple launcher windows can be open simultaneously.
- Floating windows are draggable, resizable, closeable, and click-to-front.
- Outer tabs can detach into floating windows and dock back into compatible launcher tab rows.
- Nested tabs can detach into floating windows and dock back into compatible nested tab rows.
- Drag feedback/ghosting exists while dragging tabs/windows.
- Floating windows can dock into the right workspace.
- Docked workspace panels stack visibly instead of hiding behind flat tabs.
- Docked panels have minimize/close controls.
- Undock option for docked workspace panels is planned.

## Lower HUD / Status Strips

The lower HUD/status-control strips are movable and optional:

- Activity / turn / active tools panel
- Board / Timer / Scale controls panel

Desired polish still pending:

- right-side theming alignment
- text centered instead of left-aligned
- text/content should shift cleanly when hover-only close button appears

## Panel Placement

Verified/expected patterns:

- Sound Editor opens as a center or wide workflow where currently wired.
- Animation Builder opens as a center workflow.
- Custom Game runtime renders in the center when an active custom ruleset is started.
- FICS Online/Console open as a single FICS hub window from Let’s Play -> Online and also remain usable as registered views/tools.
- Registered views should render inside shared themed wrappers where possible.

## Rules For Future UI Work

- Do not duplicate menu entries after moving a tool.
- Use links/buttons from related settings pages instead of duplicate menu items.
- Keep complex workflows out of cramped side panels when they require table/edit/preview layouts.
- Preserve existing action IDs unless the task explicitly requires a migration.
- Do not create one-off popups when the floating launcher/docked panel system can handle it.
- Registered views should use shared classes/wrappers instead of broad CSS fishing-net selectors.
