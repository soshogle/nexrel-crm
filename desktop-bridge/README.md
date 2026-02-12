# Nexrel EHR Desktop Bridge

Electron app for integrating **non-cloud** or **desktop** EHRs with Nexrel CRM via screen capture and Vision API.

## Quick Start

```bash
npm install
npm start
```

1. Enter your EHR Bridge token (from Nexrel CRM → Settings → EHR Bridge)
2. Click **Refresh sources** and select your EHR window
3. Click **Capture & send to Nexrel** – the screenshot is analyzed and schedule data is stored
4. Use **Export RPA actions** to save pending actions for UiPath, Automation Anywhere, or custom scripts

## Use Cases

- **Desktop EHRs** (Dentrix G5, Eaglesoft desktop) – capture the schedule window, send to Vision API
- **RPA integration** – export actions to `~/.nexrel/rpa-actions.json` for external automation
- **On-prem without browser** – when the EHR runs as a native app

## Environment

| Variable | Description |
|----------|-------------|
| `NEXREL_API_BASE` | API base URL (default: `https://www.nexrel.soshogle.com`) |

## Build

```bash
npm run build:mac   # macOS .dmg
npm run build:win   # Windows NSIS + portable
```

Output in `dist/`.
