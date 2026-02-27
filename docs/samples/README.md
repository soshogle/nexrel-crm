# Device Integration Test Files

Sample files matching the exact formats output by real dental devices. Use these to test the import pipeline and verify data consistency across odontogram, periodontal charting, x-ray analysis, and neural perio.

## Files

| File | Device / Format | Description |
|------|-----------------|-------------|
| `florida-probe-export.csv` | Florida Probe (CSV) | 6-site periodontal probe data for all 32 teeth — matches Marie Tremblay's DB record |
| `dicom-xray-metadata.json` | Planmeca ProMax 3D (DICOM) | Panoramic x-ray metadata with AI findings matching odontogram |
| `dexis-sensor-export.json` | DEXIS Platinum (TIFF sidecar) | Periapical/bitewing metadata with findings matching fillings on #3, #14 |
| `itero-scan-export.json` | iTero Element 5D (STL/PLY manifest) | Intraoral scanner session with mesh file metadata |
| `cbct-dicom-series-metadata.json` | Carestream CS 8200 3D (DICOM CT) | CBCT volume metadata — 300-slice series |
| `odontogram-import-sample.json` | Nexrel API format | Odontogram charting import payload |
| `periodontal-import-sample.json` | Nexrel API format | Periodontal import payload |

## How These Match Real Devices

### 1. Periodontal Probes (Florida Probe, ParoStatus)

**Real format**: CSV with 6 surfaces per tooth (MB, B, DB, ML, L, DL)

```
ExamDate,PatientID,...,ToothNumber,Surface,ProbingDepth,GingivalMargin,CAL,Bleeding,...
2026-02-25,MT-2024-001,...,3,MB,3,0,3,0,...
```

**Our import API** uses 4 sites (M, B, D, L). The `florida-probe-parser.ts` utility collapses 6→4 by taking max PD and OR of BOP across paired surfaces.

```bash
# Import via API (after CSV→JSON conversion)
curl -X POST http://localhost:3000/api/dental/periodontal/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERIODONTAL_PROBE_API_KEY" \
  -d @periodontal-import-sample.json
```

### 2. Digital X-Ray Sensors (DEXIS, Schick, Carestream)

**Real format**: 14-16 bit TIFF images + DICOM metadata sidecar

- `dexis-sensor-export.json` — periapical/bitewing metadata with sensor specs
- `dicom-xray-metadata.json` — panoramic DICOM tags matching Planmeca ProMax 3D

The `DentalFindings.findings` array in these JSON files maps directly to the `DentalXRay.aiAnalysis` field in the database.

### 3. Intraoral Scanners (iTero, 3Shape TRIOS, Medit)

**Real format**: ZIP archive containing STL (binary mesh) + PLY (color mesh) + manifest JSON

- `itero-scan-export.json` — session manifest matching iTero Element 5D REST API output
- References STL files already stored in `public/test-assets/dental/3d-scans/`

### 4. CBCT Scanners (Carestream, Sirona)

**Real format**: DICOM series — 250-300 individual `.dcm` slice files

- `cbct-dicom-series-metadata.json` — series-level metadata for a Carestream CS 8200 3D scan

### 5. Odontogram Charting Software

**Real format**: Varies by vendor (HL7 FHIR, proprietary JSON/XML)

- `odontogram-import-sample.json` — our standardized import format

```bash
curl -X POST http://localhost:3000/api/dental/odontogram/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ODONTOGRAM_IMPORT_API_KEY" \
  -d @odontogram-import-sample.json
```

## Data Consistency

All sample files describe the same clinical scenario for **Marie Tremblay**:

- **Odontogram**: Teeth #3 and #14 have composite fillings; all others healthy
- **Periodontal**: All probing depths 2-3mm (healthy); BOP on teeth 6M, 11M, 22B, 27B only
- **X-Ray**: Existing restorations on #3 and #14, normal bone levels, no pathology
- **3D Scans**: Full arch maxillary and mandibular STL meshes

This ensures that when you import from any device, the data will be consistent across all clinical views.

## Parser Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| Florida Probe CSV parser | `lib/dental/florida-probe-parser.ts` | Converts 6-site CSV → 4-site JSON for API |
| X-ray findings parser | `lib/dental/xray-findings-parser.ts` | Parses AI analysis text → structured toothData |
| Odontogram import utils | `lib/dental/odontogram-import.ts` | Validation, patient matching, upsert |

## Supported Tooth Numbering

All files use the **Universal Numbering System** (1-32):

```
Upper:  1  2  3  4  5  6  7  8 | 9 10 11 12 13 14 15 16
Lower: 32 31 30 29 28 27 26 25 | 24 23 22 21 20 19 18 17
       ── Right ──────────────   ── Left ──────────────
```
