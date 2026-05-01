# Do Not Rebuild

Status: Current project guardrail

Chess Unleashed is not a greenfield project. The following systems should not be rebuilt unless a prompt explicitly instructs it.

## Do Not Rebuild Systems

- Standard Chess gameplay/chess.js path
- GameContext architecture
- SettingsContext architecture
- Settings Builder architecture
- menu/panel/view routing system
- template/theme visual system
- ExperiencePackage format and apply flow
- Package Manager import/export/extract flow
- Save/Resume snapshot foundation
- Rule Builder foundation
- Custom Game runtime foundation
- Event Builder and CustomEventRuntime
- Event Log
- Troubleshooter
- Sound Editor and Sound Rules
- Audio Controller and playlist/waveform foundation
- Animation Settings
- Animation Builder and Animation Rules
- bot/engine architecture
- UCI worker adapter
- multiplayer server-source/compliance foundation
- profile identity foundation
- Electron packaging setup

## Safe Change Pattern

1. Inspect only the files required by the prompt.
2. Preserve existing state ownership.
3. Route updates through existing context/helper APIs.
4. Add narrow helpers only when they reduce risk.
5. Verify with build after app code changes.
6. Document uncertainty honestly.

## Red Flags

- duplicate active-bot state
- duplicate settings state
- package JSON containing huge media blobs
- runtime snapshots inside ExperiencePackage
- Event Log and Troubleshooter merged
- duplicate panel titles
- broad unrelated refactors
- browser prompts for in-game destructive actions

