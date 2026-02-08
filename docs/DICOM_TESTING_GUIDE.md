# DICOM Testing Guide

## Quick Test Steps

### 1. Download Valid DICOM Files

The automatic download script may fail. Download manually from:

**Option A: Use DICOM Library (Recommended)**
```bash
# Create directory
mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

# Download sample files (choose one):
# Small test file:
curl -L -o sample.dcm "https://www.dclunie.com/images/JPEGLosslessSample.dcm"

# Or download from Osirix Library:
# Visit: https://www.osirix-viewer.com/resources/dicom-image-library/
# Download any sample and save as sample.dcm
```

**Option B: Use Your Own DICOM Files**
- Place any `.dcm` files in `test-data/dicom-samples/`
- Files from X-ray machines, CT scanners, etc. work perfectly

### 2. Start Orthanc Server

**In your terminal (not in Cursor):**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Start Orthanc
./scripts/start-local-orthanc.sh

# Or manually:
docker-compose -f docker-compose.orthanc.yml up -d

# Check if running:
curl http://localhost:8042/system -u orthanc:orthanc
```

**Access Orthanc Web UI:**
- URL: http://localhost:8042
- Username: `orthanc`
- Password: `orthanc`

### 3. Start Next.js App

**In a separate terminal:**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npm run dev
```

### 4. Test DICOM Upload

**Option A: Upload via Orthanc Web UI**
1. Open http://localhost:8042
2. Click "Upload" → Select your DICOM file
3. Check if webhook triggers (check Next.js console)

**Option B: Upload via Command Line**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Upload a DICOM file
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F file=@test-data/dicom-samples/sample.dcm

# This should return an instance ID
```

**Option C: Use Test Script**
```bash
./scripts/test-dicom-local.sh
```

### 5. Verify Processing

**Check Orthanc:**
- Visit http://localhost:8042
- See uploaded instances in the UI
- Click on an instance to view details

**Check Next.js App:**
- Go to http://localhost:3000/dashboard/dental/clinical
- Select a patient
- Check if X-rays appear in the X-Ray Analysis card
- Check browser console for webhook logs

**Check Database:**
- DICOM data should be stored in `DentalXRay` table
- Patient matching happens automatically if Patient ID matches

## Troubleshooting

### Orthanc Not Starting?
```bash
# Check Docker is running
docker ps

# Check Orthanc logs
docker logs nexrel-orthanc

# Restart Orthanc
docker-compose -f docker-compose.orthanc.yml restart
```

### Webhook Not Working?
1. Check `.env.local` has:
   ```
   DICOM_WEBHOOK_SECRET=local-test-secret-change-in-production
   ORTHANC_BASE_URL=http://localhost:8042
   ```

2. Check Orthanc webhook config in `docker/orthanc/orthanc.json`:
   ```json
   "WebHookUrl": "http://host.docker.internal:3000/api/dental/dicom/webhook"
   ```

3. Check Next.js is running on port 3000

### No DICOM Files?
- Download manually from: https://www.dclunie.com/images/
- Or use files from your X-ray machine
- Place in `test-data/dicom-samples/`

### Patient Not Matching?
- DICOM files need Patient ID (tag 0010,0020) to match
- Check Orthanc UI → Instance → Tags → Patient ID
- Ensure a patient exists in your system with matching ID

## Testing Workflow

1. **Upload DICOM** → Orthanc receives it
2. **Webhook Triggered** → Next.js receives notification
3. **Download & Parse** → Extract patient info, modality, etc.
4. **Patient Matching** → Find patient by Patient ID
5. **Store in Database** → Save to `DentalXRay` table
6. **Display in UI** → Show in X-Ray Analysis card

## Next Steps

After successful test:
- Configure production Orthanc URL
- Set up proper webhook secrets
- Connect to real X-ray machines
- Set up patient ID mapping
