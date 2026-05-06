# Chat 7 UI Handoff

Status: Current handoff for next chat

## Verified Stable State

- Left Tool Palette floats over the background.
- Left Tool Palette drags by header.
- Expanded Tool Palette resizes horizontally and vertically.
- Collapsed Tool Palette becomes icon-only rail.
- Selected launcher icons remain visible.
- Let’s Play overlay opens centered/on top from both top New and left launcher.
- Let’s Play dark/glass theming is restored.
- Let’s Play scrollbar uses dark/glass style.
- Redundant right Workspace quick buttons were removed.
- Redundant inner Workspace button/tab was removed.
- Chessboard glass shell drags by grabbing the glass around the board.
- Double-clicking the board glass shell resets the board position.
- Board drag should not interfere with piece/square dragging.

## Current Next Task

Environment launcher tabs currently show “Open” cards for tools like Pieces.

Desired behavior:

- Environment → Look → Pieces renders actual Pieces controls inside the floating launcher window.
- Same direction for Board, Animation, Platform UI, Sound, Packages, etc.
- Dock should be a small secondary option inside the interface, not the main action.
- The tab should not just say “Open this workspace tool.”
- It should behave like a floating control panel.

## Design Direction

- Floating glass panels.
- Compact icon rail.
- Dark/glass theme.
- Controls in floating windows.
- Less fixed side-panel clutter.
- No fake UI.
- Real functionality only.

## Important Notes

- Do not hide SVG internals while removing launcher arrows.
- Do not add fake tabs/history/activity/help/status.
- If it looks like a feature, wire it to real state/action.
- Keep changes small and scoped.
