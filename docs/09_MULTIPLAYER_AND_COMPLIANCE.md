# Multiplayer And Compliance

Status: Current foundation / Experimental areas remain

Multiplayer exists with configurable server sources and host experience compliance foundations.

## Server Sources

`src/views/MultiplayerView.tsx` provides multiplayer connection UI. `SettingsContext` stores multiplayer server configuration.

Current server-source concepts include:

- My Home Server
- Custom Server
- Official Server as coming later/disabled where applicable

Electron can start the bundled local server from `server/chessServer.js` through `electron/main.js`.

## Compliance

Host compliance policy is defined in `src/packages/ExperienceCompliancePolicy.ts`.

Current intent:

- host-forced categories may require guests to apply host assets/config.
- allowOverride categories should preserve guest choices.
- missing host assets can be detected and applied from sync/package payloads where available.

## Asset Transfer Foundation

The multiplayer compliance foundation is designed to align with ExperiencePackage asset structure. It should not mix runtime game state into packages.

## Limitations

- Official hosted matchmaking/accounts are Planned.
- Custom multiplayer games may still be Experimental.
- Full asset-transfer QA needs manual verification.

## Related Files

- `src/views/MultiplayerView.tsx`
- `src/context/GameContext.tsx`
- `src/context/SettingsContext.tsx`
- `src/packages/ExperienceCompliancePolicy.ts`
- `server/chessServer.js`
- `electron/main.js`

