# Nexrel Desktop Worker App

Packaged desktop app for autonomous execution on owner machines (macOS + Windows).

## What it does

- Connects to a live-run session using a generated desktop key.
- Pulls worker commands from Nexrel.
- Executes browser actions in Playwright.
- Executes local app actions (`open_app`) and optional shell tasks (`run_command`).
- Sends heartbeat + completion/failure telemetry back to Nexrel.

## Development

```bash
cd desktop-worker
npm install
npm run dev
```

## Build installers

```bash
cd desktop-worker
npm install
npm run dist:mac
npm run dist:win
```

Outputs are created in `desktop-worker/dist`.

## Security defaults

- Desktop key (worker token) required.
- Token stored encrypted where OS encryption is available.
- `run_command` is blocked unless enabled in app settings.
- All execution is auditable through Nexrel live run telemetry.

## Production signing

- macOS signing/notarization: requires Apple Developer credentials.
- Windows signing: requires code signing certificate.
