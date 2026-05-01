# Event System

Status: Current with limited tactical detection

The event system lets users define reusable custom event definitions, test them, and attach sound or animation actions. Event Log and Troubleshooter remain separate.

## Event Builder

Event Builder is under Advanced -> Gaming and opens as a center-panel tool. It uses Simple, Advanced, and System layers:

- Simple: guided templates and common filters.
- Advanced: condition groups and condition summaries.
- System: raw JSON preview, validation/status, diagnostics, and copy JSON.

Event Builder should not render a duplicate internal title when the panel shell already owns the title.

## Supported Runtime Events

Current simple event support includes, where runtime payloads provide the needed data:

- after move
- piece moved
- piece captured
- promotion
- check
- checkmate
- game start
- game end
- panel opened

Limited tactical support exists for:

- piece attacked
- queen attacked through attacked-piece matching
- simple fork

Simple fork is intentionally limited: a piece attacks two or more valuable enemy pieces after a move. It is not a full tactical engine.

## Future / Unsupported Tactical Events

These remain planned/future and must not falsely fire:

- pin
- trapped piece
- no safe move

If surfaced in UI, they should be marked Future-only or Unsupported.

## Sound and Animation Actions

Valid active events can attach:

- Sound Rules through Sound Editor.
- Animation Rules through Animation Builder/Event Builder attachment flow.

Future-only or invalid events should block or clearly warn before attachment.

## Event Log

Event Log records gameplay/system actions, including custom event fires and lightweight sound/animation feedback. It is not for errors.

## Troubleshooter

Troubleshooter records errors/debug reports. Do not merge it with Event Log.

## Related Files

- `src/views/EventBuilderView.tsx`
- `src/events/CustomEventRuntime.ts`
- `src/events/EventBus.ts`
- `src/events/EventLogger.ts`
- `src/events/EventTriggerSystem.ts`
- `src/views/EventLogView.tsx`
- `src/views/TroubleshooterView.tsx`
- `src/context/GameContext.tsx`
