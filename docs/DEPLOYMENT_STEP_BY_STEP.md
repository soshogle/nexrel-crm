# Step-by-Step Deployment Guide

## Complete Production Deployment Instructions

Follow these steps in order to deploy the DICOM system to production.

---

## Prerequisites

- [ ] Server/VPS with Docker installed
- [ ] Domain name for Orthanc server
- [ ] Vercel account (for Next.js app)
- [ ] SSH access to your server

---

## Step 1: Deploy Orthanc Server (30-60 minutes)

### Option A: Automated Script (Recommended)

```bash
# On your server
ssh user@your-server.com

# Clone repository
git clone <your-repo-url>
cd nexrel-crm

# Run deployment script
chmod +x scripts/setup-orthanc-production.sh
./scripts/setup-orthanc-production.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Ask for configuration details
- ✅ Create production config files
- ✅ Deploy Orthanc
- ✅ Generate passwords and secrets

### Option B: Manual Deployment

```bash
# 1. Create directories
mkdir -p docker/orthanc/data
mkdir -p docker/orthanc/logs

# 2. Deploy with Docker Compose
docker-compose -f docker-compose.orthanc.yml up -d

# 3. Check status
docker ps | grep orthanc
curl http://localhost:8042/system -u orthanc:orthanc
```

### Step 1.1: Set Up Nginx Reverse Proxy

```bash
# Copy Nginx config (created by script)
sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc
sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 1.2: Set Up SSL Certificate

```bash
# Install Certbot (if not installed)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d orthanc.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Step 2: Configure Orthanc Webhook (15 minutes)

### Option A: Via Web Interface

1. **Access Orthanc Web Interface:**
   ```
   https://orthanc.yourdomain.com
   ```
   Login: `orthanc` / `<your-password>`

2. **Go to Configuration → Lua Scripts**

3. **Add Webhook Script:**
   ```lua
   function OnStoredInstance(dicom, instanceId)
      local url = 'https://your-api.vercel.app/api/dental/dicom/webhook'
      local secret = 'your-webhook-secret'
      
      local headers = {
         ['Content-Type'] = 'application/json',
         ['Authorization'] = 'Bearer ' .. secret
      }
      
      local userId = 'default-user-id'  -- Get from Orthanc metadata
      
      local body = {
         event = 'NewInstance',
         resourceId = instanceId,
         userId = userId
      }
      
      http.request('POST', url, headers, json.encode(body))
   end
   ```

4. **Save Configuration**

### Option B: Via Script

```bash
# Run webhook configuration script
chmod +x scripts/configure-orthanc-webhook.sh
./scripts/configure-orthanc-webhook.sh
```

### Option C: Update orthanc.json Directly

Edit `docker/orthanc/orthanc.json` and add Lua script, then restart:

```bash
docker-compose -f docker-compose.orthanc.prod.yml restart
```

---

## Step 3: Set Environment Variables in Vercel (10 minutes)

### 3.1: Get Values from Configuration File

The deployment script created `.env.orthanc.production`. Open it to get values:

```bash
cat .env.orthanc.production
```

### 3.2: Add to Vercel Dashboard

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Select Your Project**

3. **Go to Settings → Environment Variables**

4. **Add Each Variable:**

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `ORTHANC_BASE_URL` | `https://orthanc.yourdomain.com` | Production |
   | `ORTHANC_USERNAME` | `orthanc` | Production |
   | `ORTHANC_PASSWORD` | `<from .env.orthanc.production>` | Production |
   | `DICOM_WEBHOOK_SECRET` | `<from .env.orthanc.production>` | Production |
   | `DICOM_AE_TITLE` | `NEXREL-CRM` | Production |
   | `ORTHANC_HOST` | `orthanc.yourdomain.com` | Production |
   | `ORTHANC_PORT` | `4242` | Production |

5. **Save and Redeploy**

   Vercel will automatically redeploy, or trigger manually:
   ```bash
   vercel --prod
   ```

---

## Step 4: Test Integration (30 minutes)

### 4.1: Test Health Check

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/dental/dicom/health

# Expected response:
# {
#   "status": "healthy",
#   "message": "DICOM server is operational",
#   ...
# }
```

### 4.2: Test Webhook Manually

```bash
curl -X POST https://your-app.vercel.app/api/dental/dicom/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-secret" \
  -d '{
    "event": "NewInstance",
    "resourceId": "test-instance-id",
    "userId": "test-user-id"
  }'
```

### 4.3: Run Automated Test Script

```bash
chmod +x scripts/test-dicom-integration.sh
./scripts/test-dicom-integration.sh
```

### 4.4: Upload Test DICOM File

1. **Get Test DICOM File:**
   - Download from: https://www.dclunie.com/images/
   - Or use sample from your X-ray machine

2. **Upload via UI:**
   - Go to Dental Management page
   - Upload DICOM file
   - Verify processing

3. **Check Logs:**
   ```bash
   # Orthanc logs
   docker logs nexrel-orthanc-prod -f
   
   # Vercel logs
   vercel logs
   ```

---

## Step 5: Configure X-Ray Machines (Per Clinic)

### For Each Clinic:

1. **Access X-Ray Machine Settings:**
   - Navigate to DICOM/Network settings
   - Find "DICOM Server" or "Network" configuration

2. **Configure DICOM Server:**
   - **Server Address:** `orthanc.yourdomain.com` (or IP address)
   - **Port:** `4242`
   - **AE Title:** `NEXREL-CRM`
   - **Protocol:** DICOM

3. **Test Connection:**
   - Send test image
   - Verify it appears in Orthanc
   - Check webhook is triggered
   - Verify it appears in your CRM

### Common X-Ray Machine Configurations:

**Carestream:**
- Settings → Network → DICOM
- Add server: `orthanc.yourdomain.com:4242`
- AE Title: `NEXREL-CRM`

**Planmeca:**
- Settings → DICOM → Servers
- Add: `orthanc.yourdomain.com:4242`
- AE Title: `NEXREL-CRM`

**Sirona:**
- Configuration → DICOM → Destination
- Server: `orthanc.yourdomain.com:4242`
- AE Title: `NEXREL-CRM`

**Vatech:**
- Network Settings → DICOM
- Server: `orthanc.yourdomain.com:4242`
- AE Title: `NEXREL-CRM`

---

## Step 6: Verify Everything Works

### Checklist:

- [ ] Orthanc is accessible: `https://orthanc.yourdomain.com`
- [ ] Health check returns "healthy"
- [ ] Webhook is configured in Orthanc
- [ ] Environment variables set in Vercel
- [ ] Test DICOM upload works
- [ ] X-ray machine can connect to Orthanc
- [ ] Images appear in CRM after sending from X-ray machine
- [ ] Patient matching works correctly
- [ ] Images are stored in Canadian storage

### Monitoring:

```bash
# Check Orthanc status
curl https://orthanc.yourdomain.com/system -u orthanc:password

# Check health endpoint
curl https://your-app.vercel.app/api/dental/dicom/health

# View Orthanc logs
docker logs nexrel-orthanc-prod -f

# View recent images in Orthanc
curl https://orthanc.yourdomain.com/instances -u orthanc:password
```

---

## Troubleshooting

### Orthanc Not Accessible

```bash
# Check if container is running
docker ps | grep orthanc

# Check logs
docker logs nexrel-orthanc-prod

# Restart container
docker restart nexrel-orthanc-prod
```

### Webhook Not Working

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Vercel logs for errors
4. Test webhook manually (see Step 4.2)

### X-Ray Machine Can't Connect

1. Verify network connectivity
2. Check firewall allows port 4242
3. Verify AE Title matches exactly
4. Check Orthanc logs for connection attempts

---

## Next Steps After Deployment

1. **Set Up Monitoring:**
   - Configure alerts for health check failures
   - Set up log aggregation
   - Monitor storage usage

2. **Backup Strategy:**
   - Set up regular Orthanc database backups
   - Test restore procedure

3. **Documentation:**
   - Document X-ray machine configurations
   - Create user guide for clinics
   - Set up support procedures

---

**Last Updated**: February 2, 2026
**Status**: Ready for Production
