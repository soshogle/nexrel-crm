# Production Deployment Checklist

## Pre-Deployment

### Code & Testing
- [x] All code implemented and tested
- [x] Unit tests passing (47/47)
- [x] Build successful
- [x] No TypeScript errors
- [x] Code placeholders removed

### Infrastructure
- [ ] Orthanc server deployed
- [ ] Orthanc webhook configured
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Monitoring set up

---

## Deployment Steps

### 1. Deploy Orthanc Server

**Option A: VPS/Cloud Instance**
```bash
# SSH into server
ssh user@your-server.com

# Clone repository
git clone <your-repo>
cd nexrel-crm

# Deploy Orthanc
./scripts/deploy-orthanc.sh

# Configure webhook (see Orthanc deployment guide)
```

**Option B: Docker Swarm**
```bash
docker stack deploy -c docker-compose.orthanc.yml orthanc
```

**Option C: Kubernetes**
- Create deployment manifests
- Apply to cluster

### 2. Configure Environment Variables

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.orthanc.example`
3. Set production values

**Required Variables:**
```
ORTHANC_BASE_URL=https://orthanc.yourdomain.com
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=<secure-password>
DICOM_WEBHOOK_SECRET=<random-secret>
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=orthanc.yourdomain.com
ORTHANC_PORT=4242
```

### 3. Deploy Next.js App to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

### 4. Configure Orthanc Webhook

1. Access Orthanc web interface
2. Go to Configuration → Lua Scripts
3. Add webhook script pointing to:
   ```
   https://your-app.vercel.app/api/dental/dicom/webhook
   ```
4. Set webhook secret

### 5. Test Integration

```bash
# Test health check
curl https://your-app.vercel.app/api/dental/dicom/health

# Test webhook (manually)
curl -X POST https://your-app.vercel.app/api/dental/dicom/webhook \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json" \
  -d '{"event":"NewInstance","resourceId":"test","userId":"user-id"}'
```

### 6. Configure X-Ray Machines

For each clinic:
- Point X-ray machine to Orthanc server
- Set AE Title: `NEXREL-CRM`
- Set Port: `4242`
- Test transmission

---

## Post-Deployment

### Monitoring Setup
- [ ] Health check alerts configured
- [ ] Error tracking (Sentry) set up
- [ ] Performance monitoring active
- [ ] Log aggregation configured

### Security
- [ ] SSL certificates valid
- [ ] Passwords changed from defaults
- [ ] Webhook secret is strong
- [ ] Firewall rules configured
- [ ] Access logs reviewed

### Documentation
- [ ] Deployment guide updated
- [ ] User documentation ready
- [ ] Support procedures documented
- [ ] Troubleshooting guide created

---

## Verification Tests

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/dental/dicom/health
```
**Expected**: `{"status":"healthy"}`

### 2. Manual Upload
- Upload DICOM file via UI
- Verify processing
- Verify storage

### 3. Network Integration
- Send test DICOM from X-ray machine
- Verify webhook received
- Verify patient matching
- Verify storage

### 4. Performance
- Check response times
- Verify image conversion speed
- Check storage upload speed

---

## Rollback Plan

If deployment fails:

1. **Revert Vercel Deployment:**
   ```bash
   vercel rollback
   ```

2. **Restore Orthanc:**
   ```bash
   docker restart nexrel-orthanc
   ```

3. **Check Logs:**
   ```bash
   # Vercel logs
   vercel logs

   # Orthanc logs
   docker logs nexrel-orthanc
   ```

---

## Support Contacts

- **Technical Issues**: [Your support email]
- **Infrastructure**: [DevOps contact]
- **Emergency**: [On-call contact]

---

**Last Updated**: February 2, 2026
**Status**: Ready for Production Deployment
