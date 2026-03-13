# Nexrel Desktop Worker Automation

This enables autonomous browser + local-app task execution on another computer using a local Playwright worker.

## Owner flow (simple)

1. Open AI Employees and start a live mission.
2. Choose `owner_desktop` execution target.
3. For `owner_desktop`, Nexrel auto-generates a desktop key (worker token) on session start.
4. Open Live Console and click `Open Desktop Worker`.
5. Paste session id + key (if not prefilled), then copy the runner command.
6. On the other computer, run the copied command from the repo root.

From that point on, the desktop worker heartbeats, pulls commands, executes them in a real browser, and acknowledges completion/failure automatically.

## Local runner command

```bash
npm run desktop-worker -- --baseUrl <your-nexrel-url> --sessionId <session-id> --userId <owner-user-id> --token <worker-token>
```

Optional flags:

- `--headless` to run without visible browser window.
- `--heartbeatMs 5000` adjust heartbeat interval.
- `--pollMs 2200` adjust command poll interval.

## Packaged desktop app (recommended)

Use the installer app for production owner workflows:

- macOS installer: built from `desktop-worker` as `.dmg`
- Windows installer: built from `desktop-worker` as `.exe` (NSIS)

Build locally:

```bash
npm run desktop-app:dist:mac
npm run desktop-app:dist:win
```

The packaged app provides:

- encrypted local key storage,
- run-on-startup option,
- one-click connect/start/stop,
- live logs for autonomous execution.

## Security model

- The worker token is required and short-lived.
- Commands are accepted only when token + session + user context are valid.
- Regenerate token in Live Console if expired.

## Current command capability

- `navigate`: opens URL in browser.
- `click`: clicks selector in browser.
- `type`: fills selector or keyboard-types fallback.
- `extract`: captures page context (title + URL).
- `verify`: waits for page load state.
- `open_app`: launches a local desktop app (macOS/Windows/Linux launcher).
- `run_command`: runs a local shell command (disabled by default; requires `NEXREL_ALLOW_LOCAL_COMMANDS=true`).
