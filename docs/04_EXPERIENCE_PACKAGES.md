# Experience Packages

Status: Current

ExperiencePackage is the reusable package/config/asset system. It is separate from Save/Resume game snapshots.

## Package Format

New packages are `.zip` files containing:

- `manifest.json`
- `experience.json`
- real media files under `assets/`

Expected asset folders include:

- `assets/pieces/`
- `assets/boards/`
- `assets/audio/`
- `assets/ui/`

JSON should reference media with `package://assets/...` paths instead of embedding giant base64/data-url blobs.

## Category Handling

Package categories include, where present:

- Visuals / Board / Pieces
- UI Appearance
- Timer
- Audio Settings
- Sound Library
- Sound Rules
- Audio Playlists
- Custom Events
- Animation Definitions
- Event Animation Rules
- Custom Rulesets / Custom Games
- Bot Settings
- Registered Bots
- Chat Settings
- Profile Identity
- Multiplayer Server Settings
- Compliance Policy

Missing categories should be shown as not included, not treated as errors. Unsupported categories should produce friendly warnings.

## Durable Imported Assets

Electron import persists media under:

`userData/assets/packages/[packageId]/...`

Imported media is referenced with stable `local-asset://` URLs. `electron/main.js` registers the local asset protocol and writes files through safe IPC exposed by `electron/preload.js`.

Browser/dev fallback may hydrate package assets as object URLs, which can be session-only.

## Package Manager Workflows

Current Package Manager flows in `src/views/ImportExportView.tsx`:

- Load Package
- Save Package
- Extract Package

Save Package is a two-step workflow:

1. choose categories
2. Prepare Package
3. Package Ready
4. Save Package / Save Zip

Extract Package produces a human-readable folder layout under:

`Themes/[package-name]/`

with folders such as pieces, boards, frames, backgrounds, audio, ui, events, animations, rules, bots, and `README_PACKAGE_CONTENTS.md`.

## Important Non-Goals

- Do not store active games in ExperiencePackage.
- Do not revert to base64 media storage.
- Do not redesign the package format unless explicitly requested.

## Related Files

- `src/packages/ExperiencePackage.ts`
- `src/views/ImportExportView.tsx`
- `src/context/SettingsContext.tsx`
- `electron/main.js`
- `electron/preload.js`

