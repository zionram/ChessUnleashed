# AI Handoff Protocol

Status: Active instructions for future AI/dev work, updated with launcher-window caution

Chess Unleashed is a functioning release-candidate project. Treat it as existing software with working systems, not a greenfield rebuild.

## Start Here

1. Read this file and `docs/00_PROJECT_OVERVIEW.md`.
2. Read the relevant system doc for the requested area.
3. Use `rg` or targeted file reads to confirm current code before editing.
4. Keep changes scoped to the prompt.
5. Run the build after code changes.

## Rules

- Do not rebuild working systems.
- Do not create duplicate state.
- Do not create duplicate systems.
- Do not perform broad refactors unless explicitly requested.
- Do not inspect unrelated files unless needed to solve the task.
- Do not use browser/window prompts when an in-app panel/modal is expected.
- Do not add duplicate panel titles.
- Do not mix Game Snapshot runtime state into ExperiencePackage exports by default.
- Do not store media binaries as giant JSON/base64/localStorage strings.
- Preserve Standard Chess behavior unless the task explicitly targets it.
- Preserve Stockfish/worker bot support when touching bots.
- Preserve Package Manager real-file zip behavior when touching packages.
- Preserve Sound Rules and Animation Rules when touching Event Builder.

## Launcher / Workspace Handoff Rules — 2026-05-03

When working on Obsidian Workspace / launcher windows:

- Search for `launcher-sub-panel` before editing. It was the old wrong sidebar panel.
- Do not restore `launcher-sub-panel`.
- Use `launcher-category-window` as the launcher category surface.
- Use `DynamicMenu` for the root icon launcher only.
- Do not use `DynamicMenu` recursively for launcher window content.
- Do not route left launcher category windows into the right dock.
- Do not treat `ViewManager` as the owner of left launcher windows.
- Keep launcher drag/resize state inside `MainLayout`.
- Do not put `activeLauncherItem` references or launcher helpers inside outer `function App()`.
- If the app crashes with `ReferenceError: activeLauncherItem is not defined`, inspect for launcher code accidentally inserted into the provider-only `App()` wrapper.

Expected outer `App()` shape:

```tsx
function App() {
  return (
    <AudioProvider>
      <SettingsProvider>
        <GameProvider>
          <MainLayout />
        </GameProvider>
      </SettingsProvider>
    </AudioProvider>
  );
}
```

## Current Release-Candidate Watch Areas

- Package Manager Load/Save/Extract must keep visible progress/status/error handling.
- Package exports must exclude live game state by default.
- Electron splash and packaged app loading must not regress.
- Local/player movement animation and bot delay timing must not regress.
- Check/in-check sound rules must pause/resume background music correctly.
- Event Builder, Sound Editor, and Animation Builder are complex center-panel tools.
- Piece Set and Layer edits must merge into the same theme draft without overwriting each other.
- Frame sizing/lock and welcome sidebar color controls should work in packaged Electron, not only browser mode.
- Launcher category windows should remain independent from right dock workspace tabs.
- Board overlay color layer should remain optional/invisible unless enabled.

## Build Expectations

After app source changes:

```powershell
npm.cmd run build
```

For packaging changes, also use the relevant packaging command when feasible:

```powershell
npm.cmd run dist:portable
```

Docs-only changes do not require a build unless docs become part of the build.

## Handoff Format

When handing work to another AI/dev, include:

- prompt ID
- exact files changed
- what changed
- what was verified
- build command/result
- known limitations or follow-up

If uncertain, say Needs verification instead of guessing.

## Useful Launcher Verification Commands

```powershell
Select-String -Path .\src\**\*.tsx,.\src\**\*.css -Pattern "launcher-sub-panel"
```

```powershell
Select-String -Path .\src\App.tsx,.\src\App.css -Pattern "launcher-category-window","launcher-window-titlebar","launcherWindowPosition"
```

```powershell
Select-String -Path .\src\App.tsx -Pattern "function App","MainLayout","activeLauncherItem"
```
