# Nexrel EHR Bridge

Chrome extension that pushes Docpen SOAP notes into browser-based EHRs (Dentrix, Open Dental, Athena, Epic, etc.).

## Setup

1. **Load the extension** (Chrome):
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extensions/nexrel-ehr-bridge`

2. **Generate token** (Nexrel):
   - Log in to Nexrel → Settings → EHR Bridge
   - Click "Generate Extension Token"
   - Copy the token

3. **Connect extension**:
   - Click the Nexrel EHR Bridge icon in the toolbar
   - Click "Connect to Nexrel"
   - Paste the token

4. **Push notes**:
   - Open an EHR tab (e.g. Dentrix, Athena)
   - Open the extension popup
   - Select a note and click "Push", or click "Push Latest Note"

5. **Read from EHR** (sync patient data to CRM):
   - Open an EHR patient chart or demographics page
   - Open the extension popup
   - Click "Read from This Page"
   - Patient name, email, phone, address, DOB, prior notes sync to Nexrel as a Lead

## Supported EHRs

**US:**
- Dentrix, Dentrix Ascend
- Eaglesoft
- Open Dental
- Athenahealth
- Epic
- SimplePractice
- Tebra

**Canada:**
- Dentitek (dentitek.ca, app.dentitek.ca, dentitek.info)
- OrthoNovo (Novologik)
- Progident

**Fallback:** Generic (heuristic field matching)

## Sync from EHR (Read)

1. Open an EHR patient chart or calendar page
2. Click the extension icon → **Read from This Page**
3. Patient data (name, email, phone, address, DOB, prior notes) is extracted via DOM and synced to Nexrel CRM
4. Matching: by email → phone → contact name. Creates new Lead or updates existing

## Schedule (No API Fallback)

When the EHR has no read/write API:

1. **Capture Schedule** – Open EHR schedule tab → click **Capture Schedule** → extension screenshots the page → Vision API extracts available slots → stored for Voice AI
2. **Voice AI** – Calls `GET /api/ehr-bridge/availability?date=YYYY-MM-DD` to get available slots, offers them to callers, books in Nexrel
3. **Push to EHR** – Pending appointments appear in extension → open EHR add-appointment form → click **Push to EHR** → extension fills fields via DOM

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ehr-bridge/auth/generate` | Generate extension token (requires Nexrel session) |
| `GET /api/ehr-bridge/notes` | List pushable notes (Bearer token) |
| `GET /api/ehr-bridge/export/[sessionId]` | Get formatted note for injection (Bearer token) |
| `POST /api/ehr-bridge/pull` | Sync DOM-extracted patient data to Lead (Bearer token) |
| `POST /api/ehr-bridge/schedule/analyze-screenshot` | Analyze schedule screenshot, extract slots (Bearer token) |
| `GET /api/ehr-bridge/availability?date=` | Get available slots for Voice AI (Bearer or session) |
| `GET /api/ehr-bridge/schedule/pending` | List pending appointments to push (Bearer token) |
| `GET /api/ehr-bridge/mappings` | EHR field mappings (public) |

## Local Development

When developing against `localhost:3000`, the extension uses production by default. To use localhost, modify `API_BASE` in `popup/popup.js` to `http://localhost:3000`, or add a configurable base URL in the popup.

## Regenerating Icons

```bash
node extensions/nexrel-ehr-bridge/scripts/generate-icons.js
```
