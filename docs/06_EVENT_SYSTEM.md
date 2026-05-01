# Event System

Status: Current with planned tactical expansion

The Event system has three distinct pieces:

- Event Builder: reusable custom event definitions.
- Event Log: gameplay/system action history.
- Troubleshooter: error/debug reports.

Event Log and Troubleshooter must remain separate.

## Event Builder

`src/views/EventBuilderView.tsx` manages custom event definitions. It uses Simple / Advanced / System layers.

Current capabilities:

- create/edit/delete custom events
- templates
- validation
- test/simulate event payloads
- condition matching
- Attach Sound workflow
- Attach Animation workflow
- raw JSON preview/copy

Supported simple triggers include:

- after move
- piece moved
- piece captured
- promotion
- check
- checkmate
- game start
- game end
- panel opened

Supported condition fields include:

- piece type
- team
- from square
- to square
- captured piece
- attacked piece
- panel/view id
- trigger type

## Tactical Events

Current limited tactical support:

- piece attacks target piece
- piece is attacked
- simple fork

Planned/future tactical support:

- pin
- trapped piece
- no safe move

Future-only tactical events must not falsely fire.

## Runtime Integration

Runtime event evaluation is handled through the custom event runtime and Standard Chess event emission. Sound Rules and Animation Rules can listen to active custom events.

## Related Files

- `src/views/EventBuilderView.tsx`
- `src/events/CustomEventRuntime.ts`
- `src/context/GameContext.tsx`
- `src/views/EventLogView.tsx`
- `src/views/TroubleshooterView.tsx`
- `src/utils/ErrorLog.ts`

