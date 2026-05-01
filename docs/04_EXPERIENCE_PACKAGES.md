# Experience Packages

Status: Current

ExperiencePackage is the reusable package/config/asset system. It is intentionally separate from Save/Resume game snapshots.

## Package Manager

The user-facing package tool is Package Manager, with three main workflows:

- Load Package
- Save Package
- Extract Package

The UI should use package wording, not older "set download" wording. Load and Extract now show visible step/status/error messages instead of failing silently.

## Package Format

Current packages are `.zip` files containing:

- `manifest.json`
- `experience.json`
- real media files under `assets/`

Expected asset folders include:

- `assets/pieces/`
- `assets/boards/`
- `assets/audio/`
- `assets/ui/`

JSON should reference media with `package://assets/...` paths. New package exports must not store giant base64/data-url media blobs in JSON.

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

## Live Game State Rule

Normal Package Manager exports do not include active game-in-progress state by default. Do not include:

- current board position
- current turn
- move history
- timer runtime
- game result
- live match state
- current custom runtime board state

Game-in-progress state belongs to Game Snapshot. If package support for snapshots is added later, it must be an explicit opt-in category and unchecked by default.

## Durable Imported Assets

Electron import persists media under:

`userData/assets/packages/[packageId]/...`

Imported media is referenced with stable `local-asset://` URLs. `electron/main.js` owns the local asset protocol and durable file IPC. `electron/preload.js` exposes the safe renderer bridge.

Browser/dev fallback may hydrate package assets as object URLs, which can be session-only.

## Load Package

Load Package should:

- accept a `.zip`
- read manifest/experience metadata first
- show a lightweight preview and category checklist
- apply only selected categories
- hydrate/persist selected media assets where supported
- show visible success or failure

## Save Package

Save Package is a two-step workflow:

1. choose categories
2. Prepare Package
3. Package Ready
4. Save Package / Save Zip

The preparation flow gathers selected settings/assets only after the user starts it. Large GIF/MP3/media packages should not be eagerly decoded just from opening the screen.

## Extract Package

Extract Package does not apply package contents to the app. It creates a human-readable output layout under:

`Themes/[package-name]/`

Expected folders include pieces, boards, frames, backgrounds, audio, ui, events, animations, rules, bots, misc, plus `README_PACKAGE_CONTENTS.md`.

## Related Files

- `src/packages/ExperiencePackage.ts`
- `src/views/ImportExportView.tsx`
- `src/context/SettingsContext.tsx`
- `electron/main.js`
- `electron/preload.js`
