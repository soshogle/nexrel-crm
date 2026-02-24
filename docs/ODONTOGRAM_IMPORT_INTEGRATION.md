# Odontogram Import Integration

Three ways to get tooth chart data into the CRM:

## 1. Direct Import API

**Endpoint:** `POST /api/dental/odontogram/import`

**Auth:** `Authorization: Bearer <ODONTOGRAM_IMPORT_API_KEY>` (or `PERIODONTAL_PROBE_API_KEY`)

**Body:**
```json
{
  "userId": "practice-owner-user-id",
  "leadId": "optional",
  "patientName": "optional",
  "patientEmail": "optional",
  "toothData": {
    "1": { "condition": "crown", "treatment": "Crown", "completed": false },
    "14": { "condition": "caries", "treatment": "Crown", "completed": false },
    "29": { "condition": "implant", "treatment": "Implant", "completed": true }
  }
}
```

**Conditions:** `healthy`, `caries`, `crown`, `filling`, `missing`, `extraction`, `implant`, `root_canal`

---

## 2. X-Ray AI → Odontogram (automatic)

When an X-ray is analyzed (`POST /api/dental/xrays/[id]/analyze`), the AI findings are parsed and the odontogram is updated automatically.

- Findings like "caries on tooth 14", "crown on tooth 3", "implants on teeth 29 and 30" are extracted
- Merged with existing odontogram data
- No extra API call needed

---

## 3. Voice Import (fallback)

**Endpoint:** `POST /api/dental/odontogram/import/voice`

**Auth:** Session (logged-in user) OR `Authorization: Bearer <ODONTOGRAM_IMPORT_API_KEY>`

**Body:**
```json
{
  "userId": "required when using API key",
  "patientName": "Jim Halpert",
  "transcript": "tooth 14 crown, tooth 3 filling, teeth 29 and 30 implants",
  "merge": true
}
```

**Use case:** When direct import or X-ray AI is unavailable. Voice AI transcribes clinician dictation → GPT parses to structured toothData → odontogram updated.

---

## Patient Matching

All endpoints accept: `leadId`, `patientId`, `patientName`, or `patientEmail`

---

## Real-time Display

When the Odontogram modal is open, the UI polls every 5 seconds. New data from any source appears automatically.
