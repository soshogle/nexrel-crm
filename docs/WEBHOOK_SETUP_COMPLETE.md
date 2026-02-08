# Webhook Setup Complete ✅

## What Was Done

1. ✅ **Created webhook Lua script** (`docker/orthanc/webhook.lua`)
   - Triggers when new DICOM instances are stored
   - Sends POST request to your Next.js API endpoint

2. ✅ **Updated Orthanc configuration** (`docker/orthanc/orthanc.json`)
   - Added Lua script to `LuaScripts` array

3. ✅ **Updated Docker Compose** (`docker-compose.orthanc.yml`)
   - Mounted webhook script into container

## 🔄 Restart Orthanc

For the webhook to take effect, you need to restart Orthanc:

```bash
docker-compose -f docker-compose.orthanc.yml restart
```

Or if it's not running:
```bash
docker-compose -f docker-compose.orthanc.yml up -d
```

## 🧪 Test the Webhook

### 1. Upload a DICOM file (if not already done)
```bash
curl -u orthanc:orthanc -X POST http://localhost:8042/instances \
  -F file=@test-data/dicom-samples/0002.DCM
```

### 2. Check Orthanc logs for webhook calls
```bash
docker logs nexrel-orthanc | grep -i webhook
```

You should see:
- `Webhook succeeded for instance: <instance-id>` (if successful)
- `Webhook failed for instance <instance-id>: HTTP <code>` (if failed)

### 3. Check your Next.js app logs
If your Next.js app is running, check its logs for incoming webhook requests:
```bash
# If running with npm run dev, check the terminal output
# Look for POST requests to /api/dental/dicom/webhook
```

### 4. Verify webhook manually (optional)
You can manually trigger the webhook to test:
```bash
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d '{
    "event": "NewInstance",
    "resourceId": "b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b",
    "userId": "test-user-id"
  }'
```

## 📋 Webhook Configuration

### Current Settings (Local Testing)
- **Webhook URL**: `http://host.docker.internal:3000/api/dental/dicom/webhook`
  - Uses `host.docker.internal` so Docker can reach your local Next.js app
- **Secret**: `local-test-secret-change-in-production`
  - Set via `DICOM_WEBHOOK_SECRET` environment variable
  - Or hardcoded in `webhook.lua` for local testing

### For Production
Update `docker/orthanc/webhook.lua` to use:
```lua
local url = 'https://your-api-domain.com/api/dental/dicom/webhook'
local secret = os.getenv('DICOM_WEBHOOK_SECRET')  -- From environment variable
```

Or set environment variables in `docker-compose.orthanc.yml`:
```yaml
environment:
  - DICOM_WEBHOOK_URL=https://your-api-domain.com/api/dental/dicom/webhook
  - DICOM_WEBHOOK_SECRET=your-production-secret
```

## 🔍 Troubleshooting

### Webhook not triggering?
1. **Check Orthanc logs**: `docker logs nexrel-orthanc`
2. **Verify Lua script is loaded**: Check Orthanc logs for errors about webhook.lua
3. **Check network connectivity**: Ensure Docker can reach `host.docker.internal:3000`
4. **Verify Next.js is running**: Make sure your Next.js app is running on port 3000

### Webhook failing with 401?
- Check that `DICOM_WEBHOOK_SECRET` matches in both:
  - Orthanc webhook script
  - Your Next.js `.env.local` file

### Webhook failing with connection error?
- For local testing, ensure Next.js is accessible at `http://localhost:3000`
- For Docker, use `host.docker.internal:3000` instead of `localhost:3000`
- Check firewall settings

## ✅ Success Indicators

When everything is working, you should see:
1. ✅ DICOM file uploads successfully to Orthanc
2. ✅ Orthanc logs show "Webhook succeeded for instance: <id>"
3. ✅ Next.js app receives POST request at `/api/dental/dicom/webhook`
4. ✅ DICOM metadata is stored in your database
5. ✅ Patient record is created/updated with X-ray information

## 📝 Next Steps

1. **Restart Orthanc** to load the webhook script
2. **Upload a DICOM file** (or use the existing `0002.DCM`)
3. **Check logs** to verify webhook is triggered
4. **Verify database** to see if DICOM data was stored
5. **Test with your Next.js app** to see the full workflow
