# Known Limitations and Roadmap

Status: Current release-candidate notes, updated with workspace-window roadmap

These items should be represented honestly in handoffs, release notes, and tester instructions.

## Needs Broader Testing

- Custom Game / Rule Builder: playable local custom games exist, but custom rules and custom-game runtime need deeper user testing.
- Package Manager: Load, Save, Extract, durable asset import, and real-file zip packaging are implemented, but large GIF/MP3/background packages need manual QA on real beta machines.
- Multiplayer: server sources, host compliance, and asset matching foundations exist, but multiplayer requires broader network and packaged-app testing.
- Electron packaged app: splash, build, Stockfish, durable assets, package workflows, and local server behavior need release-candidate smoke tests.

## Experimental / Partial

- Custom multiplayer games are not complete.
- Bot support for Custom Game is not complete.
- Full cloud/server account system is not implemented.
- Official profiles/accounts/rankings are future work.
- Browser mode durable imported asset persistence may be session-only.
- Settings Builder and Validation may need clarification before being presented as fully finished.

## Workspace / Windowing Roadmap — 2026-05-03

Current verified:

- Left launcher root icons open floating category windows.
- Launcher category content uses tabs instead of vertical `DynamicMenu` rows.
- Old `launcher-sub-panel` behavior was identified as wrong and removed from active launcher behavior.
- Launcher category window can be dragged by its title bar.

Still partial / future:

- Launcher window resize handle is not yet verified complete.
- Launcher window position persistence is not decided.
- Per-category remembered window positions/tabs are not decided.
- Multiple simultaneous launcher windows are not implemented.
- Reusable `FloatingWindow` extraction is future work.
- Dockable/detachable tabs are future work.
- The chessboard as a movable non-dockable board-stage object is future work.
- Board-stage movement should be intentional, likely through design mode, right-click “Move Board,” modifier drag, or a hidden handle.

Do not claim a full window manager exists yet.

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

## Package Roadmap

Current packages are reusable setup/config/assets packages.

Runtime game snapshots are separate.

Future work may add explicit optional save-slot exports, cloud sync, or manual snapshot management, but those must not be mixed into normal ExperiencePackage exports by default.

## Release Rule

If uncertain, mark a system as Needs verification instead of claiming it is complete.
