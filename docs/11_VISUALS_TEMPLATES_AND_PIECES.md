# Visuals Templates And Pieces

Status: Current

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

Important rule: Apply to Draft updates draft/board preview but does not leave Arrange or clear the assignment preview. Finalize is the only action that moves to the final step.

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

Platform appearance settings include UI color/appearance controls. Welcome/tips panel color should be controlled through existing UI appearance patterns, not hardcoded.

## Related Files

- `src/views/ThemeEditorView.tsx`
- `src/views/PlatformAppearanceView.tsx`
- `src/context/SettingsContext.tsx`
- `src/config/menuSchema.ts`

