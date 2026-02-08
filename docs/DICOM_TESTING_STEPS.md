# DICOM System Testing - Step by Step Guide

## Current Status ✅

- ✅ Orthanc is running (http://localhost:8042)
- ✅ DICOM test files available (`test-data/dicom-samples/sample-minimal.dcm`)
- ✅ Webhook endpoint configured (`/api/dental/dicom/webhook`)
- ✅ Patient matching logic implemented

---

## Step-by-Step Testing Process

### Step 1: Verify Prerequisites ✅

**Check Orthanc:**
```bash
curl -u orthanc:orthanc http://localhost:8042/system
```
Expected: JSON response with system information

**Check DICOM Files:**
```bash
ls -lh test-data/dicom-samples/*.dcm
```
Expected: At least `sample-minimal.dcm` (226B)

**Check Next.js App:**
```bash
# In a separate terminal, start Next.js if not running:
npm run dev
```
Expected: App running on http://localhost:3000

---

### Step 2: Ensure Environment Variables Are Set

Check `.env.local` has:
```bash
ORTHANC_BASE_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
DICOM_WEBHOOK_SECRET=local-test-secret-change-in-production
```

---

### Step 3: Upload DICOM File to Orthanc

**Option A: Using curl (Recommended)**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm

curl -u orthanc:orthanc -X POST http://localhost:8042/instances \
  -F file=@test-data/dicom-samples/sample-minimal.dcm
```

**Expected Response:**
```json
{
  "ID": "abc123-def456-ghi789",
  "Path": "/instances/abc123-def456-ghi789",
  "Status": "Success"
}
```

**Save the Instance ID** - You'll need it for the next step!

**Option B: Using Orthanc Web UI**
1. Open http://localhost:8042
2. Login: orthanc / orthanc
3. Go to "Upload" → "Upload files"
4. Select `test-data/dicom-samples/sample-minimal.dcm`
5. Click "Upload"
6. Note the Instance ID from the response

---

### Step 4: Verify File in Orthanc

**Check in Web UI:**
1. Go to http://localhost:8042
2. Click "Instances" in the left sidebar
3. You should see the uploaded DICOM file

**Or via API:**
```bash
# List all instances
curl -u orthanc:orthanc http://localhost:8042/instances

# Get specific instance details (replace INSTANCE_ID)
curl -u orthanc:orthanc http://localhost:8042/instances/INSTANCE_ID
```

---

### Step 5: Test Webhook Manually

**Important:** The webhook needs to be triggered manually since Orthanc webhook configuration requires setup.

```bash
# Replace INSTANCE_ID with the ID from Step 3
INSTANCE_ID="your-instance-id-here"

curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d "{
    \"event\": \"NewInstance\",
    \"resourceId\": \"$INSTANCE_ID\",
    \"userId\": \"test-user-id\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "DICOM instance processed"
}
```

**Check Next.js Terminal:**
- Look for logs showing:
  - DICOM file download from Orthanc
  - Patient matching attempt
  - File processing

---

### Step 6: Verify Patient Matching

The system tries to match DICOM files to patients by:
1. **Patient ID** (from DICOM metadata)
2. **Patient Name** (from DICOM metadata)

**Check if patient exists:**
```bash
# The sample-minimal.dcm has Patient ID: TEST001
# Check if you have a patient with this ID or name in your database
```

**If no match found:**
- The system will log a warning but won't fail
- You can create a patient with matching ID/name and re-test

**To create a test patient:**
1. Go to http://localhost:3000/dashboard/dental/admin
2. Create a new patient/lead
3. Set Patient ID to "TEST001" (or match the DICOM Patient ID)
4. Re-run Step 5 (webhook)

---

### Step 7: Verify Data Storage

**Check Database:**
```bash
# Check if X-ray record was created
# The system should create a DentalXRay record in the database
```

**Check in Next.js App:**
1. Go to http://localhost:3000/dashboard/dental/clinical
2. Select the matched patient
3. Check "X-Ray Analysis" card
4. The uploaded DICOM should appear

**Or check via API:**
```bash
# Get X-rays for a patient (replace LEAD_ID)
curl http://localhost:3000/api/dental/xrays?leadId=LEAD_ID
```

---

### Step 8: Test Complete Workflow (Automated)

**Run the automated test script:**
```bash
./scripts/test-real-dicom.sh
```

This script will:
1. ✅ Check for DICOM files
2. ✅ Verify Orthanc is running
3. ✅ Verify Next.js is running
4. ✅ Upload DICOM file to Orthanc
5. ✅ Trigger webhook
6. ✅ Display results

---

## Troubleshooting

### Issue: Webhook returns 401 Unauthorized

**Solution:** Check webhook secret matches:
```bash
# In .env.local
DICOM_WEBHOOK_SECRET=local-test-secret-change-in-production

# In webhook request
Authorization: Bearer local-test-secret-change-in-production
```

### Issue: Patient Not Found

**Solution:** 
1. Check DICOM Patient ID: The sample file has `Patient ID: TEST001`
2. Create a patient with matching ID or name
3. Re-trigger webhook

**To check DICOM metadata:**
```bash
# If you have dcmtk installed:
dcmdump test-data/dicom-samples/sample-minimal.dcm | grep PatientID

# Or check in Orthanc UI:
# Go to instance → "Tags" tab
```

### Issue: Next.js App Not Running

**Solution:**
```bash
npm run dev
```

### Issue: Orthanc Not Accessible

**Solution:**
```bash
# Check container status
docker ps | grep orthanc

# Check logs
docker logs nexrel-orthanc --tail 50

# Restart if needed
docker-compose -f docker-compose.orthanc.yml restart
```

### Issue: DICOM File Upload Fails

**Solution:**
1. Verify file exists: `ls -lh test-data/dicom-samples/sample-minimal.dcm`
2. Verify file is valid DICOM: `file test-data/dicom-samples/sample-minimal.dcm`
3. Check Orthanc logs: `docker logs nexrel-orthanc --tail 20`

---

## Expected Workflow

```
1. DICOM File Uploaded to Orthanc
   ↓
2. Orthanc Stores File (Instance ID generated)
   ↓
3. Webhook Triggered (manual or automatic)
   ↓
4. Next.js Downloads DICOM from Orthanc
   ↓
5. DICOM Metadata Parsed (Patient ID, Name, Modality, etc.)
   ↓
6. Patient Matching (by ID or Name)
   ↓
7. DICOM File Stored (Canadian storage, Law 25 compliant)
   ↓
8. Preview Image Generated
   ↓
9. Database Record Created (DentalXRay)
   ↓
10. Available in UI (X-Ray Analysis card)
```

---

## Quick Test Commands

**All-in-one test:**
```bash
# 1. Upload
INSTANCE_ID=$(curl -s -u orthanc:orthanc -X POST http://localhost:8042/instances \
  -F file=@test-data/dicom-samples/sample-minimal.dcm | grep -o '"ID":"[^"]*"' | cut -d'"' -f4)

# 2. Trigger webhook
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d "{\"event\": \"NewInstance\", \"resourceId\": \"$INSTANCE_ID\", \"userId\": \"test-user-id\"}"

# 3. Check result
echo "Instance ID: $INSTANCE_ID"
echo "Check Orthanc UI: http://localhost:8042"
echo "Check Next.js app: http://localhost:3000/dashboard/dental/clinical"
```

---

## Next Steps After Testing

Once basic testing works:

1. **Configure Automatic Webhook** (Orthanc → Next.js)
2. **Test with Real X-Ray Machine** (if available)
3. **Test Patient Matching** with various scenarios
4. **Test Multiple Files** (batch upload)
5. **Test Error Handling** (invalid files, network issues)
6. **Performance Testing** (large files, many files)

---

## Success Criteria

✅ DICOM file uploads to Orthanc successfully  
✅ Webhook triggers and processes the file  
✅ Patient matching works (or logs warning if no match)  
✅ DICOM file stored in database  
✅ Preview image generated  
✅ File appears in Next.js UI  

---

## Need Help?

- Check logs: `docker logs nexrel-orthanc`
- Check Next.js terminal for errors
- Verify environment variables in `.env.local`
- Review documentation: `docs/LOCAL_DICOM_SETUP.md`
