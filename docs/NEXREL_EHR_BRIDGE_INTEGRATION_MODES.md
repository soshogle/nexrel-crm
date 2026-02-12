# Nexrel EHR Bridge – Integration Modes

This document describes all supported integration modes for connecting Nexrel CRM to EHR systems, including cloud-based, on-premise, desktop, and API-based options.

---

## Overview

| Mode | Use case | Components | Best for |
|------|----------|------------|----------|
| **Cloud extension** | Browser-based EHRs (Dentrix Ascend, Dentitek, etc.) | Chrome extension | Most dental practices |
| **On-prem web** | EHR hosted on local/internal server | Chrome extension | Single-location practices |
| **Desktop bridge** | Native desktop EHR apps | Electron app + Vision API | Dentrix G5, Eaglesoft desktop |
| **API connector** | EHRs with REST/FHIR APIs | Nexrel API + config | Epic, Athena, Open Dental API |
| **RPA** | Any EHR via UI automation | External RPA tools + export | Complex workflows |

---

## 1. Cloud Extension (Browser-Based)

The standard integration for SaaS EHRs accessed via browser.

**Setup:**
1. Install the Nexrel EHR Bridge Chrome extension
2. In Nexrel CRM → Settings → EHR Bridge, generate a token
3. In the extension popup, paste the token and connect
4. Navigate to your EHR in the same browser; the extension detects it and enables push/pull

**Features:**
- DOM-based schedule extraction (real-time)
- Auto-push appointments when add form is visible
- Cookie change detection (session refresh)
- SOAP note injection

**Supported EHRs:** Dentrix, Dentrix Ascend, Eaglesoft, Open Dental, Dentitek, OrthoNovo, Progident, Athena, Epic, SimplePractice, Tebra, and generic fallback.

---

## 2. On-Premise Web (Browser-Accessible)

For EHRs hosted on internal servers (e.g. `http://192.168.1.50/ehr`, `http://dentrix-server.local`).

**Setup:**
1. Same as cloud extension
2. Ensure the EHR is accessed via HTTP/HTTPS in Chrome
3. The extension automatically detects `localhost`, `127.0.0.1`, and private IP ranges (192.168.x.x, 10.x.x.x, 172.16–31.x.x)

**Manifest permissions:** The extension includes `http://*/*`, `http://localhost:*/*`, and `http://127.0.0.1:*/*` in `host_permissions`.

**Detection:** URLs matching private IPs or `*.local` / `*.internal` are detected as **On-Premise EHR**.

---

## 3. Desktop Bridge (Screen Capture + Vision)

For native desktop EHR applications (no browser).

**Components:**
- **Nexrel Desktop Bridge** – Electron app in `desktop-bridge/`
- **Vision API** – Extracts schedule data from screenshots
- **RPA export** – Outputs actions for UiPath, Automation Anywhere, or custom scripts

**Setup:**

```bash
cd desktop-bridge
npm install
npm start
```

1. Enter your EHR Bridge token (from Nexrel CRM)
2. Select the EHR window or screen to capture
3. Click **Capture & send to Nexrel** – screenshot is sent to the Vision API for schedule extraction
4. Optionally export pending actions for RPA tools

**Environment:**
- `NEXREL_API_BASE` – Override API URL (default: `https://www.nexrel.soshogle.com`)

**Build:**
```bash
npm run build:mac   # macOS .dmg
npm run build:win   # Windows installer
```

---

## 4. Direct API Integration

For EHRs that expose REST or FHIR APIs.

**Available connectors:** See `GET /api/ehr-bridge/connectors`

| Connector | EHR | Type | Auth |
|-----------|-----|------|------|
| dentrix-ascend-api | Dentrix Ascend | REST | OAuth2 |
| epic-fhir | Epic | FHIR | OAuth2 |
| athena-fhir | Athenahealth | FHIR | OAuth2 |
| open-dental-api | Open Dental | REST | API key |

**Config:** Add connector config in `lib/ehr-bridge/connectors.ts`. Use env vars for base URLs:

- `EHR_DENTRIX_ASCEND_API_URL`
- `EHR_EPIC_FHIR_URL`
- `EHR_ATHENA_FHIR_URL`
- `EHR_OPENDENTAL_API_URL`

**Extending:** Add new entries to `EHR_API_CONNECTORS` when an EHR vendor provides API access.

---

## 5. RPA Tools (UiPath, Automation Anywhere)

Use external RPA tools to drive the EHR UI.

**Getting actions:**
- **API:** `GET /api/ehr-bridge/desktop/actions?format=uipath` or `?format=automationanywhere`
- **Desktop Bridge:** Export to `~/.nexrel/rpa-actions.json`

**Response format (default):**
```json
{
  "actions": [
    {
      "id": "apt-123",
      "type": "inject_appointment",
      "payload": { "customerName": "Jane Doe", "appointmentDate": "..." },
      "rpa": {
        "uipath": { "activity": "TypeInto", "selector": {...}, "text": "Jane Doe" },
        "automationAnywhere": { "command": "Type", "parameters": {...} },
        "exec": { "command": "osascript -e 'tell application \"System Events\" to keystroke \"Jane Doe\"'" }
      }
    }
  ]
}
```

**UiPath:** Use `?format=uipath` for workflow-ready JSON.  
**Automation Anywhere:** Use `?format=automationanywhere` for task-ready JSON.

**Polling:** RPA tools can poll `/api/ehr-bridge/desktop/actions` periodically (with Bearer token) to fetch new pending appointments and execute them.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ehr-bridge/schedule/pending` | GET | Pending appointments (extension/desktop) |
| `/api/ehr-bridge/schedule/analyze-screenshot` | POST | Vision API – extract schedule from screenshot |
| `/api/ehr-bridge/schedule/pull-dom` | POST | DOM-extracted schedule (extension) |
| `/api/ehr-bridge/desktop/actions` | GET | RPA actions (`?format=nexrel|uipath|automationanywhere`) |
| `/api/ehr-bridge/connectors` | GET | List API connectors |

All require `Authorization: Bearer <ehr_xxx>` except connectors (public list).

---

## File Layout

```
extensions/nexrel-ehr-bridge/     # Chrome extension
desktop-bridge/                  # Electron desktop app
  main.js
  preload.js
  renderer/
lib/ehr-bridge/
  mappings.ts                    # DOM field mappings
  connectors.ts                  # API connector configs
app/api/ehr-bridge/
  schedule/                      # Schedule endpoints
  desktop/actions/               # RPA actions
  connectors/                    # Connector list
```
