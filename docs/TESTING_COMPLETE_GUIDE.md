# Complete DICOM Testing Guide

## Quick Start

### Step 1: Start Orthanc (if not already running)

```bash
# Option A: Start locally with Docker
./scripts/start-local-orthanc.sh

# Option B: Use existing Orthanc server
export ORTHANC_BASE_URL=http://your-orthanc-server:8042
export ORTHANC_USERNAME=your-username
export ORTHANC_PASSWORD=your-password
```

### Step 2: Start Next.js App (if not already running)

```bash
npm run dev
```

### Step 3: Run Complete Test Suite

```bash
./scripts/test-dicom-complete.sh
```

---

## Manual Testing Steps

### 1. Test Orthanc Connection

```bash
# Check if Orthanc is running
curl http://localhost:8042/system -u orthanc:orthanc

# Should return JSON with version info
```

### 2. Test Health Check Endpoint

```bash
# Test your app's health check
curl http://localhost:3000/api/dental/dicom/health

# Should return: {"status":"healthy",...}
```

### 3. Upload Test DICOM File

**Option A: Via UI (Recommended)**
1. Go to: http://localhost:3000/dashboard/dental-test
2. Click "Upload X-Ray" card
3. Select a DICOM file
4. Fill in details (X-ray type, date, etc.)
5. Upload

**Option B: Via API**

```bash
# Get authentication token first (from browser dev tools)
# Then upload:
curl -X POST http://localhost:3000/api/dental/xrays \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-file.dcm" \
  -F "leadId=YOUR_LEAD_ID" \
  -F "userId=YOUR_USER_ID" \
  -F "xrayType=PANORAMIC" \
  -F "dateTaken=2026-02-02"
```

**Option C: Upload to Orthanc (Simulates X-ray machine)**

```bash
# Upload to Orthanc
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F "file=@test-file.dcm"

# This will trigger webhook if configured
```

### 4. Test DICOM Viewer

1. Go to Dental Management page
2. Click "X-Ray Analysis" card
3. Select a patient and X-ray
4. Verify:
   - Image displays correctly
   - Zoom, pan, rotate work
   - Window/Level adjustments work
   - Measurement tools work
   - Annotations work

### 5. Test AI Analysis

1. Open an X-ray in the viewer
2. Click "AI Analyze" button
3. Verify:
   - Analysis completes successfully
   - **Disclaimers are displayed prominently**
   - Findings are shown
   - Recommendations are shown
   - Confidence score is displayed

### 6. Test Webhook Integration

```bash
# Simulate webhook call from Orthanc
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "event": "NewInstance",
    "resourceId": "test-instance-id",
    "timestamp": "2026-02-02T12:00:00Z"
  }'
```

### 7. Test Query Endpoint

```bash
# Query for studies
curl -X POST http://localhost:3000/api/dental/dicom/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patientId": "TEST001",
    "startDate": "2020-01-01",
    "endDate": "2026-12-31"
  }'
```

---

## What to Verify

### ✅ DICOM Processing
- [ ] File uploads successfully
- [ ] DICOM metadata is parsed correctly
- [ ] Image conversion works (DICOM → PNG/JPEG)
- [ ] Preview images are generated
- [ ] File is stored securely (Canadian storage)

### ✅ Viewer Features
- [ ] Image displays correctly
- [ ] Zoom in/out works
- [ ] Pan works
- [ ] Rotate works
- [ ] Window/Level adjustments work
- [ ] Measurement tools work
- [ ] Annotations work
- [ ] Fullscreen mode works

### ✅ AI Analysis
- [ ] Analysis completes successfully
- [ ] **Disclaimers are visible and prominent**
- [ ] Findings are displayed
- [ ] Recommendations are shown
- [ ] Confidence score is displayed
- [ ] Analysis is saved to database

### ✅ Network Integration
- [ ] Orthanc receives files
- [ ] Webhook triggers correctly
- [ ] Patient matching works
- [ ] Files are processed automatically

### ✅ Security & Compliance
- [ ] Files are encrypted at rest
- [ ] Access control works
- [ ] Audit logs are created
- [ ] Law 25 compliance verified

---

## Test DICOM Files

### Where to Get Test Files

1. **David Clunie's Sample Images:**
   - https://www.dclunie.com/images/
   - Free, various types

2. **Osirix DICOM Library:**
   - https://www.osirix-viewer.com/resources/dicom-image-library/
   - Free samples

3. **OHIF Viewer Samples:**
   - https://github.com/OHIF/Viewers/tree/master/public/dicom-files
   - GitHub repository

### Recommended Test Files

- **Panoramic X-ray:** `panoramic.dcm`
- **Bitewing:** `bitewing.dcm`
- **Periapical:** `periapical.dcm`
- **CBCT:** `cbct.dcm` (if available)

---

## Troubleshooting

### Orthanc Not Starting

```bash
# Check Docker is running
docker ps

# Check logs
docker logs nexrel-orthanc

# Restart
docker restart nexrel-orthanc
```

### Health Check Failing

```bash
# Check environment variables
echo $ORTHANC_BASE_URL
echo $ORTHANC_USERNAME
echo $ORTHANC_PASSWORD

# Test Orthanc directly
curl http://localhost:8042/system -u orthanc:orthanc
```

### Upload Failing

```bash
# Check file size (should be < 50MB)
ls -lh test-file.dcm

# Check file format
file test-file.dcm

# Check logs
# Check browser console for errors
# Check server logs
```

### AI Analysis Failing

```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Check image conversion
# Verify DICOM was converted to image successfully
```

---

## Next Steps After Testing

1. **Fix any issues found**
2. **Document test results**
3. **Update test files with real DICOM files**
4. **Test with multiple X-ray types**
5. **Test with different file sizes**
6. **Test error scenarios**
7. **Performance testing**
8. **User acceptance testing**

---

## Automated Testing

Run the complete test suite:

```bash
./scripts/test-dicom-complete.sh
```

This will:
- ✅ Check Orthanc is running
- ✅ Check Next.js app is running
- ✅ Test health check endpoint
- ✅ Test upload functionality
- ✅ Test webhook integration
- ✅ Test query endpoint
- ✅ Provide summary and next steps
