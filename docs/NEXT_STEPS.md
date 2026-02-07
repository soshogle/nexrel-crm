# What To Do Now - Quick Start Guide

## ✅ Current Status

- ✅ **Docker**: Installed and running
- ✅ **Orthanc**: Running locally at http://localhost:8042
- ⏳ **Next.js App**: Needs to be started
- ⏳ **Testing**: Ready to begin

---

## 🚀 Step-by-Step Instructions

### Step 1: Start Next.js Development Server

Open a **new terminal window** and run:

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npm run dev
```

Wait for it to say: `✓ Ready on http://localhost:3000`

**Keep this terminal open** - the dev server needs to keep running.

---

### Step 2: Open Dental Management Page

In your browser, go to:

```
http://localhost:3000/dashboard/dental-test
```

You should see the Dental Management dashboard with all the cards.

---

### Step 3: Test DICOM Upload

1. **Get a test DICOM file:**
   - Visit: https://www.dclunie.com/images/
   - Download any sample DICOM file (`.dcm` extension)
   - Or use: https://www.osirix-viewer.com/resources/dicom-image-library/

2. **Upload via UI:**
   - Click the **"Upload X-Ray"** card
   - Select your test DICOM file
   - Fill in:
     - **X-ray Type**: Panoramic (or match your file)
     - **Date Taken**: Today's date
     - **Teeth Included**: (optional, e.g., "1,2,3")
     - **Notes**: (optional)
   - Click **"Upload X-Ray"**
   - Wait for upload to complete

3. **Verify:**
   - File should upload successfully
   - You should see it in the X-ray list

---

### Step 4: Test DICOM Viewer

1. Click the **"X-Ray Analysis"** card
2. Select a patient (create one if needed)
3. Select the uploaded X-ray
4. Verify the viewer works:
   - ✅ Image displays correctly
   - ✅ Zoom in/out buttons work
   - ✅ Pan works (click and drag)
   - ✅ Rotate button works
   - ✅ Window/Level sliders work (brightness/contrast)
   - ✅ Measurement tools work
   - ✅ Annotations work

---

### Step 5: Test AI Analysis (IMPORTANT - Verify Disclaimers!)

1. **Open an X-ray in the viewer**
2. **Click "AI Analyze" button**
3. **VERIFY DISCLAIMERS ARE VISIBLE:**
   - ✅ **Yellow warning banner** should appear **BEFORE** analysis starts
   - ✅ **Yellow warning banner** should appear **ABOVE** analysis results
   - ✅ Should show all 4 disclaimer points:
     - "AI analysis is for information purposes only"
     - "Not for diagnostic use"
     - "Requires professional interpretation"
     - "Not a substitute for professional judgment"

4. **Wait for analysis to complete** (may take 10-30 seconds)
5. **Verify:**
   - ✅ Analysis results are displayed
   - ✅ Findings are shown
   - ✅ Recommendations are shown (if any)
   - ✅ Confidence score is displayed
   - ✅ **Disclaimers remain visible above results**

---

### Step 6: Test Orthanc Integration (Optional)

**Test uploading directly to Orthanc (simulates X-ray machine):**

```bash
# Upload test file to Orthanc
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F "file=@path/to/your/test-file.dcm"
```

**Check Orthanc Web Interface:**
- Go to: http://localhost:8042
- Login: `orthanc` / `orthanc`
- You should see uploaded instances

---

### Step 7: Run Automated Tests

Once everything is working, run the complete test suite:

```bash
./scripts/test-dicom-complete.sh
```

This will test:
- ✅ Orthanc connection
- ✅ Health check endpoint
- ✅ Upload functionality
- ✅ Webhook integration
- ✅ Query endpoint

---

## 🎯 Quick Checklist

- [ ] Next.js app is running (`npm run dev`)
- [ ] Opened http://localhost:3000/dashboard/dental-test
- [ ] Uploaded a test DICOM file
- [ ] Tested DICOM viewer (zoom, pan, rotate, measurements)
- [ ] Tested AI analysis
- [ ] **Verified disclaimers are visible** (most important!)
- [ ] Tested Orthanc web interface (http://localhost:8042)

---

## 🐛 Troubleshooting

### Next.js app won't start

```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)

# Try again
npm run dev
```

### Orthanc not accessible

```bash
# Check if Orthanc is running
docker ps | grep orthanc

# Check logs
docker logs nexrel-orthanc

# Restart if needed
docker restart nexrel-orthanc
```

### Upload fails

- Check file size (should be < 50MB)
- Check file format (should be `.dcm`)
- Check browser console for errors
- Check server logs in terminal

### AI Analysis fails

- Check OpenAI API key is set: `echo $OPENAI_API_KEY`
- Check network connectivity
- Verify DICOM was converted to image successfully

---

## 📚 Additional Resources

- **Test DICOM Files**: https://www.dclunie.com/images/
- **Orthanc Documentation**: https://book.orthanc-server.com/
- **DICOM Testing Guide**: `docs/TESTING_INSTRUCTIONS.md`
- **Complete Testing Guide**: `docs/TESTING_COMPLETE_GUIDE.md`

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ You can upload DICOM files via UI
2. ✅ Files are processed and stored
3. ✅ Viewer displays images correctly
4. ✅ AI analysis completes successfully
5. ✅ **Disclaimers are prominently displayed** (critical!)
6. ✅ Orthanc receives files via network

---

**Ready to start? Run `npm run dev` and open http://localhost:3000/dashboard/dental-test** 🚀
