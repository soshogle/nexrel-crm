# Sample Import Files

Use these JSON samples to test the odontogram and periodontal import APIs.

## Setup

1. **Get a real `userId`** – Use the practice owner's User ID from your CRM (e.g. from the database or user profile).
2. **Ensure patient exists** – The patient must exist in your CRM. Use `patientName`, `patientEmail`, or `leadId` to match.
3. **Set API key** – Add `ODONTOGRAM_IMPORT_API_KEY` or `PERIODONTAL_PROBE_API_KEY` to `.env`.

## Odontogram Import

**Endpoint:** `POST /api/dental/odontogram/import`

```bash
# Replace YOUR_API_KEY and YOUR_USER_ID in the sample first
curl -X POST http://localhost:3000/api/dental/odontogram/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @odontogram-import-sample.json
```

Or with inline JSON (replace placeholders):

```bash
curl -X POST http://localhost:3000/api/dental/odontogram/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ODONTOGRAM_IMPORT_API_KEY" \
  -d '{
    "userId": "YOUR_USER_ID",
    "patientName": "Jim Halpert",
    "toothData": {
      "14": { "condition": "crown", "treatment": "Crown", "completed": false },
      "29": { "condition": "implant", "treatment": "Implant", "completed": true }
    }
  }'
```

## Periodontal Import

**Endpoint:** `POST /api/dental/periodontal/import`

```bash
# Replace YOUR_API_KEY and YOUR_USER_ID in the sample first
curl -X POST http://localhost:3000/api/dental/periodontal/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @periodontal-import-sample.json
```

Or with inline JSON:

```bash
curl -X POST http://localhost:3000/api/dental/periodontal/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERIODONTAL_PROBE_API_KEY" \
  -d '{
    "userId": "YOUR_USER_ID",
    "patientName": "Jim Halpert",
    "measurements": {
      "14": {
        "mesial": { "pd": 5, "bop": true },
        "buccal": { "pd": 4, "bop": true },
        "distal": { "pd": 6, "bop": true },
        "lingual": { "pd": 4, "bop": false }
      }
    }
  }'
```

## Data Formats

### Odontogram `toothData`

- Keys: tooth numbers 1–32 (Universal Numbering System)
- Values: `{ condition?, treatment?, completed?, date?, notes? }`
- Conditions: `healthy`, `caries`, `crown`, `filling`, `missing`, `extraction`, `implant`, `root_canal`

### Periodontal `measurements`

- Keys: tooth numbers 1–32
- Sites per tooth: `mesial`, `buccal`, `distal`, `lingual`
- Per site: `{ pd: number, bop?: boolean, recession?: number, mobility?: number }`
