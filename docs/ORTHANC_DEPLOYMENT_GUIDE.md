# Orthanc DICOM Server Deployment Guide

## Overview

This guide covers deploying Orthanc DICOM server for production use with Nexrel CRM.

---

## Quick Start (Local Development)

### Option 1: Docker Compose (Recommended)

```bash
# Deploy Orthanc
./scripts/deploy-orthanc.sh

# Or manually:
docker-compose -f docker-compose.orthanc.yml up -d
```

### Option 2: Docker Run

```bash
docker run -d \
  --name nexrel-orthanc \
  -p 4242:4242 \
  -p 8042:8042 \
  -v orthanc-data:/var/lib/orthanc/db \
  jodogne/orthanc-plugins:latest
```

---

## Production Deployment Options

### Option 1: Vercel + Separate Orthanc Server (Recommended)

**Architecture:**
- Next.js app on Vercel
- Orthanc on separate server (AWS EC2, DigitalOcean, etc.)

**Steps:**

1. **Deploy Orthanc on a VPS/Cloud Instance:**
   ```bash
   # On your server
   git clone <your-repo>
   cd nexrel-crm
   ./scripts/deploy-orthanc.sh
   ```

2. **Configure Environment Variables in Vercel:**
   ```
   ORTHANC_BASE_URL=https://orthanc.yourdomain.com
   ORTHANC_USERNAME=orthanc
   ORTHANC_PASSWORD=<secure-password>
   DICOM_WEBHOOK_SECRET=<random-secret>
   DICOM_AE_TITLE=NEXREL-CRM
   ORTHANC_HOST=orthanc.yourdomain.com
   ORTHANC_PORT=4242
   ```

3. **Set up Reverse Proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name orthanc.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8042;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **Configure SSL (Let's Encrypt):**
   ```bash
   certbot --nginx -d orthanc.yourdomain.com
   ```

### Option 2: Docker Swarm / Kubernetes

**Docker Swarm:**
```bash
docker stack deploy -c docker-compose.orthanc.yml orthanc
```

**Kubernetes:**
- Create deployment YAML
- Use persistent volumes for storage
- Configure service and ingress

### Option 3: Managed Orthanc Service

- Use a managed DICOM service provider
- Configure webhook to point to your API
- Update environment variables

---

## Configuration

### 1. Update Orthanc Password

**Via Web Interface:**
1. Access http://localhost:8042
2. Login with default credentials (orthanc/orthanc)
3. Go to Configuration → Users
4. Change password

**Via Configuration File:**
```json
{
  "RegisteredUsers": {
    "orthanc": "your-hashed-password"
  }
}
```

### 2. Configure Webhook

**Via Web Interface:**
1. Go to Configuration → Plugins → Lua Scripts
2. Add webhook script:

```lua
function OnStoredInstance(dicom, instanceId)
   local url = 'https://your-api.vercel.app/api/dental/dicom/webhook'
   local secret = 'your-webhook-secret'
   
   local headers = {
      ['Content-Type'] = 'application/json',
      ['Authorization'] = 'Bearer ' .. secret
   }
   
   local body = {
      event = 'NewInstance',
      resourceId = instanceId,
      userId = 'default-user-id'  -- Get from Orthanc metadata or config
   }
   
   http.request('POST', url, headers, json.encode(body))
end
```

**Via REST API:**
```bash
curl -X PUT http://localhost:8042/system \
  -u orthanc:orthanc \
  -d '{
    "LuaScripts": [
      "function OnStoredInstance(dicom, instanceId) ... end"
    ]
  }'
```

### 3. Configure X-Ray Machines

**For Carestream:**
- DICOM Server: `orthanc.yourdomain.com`
- Port: `4242`
- AE Title: `NEXREL-CRM`

**For Planmeca:**
- Same configuration
- May require additional setup in Planmeca software

**For Sirona:**
- Same configuration
- Check Sirona documentation for specific steps

---

## Security Checklist

- [ ] Change default Orthanc password
- [ ] Use HTTPS for Orthanc web interface
- [ ] Set strong `DICOM_WEBHOOK_SECRET`
- [ ] Configure firewall (only allow port 4242 from X-ray machines)
- [ ] Enable authentication on Orthanc
- [ ] Set up SSL/TLS certificates
- [ ] Configure IP whitelist (if possible)
- [ ] Regular backups of Orthanc database
- [ ] Monitor Orthanc logs for suspicious activity

---

## Monitoring

### Health Check Endpoint

Your API includes a health check:
```
GET /api/dental/dicom/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "DICOM server is operational",
  "details": {
    "url": "http://localhost:8042",
    "version": "1.12.0",
    "dicomPort": 4242,
    "httpPort": 8042
  }
}
```

### Monitoring Tools

1. **Orthanc Web Interface:**
   - Access http://localhost:8042
   - View statistics, logs, and system info

2. **API Monitoring:**
   - Set up alerts for `/api/dental/dicom/health` failures
   - Monitor webhook endpoint for errors

3. **Log Monitoring:**
   ```bash
   docker logs nexrel-orthanc -f
   ```

---

## Troubleshooting

### Orthanc Not Starting

```bash
# Check logs
docker logs nexrel-orthanc

# Check if ports are in use
netstat -tulpn | grep -E '4242|8042'

# Restart container
docker restart nexrel-orthanc
```

### Webhook Not Working

1. Check webhook URL is accessible
2. Verify `DICOM_WEBHOOK_SECRET` matches
3. Check Orthanc logs for errors
4. Test webhook manually:
   ```bash
   curl -X POST https://your-api.vercel.app/api/dental/dicom/webhook \
     -H "Authorization: Bearer your-secret" \
     -H "Content-Type: application/json" \
     -d '{"event":"NewInstance","resourceId":"test-id","userId":"user-id"}'
   ```

### X-Ray Machine Can't Connect

1. Verify network connectivity
2. Check firewall rules
3. Verify AE Title matches
4. Check Orthanc logs:
   ```bash
   docker logs nexrel-orthanc | grep -i error
   ```

---

## Backup & Recovery

### Backup Orthanc Database

```bash
# Backup volume
docker run --rm \
  -v orthanc-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/orthanc-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore Orthanc Database

```bash
# Stop Orthanc
docker stop nexrel-orthanc

# Restore volume
docker run --rm \
  -v orthanc-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/orthanc-backup-YYYYMMDD.tar.gz -C /
```

---

## Performance Tuning

### Increase Storage Limits

Edit `orthanc.json`:
```json
{
  "MaximumStorageSize": 107374182400,  // 100GB
  "MaximumPatientCount": 100000
}
```

### Optimize Network

```json
{
  "DicomMaxPduLength": 32768,
  "DicomMaxAssociations": 32,
  "TcpNoDelay": true,
  "TcpKeepAlive": true
}
```

---

## Next Steps

1. ✅ Deploy Orthanc server
2. ✅ Configure webhook
3. ✅ Set environment variables
4. ✅ Test with sample DICOM file
5. ✅ Configure X-ray machines
6. ✅ Monitor health checks
7. ✅ Set up backups

---

**Last Updated**: February 2, 2026
**Status**: Production Ready
