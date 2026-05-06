# Multiplayer And Compliance

Status: Current foundation / Experimental areas remain.

Multiplayer exists with configurable LAN/server sources, host experience compliance foundations, and the first FICS internet chess provider path.

## LAN / Local Multiplayer

`src/views/MultiplayerView.tsx` provides multiplayer connection UI. `SettingsContext` stores multiplayer server configuration.

Current server-source concepts include:

- My Home Server
- Custom Server
- Official Server as coming later/disabled where applicable

Electron can start the bundled local server from `server/chessServer.js` through `electron/main.js`.

## FICS / Internet Chess Server

FICS support is now a separate online-provider path, not a replacement for LAN.

Current FICS capabilities:

- Let’s Play -> Online -> Open FICS
- Dockable FICS window with Online and Console tabs
- Electron TCP bridge to freechess.org:5000
- Safe preload bridge via `electron/preload.cjs`
- Guest login and registered account login flow
- External FICS registration link; account creation is handled by FICS, not Chess Unleashed
- `set style 12` requested after login
- Raw console log and raw command entry
- `sought` / Open Seeks parsing and Play buttons
- `games` parsing and Observe buttons
- Observe/unobserve support
- Style 12 board/clock parsing
- Main-board observe bridge
- Experimental main-board play bridge
- FICS timer display can override local timer visibility when FICS is active
- Board orientation options to prevent observed games from flipping every update
- Registry-style FICS command translator

FICS architecture boundary:

- FICS owns online server state, opponent, legal remote game state, clocks, ratings, result, and server messages.
- Chess Unleashed owns visuals, templates, board theme, pieces, local UI, packages, and experience presentation.
- `ChessBoard.tsx` must remain provider-agnostic. It sends generic board intent.
- `FicsGameTranslator.ts` converts generic app intents into FICS commands and converts FICS Style 12 into normalized app state.
- `GameContext.tsx` may route online state/move intent, but should not learn FICS command syntax directly.

## Compliance

Host compliance policy is defined in `src/packages/ExperienceCompliancePolicy.ts`.

Current intent:

- host-forced categories may require guests to apply host assets/config.
- allowOverride categories should preserve guest choices.
- missing host assets can be detected and applied from sync/package payloads where available.

## Asset Transfer Foundation

The multiplayer compliance foundation is designed to align with ExperiencePackage asset structure. It should not mix runtime game state into packages.

## Limitations

- FICS integration is experimental and needs live-server QA.
- FICS main-board playing has had command-translation issues; fixes must stay in translator/adapters, not `ChessBoard.tsx`.
- Timeseal is not implemented.
- FICS browser mode cannot use raw TCP. Browser support would require a backend/WebSocket relay.
- Official hosted matchmaking/accounts are Planned.
- Custom multiplayer games may still be Experimental.
- Full asset-transfer QA needs manual verification.

## Related Files

- `src/views/MultiplayerView.tsx`
- `src/views/FicsOnlineView.tsx`
- `src/views/FicsConsoleView.tsx`
- `src/views/FicsBoardPreview.tsx`
- `src/services/online/fics/FicsAdapter.ts`
- `src/services/online/fics/FicsGameTranslator.ts`
- `src/services/online/fics/FicsProtocolParser.ts`
- `src/services/online/fics/FicsTypes.ts`
- `src/context/GameContext.tsx`
- `src/context/SettingsContext.tsx`
- `src/packages/ExperienceCompliancePolicy.ts`
- `server/chessServer.js`
- `electron/main.js`
- `electron/preload.cjs`
