# Settings And Persistence

Status: Current

`src/context/SettingsContext.tsx` is the primary owner of persistent user configuration. It should remain the single source of truth for applied settings and configuration values.

## Current Persistent Areas

Verified or referenced in `SettingsContext` and package category handling:

- Visual/template settings
- UI appearance and platform UI settings
- Timer settings
- Chat settings
- Audio settings
- Sound Library metadata
- Sound Rules
- Audio playlists
- Bot settings
- Registered bots
- Bot personality profiles
- Local profile identity
- Multiplayer server settings
- Compliance policy settings
- Custom rulesets
- Custom events
- Animation definitions
- Animation rules
- Imported asset registry metadata

## Persistence Boundary

Persistent settings/config:

- belongs in `SettingsContext`.
- may be included in ExperiencePackage categories when reusable/shareable.

Runtime game state:

- belongs in Game Snapshot storage.
- must not be mixed into ExperiencePackage.

Temporary drafts:

- should not overwrite applied settings unless the existing apply flow is used.
- should not create stale unsaved-warning behavior after refresh unless intentionally restored.

## Imported Asset Metadata

Imported assets should persist as metadata only in settings:

- asset id
- original package path
- durable reference such as `local-asset://...`
- mime type/category/display name/source package

Binary media must not be stored directly in settings/localStorage.

## Related Files

- `src/context/SettingsContext.tsx`
- `src/packages/ExperiencePackage.ts`
- `src/runtime/GameSnapshot.ts`
- `electron/main.js`
- `electron/preload.js`

