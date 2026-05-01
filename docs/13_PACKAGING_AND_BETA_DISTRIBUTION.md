# Packaging And Beta Distribution

Status: Current

Electron beta packaging has been updated so the packaged app loads the built Vite output instead of a blank screen.

## Developer Commands

Common commands:

```powershell
npm run build
npm run electron
npm run dist:portable
npm run dist
```

`npm run build` creates the frontend build. Electron production loads `dist/index.html`.

`npm run dist:portable` creates a portable Windows build where configured.

`npm run dist` creates distributable Electron artifacts through electron-builder.

## Distribution Rules

- Release portable `.exe` files through GitHub Releases.
- Do not commit `dist/`.
- Do not commit `release/`.
- Do not commit `node_modules/`.
- Do not commit large `.exe` release artifacts.
- Do not commit Stockfish Windows `.exe` binaries.

## Stockfish Browser Worker

Default browser-worker path:

`/engines/stockfish/stockfish-18-lite-single.js`

Expected bundled files:

- `public/engines/stockfish/stockfish-18-lite-single.js`
- `public/engines/stockfish/stockfish-18-lite-single.wasm`

## Bundled Server

Electron starts the local multiplayer server from `server/chessServer.js` where configured. This is for local/beta convenience and is not an official hosted service.

## Related Files

- `package.json`
- `vite.config.ts`
- `electron/main.js`
- `electron/preload.js`
- `server/chessServer.js`
- `docs/BETA_PACKAGING.md`

