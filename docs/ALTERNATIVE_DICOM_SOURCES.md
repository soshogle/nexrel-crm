# Alternative Ways to Get DICOM Files

## The Problem
The OHIF testdata repository uses DICOMweb format (JSON-based), not raw `.dcm` files. This makes it harder to download individual DICOM files directly.

## Solution: Use Alternative Sources

### Option 1: Rubo Medical (Easiest) ✅ Recommended
**Website:** https://www.rubomedical.com/dicom_files/

**Steps:**
1. Visit the website
2. Click on any sample file (they're clearly labeled)
3. Download directly - these are real `.dcm` files
4. Save to: `/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/`

**Available samples:**
- X-ray angiograms
- MRI brain scans
- Ultrasound images
- Various compression formats

### Option 2: 3DICOM Viewer Library
**Website:** https://3dicomviewer.com/dicom-library/

**Steps:**
1. Browse the library
2. Click "Download" on any sample
3. Save to your test directory

### Option 3: Use Your Own DICOM Files
If you have access to:
- Real X-ray machines
- Dental imaging systems
- DICOM files from medical software
- Previous patient files

Simply copy any `.dcm` file to:
```
/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/
```

### Option 4: Test Without Real File (For Now)
You can test the webhook endpoint logic without a real file:

```bash
# This tests the endpoint (will fail but confirms it works)
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d '{
    "event": "NewInstance",
    "resourceId": "test-instance-123",
    "userId": "test-user-id"
  }'
```

## Why OHIF Repository Doesn't Work

The `OHIF/viewer-testdata-dicomweb` repository stores data in **DICOMweb format** (JSON), not raw DICOM files. This is:
- ✅ Good for web viewers
- ❌ Not good for downloading individual `.dcm` files

The actual DICOM files would need to be reconstructed from the JSON metadata, which is complex.

## Recommended Next Step

**Visit Rubo Medical** - it's the easiest source:
1. Go to: https://www.rubomedical.com/dicom_files/
2. Download any sample file
3. Upload to Orthanc
4. Test the complete workflow

This will give you a real, working DICOM file immediately.
