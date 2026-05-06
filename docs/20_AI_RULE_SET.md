# Chess Unleashed AI Rule Set

Version: v2
Last Updated: 2026-05-04

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

## UI / UX Rules (R21a–R21h)

**R21a.** Do not add fake UI or fake functionality.
**R21b.** If a UI element looks clickable/functional, it must be wired to real state or a real action.
**R21c.** Do not hardcode fake save states, fake history, fake recent activity, fake tabs, fake help, or fake board metadata.
**R21d.** Use real overlay/floating-window architecture for modal/floating behavior.
**R21e.** Keep complex tools readable in center/floating panels, not cramped side panels.
**R21f.** Hiding launcher arrows must not hide SVG icon internals.
**R21g.** Selected launcher icons must remain visible.
**R21h.** Dock should only appear where docking is real; otherwise do not show it.

---

## Networking / Runtime Safety (R22–R24)

**R22.** Do not modify LAN, networking, or multiplayer systems unless explicitly tasked.
**R23.** Do not assume host-local paths are accessible to peers.
**R24.** Do not introduce hidden coupling between systems.

---

## Build & Verification Rules (R25–R28)

**R25.** Build must pass after changes (`npm.cmd run build`).
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

## File Handoff Rules (R41–R46)

**R41.** If a change is fewer than 4 files, ask/list the specific files.
**R42.** If a change is more than 4 files, give a PowerShell zip command to collect them.
**R43.** If the latest version of a file was just created by the assistant and the user did not change it, do not ask for it again.
**R44.** When returning replacement files, provide target path and exact build/test action.
**R45.** For small patches, prefer individual file links over zips.
**R46.** If a zip download link fails, retry by resurfacing individual files when possible.

---

## Prompt Protocol (P1–P12)

P1. Every prompt must begin with a Prompt ID using the format: `C# . P-###`.
P0. The C# prefix identifies the chat number that created the prompt.
P0a. The chat number is assigned by the user, not guessed by the AI.
P0b. If the AI does not know the current chat number, it must ask the user before creating numbered prompts.
P0c. Do not invent or increment the chat number automatically.
P2. Prompt numbering must be sequential within the chat.
P3. Multi-objective prompts may use range notation.
P4. Optional suffixes may be added for clarity: BATCH, FIX, VERIFY.
P5. Every prompt must specify the intended AI model.
P6. Model selection must be explicit and justified.
P7. If a model is NOT suitable, explicitly forbid its use.
P8. Prompts must include a Touches section listing systems/files if known.
P9. Prompts must not allow scope expansion beyond Touches.
P10. Every prompt must include one primary objective.
P11. Every prompt must include a Verify section.
P12. Every prompt must include a 5–10 word DONE summary request, with no prefilled summary.

---

## Governance

- This file is the single source of truth for AI behavior constraints.
- Do not casually edit this file.
- If rule meaning changes, increment version.
- Changes must be intentional and human-reviewed.
