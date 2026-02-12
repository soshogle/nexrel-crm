# Nexrel EHR Bridge – Chrome Extension Design

## Overview

A Chrome extension that connects Nexrel CRM and Docpen to browser-based EHRs via DOM injection (no API) or API when read/write access exists. Built with our brand (purple gradient, clean UI) and designed to surpass [Freed's EHR Push](https://www.getfreed.ai/ehr-push).

---

## Freed vs Nexrel – Comparison

| Feature | Freed | Nexrel EHR Bridge |
|--------|-------|-------------------|
| **Push notes to EHR** | ✅ One-click | ✅ One-click + batch |
| **Works when CRM closed** | ❌ (Freed app required) | ✅ Extension fetches from API |
| **Read from EHR** | ❌ | ✅ Pull patient data when read API exists |
| **Pre-charting** | Limited | ✅ Prior notes, demographics from EHR → Docpen |
| **CRM integration** | Scrib-only | ✅ Full CRM: notes, appointments, patients |
| **EHR type support** | All browser-based | Same + prioritized dental (Dentrix, Eaglesoft, Open Dental) |
| **Dental-specific** | No | ✅ Docpen, CDT codes, tooth refs |
| **Multi-entity push** | Notes only | Notes, appointments, patient updates |
| **Standalone UI** | Minimal | Full popup with branding, history, settings |
| **API-first when available** | No | ✅ Uses read API when configured |

---

## Extension Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEXREL EHR BRIDGE (Chrome Extension)                               │
├─────────────────────────────────────────────────────────────────────┤
│  Popup UI          │  Content Scripts      │  Background Service    │
│  - Auth            │  - EHR tab detection  │  - API calls           │
│  - Push queue      │  - DOM injection      │  - Message routing     │
│  - Pull/sync       │  - Field mapping     │  - Auth token storage  │
│  - Settings        │  - Read DOM (no API) │  - EHR config cache    │
└─────────────────────────────────────────────────────────────────────┘
         │                      │                        │
         └──────────────────────┼────────────────────────┘
                                │
         ┌──────────────────────┼────────────────────────┐
         │                      │                        │
         ▼                      ▼                        ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│  Nexrel API     │  │  EHR Tab        │  │  EHR API (if read/write) │
│  (notes, CRM)  │  │  (DOM inject)  │  │  (when configured)      │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

---

## Popup UI Design (Brand-Styled)

### Layout (380×520px popup)

```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Nexrel Logo]  EHR Bridge                    [≡]  │  │
│  │  purple gradient header                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ EHR Tab Detected ─────────────────────────────────┐  │
│  │  ● Dentrix Web  Ready to push                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Push to EHR ──────────────────────────────────────┐  │
│  │  [Push Latest Note]   ← primary CTA                │  │
│  │                                                     │  │
│  │  Recent notes:                                      │  │
│  │  ○ Jane Doe – 02/12 10:30  [Push]                 │  │
│  │  ○ John Smith – 02/12 09:15  [Push]               │  │
│  │  ○ Maria Garcia – 02/11 16:00  [Push]             │  │
│  │  [View all in Nexrel →]                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Sync from EHR (when read API) ────────────────────┐  │
│  │  [Pull Patient Data]  [Pull Prior Notes]           │  │
│  │  Last sync: 2 min ago                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Quick Actions ────────────────────────────────────┐  │
│  │  [Open Docpen]  [Open CRM]  [Settings]             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  Signed in as clinic@example.com         [Log out]       │
└──────────────────────────────────────────────────────────┘
```

### Brand Elements

- **Primary:** `hsl(262, 83%, 58%)` (purple)
- **Header:** Gradient `purple-600 → purple-500`, white text
- **Buttons:** Rounded `0.75rem`, purple primary, outline secondary
- **Typography:** Inter or system font, clean hierarchy
- **Logo:** Nexrel/Soshogle logo in header

---

## Features & Flows

### 1. Push to EHR (No API)

**Flow:**
1. User opens EHR tab (e.g. Dentrix Web).
2. Extension detects EHR type via URL/domain.
3. User opens extension popup → sees "Recent notes" from Nexrel API.
4. User selects note → clicks "Push".
5. Content script injects into EHR tab:
   - Finds clinical note/textarea fields (per EHR mapping).
   - Fills Subjective, Objective, Assessment, Plan.
   - Optionally triggers save or leaves for user to review.

**EHR field mappings (per EHR):**
- Dentrix Web: `#clinical-note`, `#soap-subjective`, etc.
- Open Dental: `textarea.progress-note`, etc.
- Epic, Athena, etc.: Configurable selector map.

### 2. Push to EHR (Write API)

**Flow:**
1. Clinic configures EHR API in Nexrel settings (write endpoint, auth).
2. Extension calls our API with "push" request.
3. Our backend uses EHR write API directly.
4. Extension shows success/failure; no DOM injection.

### 3. Sync from EHR (Read API)

**Flow:**
1. Clinic configures EHR read API in Nexrel (endpoint, API key/OAuth).
2. User opens EHR tab on patient chart.
3. User clicks "Pull Patient Data" or "Pull Prior Notes" in extension.
4. Extension sends current patient id/context (from EHR URL or DOM) to our API.
5. Our backend calls EHR read API.
6. Data stored in Nexrel CRM; available for Docpen pre-charting, lead record, etc.

**Data we pull:**
- Patient demographics (name, DOB, contact)
- Prior visit notes
- Upcoming appointments
- Allergies, medications (when available)

### 4. Pre-Charting Enrichment

**Flow:**
1. User starts Docpen session with patient (leadId).
2. If EHR read API is configured, our backend fetches prior notes + demographics.
3. Docpen pre-chart panel shows: "Prior notes (3)", "Last visit: 01/15", "Allergies: Penicillin".
4. Voice agent can reference this context during the visit.

### 5. Works When Nexrel Is Closed

- Extension has its own auth (stored token from Nexrel login).
- Fetches notes/sessions from `GET /api/docpen/sessions?status=ready` (or similar).
- User can push notes without having Nexrel tab open.

---

## Content Script – EHR Detection & Injection

### Supported EHRs (Priority)

| EHR | Type | Detection | DOM Injection |
|-----|------|-----------|---------------|
| Dentrix | Dental | `dentrix.com`, `eaglesoft.net` | Yes |
| Open Dental | Dental | `opendental.com` | Yes |
| Eaglesoft | Dental | `eaglesoft.net` | Yes |
| Dentrix Ascend | Dental | `ascend.dentrix.com` | Yes |
| Athena | Medical | `athenahealth.com` | Yes |
| Epic | Medical | `epic.com`, `*.epic.com` | Yes |
| SimplePractice | Medical | `simplepractice.com` | Yes |
| Tebra | Medical | `tebra.com` | Yes |
| Generic | Any | URL pattern | Heuristic field matching |

### Field Mapping Config

```json
{
  "dentrix": {
    "subjective": "#ClinicalNote-Subjective",
    "objective": "#ClinicalNote-Objective",
    "assessment": "#ClinicalNote-Assessment",
    "plan": "#ClinicalNote-Plan"
  },
  "athena": {
    "note": ".am-encounter-note-body"
  }
}
```

Stored in extension, updatable via our API (extension fetches latest mappings).

---

## API Endpoints (New/Extended)

### For Extension

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ehr-bridge/auth` | POST | Exchange Nexrel session for extension token |
| `/api/ehr-bridge/notes` | GET | List pushable notes (for user/clinic) |
| `/api/ehr-bridge/mappings` | GET | EHR field mappings (by EHR type) |
| `/api/ehr-bridge/pull` | POST | Trigger pull from EHR (when read API); body: `{ patientId, dataType }` |
| `/api/ehr-bridge/push-status` | POST | Extension reports push success/failure |

### For Read API Integration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ehr/config` | GET/PUT | Clinic EHR API config (read URL, auth) |
| `/api/ehr/sync` | POST | Backend calls EHR read API, stores in CRM |

---

## Extension File Structure

```
nexrel-ehr-bridge/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── content.js          # Injected into EHR tabs
│   ├── ehr-detector.js
│   └── injectors/
│       ├── dentrix.js
│       ├── opendental.js
│       └── generic.js
├── background/
│   └── service-worker.js   # API calls, messaging
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── lib/
    ├── api.js
    └── auth.js
```

---

## Security & Compliance

- **HIPAA / Law 25:** End-to-end encryption for API calls; no PHI in extension storage beyond session token.
- **Auth:** Short-lived extension token; refresh via Nexrel session.
- **DOM injection:** Read/write only on EHR domains we explicitly support.
- **Permissions:** `activeTab`, `storage`, `scripting` for injection; `host_permissions` for our API + EHR domains.

---

## Implementation Phases

### Phase 1: Core Push (DOM only)
- Extension shell + popup UI
- Auth flow
- Fetch notes from API
- Content script for 1–2 EHRs (e.g. Open Dental, Dentrix)
- Push to EHR via DOM injection

### Phase 2: Read API
- Clinic EHR config (read API URL, key)
- Backend EHR client
- Pull patient data into CRM
- Pre-chart panel uses pulled data

### Phase 3: Write API
- When clinic has EHR write API
- Backend pushes directly; extension only triggers

### Phase 4: Expand EHRs
- More EHR mappings
- Auto-update mappings from API

---

## What Makes It Better Than Freed

1. **Bidirectional:** Read + write; Freed is push-only.
2. **CRM integration:** Notes, appointments, patient data; Freed is scribe-only.
3. **Works offline of our app:** Extension fetches from API; Freed requires app open.
4. **Pre-charting:** EHR data enriches Docpen; Freed’s pre-chart is limited.
5. **Dental focus:** Docpen, CDT, tooth refs; Freed is medical.
6. **API-first:** Uses read/write APIs when available; Freed is DOM-only.
7. **Unified branding:** Consistent Nexrel UI; Freed is a separate product.
8. **Batch push:** Push multiple notes; Freed is single-note.

---

## References

- [Freed EHR Push](https://www.getfreed.ai/ehr-push) – competitor reference
- Chrome Extension [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- Docpen EHR export: `lib/docpen/ehr-export.ts`
