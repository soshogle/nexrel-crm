# Quick Start: Local DICOM Testing

Get up and running with DICOM files and Orthanc in 5 minutes!

## 🚀 One-Command Setup

```bash
# Run the complete setup script
./scripts/setup-local-dicom.sh
```

This will:
- ✅ Check Docker installation
- ✅ Add environment variables to `.env.local`
- ✅ Start Orthanc server
- ✅ Download sample DICOM files

## 📋 Manual Setup (If Needed)

### 1. Install Docker
```bash
# Check if installed
docker --version

# Install if needed:
# macOS: https://docs.docker.com/desktop/install/mac-install/
```

### 2. Add Environment Variables

Add to `.env.local`:
```bash
ORTHANC_BASE_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=localhost
ORTHANC_PORT=4242
DICOM_WEBHOOK_SECRET=local-test-secret-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Orthanc
```bash
./scripts/start-local-orthanc.sh
```

### 4. Start Next.js App
```bash
npm run dev
```

## 🧪 Test It

### Test 1: Upload via UI
1. Go to http://localhost:3000
2. Navigate to Dental Dashboard
3. Select a patient
4. Upload a DICOM file

### Test 2: Upload to Orthanc
```bash
./scripts/test-dicom-local.sh
```

### Test 3: Manual Upload
```bash
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F file=@test-data/dicom-samples/sample.dcm
```

## 🔗 Quick Links

| Service | URL | Credentials |
|---------|-----|-------------|
| Orthanc Web UI | http://localhost:8042 | orthanc / orthanc |
| Next.js App | http://localhost:3000 | - |

## 📚 Full Documentation

See `docs/LOCAL_DICOM_SETUP.md` for complete details.

## 🐛 Troubleshooting

**Orthanc not starting?**
```bash
docker logs nexrel-orthanc
```

**Webhook not working?**
- Check webhook secret matches in `.env.local` and Orthanc config
- Ensure Next.js app is running on port 3000

**No DICOM files?**
```bash
./scripts/download-sample-dicom.sh
```
