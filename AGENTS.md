# Agent Instructions

## Project Scope
- This repository is a prototype for testing features planned for a visual novel (VN).
- Prioritize validating the intended VN flow and interaction behavior over production hardening.
- Mobile portrait-ratio testing is not required unless the user explicitly requests it.

## Package Manager
- Use **npm**; `package-lock.json` is the lockfile.
- Install dependencies with `npm install`.

## Commands
| Task | Command |
|------|---------|
| Start host in background (PowerShell) | `$hostProcess = Start-Process cmd.exe -ArgumentList "/c","npm run dev" -PassThru` |
| Build and type-check | `npm run build` |
| Preview production build | `npm run preview` |

## Development Host Lifecycle
- Never run `npm run dev` in the foreground during browser or manual testing.
- Keep the PID returned in `$hostProcess` so the process can be cleaned up.
- Stop the host and its child processes after testing, including when testing fails:
  `taskkill /PID $hostProcess.Id /T /F`
- Do not leave a Vite host running after the task is complete.

## Playtest Screenshots
- Capture representative play screens while testing the implemented VN flow, including the VN scene and report screen when available.
- For the report screen, scroll from top to bottom and capture each viewport or section separately so the full report is visible; do not rely on one cropped image.
- Store committed screenshots under `docs/screenshots/` with stable, descriptive filenames.
- Add or update a `## Screenshots` section in `README.md` with relative Markdown image links to the current screenshots.
- Add every report screenshot to `README.md` in top-to-bottom order.
- After each feature or visual change, retake affected screenshots and replace the README references so they show the current implementation.
- Do not use `.openchamber/screenshots/` as README assets because `.openchamber/` is ignored.

## Key Conventions
- `src/game/` contains game state, reducer, and time logic.
- `src/content/` contains dialogue, task, report, and evidence data.
- Add character, background, UI, and evidence assets under `public/assets/` in their matching directories.

## External References
| Need | File |
|------|------|
| Project flow, structure, and design direction | `README.md` |
