# Known Limitations and Roadmap

Status: Current release-candidate notes.

These items should be represented honestly in handoffs, release notes, and tester instructions.

## Needs Broader Testing

- Custom Game / Rule Builder: playable local custom games exist, but custom rules and custom-game runtime need deeper user testing.
- Package Manager: Load, Save, Extract, durable asset import, and real-file zip packaging are implemented, but large GIF/MP3/background packages need manual QA on real beta machines.
- Multiplayer: server sources, host compliance, and asset matching foundations exist, but multiplayer requires broader network and packaged-app testing.
- FICS: connect/login/seek/observe/main-board bridge exists, but live play, move sending, clocks, orientation, shutdown behavior, parser formats, and account/login paths need repeated packaged-app testing.
- Electron packaged app: splash, build, Stockfish, durable assets, package workflows, local server behavior, FICS TCP bridge, and preload bridges need release-candidate smoke tests.
- Theming foundation: many registered views still need semantic class cleanup; broad CSS overrides may affect unrelated UI unless carefully scoped.
- Packaging/performance: release size and startup time need measured audit before optimization/refactor work.

## Experimental / Partial

- Custom multiplayer games are not complete.
- Bot support for Custom Game is not complete.
- Full cloud/server account system is not implemented.
- FICS Timeseal is not implemented.
- Browser-based FICS is not supported because browsers cannot open raw TCP to FICS; future browser support would require a backend/WebSocket relay.
- FICS account registration is external via the official FICS website.
- Official profiles/accounts/rankings are future work.
- Browser mode durable imported asset persistence may be session-only.
- Settings Builder and Validation may need clarification before being presented as fully finished.

## Tactical Events

Current limited tactical event support includes attacked-piece detection and simple fork detection.

Future tactical detection:

- pin
- trapped piece
- no safe move
- deeper tactical evaluation

These must remain marked future/unsupported until implemented.

## Animation Roadmap

Current animations include default movement animation, named animation definitions, event-triggered overlays, and board/target/piece-style targets.

Future animation work may include:

- deeper keyframes/timelines
- richer target resolution
- broader custom-game animation support
- more detailed per-piece/per-side animation policy

## Visual / Theme Roadmap

Current direction:

- Built-in default theme images should live under `src/assets/default-themes/<theme-name>/`.
- User-imported images should use durable asset storage / `local-asset://`.
- Experience package assets should use package asset manifests and package/local asset references.

Pending UI polish:

- Background should become its own higher-level Environment -> Look tab.
- Lower HUD/status strips need better theme alignment and centered content.
- Docked workspace panels need an Undock option.
- Floating-window embedded views should use explicit shared theme classes.
- Sound Editor docked/wide layout needs tighter spacing to avoid needless horizontal overflow.

## Package Roadmap

Current packages are reusable setup/config/assets packages. Runtime game snapshots are separate.

Future work may add explicit optional save-slot exports, cloud sync, or manual snapshot management, but those must not be mixed into normal ExperiencePackage exports by default.

## Optimization Roadmap

Before optimization, measure:

- fresh `release` output size
- largest packaged files
- `dist` bundle size
- node_modules contributors
- Stockfish/WASM size
- source maps / TypeScript sources accidentally included
- startup services

Likely future actions:

- clean old `release` artifacts before measuring
- consider `asar: true` with targeted `asarUnpack`
- exclude source maps, TypeScript, logs, zips, and release artifacts from packaged output
- lazy-load heavy views
- delay LAN/FICS services until used

## Release Rule

If uncertain, mark a system as Needs verification instead of claiming it is complete.
