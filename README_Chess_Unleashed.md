# Chess Unleashed

Chess Unleashed is a modular chess and custom-game platform built around customizable visuals, pieces, sounds, events, bots, and rules. It includes Standard Chess, a Stockfish browser-worker bot path, a custom game/ruleset builder, event-driven sound rules, audio controls, import/export packages, and experimental multiplayer/compliance tools.

> Status: Beta / active development. Some systems are stable enough to test, while others are experimental or still being expanded.

## Features

### Standard Chess
- Standard chess gameplay powered by the existing chess engine flow.
- Move validation, turn tracking, game-end handling, undo/rematch flows, and bot play support.
- Protected core gameplay: Standard Chess should remain stable and should not be modified by custom game rules.

### Custom Games and Rule Builder
- Create custom game rulesets using a Simple / Advanced / System workflow.
- Define board size, teams, pieces, movement, captures, promotions, win conditions, setup, and turn order.
- Includes a Checkers-style template and a custom-game runtime for supported rulesets.
- Custom games are separate from Standard Chess.

### Visual Customization
- Template-driven visual system.
- Custom piece images and animated GIF piece support.
- Piece editor and bulk import workflow.
- Layered board/background/frame visual system.

### Sound and Audio
- Rules-first Sound Editor for assigning sounds to events.
- Sound Library for uploaded audio files.
- Audio Controller with playlist/background music foundation.
- Functional wave/progress bar for supported audio files.
- Sound rules can respond to built-in and custom events.

### Event Builder
- Create reusable custom events through Simple / Advanced / System layers.
- Supports simple events such as moves, captures, checks, checkmate, promotion, and panel opened.
- Supports first tactical event detection such as piece attacked and simple fork.
- Events can be used by Sound Rules.

### Bots and Engines
- Built-in training/random bot support.
- Registered custom bot support.
- Browser-worker UCI bot support.
- Stockfish works when configured with the bundled browser-worker path.

Example Stockfish path:

```text
/engines/stockfish/stockfish-18-lite-single.js
```

### Import / Export Packages
- ExperiencePackage-style import/export for reusable configuration and assets.
- Category selection for supported systems such as visuals, audio, sound rules, custom events, custom games, bots, profiles, and multiplayer settings.
- Game snapshots and in-progress game state are separate from ExperiencePackages.

### Multiplayer
- LAN/server-source multiplayer foundation.
- Host compliance policy groundwork for matching assets/settings between players.
- Multiplayer is experimental and may require server setup.

## Beta Notes

This project is under active development. The following areas are still experimental or planned:

- Large GIF/audio package saving may be slow until media assets are stored as real files inside package zips instead of large embedded strings.
- Animated piece movement is planned but not yet implemented.
- Advanced tactical event detection such as pins, trapped pieces, and no-safe-move logic is planned.
- Custom game multiplayer and custom game bots are planned.
- Official profiles, cloud accounts, ranking, and official server support are planned.
- Full cloud save/resume is not yet implemented.

## Running Locally for Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the Electron desktop app after building:

```bash
npm run electron
```

Build a portable Windows beta executable:

```bash
npm run dist:portable
```

Build the Windows installer:

```bash
npm run dist
```

## Optional Local Multiplayer Server

If using the local WebSocket server manually:

```bash
node server/chessServer.js
```

Multiplayer/server behavior may depend on current packaging and server configuration.

## Stockfish Setup

Stockfish browser-worker files should be included under:

```text
public/engines/stockfish/
```

Expected files:

```text
stockfish-18-lite-single.js
stockfish-18-lite-single.wasm
```

In the app, add or select a bot using:

```text
/engines/stockfish/stockfish-18-lite-single.js
```

Then use the app's Test Bot feature before starting a bot game.

## Project Architecture Rules

Future development should follow these rules:

- Do not rebuild existing working systems.
- Keep changes minimal, scoped, and incremental.
- Do not duplicate state or create parallel systems.
- Preserve Standard Chess as the protected core game.
- SettingsContext owns persistent settings values.
- ExperiencePackage stores reusable setup/config/assets/rules/events/sounds.
- Game Snapshot stores live game-in-progress state.
- Event Log records gameplay/system events.
- Troubleshooter logs errors and debugging information.
- Use the Simple / Advanced / System pattern for complex tools.
- Avoid duplicate panel titles; panel shell owns the main title.

## Important Systems

- Settings and persistence
- Template-driven visuals
- Piece Editor and bulk import
- ExperiencePackage import/export
- Rule Builder and Custom Game runtime
- Event Builder and Event Log
- Sound Editor and Audio Controller
- Bot/engine registration and Stockfish worker support
- Multiplayer and compliance policy foundation
- Profile identity system

## Development Status

Chess Unleashed is currently suitable for internal testing and controlled beta testing. It is not yet a polished public release.

## License

License not yet specified.
