# EHR Integration Modes

Nexrel supports multiple ways to integrate with EHRs depending on whether they are cloud-based, on-premise, or desktop-only.

---

## 1. Cloud-based (Browser Extension)

**Best for:** Dentrix Ascend, Dentitek, Eaglesoft, Open Dental cloud, Athenahealth, Epic, SimplePractice, Tebra, etc.

- **Install:** Chrome extension (Nexrel EHR Bridge)
- **How it works:** Content scripts inject into the EHR web app; DOM extraction and injection
- **Setup:** Load extension, authenticate with token from Nexrel CRM → Settings → EHR Bridge

---

## 2. On-Premise but Browser-Accessible

**Best for:** EHRs hosted on local/internal servers (e.g. `http://localhost:8080`, `http://192.168.1.50/ehr`, `http://dentrix-server.local`)

- **Install:** Same Chrome extension
- **How it works:** Extension runs on `http://*/*` and `https://*/*`; detects `localhost`, `127.0.0.1`, `*.local`, `*.internal`, and private IP ranges (192.168.x.x, 10.x.x.x, 172.16–31.x.x)
- **Setup:** Open your EHR in Chrome; extension auto-detects as "On-Premise EHR"
- **Cookie/session:** Cookie change listener refreshes extension state when you log in/out

---

## 3. Desktop Bridge (Electron) – Screen Capture + Vision/OCR

**Best for:** Native desktop EHRs (Dentrix G5, Eaglesoft desktop, etc.) that don’t run in a browser

- **Install:** `cd desktop-bridge && npm install && npm start`
- **What it does:**
  - Captures a selected window or screen
  - Sends screenshot to Nexrel API for Vision/OCR (schedule extraction)
  - Stores availability in the same data model as the extension
- **APIs used:**
  - `POST /api/ehr-bridge/schedule/analyze-screenshot` – upload screenshot
  - `GET /api/ehr-bridge/desktop/actions` – fetch pending RPA actions

---

## 4. Direct API Integration

**Best for:** EHRs with REST or FHIR APIs (Epic, Athenahealth, Dentrix Ascend, Open Dental, etc.)

- **Configure:** Nexrel CRM → Settings → EHR Bridge → API Connectors
- **Connectors:** See `GET /api/ehr-bridge/connectors` for available connectors
- **Setup:** Configure base URL and auth (OAuth2, API key) per connector
- **Docs:** Each connector links to vendor API documentation

---

## 5. RPA Tools (UiPath, Automation Anywhere)

**Best for:** When you need full keyboard/mouse automation on desktop EHRs

- **Export format:** JSON actions from `GET /api/ehr-bridge/desktop/actions`
- **Formats:**
  - `?format=nexrel` – default, rich payload
  - `?format=uipath` – UiPath-style activities
  - `?format=automationanywhere` – Automation Anywhere-style tasks
- **Desktop Bridge:** Can write actions to `~/.nexrel/rpa-actions.json` for RPA tools to consume
- **Example RPA flow:**
  1. Poll `GET /api/ehr-bridge/desktop/actions` for pending appointments
  2. Import JSON into UiPath/Automation Anywhere
  3. Execute TypeInto, Click, etc. on the EHR window

---

## Summary Table

| Mode                  | Use case                     | Tool                      |
|-----------------------|-----------------------------|---------------------------|
| Cloud                 | Browser-based EHR           | Chrome extension          |
| On-prem web           | Local/internal web server   | Chrome extension          |
| Desktop bridge        | Native desktop app          | Electron app              |
| Direct API            | EHR has REST/FHIR API       | Nexrel backend            |
| RPA                   | Full desktop automation     | UiPath / Automation Anywhere |
