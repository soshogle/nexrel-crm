# Testing DICOM Webhook Without Real File Upload

Since the minimal DICOM file is too small for Orthanc, you can test the webhook integration logic without uploading a file first.

## Option: Test Webhook Processing Logic

The webhook endpoint will attempt to download from Orthanc, but if the instance doesn't exist, it will fail gracefully. This still tests:
- ✅ Webhook endpoint is accessible
- ✅ Authentication works
- ✅ Request processing logic
- ✅ Error handling

### Test Command

```bash
# Use a mock instance ID (won't work but tests the endpoint)
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-secret-change-in-production" \
  -d '{
    "event": "NewInstance",
    "resourceId": "mock-instance-id-12345",
    "userId": "test-user-id"
  }'
```

**Expected:** Error response (since instance doesn't exist), but confirms webhook endpoint is working.

## Better Solution: Get Real DICOM File

For full testing, you need a real DICOM file. Options:

1. **Download from:** https://www.dclunie.com/images/
2. **Use files from:** Your X-ray machine or dental imaging system
3. **Request sample:** From your DICOM vendor

Once you have a real file (> 1KB), upload it and test the complete workflow.
