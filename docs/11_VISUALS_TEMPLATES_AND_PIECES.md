# Visuals Templates And Pieces

Status: Current, with board-overlay color-layer notes

The visuals/template system owns game appearance only. It must not own gameplay rules or runtime snapshots.

## Theme And Piece Set Workflow

`src/views/ThemeEditorView.tsx` contains the guided Piece Set workflow:

1. Source
2. Arrange
3. Finalize

Current behavior:

- choose built-in set
- upload multiple custom images
- auto-detect common piece filenames
- keep unassigned uploads available
- arrange staged piece slots
- mix built-in fallback and custom images where supported
- preserve variants/extra styles
- preview staged draft
- apply finalized piece set

Important rule:

- Apply to Draft updates draft/board preview but does not leave Arrange or clear the assignment preview.
- Finalize is the only action that moves to the final step.

## Visual Areas

Environment → Look includes:

- Pieces
- Board
- Squares
- Paths
- Layers
- Themes
- Animation
- Platform UI

## Platform UI

Platform appearance settings include UI color/appearance controls.

Welcome/tips panel color should be controlled through existing UI appearance patterns, not hardcoded.

## Board Overlay Color Layer — 2026-05-03

A board-overlay color layer was added as an optional tinting aid.

Expected behavior:

- The color layer must be off/invisible by default.
- It must render only when explicitly enabled and opacity is greater than zero.
- It must tint only the board area/squares, not the workspace background or an outer board shell.
- It must not create an orange/brown frame around the board.
- It must not break board overlay image rendering.
- It must not interfere with highlights, pieces, coordinates, or animations.

Expected render order:

1. board squares/base
2. optional board overlay color tint
3. optional board overlay image
4. highlights / pieces / coordinates / animations

Implementation rule:

```tsx
boardOverlay.colorEnabled === true
&& boardOverlay.color
&& (boardOverlay.colorOpacity ?? 0) > 0
```

Related build note:

After removing the thick border that used `boardColors.dark`, `boardColors` may become unused in `ChessBoard.tsx`.

Use:

```tsx
const { boardOverlay } = settings.template;
```

instead of:

```tsx
const { boardColors, boardOverlay } = settings.template;
```

## Related Files

- `src/views/ThemeEditorView.tsx`
- `src/views/LayersView.tsx`
- `src/components/board/ChessBoard.tsx`
- `src/templates/defaultTemplate.ts`
- `src/templates/darkTemplate.ts`
- `src/context/SettingsContext.tsx`
- `src/views/PlatformAppearanceView.tsx`
- `src/config/menuSchema.ts`
