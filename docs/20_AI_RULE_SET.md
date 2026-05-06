# Chess Unleashed AI Rule Set

Version: v2
Last Updated: 2026-05-05

---

## Core System Rules (R1–R9)

**R1.** This is an existing functioning system. Do not treat it as greenfield.
**R2.** Do not rebuild existing systems.
**R3.** Do not create duplicate systems or parallel implementations.
**R4.** Do not create duplicate state.
**R5.** Preserve all existing architecture decisions unless explicitly told otherwise.
**R6.** Do not refactor broadly.
**R7.** Make minimal, scoped, incremental changes only.
**R8.** Only inspect files relevant to the task.
**R9.** Do not rename or move files unless absolutely required for build success.

---

## Data & Architecture Rules (R10–R16)

**R10.** Preserve ExperiencePackage vs Game Snapshot separation.
**R11.** ExperiencePackage owns assets.
**R12.** Game Snapshot must not store or duplicate assets.
**R13.** Do not introduce new asset systems. Extend existing ones only.
**R14.** Package media must be real files in ZIP `assets/`.
**R15.** Do not use base64 for asset storage.
**R16.** Asset references must be package-relative, not host-local.

---

## Implementation Rules (R17–R21)

**R17.** Modify only what is required for the task.
**R18.** Do not touch unrelated systems.
**R19.** If a larger issue is discovered, report it instead of fixing it.
**R20.** Prefer extending existing structures over introducing new ones.
**R21.** Do not introduce new dependencies unless absolutely necessary.

---

## Networking / Runtime Safety (R22–R24)

**R22.** Do not modify LAN, networking, or multiplayer systems unless explicitly tasked.
**R23.** Do not assume host-local paths are accessible to peers.
**R24.** Do not introduce hidden coupling between systems.

---

## Build & Verification Rules (R25–R28)

**R25.** Build must pass after changes (`npm.cmd run build` or `npm run build`).
**R26.** Do not leave the system in a broken or partial state.
**R27.** If build fails, fix only what is necessary.
**R28.** Do not ignore TypeScript or build errors.

---

## Packaging Rules (R29–R31)

**R29.** Assets must live inside package ZIP `assets/`.
**R30.** Package output must be portable across machines.
**R31.** Do not rely on local filesystem paths in packages.

---

## Prompt Discipline Rules (R32–R36)

**R32.** Follow task scope strictly.
**R33.** Do not expand scope beyond what is explicitly asked.
**R34.** Do not “improve” unrelated code.
**R35.** Do not optimize unless required for the task.
**R36.** Do not add features unless explicitly requested.

---

## Reporting Rules (R37–R40)

**R37.** Report only what was actually done.
**R38.** Do not invent behavior or results.
**R39.** Clearly list files inspected and changed.
**R40.** Provide DONE summary (5–10 word summary).

---

## Online/FICS Rules (R41–R46)

**R41.** `ChessBoard.tsx` must remain provider-agnostic. Do not put FICS command syntax in the board.
**R42.** FICS command translation belongs in `src/services/online/fics/FicsGameTranslator.ts`.
**R43.** FICS socket/session handling belongs in `FicsAdapter.ts`, `electron/main.js`, and `electron/preload.cjs`.
**R44.** FICS must not own templates, pieces, visual themes, or package systems.
**R45.** Browser mode cannot use raw FICS TCP without a future relay; do not fake browser TCP support.
**R46.** FICS should use standardized app command intents mapped through the command registry/translator.

---

## UI / Theming Rules (R47–R51)

**R47.** Registered views should use shared semantic classes/wrappers instead of broad global CSS overrides.
**R48.** Do not let view-content theming rules style HUD, board shell, floating-window chrome, or launcher shell unintentionally.
**R49.** Floating window/docked workspace behavior should extend the existing launcher/docking system, not create one-off popup systems.
**R50.** Lower HUD/status strips are optional/movable UI elements and should remain isolated from embedded-view theming.
**R51.** Background controls are planned to become a higher-level Environment -> Look tab; do not bury new background behavior deeper under unrelated controls.

---

## Usage

All AI prompts should include:

- Prompt ID
- Target model
- Project/context constraints
- Touches / allowed files
- Do not touch list
- Task
- Verify
- Report
- DONE line

---

## Governance

- This file is a source of truth for AI behavior constraints.
- Do not casually edit this file.
- If rule meaning changes, increment version.
- Changes must be intentional and human-reviewed.
