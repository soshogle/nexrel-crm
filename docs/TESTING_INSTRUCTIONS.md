# DICOM Testing Instructions

## ✅ What's Ready

All disclaimers have been added and the build is successful. Now you need to test the complete DICOM integration.

---

## 🚀 Step-by-Step Testing

### Step 1: Start Orthanc Locally

**Option A: Using Docker (Recommended)**

```bash
# Make sure Docker is installed and running
docker --version

# Start Orthanc
./scripts/start-local-orthanc.sh

# Verify it's running
curl http://localhost:8042/system -u orthanc:orthanc
```

**Option B: Use Existing Orthanc Server**

```bash
export ORTHANC_BASE_URL=http://your-orthanc-server:8042
export ORTHANC_USERNAME=your-username
export ORTHANC_PASSWORD=your-password
```

### Step 2: Start Next.js Development Server

```bash
# In a separate terminal
npm run dev

# App will be available at http://localhost:3000
```

### Step 3: Run Complete Test Suite

```bash
# Run automated tests
./scripts/test-dicom-complete.sh
```

This will test:
- ✅ Orthanc connection
- ✅ Health check endpoint
- ✅ Upload functionality
- ✅ Webhook integration
- ✅ Query endpoint

### Step 4: Manual UI Testing

1. **Open Dental Management Page:**
   ```
   http://localhost:3000/dashboard/dental-test
   ```

2. **Test Upload:**
   - Click "Upload X-Ray" card
   - Select a DICOM file (download from https://www.dclunie.com/images/)
   - Fill in details:
     - X-ray Type: Panoramic/Bitewing/Periapical/etc.
     - Date Taken: Today's date
     - Teeth Included: (optional)
     - Notes: (optional)
   - Click "Upload X-Ray"
   - Verify upload succeeds

3. **Test Viewer:**
   - Click "X-Ray Analysis" card
   - Select a patient (create one if needed)
   - Select an uploaded X-ray
   - Verify:
     - Image displays correctly
     - Zoom, pan, rotate work
     - Window/Level adjustments work
     - Measurement tools work
     - Annotations work

4. **Test AI Analysis:**
   - Open an X-ray in the viewer
   - Click "AI Analyze" button
   - **VERIFY DISCLAIMERS ARE VISIBLE:**
     - Yellow warning banner should appear
     - Text: "AI analysis is for information purposes only"
     - Text: "Not for diagnostic use"
     - Text: "Requires professional interpretation"
     - Text: "Not a substitute for professional judgment"
   - Wait for analysis to complete
   - Verify findings and recommendations are displayed
   - Verify disclaimers remain visible above analysis results

---

## 📋 Test Checklist

### DICOM Processing
- [ ] File uploads successfully
- [ ] DICOM metadata is parsed correctly
- [ ] Image conversion works (DICOM → PNG/JPEG)
- [ ] Preview images are generated
- [ ] File is stored securely

### Viewer Features
- [ ] Image displays correctly
- [ ] Zoom in/out works
- [ ] Pan works
- [ ] Rotate works
- [ ] Window/Level adjustments work
- [ ] Measurement tools work
- [ ] Annotations work
- [ ] Fullscreen mode works

### AI Analysis
- [ ] Analysis completes successfully
- [ ] **Disclaimers are visible BEFORE analysis starts**
- [ ] **Disclaimers are visible ABOVE analysis results**
- [ ] Findings are displayed
- [ ] Recommendations are shown
- [ ] Confidence score is displayed
- [ ] Analysis is saved to database

### Network Integration
- [ ] Orthanc receives files
- [ ] Webhook triggers correctly (if configured)
- [ ] Patient matching works
- [ ] Files are processed automatically

### Security & Compliance
- [ ] Files are encrypted at rest
- [ ] Access control works
- [ ] Audit logs are created
- [ ] Law 25 compliance verified

---

## 🧪 Test DICOM Files

### Download Test Files

**Free Test DICOM Files:**
- https://www.dclunie.com/images/ (David Clunie's sample images)
- https://www.osirix-viewer.com/resources/dicom-image-library/
- https://github.com/OHIF/Viewers/tree/master/public/dicom-files

**Recommended:**
- Panoramic X-ray: `panoramic.dcm`
- Bitewing: `bitewing.dcm`
- Periapical: `periapical.dcm`

### Upload Test File to Orthanc (Simulates X-ray Machine)

```bash
# Upload to Orthanc via REST API
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F "file=@path/to/test-file.dcm"

# This will trigger webhook if configured
```

---

## 🔍 Verify Disclaimers

### Where Disclaimers Should Appear:

1. **DICOM Viewer - Before Analysis:**
   - Yellow warning banner above "Start Analysis" button
   - Contains all 4 disclaimer points

2. **DICOM Viewer - After Analysis:**
   - Yellow warning banner above analysis results
   - Contains all 4 disclaimer points

3. **X-Ray Upload Component:**
   - Yellow warning banner above AI analysis display
   - Contains all 4 disclaimer points

4. **AI Analyze Button:**
   - Tooltip on hover: "AI analysis is for information purposes only. Not for diagnostic use."

5. **API Response:**
   - `disclaimer` field included in analysis object

---

## 🐛 Troubleshooting

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

- Check file size (should be < 50MB)
- Check file format: `file test-file.dcm`
- Check browser console for errors
- Check server logs

### AI Analysis Failing

- Check OpenAI API key: `echo $OPENAI_API_KEY`
- Verify DICOM was converted to image successfully
- Check network connectivity

---

## 📊 Expected Results

### Successful Test Run Should Show:

```
🧪 Complete DICOM Integration Test

✅ Orthanc is running at http://localhost:8042
   Version: 1.x.x

✅ Next.js app is running at http://localhost:3000

✅ Health check endpoint is working
   Response: {"status":"healthy",...}

✅ File uploaded to Orthanc
   Instance ID: xxxxx-xxxxx-xxxxx

✅ Found X instance(s) in Orthanc

✅ Webhook endpoint is accessible

✅ Query endpoint is accessible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Next Steps After Testing

1. **Fix any issues found**
2. **Document test results**
3. **Update test files with real DICOM files**
4. **Test with multiple X-ray types**
5. **Test with different file sizes**
6. **Test error scenarios**
7. **Performance testing**
8. **User acceptance testing**

---

## 📝 Notes

- All disclaimers are now in place ✅
- Build is successful ✅
- Ready for testing ✅
- Docker required for local Orthanc testing
- Can use existing Orthanc server instead

---

**Status:** Ready for Testing 🚀
