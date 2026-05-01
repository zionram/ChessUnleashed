# Save Resume And Game Snapshots

Status: Current foundation

Game Snapshot is separate from ExperiencePackage.

## Distinction

ExperiencePackage:

- reusable setup/config/assets/rules/events/sounds
- shareable package data
- no active game-in-progress runtime state

Game Snapshot:

- current game in progress
- board state / FEN where supported
- turn
- move/history
- result
- selected custom ruleset reference/state for Custom Game
- runtime-only fields

## Standard Chess Resume

Standard Chess snapshots are handled through `GameContext` and snapshot helpers. Existing chess rules/chess.js behavior should not be changed for snapshot work.

## Custom Game Resume

Custom Game snapshots are handled separately from ExperiencePackage. They should include runtime board state, turn, history, result, and selected ruleset reference/state.

## Safety Rules

- Validate snapshot version before restoring.
- Ignore invalid/stale snapshots safely.
- Do not use browser confirm prompts for resume/start-fresh choices.
- Clear snapshots when the user intentionally starts fresh, resets, or exits where appropriate.
- Do not include runtime snapshots in exported ExperiencePackages.

## Related Files

- `src/runtime/GameSnapshot.ts`
- `src/context/GameContext.tsx`
- `src/views/CustomGameRuntimeView.tsx`
- `src/packages/ExperiencePackage.ts`

