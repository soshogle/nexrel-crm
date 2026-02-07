# Local Testing Quick Start

## ✅ No VPS Needed - Test on Your Computer!

---

## Step 1: Start Orthanc Locally

```bash
./scripts/start-local-orthanc.sh
```

**Or manually:**
```bash
docker-compose -f docker-compose.orthanc.yml up -d
```

**Access:** http://localhost:8042 (username: `orthanc`, password: `orthanc`)

---

## Step 2: Set Environment Variables (Local)

Create `.env.local`:

```env
ORTHANC_BASE_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
DICOM_WEBHOOK_SECRET=test-secret
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=localhost
ORTHANC_PORT=4242
```

---

## Step 3: Test with Sample DICOM File

### Option A: Upload via UI
1. Download test file: https://www.dclunie.com/images/
2. Go to Dental Management page
3. Upload test file

### Option B: Upload to Orthanc
```bash
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F file=@test-file.dcm
```

### Option C: Use DICOM Tools
```bash
# Install dcmtk
brew install dcmtk  # macOS

# Send file
storescu -aec NEXREL-CRM localhost 4242 test-file.dcm
```

---

## Step 4: Verify

- Check Orthanc: http://localhost:8042
- Check your app: View uploaded X-rays
- Test viewer: Open and interact with images
- Test AI: Run analysis

---

## Summary

✅ **No VPS needed for testing**
✅ **Everything runs locally**
✅ **Full functionality testable**

**Get VPS only when ready for production!**

---

See `docs/TESTING_WITHOUT_REAL_XRAYS.md` for complete guide.
