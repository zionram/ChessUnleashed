# Bots And Engines

Status: Current

Chess Unleashed supports built-in bots and registered custom browser-worker UCI bots.

## Current Bot Types

- Training Bot
- Random Bot
- registered custom bots
- browser-worker / URL UCI engines
- default Stockfish worker bot when bundled files exist

The default Stockfish worker path is:

`/engines/stockfish/stockfish-18-lite-single.js`

The app should not bundle or commit a Stockfish Windows `.exe`. Browser worker files belong under `public/engines/stockfish/` when used for beta distribution.

## Registered Bots

Registered bot configs persist through `SettingsContext`. Tools → Bots supports management actions such as add/edit/remove/test where available.

The Computer Opponent controller uses registered bots in the engine selector so Stockfish-style bots can appear alongside built-ins.

## UCI Worker Adapter

`src/engines/UciWorkerAdapter.ts` provides a minimal browser-worker UCI path:

- load worker from configured URL/path
- send UCI startup messages
- send position/search commands
- parse `bestmove`
- report friendly load/test failures

Live Standard Chess bot turns can use async worker move generation while built-in bots stay on their existing path.

## Guardrails

- Do not rewrite the bot architecture.
- Do not touch Stockfish adapter when doing UI-only bot work.
- Do not remove registered bot management.
- Do not make custom game bots until explicitly requested.

## Related Files

- `src/views/BotsView.tsx`
- `src/views/ComputerOpponentView.tsx`
- `src/context/SettingsContext.tsx`
- `src/context/GameContext.tsx`
- `src/engines/UciWorkerAdapter.ts`

