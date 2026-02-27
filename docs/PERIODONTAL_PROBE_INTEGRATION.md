# Periodontal Probe Integration

Probe software (Florida Probe, PerioPal, etc.) can push measurements to the CRM via API.

## Endpoint

```
POST /api/dental/periodontal/import
```

## Auth

- **Header**: `Authorization: Bearer <PERIODONTAL_PROBE_API_KEY>`
- **Env**: Set `PERIODONTAL_PROBE_API_KEY` in `.env` (generate with `openssl rand -base64 32`)

## Request Body

```json
{
  "userId": "cuid-of-practice-owner",
  "leadId": "optional-if-you-have-it",
  "patientId": "optional-same-as-leadId",
  "patientName": "optional-Jim Halpert",
  "patientEmail": "optional-jim@example.com",
  "measurements": {
    "1": {
      "mesial": { "pd": 3, "bop": false },
      "buccal": { "pd": 2, "bop": false },
      "distal": { "pd": 3, "bop": true },
      "lingual": { "pd": 2, "bop": false }
    },
    "2": { ... },
    ...
  },
  "notes": "optional",
  "chartDate": "2025-02-24T12:00:00Z",
  "clinicId": "optional",
  "source": "florida_probe"
}
```

## Patient Matching

Provide at least one of:

- **leadId** – CRM patient ID (best)
- **patientId** – Same as leadId
- **patientName** – Matches `contactPerson` or `businessName`
- **patientEmail** – Matches `email`

## Response

**Success (201):**
```json
{
  "success": true,
  "chart": {
    "id": "...",
    "leadId": "...",
    "chartDate": "...",
    "source": "probe"
  }
}
```

**Patient not found (404):**
```json
{
  "success": false,
  "error": "Patient not found",
  "hint": "Provide leadId, patientId, patientName, or patientEmail that matches a patient in your practice"
}
```

## Probe Software Setup

1. **Configure API URL**: `https://your-domain.com/api/dental/periodontal/import`
2. **Set API key**: Use `PERIODONTAL_PROBE_API_KEY` as Bearer token
3. **Get userId**: From practice owner's User record in CRM
4. **Patient matching**: Export leadId from CRM when scheduling, or use patientName/email

## Real-time Display

When the Periodontal Charting modal is open, the UI polls every 5 seconds for new data. Probe data pushed via this endpoint will appear automatically.

## CSV File Upload (Florida Probe Export)

Probe systems typically export CSV files with 6-site measurements. Upload the CSV directly:

```
POST /api/dental/periodontal/import/csv
Content-Type: multipart/form-data
Authorization: Bearer <PERIODONTAL_PROBE_API_KEY>
```

### Form fields:

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | The CSV file from your probe system |
| `leadId` | No | CRM patient ID (if known) |
| `patientName` | No | Falls back to CSV PatientFirstName/PatientLastName columns |
| `userId` | No | Required if using API key auth (not needed with session) |
| `clinicId` | No | Clinic ID |

### Example with curl:

```bash
curl -X POST https://your-domain.com/api/dental/periodontal/import/csv \
  -H "Authorization: Bearer $PERIODONTAL_PROBE_API_KEY" \
  -F "file=@florida-probe-export.csv" \
  -F "userId=YOUR_USER_ID" \
  -F "patientName=Marie Tremblay"
```

### Supported CSV format:

The parser expects these columns (Florida Probe standard):

```
ExamDate,PatientID,PatientLastName,PatientFirstName,ToothNumber,Surface,ProbingDepth,GingivalMargin,CAL,Bleeding,...
```

Surfaces: MB, B, DB, ML, L, DL — automatically collapsed to our 4-site model (M, B, D, L).

## Sample Files

- `docs/samples/periodontal-import-sample.json` — JSON format
- `docs/samples/florida-probe-export.csv` — CSV format (6-site, 32 teeth)

Replace `userId` and `patientName` with real values before testing.

## Related

- [Curve Dental Perio Checklist](https://www.curvedental.com/dental-blog/essential-periodontal-charting-checklist)
- Florida Probe: [Practice Management Integration](https://www.floridaprobe.com/downloads/pmi.htm)
