# Local DICOM & Orthanc Testing Setup Guide

Complete guide to test DICOM files and Orthanc integration locally.

## Prerequisites

1. **Docker & Docker Compose** installed
   ```bash
   # Check if installed
   docker --version
   docker-compose --version
   
   # Install if needed:
   # macOS: https://docs.docker.com/desktop/install/mac-install/
   # Linux: https://docs.docker.com/engine/install/
   ```

2. **Node.js & npm** (already installed)
   ```bash
   node --version
   npm --version
   ```

3. **Next.js app running** (port 3000)
   ```bash
   npm run dev
   ```

---

## Step 1: Set Up Environment Variables

Add these to your `.env.local` file:

```bash
# Orthanc DICOM Server Configuration
ORTHANC_BASE_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc

# DICOM Network Configuration
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=localhost
ORTHANC_PORT=4242

# Webhook Secret (for securing webhook endpoint)
DICOM_WEBHOOK_SECRET=local-test-secret-change-in-production

# Next.js API URL (for webhook)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Step 2: Start Orthanc Server

### Quick Start (Recommended)

```bash
# Start Orthanc using the provided script
chmod +x scripts/start-local-orthanc.sh
./scripts/start-local-orthanc.sh
```

### Manual Start

```bash
# Using docker-compose
docker-compose -f docker-compose.orthanc.yml up -d

# Or using docker directly
docker run -d \
  --name nexrel-orthanc \
  -p 4242:4242 \
  -p 8042:8042 \
  -v orthanc-data:/var/lib/orthanc/db \
  jodogne/orthanc-plugins:latest
```

### Verify Orthanc is Running

```bash
# Check if Orthanc is accessible
curl http://localhost:8042/system

# Or open in browser:
# http://localhost:8042
# Username: orthanc
# Password: orthanc
```

---

## Step 3: Configure Orthanc Webhook (Local Testing)

For local testing, we need to configure Orthanc to call your local Next.js API when new DICOM files arrive.

### Option A: Manual Configuration via Web UI

1. Open Orthanc web interface: http://localhost:8042
2. Login with `orthanc` / `orthanc`
3. Go to **Configuration** → **Lua Scripts**
4. Add this Lua script:

```lua
function OnStoredInstance(dicom, instanceId)
   local url = 'http://host.docker.internal:3000/api/dental/dicom/webhook'
   local secret = 'local-test-secret-change-in-production'
   
   local headers = {
      ['Content-Type'] = 'application/json',
      ['Authorization'] = 'Bearer ' .. secret
   }
   
   -- Get user ID from Orthanc metadata or use default
   local userId = 'default-user-id'  -- TODO: Get from Orthanc metadata
   
   local body = {
      event = 'NewInstance',
      resourceId = instanceId,
      userId = userId
   }
   
   local http = require('socket.http')
   local ltn12 = require('ltn12')
   local json = require('json')
   
   local response_body = {}
   local res, code, response_headers = http.request{
      url = url,
      method = 'POST',
      headers = headers,
      source = ltn12.source.string(json.encode(body)),
      sink = ltn12.sink.table(response_body)
   }
   
   if code ~= 200 then
      print('Webhook failed: ' .. code)
   end
end
```

**Note:** For local testing, use `host.docker.internal` instead of `localhost` so Docker can reach your Next.js app.

### Option B: Update orthanc.json Configuration

Edit `docker/orthanc/orthanc.json` and add:

```json
{
  "LuaScripts": [
    "/etc/orthanc/webhook.lua"
  ]
}
```

Then create `docker/orthanc/webhook.lua` with the script above.

---

## Step 4: Download Sample DICOM Files

### Quick Download Script

```bash
# Run the download script
chmod +x scripts/download-sample-dicom.sh
./scripts/download-sample-dicom.sh
```

This will download sample DICOM files to `test-data/dicom-samples/`

### Manual Download

Download sample DICOM files from:
- https://www.dclunie.com/images/
- https://www.osirix-viewer.com/resources/dicom-image-library/
- https://github.com/OHIF/Viewers/tree/master/public/dicom-files

---

## Step 5: Test DICOM Upload

### Test 1: Upload via UI

1. Start your Next.js app: `npm run dev`
2. Go to Dental Dashboard
3. Select a patient
4. Click "Upload X-Ray"
5. Select a test DICOM file
6. Verify it appears in the viewer

### Test 2: Upload to Orthanc via REST API

```bash
# Upload DICOM file to Orthanc
curl -X POST http://localhost:8042/instances \
  -u orthanc:orthanc \
  -F file=@test-data/dicom-samples/sample.dcm
```

This should:
1. Upload to Orthanc
2. Trigger webhook (if configured)
3. Process in Next.js app
4. Match to patient (if Patient ID matches)

### Test 3: Simulate X-Ray Machine (C-STORE)

Install DICOM toolkit:

```bash
# macOS
brew install dcmtk

# Linux
sudo apt-get install dcmtk
```

Send DICOM file via C-STORE protocol:

```bash
# Send DICOM file to Orthanc (simulates X-ray machine)
storescu -aec NEXREL-CRM localhost 4242 test-data/dicom-samples/sample.dcm
```

---

## Step 6: Test Webhook Manually

If webhook isn't configured, you can test it manually:

```bash
# First, upload a file to Orthanc and get the instance ID
INSTANCE_ID=$(curl -s -u orthanc:orthanc \
  -X POST http://localhost:8042/instances \
  -F file=@test-data/dicom-samples/sample.dcm | jq -r '.ID')

# Then trigger webhook manually
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d "{
    \"event\": \"NewInstance\",
    \"resourceId\": \"$INSTANCE_ID\",
    \"userId\": \"test-user-id\"
  }"
```

---

## Step 7: Verify Everything Works

### Checklist

- [ ] Orthanc is running on http://localhost:8042
- [ ] Can access Orthanc web interface
- [ ] Environment variables set in `.env.local`
- [ ] Next.js app running on http://localhost:3000
- [ ] Webhook configured in Orthanc (or can trigger manually)
- [ ] Sample DICOM files downloaded
- [ ] Can upload DICOM via UI
- [ ] Can upload DICOM to Orthanc via REST API
- [ ] Webhook triggers when file uploaded to Orthanc
- [ ] DICOM files appear in Next.js app
- [ ] Patient matching works (if Patient ID matches)

---

## Troubleshooting

### Orthanc Not Starting

```bash
# Check logs
docker logs nexrel-orthanc

# Check if ports are in use
lsof -i :4242
lsof -i :8042

# Restart Orthanc
docker-compose -f docker-compose.orthanc.yml restart
```

### Webhook Not Working

1. **Check if Next.js app is accessible from Docker:**
   ```bash
   # From inside Docker container
   docker exec -it nexrel-orthanc curl http://host.docker.internal:3000/api/health
   ```

2. **Check webhook secret matches:**
   - `.env.local`: `DICOM_WEBHOOK_SECRET`
   - Orthanc Lua script: `secret` variable

3. **Check Next.js logs:**
   ```bash
   # In Next.js terminal, you should see webhook requests
   ```

### Patient Matching Not Working

1. **Check Patient ID in DICOM file:**
   ```bash
   # View DICOM metadata
   dcmdump test-data/dicom-samples/sample.dcm | grep PatientID
   ```

2. **Ensure patient exists in database with matching ID:**
   - Go to Leads/Patients
   - Check Patient ID matches DICOM Patient ID

---

## Next Steps

Once local testing works:

1. **Test with real X-ray machines** (if available)
2. **Deploy Orthanc to production server**
3. **Configure production webhook URL**
4. **Set up SSL/TLS for Orthanc**
5. **Configure firewall rules**

---

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| Orthanc Web UI | http://localhost:8042 | orthanc / orthanc |
| Orthanc REST API | http://localhost:8042 | orthanc / orthanc |
| Orthanc DICOM Port | localhost:4242 | N/A |
| Next.js App | http://localhost:3000 | N/A |
| Webhook Endpoint | http://localhost:3000/api/dental/dicom/webhook | Bearer token |

---

## Additional Resources

- [Orthanc Documentation](https://book.orthanc-server.com/)
- [DICOM Standard](https://www.dicomstandard.org/)
- [DCMTK Tools](https://dicom.offis.de/dcmtk.php.en)
