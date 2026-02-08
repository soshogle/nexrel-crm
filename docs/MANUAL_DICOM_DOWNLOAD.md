# Manual DICOM File Download Guide

## The Issue
Automatic downloads from GitHub raw links are returning HTML instead of binary DICOM files.

## Solution: Manual Download Steps

### Method 1: Direct Browser Download (Recommended)

1. **Open this link in your browser:**
   ```
   https://github.com/OHIF/Viewers/tree/master/public/dicom-files
   ```

2. **Navigate to a folder:**
   - Click on `CT` folder for CT scan samples
   - Or `CR` folder for X-Ray samples
   - Or `MR` folder for MRI samples

3. **Download a file:**
   - Click on any `.dcm` file
   - Click the "Download" button (or right-click → Save As)
   - Save to: `/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/`

### Method 2: Use Alternative Sources

**Rubo Medical (Working):**
- Visit: https://www.rubomedical.com/dicom_files/
- Download any sample file
- Save to test directory

**3DICOM Viewer Library:**
- Visit: https://3dicomviewer.com/dicom-library/
- Browse and download samples
- Save to test directory

**Aliza Medical Imaging:**
- Visit: https://www.aliza-dicom-viewer.com/download/datasets
- Download from Google Drive links
- Save to test directory

### Method 3: Use Your Own Files

If you have access to:
- Real X-ray machines
- Dental imaging systems  
- DICOM files from other medical software

Copy any `.dcm` file to:
```
/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/
```

## Verify File is Valid

After downloading, check:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Check file type (should say "DICOM medical imaging data")
file test-data/dicom-samples/your-file.dcm

# Check file size (should be > 10KB for real files)
ls -lh test-data/dicom-samples/*.dcm
```

## Upload to Orthanc

Once you have a valid file:

**Via Web UI:**
1. Go to http://localhost:8042
2. Click "Upload" (top right)
3. Drag and drop your `.dcm` file
4. Click "Start the upload"
5. Should see "Success" message

**Via Terminal:**
```bash
curl -u orthanc:orthanc -X POST http://localhost:8042/instances \
  -F file=@test-data/dicom-samples/your-file.dcm
```

## Quick Test Without Real File

If you can't get a real DICOM file right now, you can still test the webhook endpoint:

```bash
# This will fail (no instance exists) but tests the endpoint
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d '{
    "event": "NewInstance",
    "resourceId": "test-instance-123",
    "userId": "test-user-id"
  }'
```

This confirms:
- ✅ Webhook endpoint is accessible
- ✅ Authentication works
- ✅ Request processing logic works

For full end-to-end testing, you'll need a real DICOM file.
