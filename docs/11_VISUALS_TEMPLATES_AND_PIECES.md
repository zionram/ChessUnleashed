# Visuals Templates And Pieces

Status: Current

The visuals/template system owns game appearance and template-owned visual layout defaults. It must not own gameplay rules or runtime snapshots.

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

## Built-In Obsidian Theme

The built-in Obsidian theme should be a bundled default-theme folder, not just a zip loaded at runtime:

```txt
src/assets/default-themes/obsidian/
  experience.json
  manifest.json
  images/
  music/
```

Rules:

- `src/assets/default-themes/obsidian/experience.json` is the source of truth for the built-in Obsidian default.
- `src/assets/default-themes/obsidianDefaultTheme.ts` loads and normalizes that source.
- The loader must not define a competing theme through unrelated hardcoded visual fallbacks.
- Already-correct `/src/assets/default-themes/obsidian/...` paths must not be rewritten into doubled paths.
- Built-in reset/default behavior should not let stale localStorage layer values override Obsidian's source-of-truth template.

Current intended Obsidian defaults include:

- Background image from `images/backgrounds/background.png`.
- Board overlay from `images/boards/board75.png`.
- No unwanted frame layer unless explicitly specified by the template.

## Workspace Chrome As Template-Owned Visual Default

Visual layout defaults that are part of the app's look should be template-owned where supported:

- HUD safe areas and default positions.
- Board controls HUD default placement.
- Activity/status HUD default placement.
- Side palette/workspace safe margins.
- Launcher/window default sizes and offsets, if represented in the template.

`App.tsx` may hold live drag state, but it should not be the long-term source of truth for visual defaults that belong to the active template.

CSS should style the HUD/window surfaces, not override template-owned placement with `left/right/bottom !important`.

## Visual Areas

Environment -> Look includes:

- Pieces
- Board
- Squares
- Paths
- Layers
- Themes
- Background
- Animation
- Platform UI

## Platform UI

Platform appearance settings include UI color/appearance controls. Welcome/tips panel color should be controlled through existing UI appearance patterns, not hardcoded.

## Related Files

- `src/views/ThemeEditorView.tsx`
- `src/views/BackgroundView.tsx`
- `src/views/LayersView.tsx`
- `src/views/PlatformAppearanceView.tsx`
- `src/context/SettingsContext.tsx`
- `src/config/menuSchema.ts`
- `src/assets/default-themes/obsidian/experience.json`
- `src/assets/default-themes/obsidianDefaultTheme.ts`
