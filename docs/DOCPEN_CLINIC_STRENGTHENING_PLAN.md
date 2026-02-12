# Docpen Clinic Strengthening – Implementation Plan

## Overview

Make Docpen the go-to AI scribe for dental and orthodontic practices by adding EHR push, specialty templates, pre-charting, DICOM linking, code suggestions, and workflow integration.

---

## 1. EHR Push (Any Method)

**Goal:** Reduce copy/paste and manual data entry.

| Feature | Description | Status |
|---------|-------------|--------|
| Copy for EHR | One-click copy of formatted SOAP note (optimized for pasting into EHR fields) | Planned |
| Download PDF | Export visit note as PDF for attachment or printing | Planned |
| Webhook export | POST finalized note to configurable URL (clinic middleware, EHR connectors) | Planned |
| Chrome extension | Phase 2 – DOM injection for browser-based EHRs | Future |

**Implementation:**
- Add `Copy for EHR` and `Download PDF` buttons to SOAPNoteEditor
- Create `/api/docpen/sessions/[id]/export` – returns formatted text, PDF, or webhook trigger
- Add `ehrWebhookUrl` to user/clinic settings (optional)

---

## 2. Dental/Ortho-Specific Templates

**Goal:** CDT codes, treatment plans, progress notes, ortho progress.

| Feature | Description | Status |
|---------|-------------|--------|
| ORTHODONTIC profession | Ortho-specific SOAP prompt (bonding, wires, progress, OPG) | Planned |
| CDT code reference | Include common CDT codes in dental prompts | Planned |
| Treatment plan template | Structured output for treatment planning | Planned |
| Progress note template | Ortho progress note format | Planned |

**Implementation:**
- Add `ORTHODONTIC` to DocpenProfession enum and prompts
- Enhance DENTIST prompt with CDT examples (D0120, D1110, D2391, etc.)
- Add profession-specific SOAP types: DENTAL_EXAM, ORTHO_PROGRESS, TREATMENT_PLAN

---

## 3. Pre-Charting

**Goal:** Pull prior notes, X-rays, upcoming procedures into the session before the visit.

| Feature | Description | Status |
|---------|-------------|--------|
| Prior notes summary | Last 3–5 SOAP notes for this patient | Planned |
| X-ray summary | Recent X-rays with dates and types | Planned |
| Upcoming procedures | Dental procedures from treatment plans | Planned |
| Pre-chart panel | Show in New Session or session start | Planned |

**Implementation:**
- Create `/api/docpen/pre-chart` – accepts leadId, returns prior notes, xrays, procedures
- Add PreChartPanel component to NewSessionDialog (when lead selected) or session view
- Load pre-chart data when opening a session with leadId

---

## 4. DICOM + Notes Auto-Link

**Goal:** Auto-link clinical notes to relevant X-rays (e.g., "PA #19").

| Feature | Description | Status |
|---------|-------------|--------|
| Tooth reference extraction | Parse SOAP note for tooth numbers (Universal 1–32) | Planned |
| X-ray linkage | Link note to DentalXRay records that include those teeth | Planned |
| Visual indicator | Show linked X-rays in SOAP editor | Planned |

**Implementation:**
- Add `linkedXrayIds` (or similar) to DocpenSOAPNote
- Service: `extractToothNumbersFromNote(note)` → [1, 2, 19, …]
- Query DentalXRay where teethIncluded overlaps
- Store link, display in UI

---

## 5. Automatic ICD-10/CDT Suggestions

**Goal:** Suggest diagnosis and procedure codes from the note.

| Feature | Description | Status |
|---------|-------------|--------|
| Code extraction | AI or regex to find codes in note | Planned |
| Suggestion API | GPT returns suggested ICD-10/CDT from note text | Planned |
| Code chips in editor | Show suggested codes, one-click to add | Planned |

**Implementation:**
- Create `/api/docpen/codes/suggest` – POST note text, returns { icd10: [], cdt: [] }
- Add CodeSuggestions component to SOAPNoteEditor
- Dental/ortho: CDT codes; general: ICD-10

---

## 6. Workflow Integration

**Goal:** Flow from Docpen → review → sign → EHR with clear status and audit trail.

| Feature | Description | Status |
|---------|-------------|--------|
| Status badges | RECORDING → PENDING_REVIEW → REVIEWED → SIGNED → EXPORTED | Planned |
| Audit log | Record each status change with timestamp, user | Planned |
| EHR export status | Track when note was pushed/copied/exported | Planned |

**Implementation:**
- Add `DocpenSessionAuditLog` model (sessionId, action, userId, timestamp, metadata)
- Extend DocpenSessionStatus: PENDING_REVIEW, REVIEWED, SIGNED, EXPORTED
- Log: session_created, recording_started, recording_stopped, soap_generated, reviewed, signed, exported
- Status pipeline UI in session view

---

## Implementation Order

1. EHR push (copy, PDF) – immediate value
2. Workflow (status, audit) – foundation for rest
3. Pre-charting – elevates session start
4. Dental/ortho templates (ORTHODONTIC, CDT) – specialty depth
5. ICD-10/CDT suggestions – efficiency
6. DICOM + notes link – dental-specific integration
