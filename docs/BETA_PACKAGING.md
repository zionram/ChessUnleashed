# Chess Unleashed Beta Packaging

This document describes the current Windows beta packaging path for Chess Unleashed.

## Developer Build Commands

Run these from the repository root:

```powershell
npm install
npm run build
npm run package
npm run dist
```

- `npm run build` runs TypeScript and creates the Vite production build in `dist/`.
- `npm run package` creates an unpacked Electron app in `release/` for quick local validation.
- `npm run dist` creates Windows beta distributables in `release/`, including an NSIS installer and portable executable.
- `npm run dist:portable` creates only the portable Windows target.

## Tester Install/Run Flow

Beta testers should use either:

- the Windows installer generated in `release/`, or
- the portable `.exe` generated in `release/`.

Testers should not need npm, a terminal, Vite, or a developer checkout.

## Production App Loading

Electron loads the Vite build from `dist/index.html` in packaged production. Vite is configured with `base: './'`, so generated script, style, and asset URLs are relative and work under Electron `file://` loading.

For development, Electron can load a dev server URL when `VITE_DEV_SERVER_URL` or `ELECTRON_START_URL` is provided. Without one, it loads the built `dist/index.html`.

## Included Assets

Vite copies `public/` into `dist/` during `npm run build`. The packaged app includes `dist/**/*`, which includes:

- public icons and app assets
- `dist/engines/stockfish/stockfish-18-lite-single.js`
- `dist/engines/stockfish/stockfish-18-lite-single.wasm`

The Stockfish browser worker path used by the app should be:

```text
/engines/stockfish/stockfish-18-lite-single.js
```

## Multiplayer Server

The packaged Electron app starts the bundled WebSocket server locally on:

```text
127.0.0.1:8080
```

This supports local host/join flows that point to localhost/home server settings. If port `8080` is already in use, the app keeps running, but multiplayer may require closing the conflicting process or running the server manually.

Manual LAN server mode is still available for development or LAN testing:

```powershell
node server/chessServer.js
```

Manual server mode listens on `0.0.0.0:8080`, so firewall/LAN setup is still the tester's responsibility.

## Known Beta Limitations

- Official hosted multiplayer, cloud accounts, and auto-updates are not included.
- LAN multiplayer remains experimental and may require firewall approval.
- Runtime game snapshots are separate from ExperiencePackage imports/exports.
- Engine worker files must be included in `dist/engines/...` or custom registered bot paths must point to a packaged-accessible file.

## Packaging QA Checklist

Before sending a beta:

1. Run `npm run build`.
2. Confirm `dist/index.html` exists.
3. Confirm `dist/engines/stockfish/stockfish-18-lite-single.js` exists.
4. Run `npm run package`.
5. Open the unpacked app from `release/` and confirm the real game UI appears.
6. Start Standard Chess and make a move.
7. Open Custom Game, Sound Editor, Event Builder, and Audio settings.
8. Register or select the Stockfish worker path and run Test Bot.
9. Run `npm run dist` and validate the generated installer or portable executable.
