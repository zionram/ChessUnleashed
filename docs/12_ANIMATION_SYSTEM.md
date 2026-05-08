# Animation System

Status: Current foundation with event-triggered overlays

Chess Unleashed has two animation concepts:

- Animation Settings: user defaults for normal movement animation
- Animation Builder: reusable named animation definitions that can be called by event actions

## Animation Settings

Environment → Look → Animation controls the default movement animation.

Current settings include:

- enabled/disabled
- selected default movement animation
- movement speed/duration
- easing where supported
- capture/promotion animation flags where supported
- movement scope: all/both sides, my pieces, opponent pieces, white pieces, black pieces
- active-state/apply feedback
- preview controls that are intuitive and can loop/restart when settings change

The UI should show the current effective default clearly. Snap/no animation is the fallback when animations are disabled or Snap is selected.

## Standard Chess Movement Animation

Standard Chess piece movement animation applies to both local/player moves and opponent/bot moves when enabled and within scope. Local moves use the same visual staging path as bot/opponent moves. Bot/opponent turn response is delayed until the player's configured movement animation finishes, unless animation is disabled or Snap/no animation is selected.

Captures and promotions should continue to use legal game state and should not break animation.

## Priority

Animation priority:

1. Event-triggered Animation Rules / special overlays
2. Variant/special animation support if present
3. Default movement animation from Environment → Look → Animation
4. Snap/no animation fallback

Event-triggered animations are visual overlays and should not mutate game state or block normal moves.

## Animation Builder

Animation Builder is under Advanced → Gaming and opens as a center-panel workflow similar to Sound Editor.

It manages reusable Animation Definitions:

- built-in protected presets
- custom named animations
- create/edit/delete/duplicate/test controls
- Simple / Advanced / System editor layers
- preview through `AnimationPreviewCard`

Built-ins are protected from destructive edits. Users can duplicate built-ins into custom definitions. Animation Builder's polished table/card layout is the reference style for Sound Editor and Event Builder.

## Event Animation Rules

Animation Rules connect events to named animations.

Initial target options include:

- moved piece
- captured piece
- source square
- target square
- board

If runtime target data is unavailable, the rule should fail safely with lightweight feedback, not crash.

## Related Files

- `src/views/AnimationSettingsView.tsx`
- `src/views/AnimationBuilderView.tsx`
- `src/components/animation/AnimationPreviewCard.tsx`
- `src/components/board/ChessBoard.tsx`
- `src/context/GameContext.tsx`
- `src/context/SettingsContext.tsx`
- `src/views/EventBuilderView.tsx`
