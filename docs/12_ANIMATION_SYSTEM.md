# Animation System

Status: Current foundation

Animation has two related but separate systems:

- Animation Settings: user defaults for normal movement animation.
- Animation Builder: reusable named animation definitions.

## Animation Settings

Environment → Look → Animation controls defaults such as movement animation behavior. Settings persist through `SettingsContext`.

Standard Chess movement animation is current. Snap/no-animation should behave as instant movement.

## Animation Builder

Animation Builder is under Advanced → Gaming and opens as a center-panel workflow. It manages reusable `AnimationDefinition` records with stable IDs.

Current built-in protected presets include:

- Snap / No Animation
- Slide
- Fast Slide
- Bounce
- Hop
- Shake
- Pulse
- Capture Pop
- Promotion Glow
- Board Flash

Custom animations can be created, duplicated from built-ins, edited, deleted, and previewed.

## Event-Triggered Animations

Animation Rules connect custom/built-in events to animation definitions. Event Builder supports Attach Animation for active events.

Initial targets include:

- moved piece
- captured piece
- source square
- target square
- board

Triggered animations use transient overlay/playback and must not mutate game state or block normal movement.

## Limitations

- Full keyframe/timeline scripting is Planned.
- Custom Game animation support may be limited.
- Unsupported/future-only events should not pretend to trigger animations.

## Related Files

- `src/views/AnimationSettingsView.tsx`
- `src/views/AnimationBuilderView.tsx`
- `src/components/animation/AnimationPreviewCard.tsx`
- `src/views/EventBuilderView.tsx`
- `src/context/SettingsContext.tsx`
- `src/context/GameContext.tsx`

