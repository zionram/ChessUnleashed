# AI Handoff Protocol

Status: Current guidance

Use this when handing Chess Unleashed to another AI assistant or future chat.

## Before Changing Code

1. Read `docs/00_PROJECT_OVERVIEW.md`.
2. Read `docs/01_ARCHITECTURE_RULES.md`.
3. Read the system-specific doc for the task.
4. Inspect only the files needed for the prompt.
5. Confirm current ownership boundaries before editing.

## Working Rules

- Treat the app as functioning software.
- Make minimal scoped changes.
- Do not rebuild systems unless explicitly requested.
- Do not create duplicate state or parallel systems.
- Preserve Standard Chess unless the task explicitly targets it.
- Preserve ExperiencePackage vs Game Snapshot separation.
- Keep Event Log and Troubleshooter separate.
- Use existing panel/view/menu patterns.
- Avoid duplicate panel titles.
- Avoid browser prompts where in-game modal/panel confirmation is expected.
- Run build after app code changes.

## Prompt Rules

- Prompt IDs are unique. Do not reuse an older prompt ID for new requirements.
- If multiple versions of a prompt exist, use the latest explicitly corrected instruction only.
- If a task says documentation-only, do not edit app source.

## Recommended Verification Pattern

- `rg` targeted symbols/files first.
- Use existing tests/build commands if relevant.
- For docs-only work, build is not required unless docs are part of build.
- If uncertain, write Needs verification instead of guessing.

## Handoff Summary Template

```md
Prompt:
Files touched:
Systems touched:
What changed:
Verification:
Known limitations:
Next recommended step:
```

