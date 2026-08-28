# Agent Instructions

## Project Scope
- This repository is a prototype for testing features planned for a visual novel (VN).
- Prioritize validating the intended VN flow and interaction behavior over production hardening.
- Mobile portrait-ratio testing is not required unless the user explicitly requests it.

## Implementation Approval
- In Codex sessions, remain read-only until the user explicitly asks to implement, change, fix, apply, or start implementation.
- Before approval, limit work to inspection, analysis, diagnosis, design, planning, and other non-mutating checks.
- Treat approval as scoped to the requested change; obtain new approval before materially expanding implementation scope.
- For any Penpot-related request, use the `penpot-act2-prototype` MCP server.

## Package Manager
- Use **npm**; `package-lock.json` is the lockfile.
- Install dependencies with `npm install`.

## Commands
| Task | Command |
|------|---------|
| Start host in background (PowerShell) | `$hostProcess = Start-Process cmd.exe -ArgumentList "/c","npm run dev" -PassThru` |
| Run tests | `npm test` |
| Run one test file | `npm test -- <path/to/file.test.ts>` |
| Build and type-check | `npm run build` |

## Verification
- Always run relevant automated tests and `npm run build` before completion.
- Changes to `src/game/`, scheduling, time progression, evidence, proposal evaluation, or knowledge state require deterministic automated tests.
- Prefer automated component or E2E tests for testable UI interactions.
- Use browser or manual testing for visual and end-to-end checks: layout, typography, responsive behavior, animations, complete player flows.
- Report automated tests, build, and exercised browser flows separately.

## Development Host Lifecycle
- Never run `npm run dev` in the foreground during browser or manual testing.
- Keep the PID returned in `$hostProcess` so the process can be cleaned up.
- Stop the host and its child processes after testing, including when testing fails:
  `taskkill /PID $hostProcess.Id /T /F`
- Do not leave a Vite host running after the task is complete.

## Report Document Typography
- Base report document typography on Notion's default document scale; font family is Noto Sans KR for all report text.
- Scale: Page title 36px/700, H1 30px/700, H2 24px/600, H3 20px/600, Body 16px/400, Secondary 14px/400~500, Metadata 12px/400~500.
- Do not use text smaller than 16px for player-readable content: body paragraphs, character opinions/quotes, and evidence descriptions.
- Use Metadata (12px) and Secondary (14px) only for image captions or descriptions; do not attach them anywhere else.
- Do not add decorative metadata text; omit it entirely when it does not help reading.
- Render each typography role as a fixed-height block: Page title 48px, H1 40px, H2 34px, Body 24px per line, Secondary 21px, Metadata 18px.
- Use a single vertical gap of 16px between all blocks.
- Separate every H1 section from preceding content with a 1px divider, 32px above and 16px below it.
- Keep dark and light report layouts at identical block positions and sizes; vary only the palette colors.

## Penpot Structure
- Within each board, group shapes by document section (one group per document section, proposal entry, or dialog block) following the document's order; never leave all shapes flat in one board.
- Name groups after the content they contain and keep group order matching the table of contents.

## Playtest Screenshots
- After visual or player-flow changes, capture every affected representative play state as **SVG**.
- Store each `<name>.svg` and matching `<name>.txt` Playwright ARIA snapshot together under `docs/screenshots/`.
- Use `scripts/screenshot.mjs` as the canonical flow driver; extend it to emit SVG before capturing if the required SVG output is not yet supported.
- Use repeatable `--act` steps for exact states; `--plan <taskId>` remains a shortcut for planning tasks.
- Example: `node scripts/screenshot.mjs --name planning-schedule-bottom --selector ".advance-time-block" --plan powerAnalysis`.
- Always capture the full game screen once, then each panel separately; for the report screen, capture each viewport or section separately.
- Update `README.md` with relative Markdown image links to every current SVG, in top-to-bottom order.
- Do not use `.openchamber/screenshots/` as README assets because `.openchamber/` is ignored.

## Key Conventions
- `src/game/` contains game state, reducer, and time logic.
- `src/content/` contains dialogue, task, report, and evidence data.
- Add character, background, UI, and evidence assets under `public/assets/` in their matching directories.

## External References
| Need | File |
|------|------|
| Project flow, structure, and design direction | `README.md` |