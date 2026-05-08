# Chess Unleashed AI Rule Set

Version: v2
Last Updated: 2026-05-08

---

## Core System Rules (R1-R9)

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

## Data & Architecture Rules (R10-R16)

**R10.** Preserve ExperiencePackage vs Game Snapshot separation.
**R11.** ExperiencePackage owns assets.
**R12.** Game Snapshot must not store or duplicate assets.
**R13.** Do not introduce new asset systems. Extend existing ones only.
**R14.** Package media must be real files in ZIP `assets/`.
**R15.** Do not use base64 for asset storage.
**R16.** Asset references must be package-relative or use existing durable asset references; do not rely on host-local paths in packages.

---

## Source-of-Truth Rules (R17-R24)

**R17.** `SettingsContext` owns persistent settings/config values.
**R18.** Template/theme files own game visuals and template-owned visual layout defaults.
**R19.** `WorkspaceActionRegistry` owns actionId -> view/component mapping and workspace view registration.
**R20.** Shared floating/docked window shell behavior owns Dock/Undock/Close behavior.
**R21.** Do not duplicate action/view mappings in `App.tsx` when the registry owns them.
**R22.** Loader/normalizer files may normalize source data but must not invent competing source-of-truth values.
**R23.** Do not let stale localStorage/saved values silently override built-in reset/default source values.
**R24.** CSS may style visual surfaces but must not override template-owned layout placement with competing hardcoded `left/right/bottom !important` rules.

---

## Implementation Rules (R25-R31)

**R25.** Modify only what is required for the task.
**R26.** Do not touch unrelated systems.
**R27.** If a larger issue is discovered, report it instead of fixing it unless explicitly instructed.
**R28.** Prefer extending existing structures over introducing new ones.
**R29.** Do not introduce new dependencies unless absolutely necessary.
**R30.** Never patch from an older/generated copy of a source file when a newer current file is in play.
**R31.** Before patching recurrent regression files such as `App.tsx`, verify the current file content and preserve existing registry/source-of-truth architecture.

---

## Networking / Runtime Safety (R32-R34)

**R32.** Do not modify LAN, networking, or multiplayer systems unless explicitly tasked.
**R33.** Do not assume host-local paths are accessible to peers.
**R34.** Do not introduce hidden coupling between systems.

---

## Build & Verification Rules (R35-R38)

**R35.** Build must pass after changes (`npm.cmd run build`).
**R36.** Do not leave the system in a broken or partial state.
**R37.** If build fails, fix only what is necessary.
**R38.** Do not ignore TypeScript or build errors.

---

## Packaging Rules (R39-R41)

**R39.** Assets must live inside package ZIP `assets/`.
**R40.** Package output must be portable across machines.
**R41.** Do not rely on local filesystem paths in packages.

---

## Prompt Discipline Rules (R42-R46)

**R42.** Follow task scope strictly.
**R43.** Do not expand scope beyond what is explicitly asked.
**R44.** Do not "improve" unrelated code.
**R45.** Do not optimize unless required for the task.
**R46.** Do not add features unless explicitly requested.

---

## Reporting Rules (R47-R50)

**R47.** Report only what was actually done.
**R48.** Do not invent behavior or results.
**R49.** Clearly list files inspected and changed.
**R50.** Provide DONE summary (5-10 word summary).

---

## Usage

All AI prompts should include:

- Prompt ID
- Intended model
- Touches
- Task
- Verify
- DONE summary instruction

Optional exclusions may be included when needed.

---

## Governance

- This file is the single source of truth for AI behavior constraints.
- Do not casually edit this file.
- If rule meaning changes, increment version.
- Do not allow AI to rewrite this file automatically.
- Changes must be intentional and human-reviewed.

---

## Prompt Protocol (P1-P12)

P1. Every prompt must begin with a Prompt ID using the format: C# . P-###

Example: C5.P-000

P0. The C# prefix identifies the chat number that created the prompt.

Example: C5.P-000 means Chat 5, Prompt 000.

P0a. The chat number is assigned by the user, not guessed by the AI.

P0b. If the AI does not know the current chat number, it must ask the user before creating numbered prompts.

P0c. Do not invent or increment the chat number automatically.

P2. Prompt numbering must be sequential within the chat:

- First prompt: C5.P-000
- Next: C5.P-001
- Next: C5.P-002

P3. Multi-objective prompts must use range notation:

Example: C5.P-002-010 represents multiple objectives in one prompt.

P4. Optional suffixes may be added for clarity:

- BATCH
- FIX
- VERIFY

Example:

- C5.P-003 FIX
- C5.P-004 VERIFY

P5. Every prompt must specify the intended AI model.

P6. Model selection must be explicit and justified:

- Claude -> complex, high-precision, architectural tasks
- Codex -> structured code edits, surgical changes when available
- Gemini -> verification, inspection, low-risk analysis only

P7. If a model is NOT suitable, explicitly forbid its use.

Example: Do NOT use Gemini for implementation tasks.

P8. Prompts must include a "Touches" section listing:

- Systems
- Files, if known

This defines allowed scope before execution.

P9. Prompts must not allow scope expansion beyond "Touches".

P10. Every prompt must include a clear Task section with:

- One primary objective
- No hidden secondary objectives

P11. Every prompt must include a Verify section:

- Build passes
- Only relevant files changed

P12. Every prompt must include a DONE summary:

- 5-10 words
- No prefilled content
