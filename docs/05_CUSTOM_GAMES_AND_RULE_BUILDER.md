# Custom Games And Rule Builder

Status: Current / Experimental runtime

Rule Builder creates reusable custom ruleset metadata. Standard Chess remains built-in and protected.

## Current Capabilities

Current Rule Builder foundation supports:

- custom ruleset metadata
- board width/height
- teams
- custom piece definitions
- movement metadata
- capture/jump metadata
- forced capture metadata
- multi-jump metadata
- promotion metadata
- win-condition metadata
- starting setup metadata
- turn-order metadata
- validation
- import/export of custom rulesets
- approval flow
- test sandbox
- approved local Custom Game runtime for supported rulesets

The Checkers template is available as editable metadata and is intended as the design test target.

## Custom Game Runtime

`src/views/CustomGameRuntimeView.tsx` is separate from Standard Chess. It supports the sandbox-playable rule subset:

- setup rendering
- Step/Jump movement
- jump captures
- forced capture
- multi-jump
- promotion
- basic win detection
- local reset/end/history

This runtime must not modify Standard Chess or replace chess.js.

## Standard Chess Protection

- Standard Chess is not editable.
- Loading Standard Chess rules creates a custom copy only.
- Custom Game activation must stay separate from the Standard Chess path.

## Limitations

- Custom multiplayer is Planned/Experimental.
- Custom bot support is Planned.
- Full custom movement scripting is Planned.
- Complex win-condition engines are not complete.
- Custom Game animation support may be limited.

## Related Files

- `src/views/RuleBuilderView.tsx`
- `src/views/CustomGameRuntimeView.tsx`
- `src/views/LetsPlaySetupView.tsx`
- `src/rules/RulePackages.ts`
- `src/context/SettingsContext.tsx`

