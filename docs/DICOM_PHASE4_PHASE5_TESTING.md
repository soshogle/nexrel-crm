# DICOM Phase 4 & 5 Testing Guide

## Phase 4: Robustness & Performance ✅

### Components Implemented

1. **Image Caching** (`lib/dental/dicom-cache.ts`)
   - Server-side caching for converted images
   - Window/Level specific caching
   - Cache expiration management

2. **Batch Processing** (`lib/dental/dicom-batch-processor.ts`)
   - Multiple DICOM file upload support
   - Queue-based processing
   - Progress tracking
   - Error handling per file

3. **Retry Mechanisms** (`lib/dental/dicom-retry.ts`)
   - Exponential backoff
   - Configurable retry attempts
   - Retryable error detection
   - Network error recovery

4. **Performance Monitoring** (`lib/dental/dicom-performance.ts`)
   - Operation tracking
   - Duration metrics
   - Success rate tracking
   - Percentile calculations (p50, p95, p99)

### API Endpoints

- `POST /api/dental/xrays/batch` - Upload multiple DICOM files
- `GET /api/dental/xrays/batch?jobId=xxx` - Get batch job status
- `GET /api/dental/xrays/performance` - Get performance metrics

### Testing Phase 4

#### Test 1: Batch Upload
```bash
# Upload multiple DICOM files
curl -X POST http://localhost:3000/api/dental/xrays/batch \
  -H "Content-Type: multipart/form-data" \
  -F "files=@xray1.dcm" \
  -F "files=@xray2.dcm" \
  -F "files=@xray3.dcm" \
  -F "leadId=xxx" \
  -F "userId=xxx" \
  -F "xrayType=PANORAMIC" \
  -F "dateTaken=2026-02-02"

# Check job status
curl http://localhost:3000/api/dental/xrays/batch?jobId=xxx
```

#### Test 2: Performance Metrics
```bash
# Get performance statistics
curl http://localhost:3000/api/dental/xrays/performance

# Get metrics for specific operation
curl http://localhost:3000/api/dental/xrays/performance?operation=dicom_processing
```

#### Test 3: Retry Mechanism
- Simulate network failure
- Verify automatic retry
- Check exponential backoff

---

## Phase 5: DICOM Network Integration ✅

### Components Implemented

1. **DICOM Server Service** (`lib/dental/dicom-server.ts`)
   - Orthanc integration
   - C-STORE webhook handler
   - C-FIND query support
   - C-MOVE import support
   - Patient matching

2. **Modality Worklist** (`lib/dental/dicom-worklist.ts`)
   - Scheduled study queries
   - Auto-import for appointments
   - Worklist generation

### API Endpoints

- `POST /api/dental/dicom/webhook` - Receive Orthanc webhooks
- `POST /api/dental/dicom/query` - Query remote DICOM systems
- `POST /api/dental/dicom/import` - Import study from remote system
- `GET /api/dental/dicom/worklist` - Get modality worklist

### Testing Phase 5

#### Prerequisites
1. Install and configure Orthanc DICOM server
2. Set environment variables:
   ```env
   ORTHANC_BASE_URL=http://localhost:8042
   ORTHANC_USERNAME=orthanc
   ORTHANC_PASSWORD=orthanc
   DICOM_AE_TITLE=NEXREL-CRM
   ORTHANC_HOST=localhost
   ORTHANC_PORT=4242
   DICOM_WEBHOOK_SECRET=your-secret-key
   ```

#### Test 1: C-STORE Webhook
```bash
# Configure Orthanc to send webhooks to:
# POST http://your-domain/api/dental/dicom/webhook

# Send test webhook
curl -X POST http://localhost:3000/api/dental/dicom/webhook \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "NewInstance",
    "resourceId": "instance-id",
    "userId": "user-id"
  }'
```

#### Test 2: C-FIND Query
```bash
# Query remote DICOM systems
curl -X POST http://localhost:3000/api/dental/dicom/query \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "default",
    "patientId": "12345",
    "studyDate": "2026-02-02"
  }'
```

#### Test 3: Import Study
```bash
# Import study from remote system
curl -X POST http://localhost:3000/api/dental/dicom/import \
  -H "Content-Type: application/json" \
  -d '{
    "studyInstanceUid": "1.2.840.113619.2.55.3.1234567890",
    "leadId": "patient-id"
  }'
```

#### Test 4: Modality Worklist
```bash
# Get worklist for today
curl "http://localhost:3000/api/dental/dicom/worklist?startDate=2026-02-02&endDate=2026-02-02"

# Get worklist with modality filter
curl "http://localhost:3000/api/dental/dicom/worklist?startDate=2026-02-02&modality=PX"
```

---

## Integration Testing

### End-to-End Test Flow

1. **X-ray Machine → Orthanc → Webhook → Auto-Import**
   - Configure X-ray machine to send to Orthanc
   - Orthanc receives DICOM file
   - Orthanc sends webhook to your API
   - System automatically processes and imports

2. **Scheduled Appointment → Worklist → Auto-Import**
   - Create appointment in system
   - X-ray machine queries worklist
   - X-ray taken matches appointment
   - System auto-imports when webhook received

3. **Manual Query → Import**
   - User searches for studies
   - Selects study to import
   - System imports and links to patient

---

## Performance Benchmarks

### Phase 4 Targets
- Batch processing: < 5s per file (average)
- Retry success rate: > 95%
- Cache hit rate: > 80%

### Phase 5 Targets
- Webhook processing: < 2s
- C-FIND query: < 3s
- Study import: < 10s per study

---

## Known Limitations

1. **Worklist Service**: Currently uses placeholder for appointments - needs integration with actual appointment model
2. **Patient Matching**: Basic matching by Patient ID/Name - can be enhanced
3. **Orthanc Configuration**: Requires manual setup - automation planned

---

## Next Steps

1. ✅ Complete Phase 4 implementation
2. ✅ Complete Phase 5 implementation
3. ⏭️ Test with real DICOM files
4. ⏭️ Test with real Orthanc server
5. ⏭️ Integrate with appointment system
6. ⏭️ Production deployment

---

## Support

For issues or questions:
- Check error logs in console
- Review performance metrics endpoint
- Verify Orthanc configuration
- Check environment variables
