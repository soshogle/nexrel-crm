# EHR Bridge – Read/Write Extension Design

## Implemented (Phase 1–3)

- **Read from This Page** – DOM extraction of patient data (name, email, phone, address, DOB, prior notes)
- **POST /api/ehr-bridge/pull** – Sync extracted data to Lead (create or update by email/phone match)
- **Extended mappings** – `read` blocks for Dentrix, Dentitek, Generic
- **ehr-reader.js** – Content script for DOM extraction with page-type detection (patient_chart, calendar)

---

## Overview

Extend the Nexrel EHR Bridge to:
1. **Read** patient data (email, phone, treatment history) from EHR pages
2. **Read and write** calendar/appointments
3. Support both **DOM-based** (no API) and **API-based** (when clinic has EHR API) flows

---

## Two Integration Modes

| Mode | When | How |
|------|------|-----|
| **DOM-based** | EHR has no public API | Content script reads/writes DOM elements using CSS selectors |
| **API-based** | Clinic configures EHR read/write API in Nexrel | Extension triggers → Nexrel backend calls EHR API → data flows both ways |

---

## Data We Want to Extract (Read)

| Data Type | Fields | Use Case |
|-----------|--------|----------|
| **Patient demographics** | Name, DOB, email, phone, address | Sync to Nexrel Lead/Contact |
| **Treatment history** | Prior visits, procedures, notes | Docpen pre-charting, CRM history |
| **Calendar** | Appointments, times, provider, patient | Sync to Nexrel calendar, scheduling |
| **Allergies / medications** | When available | Docpen context, safety |
| **Insurance** | Provider, policy (if visible) | CRM enrichment |

---

## Extended Mappings Schema

```typescript
// lib/ehr-bridge/mappings.ts – extended

export interface EHRMapping {
  ehrType: EHRType;
  displayName: string;
  urlPatterns: string[];
  
  // WRITE (current – SOAP injection)
  fields: {
    subjective?: string[];
    objective?: string[];
    assessment?: string[];
    plan?: string[];
    note?: string[];
    additionalNotes?: string[];
  };
  
  // READ – patient demographics
  read?: {
    patientName?: string[];
    patientEmail?: string[];
    patientPhone?: string[];
    patientDob?: string[];
    patientAddress?: string[];
    patientId?: string[];      // Internal EHR patient ID (for API correlation)
  };
  
  // READ – treatment / notes history
  readHistory?: {
    priorNotes?: string[];     // Container for past visit notes
    procedures?: string[];     // Procedure list table/grid
    lastVisitDate?: string[];
  };
  
  // READ – calendar
  readCalendar?: {
    calendarView?: string[];  // Main calendar container
    appointmentRow?: string[]; // Single appointment row/card
    appointmentTime?: string[];
    appointmentPatient?: string[];
    appointmentProvider?: string[];
    appointmentStatus?: string[];
  };
  
  // WRITE – calendar (when EHR allows)
  writeCalendar?: {
    addAppointmentButton?: string[];
    datePicker?: string[];
    timeSlot?: string[];
    patientSearch?: string[];
    procedureField?: string[];
    saveButton?: string[];
  };
}
```

---

## DOM-Based Read Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: Opens EHR patient chart (e.g. Dentrix – Jane Doe)               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT: ehr-reader.js                                          │
│  • Detect EHR type from URL                                             │
│  • Run read extractors for current page type:                           │
│    - /patient/*  → read patient demographics                             │
│    - /calendar/* → read calendar appointments                            │
│    - /chart/*    → read treatment history                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EXTRACT: Query DOM with selectors from mappings                        │
│  e.g. patientEmail: ['.patient-email', '#email', '[data-field="email"]'] │
│  → Return { email: "jane@example.com", phone: "555-1234", ... }         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POPUP: "Pull Patient Data" clicked                                     │
│  → Send extracted data to Nexrel API                                    │
│  POST /api/ehr-bridge/pull                                              │
│  Body: { source: 'dom', ehrType: 'dentrix', patientId?, data: {...} }    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NEXREL API: Store in Lead, update CRM, enrich Docpen context           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API-Based Read Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CLINIC: Configures EHR API in Nexrel Settings                          │
│  • Read API URL (e.g. Dentrix API, FHIR endpoint)                       │
│  • Auth: API key, OAuth, or certificate                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: Clicks "Pull Patient Data" in extension                          │
│  Extension sends: patientId (from URL or DOM) + dataType                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NEXREL API: POST /api/ehr-bridge/pull                                  │
│  • Look up clinic's EHR config                                          │
│  • Call EHR read API: GET /patients/{id}, GET /appointments, etc.       │
│  • Map response → Nexrel schema                                         │
│  • Store in CRM (Lead, DocpenSession metadata)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ehr-bridge/pull` | POST | Receive extracted data (DOM or trigger API pull) |
| `/api/ehr-bridge/pull/trigger` | POST | Trigger backend to call EHR API for patient/calendar |
| `/api/ehr-bridge/sync-lead` | POST | Sync extracted patient → Lead by match (email/phone) |
| `/api/ehr-bridge/calendar` | GET | Return Nexrel calendar events (for comparison) |
| `/api/ehr-bridge/calendar/push` | POST | Push appointment to EHR (when write API) |

### Pull Request Body (DOM-extracted)

```json
{
  "source": "dom",
  "ehrType": "dentrix",
  "pageType": "patient_chart",
  "patientId": "EHR-12345",
  "data": {
    "patientName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-123-4567",
    "dob": "1985-03-15",
    "address": "123 Main St",
    "priorNotes": ["Visit 01/15: Cleaning...", "Visit 12/01: Exam..."],
    "lastVisitDate": "2025-01-15"
  }
}
```

---

## Page-Type Detection

Different EHR pages have different data. Content script detects page type from URL path or DOM:

| URL Pattern | Page Type | Data Available |
|-------------|-----------|----------------|
| `/patient/`, `/chart/`, `/demographics` | Patient chart | Demographics, treatment history |
| `/schedule`, `/calendar`, `/appointments` | Calendar | Appointments |
| `/clinical-note`, `/encounter` | Note entry | SOAP (already supported) |

```javascript
// content/ehr-page-detector.js
function getPageType() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('calendar') || path.includes('schedule') || path.includes('appointment'))
    return 'calendar';
  if (path.includes('patient') || path.includes('chart') || path.includes('demographic'))
    return 'patient_chart';
  if (path.includes('note') || path.includes('encounter') || path.includes('clinical'))
    return 'clinical_note';
  return 'unknown';
}
```

---

## Popup UI Additions

```
┌─ Sync from EHR ─────────────────────────────────────┐
│  [Pull Patient Data]  [Pull Prior Notes]            │  ← existing (API)
│  [Read from This Page]                              │  ← NEW: DOM extract
│  Last sync: 2 min ago                               │
└────────────────────────────────────────────────────┘

┌─ Calendar Sync ─────────────────────────────────────┐
│  [Pull Appointments]  [Push to EHR]                 │  ← NEW
│  Syncs with Nexrel calendar                          │
└────────────────────────────────────────────────────┘
```

When "Read from This Page" is clicked:
1. Content script extracts whatever is on the current page (patient, calendar, etc.)
2. Sends to `/api/ehr-bridge/pull`
3. Backend stores in Lead (create or update by email/phone match)
4. Toast: "Patient Jane Doe synced to CRM"

---

## Database / CRM Updates

**Lead model** (existing): Add `ehrPatientId` to link to EHR record.

**New or extended:**
- `EhrSyncLog` – Audit when we pulled data, from which EHR, for which patient
- `EhrClinicConfig` – Per-clinic: EHR API URL, auth, mappings override
- Calendar: Use existing Nexrel calendar/appointments; map EHR appointments → Nexrel events

---

## Per-EHR Read Selectors (Examples)

These would need to be discovered per EHR (inspect DOM, document selectors):

| EHR | Patient Email | Patient Phone | Calendar Row |
|-----|---------------|---------------|--------------|
| Dentrix | `#PatientEmail`, `.contact-email` | `#PatientPhone` | `.appointment-row` |
| Dentitek | TBD | TBD | TBD |
| Athena | `.patient-demographics .email` | `.patient-demographics .phone` | `.appointment-card` |
| Open Dental | `input[name="Email"]` | `input[name="Phone"]` | `.schedule-event` |

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| **1** | Extend mappings schema with `read` blocks; add `ehr-reader.js` content script |
| **2** | Implement DOM extractors for patient demographics (Dentrix, Dentitek first) |
| **3** | Add `POST /api/ehr-bridge/pull`, Lead sync logic |
| **4** | Add calendar read selectors and extractors |
| **5** | Add API-based flow (when clinic config exists) |
| **6** | Add calendar write (DOM or API) |

---

## Security & Privacy

- **Consent:** Clinic must agree to sync data; extension only runs when user is logged into EHR
- **Scoping:** Only extract when user explicitly clicks "Pull" or "Read from Page"
- **Storage:** Data stored in Nexrel under clinic/user; HIPAA considerations for PHI
- **Audit:** Log all pull/push actions in `EhrSyncLog`
