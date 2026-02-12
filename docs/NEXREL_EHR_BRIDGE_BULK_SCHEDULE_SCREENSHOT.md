# EHR Bridge – Bulk, Schedule Sync & Screenshot-Based Flow

## Implemented (Screenshot Flow)

- **Capture Schedule** – Extension captures visible tab, sends to POST /schedule/analyze-screenshot, Vision API extracts slots, stores in EhrScheduleSnapshot
- **GET /availability** – Voice AI fetches available slots for a date (Bearer token or session)
- **Push Pending** – Extension lists pending BookingAppointments (syncStatus=PENDING), injects into EHR add-appointment form via DOM
- **EhrScheduleSnapshot** – Prisma model for storing parsed availability

**Migration:** Run `npx prisma migrate deploy` (or `migrate dev`) to create EhrScheduleSnapshot table.

---

## Overview

Three enhancements to the EHR Bridge extension:

1. **Bulk patient read** – Extract multiple patients from list/search views in one action
2. **Schedule sync** – Pull EHR appointments into Nexrel calendar; push Nexrel bookings to EHR
3. **Screenshot-based flow** (no API) – Capture schedule screenshots → parse availability → Voice AI books → extension writes appointment to EHR

---

## 1. Bulk Patient Read

### Current Flow (Single)
- User opens one patient chart → Read from This Page → one Lead created/updated

### Bulk Flow (New)

| Source Page | What We Extract | How |
|-------------|-----------------|-----|
| **Patient list** | Each row: name, ID, possibly phone/email if visible | Query `tr.patient-row`, `.patient-list-item`, etc. per EHR |
| **Search results** | Same as list | Same selectors |
| **Schedule/day view** | Each appointment: patient name, time, slot status | Rows/cards with patient + time |

### Implementation

**Extension:**
- Detect page type: `patient_list` | `patient_search` | `schedule_day` | `patient_chart`
- For list/search: `querySelectorAll(rowSelector)` → for each row, extract cells by index or data-attrs
- Send batch: `POST /api/ehr-bridge/pull` with `{ dataType: 'patients_bulk', data: { patients: [ { patientName, email?, phone?, patientId? }, ... ] } }`

**API:**
- Handle `patients_bulk`: loop over patients, match/create Lead for each (email → phone → name)
- Return `{ created: N, updated: M, skipped: K, errors: [...] }`

**Mappings:**
```typescript
readBulk?: {
  patientListContainer?: string[];
  patientRow?: string[];
  patientRowName?: string[];   // Within row
  patientRowEmail?: string[];
  patientRowPhone?: string[];
  patientRowId?: string[];
}
```

---

## 2. Schedule Sync – EHR ↔ Nexrel Calendar

### Read: EHR Schedule → Nexrel

| Step | Action |
|------|--------|
| 1 | User opens EHR schedule/calendar (day, week view) |
| 2 | Extension extracts appointment rows (patient, time, provider, status) |
| 3 | Parse into structured slots: `{ date, time, patientName, provider?, status, isBooked }` |
| 4 | Send to `POST /api/ehr-bridge/schedule/pull` |
| 5 | API creates/updates `BookingAppointment` with `source: 'ehr_bridge'`, links to Lead if matched |
| 6 | Sync to Nexrel calendar view |

**Data model:** Use `BookingAppointment` with `externalEventId` = EHR appointment ID for dedup.

### Write: Nexrel → EHR Schedule

| Step | Action |
|------|--------|
| 1 | Voice AI or user books appointment in Nexrel |
| 2 | Appointment stored in `BookingAppointment` with `syncStatus: PENDING` |
| 3 | Extension polls `GET /api/ehr-bridge/schedule/pending` or receives push |
| 4 | User opens EHR schedule tab |
| 5 | Extension "Push Pending Appointments" → DOM injection: open add-appointment form, fill date, time, patient, procedure, save |

**Mappings:**
```typescript
writeCalendar?: {
  addAppointmentButton?: string[];
  datePicker?: string[];
  timeSlot?: string[];
  patientSearch?: string[];
  procedureField?: string[];
  saveButton?: string[];
}
```

---

## 3. Screenshot-Based Flow (No Read/Write API)

When the EHR has no API and DOM structure is unreliable for parsing:

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EHR Tab (Schedule View) – User keeps open                                    │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │  Every 30 sec (configurable)
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Chrome Extension: chrome.tabs.captureVisibleTab()                           │
│  → Screenshot of schedule                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │  POST /api/ehr-bridge/schedule/analyze-screenshot
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Nexrel API: Vision API (GPT-4V / Claude)                                    │
│  → Extract: available slots, booked slots, date range                        │
│  → Store in EhrScheduleSnapshot                                              │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │  Availability API
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Voice AI Agent                                                              │
│  → GET /api/ehr-bridge/availability?date=2025-02-15                          │
│  → Returns: ["9:00 AM", "10:30 AM", "2:00 PM", ...]                          │
│  → Agent offers these to caller, books slot                                   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │  Booking created in Nexrel
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pending Appointment Queue                                                  │
│  → BookingAppointment with syncStatus=PENDING, source='voice_ai'             │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │  User opens EHR, clicks "Push Pending"
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Extension: DOM injection into EHR add-appointment form                      │
│  → Fill date, time, patient name, phone; click Save                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| **Background script** | `chrome.alarms` every 30s when EHR schedule tab is active; `captureVisibleTab()` |
| **POST /schedule/analyze-screenshot** | Receive image, call Vision API, return structured availability |
| **EhrScheduleSnapshot** | Store parsed availability by clinic/date (cache for Voice AI) |
| **GET /availability** | Return available slots for date (from latest snapshot or parsed schedule) |
| **Push Pending** | Extension reads pending appointments, injects into EHR DOM |

### Permissions

- `chrome.tabs` (already have)
- `chrome.alarms` for 30s interval
- `activeTab` for `captureVisibleTab` (captures the active tab when extension triggers – may need user gesture)

**Note:** `captureVisibleTab` requires the tab to be active. For a "background" capture every 30s, the user would need to keep the EHR schedule tab in focus, or we use a different approach (e.g. DOM extraction when possible, screenshots only when user explicitly clicks "Capture Schedule").

### Alternative: User-Triggered Capture

- User opens EHR schedule → clicks "Capture Schedule" in extension
- Extension captures screenshot → sends to API → availability extracted
- Voice AI uses this snapshot for the next N hours (or until next capture)
- Simpler, no background polling, no permission concerns

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| **4a** | Bulk read: list detection, row extraction, batch API |
| **4b** | Schedule read: structured appointment extraction, sync to BookingAppointment |
| **4c** | Schedule write: DOM injection for add-appointment, push pending |
| **5** | Screenshot capture (user-triggered first) |
| **6** | Vision API for availability extraction |
| **7** | GET /availability for Voice AI |
| **8** | Auto-capture every 30s (optional, with permissions) |

---

## Database Additions

```prisma
model EhrScheduleSnapshot {
  id          String   @id @default(cuid())
  userId      String
  clinicId    String?
  ehrType     String
  captureDate DateTime   // Date the schedule is for
  snapshotAt  DateTime   // When we captured
  availability Json     // { slots: ["09:00", "10:30", ...], booked: [...] }
  screenshotUrl String?  // S3/storage if we keep the image
  source      String   // "dom" | "screenshot"
  user        User     @relation(...)
}
```

---

## Voice AI Integration

When Voice AI needs availability for a clinic using EHR Bridge (no API):

1. **Config:** Clinic marks "EHR Bridge – screenshot mode" in settings
2. **Pre-call:** Staff or system captures schedule (manual or 30s polling)
3. **During call:** Voice AI calls `GET /api/ehr-bridge/availability?userId=X&date=Y`
4. **Response:** `["9:00 AM", "9:30 AM", "2:00 PM"]`
5. **Agent:** "I have 9 AM, 9:30 AM, or 2 PM. Which works?"
6. **Booking:** Create `BookingAppointment` with `syncStatus: PENDING`
7. **Post-call:** Staff pushes from extension when EHR tab is open

---

## Summary

| Feature | Possible? | Approach |
|---------|-----------|----------|
| **Bulk patient read** | ✅ Yes | DOM: extract all rows from list; batch API |
| **Schedule → Nexrel calendar** | ✅ Yes | DOM: extract appointment rows; map to BookingAppointment |
| **Nexrel → EHR write appointment** | ✅ Yes | DOM: inject into add-appointment form |
| **Screenshot availability** | ✅ Yes | captureVisibleTab + Vision API |
| **Auto-capture every 30s** | ✅ Yes | chrome.alarms + captureVisibleTab (tab must be visible) |
| **Voice AI uses availability** | ✅ Yes | GET /availability from snapshot |
