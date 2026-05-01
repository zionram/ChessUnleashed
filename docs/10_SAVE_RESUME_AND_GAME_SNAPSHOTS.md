# Save/Resume and Game Snapshots

Status: Current foundation

Save/Resume is for active games in progress. ExperiencePackage is for reusable setup/config/assets/rules/events/sounds. Do not mix them by default.

## Game Snapshot

A Game Snapshot describes runtime game state, such as:

- game type: standard or custom
- timestamp and version
- board position / FEN for Standard Chess where available
- move history where available
- current turn
- result/game-over state
- timer runtime if safely available
- selected custom ruleset id for Custom Game
- custom board state for Custom Game
- basic player/profile labels

## Standard Chess Resume

Standard Chess snapshots should restore current board position, pieces, turn, move history, and result where existing runtime APIs support it. They must not change chess rules or replace chess.js/runtime behavior.

## Custom Game Resume

Custom Game snapshots describe local custom runtime state only:

- selected ruleset id
- board state
- current turn
- move history
- result

Runtime snapshots are not part of ExperiencePackage.

## Package Separation

Package Manager exports exclude live game-in-progress state by default. Normal packages should not contain current board position, turn, move history, timer runtime, or result.

If future UI adds "Include current game snapshot", it must be explicit and off by default.

## Snapshot Clearing

Snapshots may be cleared when the user intentionally starts fresh, resets, ends/exits a custom game, or starts a new game. Applied settings/config should not be cleared by snapshot actions.

## Related Files

- `src/runtime/GameSnapshot.ts`
- `src/context/GameContext.tsx`
- `src/views/CustomGameRuntimeView.tsx`
- `src/packages/ExperiencePackage.ts`
