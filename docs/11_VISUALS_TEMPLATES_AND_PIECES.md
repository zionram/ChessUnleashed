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

## Current Floating Visual-Control Direction

The visual/tool UI should move toward the current mockup direction:

- floating glass panels
- compact icon rail
- dark/glass theme
- controls inside floating windows
- less fixed side-panel clutter
- real functionality only

Current known gap:

- Environment → Look → Pieces currently behaves like an “Open this workspace tool” card in the launcher tab.
- Desired behavior is for the actual Pieces controls to render directly inside the floating launcher window.
- This pattern should be reused for Board, Animation, Platform UI, Sound, Packages, and similar visual/config tools where existing real controls can be embedded.
- “Dock” should become a small secondary option inside the tool interface, not the primary card/action.

Do not fake this UI. If controls appear in the floating launcher, they must connect to the existing settings, template draft, package, or view action they represent.

## Platform UI

Platform appearance settings include UI color/appearance controls. Welcome/tips panel color should be controlled through existing UI appearance patterns, not hardcoded.

## Related Files

- `src/views/ThemeEditorView.tsx`
- `src/views/PlatformAppearanceView.tsx`
- `src/context/SettingsContext.tsx`
- `src/config/menuSchema.ts`
- `src/components/menu/DynamicMenu.tsx`
- `src/components/layout/FloatingWindow.tsx`
- `src/components/layout/Overlay.tsx`
- `src/views/SettingsPanelShellView.tsx`
