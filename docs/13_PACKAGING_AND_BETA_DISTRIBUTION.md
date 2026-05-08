# Packaging and Beta Distribution

Status: Current release-candidate flow

Chess Unleashed is packaged as an Electron desktop app for beta testers. A tester should not need npm, terminal commands, or developer setup.

## Developer Commands

Use these commands from the project root:

```powershell
npm run build
npm run electron
npm run dist:portable
npm run dist
```

Expected release flow:

1. Run `npm run build`.
2. Run `npm run dist:portable` for the portable Windows executable.
3. Smoke test the packaged executable.
4. Upload the portable `.exe` through GitHub Releases.

Do not commit generated/runtime folders:

- `dist/`
- `release/`
- `node_modules/`
- build/out folders
- large `.exe` files

`win-unpacked` is an unpacked build output for testing. It can be deleted and regenerated. It should not be committed.

## Electron Size Reality

Electron packaged apps include Chromium/Node/Electron runtime files. A large packaged executable does not necessarily mean the app source is large.

Known large Electron/runtime files may include:

- Electron executable
- Chromium resources
- graphics/DirectX DLLs
- locale `.pak` files
- ICU data

Do not remove Electron runtime files manually unless the build tool supports that pruning safely.

## Stockfish

The default browser-worker Stockfish path is:

```text
/engines/stockfish/stockfish-18-lite-single.js
```

The matching `.wasm` file must be present beside it when required by the worker. The app does not download Stockfish automatically at runtime. Do not commit Stockfish Windows `.exe` binaries.

Browser-worker JS/WASM assets belong in public assets if they are part of the beta package. Do not package multiple huge Stockfish variants unless the app actually loads them.

## Electron Loading

Development Electron may load the Vite dev server. Production/package builds must load the built `dist/index.html` with relative asset paths. Vite base/path behavior is important for packaged Electron.

A blank packaged window usually means the renderer, assets, or base paths did not load correctly.

## Startup Splash Screen

The Electron main process shows a splash window quickly while the main app loads. The splash uses real HTML/CSS status text and an animated loading bar, not text baked into the artwork.

Splash-related files:

- `electron/main.js`
- `electron/splash.html`
- `electron/preload.js`
- optional artwork at `public/splash/chess-unleashed-splash.png`

The app should avoid multiple confusing startup windows. Single-instance behavior should focus the existing app/splash when practical.

## Local Multiplayer Server

`server/chessServer.js` is the local server. Electron startup may bundle/start local server support where safe. Multiplayer still needs broader release testing.

## Package Assets

Packaged builds must support:

- public assets
- Stockfish worker files
- splash artwork
- durable imported assets written under app user data, not the install directory

## Related Files

- `package.json`
- `vite.config.ts`
- `electron/main.js`
- `electron/preload.js`
- `electron/splash.html`
- `server/chessServer.js`
- `public/engines/stockfish/`
