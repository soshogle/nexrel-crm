# How to Get Real DICOM Files for Testing

## The Problem
The minimal DICOM file we created (226 bytes) is too small for Orthanc. Orthanc requires complete, valid DICOM files with proper structure.

## Working Sources for Real DICOM Files

### Option 1: OHIF Viewer Repository (GitHub) ✅ Recommended
**Direct download links:**
- CT Scan: https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm
- X-Ray (CR): https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.2.dcm
- MRI: https://github.com/OHIF/Viewers/raw/master/public/dicom-files/MR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.3.dcm

**How to download:**
1. Right-click the link above
2. Select "Save Link As..." or "Download Linked File"
3. Save to: `/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/`
4. Rename if needed (e.g., `sample-ct.dcm`)

### Option 2: 3DICOM Viewer Library
**Website:** https://3dicomviewer.com/dicom-library/
- Browse available DICOM files
- Download any sample file
- Save to the test-data directory

### Option 3: HorliX Sample Files
**Website:** https://phazor.info/HorliX/?page_id=184
- Multiple sample DICOM files available
- CT scans, X-rays, Ultrasound samples
- Download and save to test directory

### Option 4: Use Your Own DICOM Files
If you have access to:
- Real X-ray machines
- Dental imaging systems
- DICOM files from other sources

Simply copy any `.dcm` file to:
```
/Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples/
```

### Option 5: Create Test File Using dcmtk (Advanced)
If you have `dcmtk` installed:

```bash
# Install dcmtk (macOS)
brew install dcmtk

# Create a minimal but valid DICOM file
dcmodify --insert "(0010,0010)=Test^Patient" \
         --insert "(0010,0020)=TEST001" \
         --insert "(0008,0060)=CR" \
         --insert "(0008,0020)=20240101" \
         --insert "(0020,000D)=1.2.840.10008.5.1.4.1.1.1" \
         test-data/dicom-samples/sample-created.dcm
```

## Quick Download Script

Try running this in your terminal:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm/test-data/dicom-samples

# Download CT scan sample
curl -L -o sample-ct.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm"

# Or download X-Ray sample
curl -L -o sample-xray.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.2.dcm"
```

## Verify File is Valid

After downloading, verify it's a valid DICOM file:

```bash
file test-data/dicom-samples/sample-ct.dcm
# Should show: "DICOM medical imaging data"

# Check file size (should be > 1KB)
ls -lh test-data/dicom-samples/*.dcm
```

## Then Upload to Orthanc

Once you have a valid file:

1. **Via Web UI:**
   - Go to http://localhost:8042
   - Click "Upload"
   - Drag and drop the file
   - Click "Start the upload"

2. **Via Terminal:**
   ```bash
   curl -u orthanc:orthanc -X POST http://localhost:8042/instances \
     -F file=@test-data/dicom-samples/sample-ct.dcm
   ```

## Troubleshooting

**If download fails:**
- Try a different browser
- Check your internet connection
- Try the GitHub raw links directly
- Use a download manager

**If upload still fails:**
- Verify file size > 1KB
- Check file is valid DICOM: `file filename.dcm`
- Check Orthanc logs: `docker logs nexrel-orthanc --tail 20`
