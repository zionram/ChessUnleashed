# AI Handoff Protocol

Status: Active instructions for future AI/dev work, updated for Chat 7 workflow

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
- Do not add fake UI/functionality; if it looks functional, wire it to real state/action.
- Do not mix Game Snapshot runtime state into ExperiencePackage exports by default.
- Do not store media binaries as giant JSON/base64/localStorage strings.
- Preserve Standard Chess behavior unless the task explicitly targets it.
- Preserve Stockfish/worker bot support when touching bots.
- Preserve Package Manager real-file zip behavior when touching packages.
- Preserve Sound Rules and Animation Rules when touching Event Builder.

## Current Release-Candidate Watch Areas

- Package Manager Load/Save/Extract must keep visible progress/status/error handling.
- Package exports must exclude live game state by default.
- Electron splash and packaged app loading must not regress.
- Local/player movement animation and bot delay timing must not regress.
- Check/in-check sound rules must pause/resume background music correctly.
- Event Builder, Sound Editor, and Animation Builder are complex center/floating tools.
- Piece Set and Layer edits must merge into the same theme draft without overwriting each other.
- Frame sizing/lock and welcome sidebar color controls should work in packaged Electron, not only browser mode.
- Left floating rail drag/resize/collapse behavior must not regress.
- Selected launcher icons must stay visible; do not hide SVG internals while hiding arrow triangles.
- Let’s Play overlay must open centered/on top from both New and the left launcher.
- Board glass dragging must not interfere with piece/square dragging.

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

## User Workflow Preferences

- If a change is fewer than 4 files, ask/list the specific files needed.
- If a change is more than 4 files, give a PowerShell zip command to collect them.
- If the assistant just created the latest iteration of a file and the user did not say it changed, do not ask for it again.
- When returning replacement files, provide target path and exact build/test action.
- Keep responses brief and step-focused.
- Do not explain line-by-line changes unless asked.
- If a sandbox zip link fails, retry with individual file links when possible.

## Handoff Format

When handing work to another AI/dev, include:

- prompt ID
- exact files changed
- what changed
- what was verified
- build command/result
- known limitations or follow-up

If uncertain, say Needs verification instead of guessing.
