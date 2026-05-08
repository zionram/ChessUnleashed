# Experience Packages

Status: Current with real-file ZIP package behavior

ExperiencePackage is the reusable package/config/asset system. It is intentionally separate from Save/Resume game snapshots.

## Package Manager

The user-facing package tool is Package Manager, with these workflows:

- Load Package
- Save Package
- Extract Package

The UI should use package wording, not older “set download” wording.

## Normal Open / Save Semantics

Topbar Open should mean the normal package import path:

1. Open
2. Load Package
3. choose the original `.zip`
4. import/apply selected package categories

Topbar Save should mean the normal package export path:

1. Save
2. choose categories if needed
3. Prepare Package
4. Package Ready
5. Save Package / Save Zip

Open should not default to Extract Package. Save should not merely open a confusing package manager landing page.

## Package Format

Current packages are `.zip` files containing:

- `manifest.json`
- `experience.json`
- `PACKAGE_ASSET_AUDIT.json`
- real media files under `assets/`

Expected asset folders include:

- `assets/pieces/`
- `assets/boards/`
- `assets/backgrounds/`
- `assets/audio/`
- `assets/ui/`
- `assets/misc/`

JSON should reference media with `package://assets/...` paths. Package exports must not leave final `blob:` or `data:` references in `experience.json`.

## Real File Asset Rule

The final package must be portable and inspectable:

- media assets are real files inside the ZIP
- JSON points to package-relative `package://assets/...` references
- package export should fail or warn if final JSON still contains `blob:` or `data:` references
- the package audit should report asset count, byte totals, and per-asset package paths

Temporary browser `Blob`/`ArrayBuffer` usage is acceptable only as an implementation bridge while writing the ZIP. It is not acceptable as the saved durable package reference.

## Stale Blob Failure Pattern

A package failure like:

```text
Package media collection failed for "smbJump" at item 2/17 (blob): Failed to fetch
```

means the active export data still contains a session-only `blob:` URL. That asset must be re-imported or converted into a stable asset reference before export.

Future package diagnostics should include:

- item index/total
- owning field/path label
- source URL type
- output package path
- byte size where known
- original error message

## Category Handling

Package categories include, where present:

- Visuals / Board / Pieces
- Background / Background slideshow images
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

Normal Package Manager exports do not include active game-in-progress state by default.

Do not include:

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

```text
userData/assets/packages/[packageId]/...
```

Imported media is referenced with stable `local-asset://` URLs. `electron/main.js` owns the local asset protocol and durable file IPC. `electron/preload.js` exposes the safe renderer bridge. Browser/dev fallback may hydrate package assets as object URLs, which can be session-only.

## Extract Package

Extract Package does not apply package contents to the app. It creates a human-readable output layout for inspection, manual editing, source sharing, or debugging.

Because normal package ZIPs now contain real inspectable files, Extract Package should be treated as an advanced/secondary tool, not the main Open behavior.

## Related Files

- `src/packages/ExperiencePackage.ts`
- `src/views/ImportExportView.tsx`
- `src/context/SettingsContext.tsx`
- `electron/main.js`
- `electron/preload.js`
