# Complete Deployment Instructions

## ✅ What's Ready

All scripts and configuration files are ready. Here's what to do:

---

## Step 1: Run Master Deployment Script

```bash
cd /path/to/nexrel-crm
./scripts/deploy-all.sh
```

**What it does:**
- ✅ Checks prerequisites (Docker, docker-compose)
- ✅ Asks for configuration (domains, passwords)
- ✅ Deploys Orthanc server
- ✅ Creates `.env.orthanc.production` file
- ✅ Creates `nginx-orthanc.conf` file
- ✅ Creates webhook script (`/tmp/orthanc-webhook.lua`)
- ✅ Tests integration
- ✅ Prints summary

**Time:** ~5-10 minutes

---

## Step 2: Copy Environment Variables to Vercel

After the script completes:

1. **View the environment file:**
   ```bash
   cat .env.orthanc.production
   ```

2. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables

3. **Add each variable:**
   - Copy from `.env.orthanc.production`
   - Paste into Vercel
   - Set environment to "Production"
   - Save

4. **Redeploy:**
   - Vercel will auto-redeploy, or trigger manually

**Time:** ~5 minutes

**See:** `docs/VERCEL_SETUP_GUIDE.md` for details

---

## Step 3: Configure Webhook in Orthanc

1. **Access Orthanc:**
   - URL: `http://localhost:8042` (or your domain)
   - Login: Use credentials from `.env.orthanc.production`

2. **Go to Configuration:**
   - Click "Configuration" in sidebar
   - Click "Lua Scripts" tab

3. **Add Webhook Script:**
   - Open: `/tmp/orthanc-webhook.lua`
   - Copy entire script
   - Paste into Lua Scripts text area
   - Click "Save"

**Time:** ~2 minutes

---

## Step 4: Set Up Nginx & SSL (If Using Domain)

If you're using a domain name (not just IP):

```bash
# Copy Nginx config
sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc

# Enable site
sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Set up SSL certificate
sudo certbot --nginx -d orthanc.yourdomain.com
```

**Time:** ~5 minutes

---

## Step 5: Test Everything

```bash
# Test health check
curl https://your-app.vercel.app/api/dental/dicom/health

# Test Orthanc
curl http://localhost:8042/system -u orthanc:password

# Or use test script
./scripts/test-dicom-integration.sh
```

**Expected:** All tests should pass

**Time:** ~2 minutes

---

## Step 6: Configure X-Ray Machines

For each clinic's X-ray machine:

1. **Access machine settings**
2. **Configure DICOM server:**
   - Server: `orthanc.yourdomain.com` (or IP)
   - Port: `4242`
   - AE Title: `NEXREL-CRM`
3. **Test transmission**

**Time:** ~5 minutes per machine

---

## Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Run `deploy-all.sh` | 5-10 min | ⏭️ Ready |
| 2 | Add to Vercel | 5 min | ⏭️ Manual |
| 3 | Configure webhook | 2 min | ⏭️ Manual |
| 4 | Nginx/SSL | 5 min | ⏭️ Optional |
| 5 | Test | 2 min | ⏭️ Ready |
| 6 | X-ray machines | 5 min each | ⏭️ Per clinic |

**Total Time:** ~20-30 minutes (excluding X-ray machine config)

---

## Files Created by Script

After running `deploy-all.sh`:

- ✅ `.env.orthanc.production` - Copy to Vercel
- ✅ `nginx-orthanc.conf` - Copy to Nginx
- ✅ `/tmp/orthanc-webhook.lua` - Copy to Orthanc
- ✅ `.deployment-config.json` - Saved config
- ✅ `docker-compose.orthanc.prod.yml` - Docker config

---

## Troubleshooting

### Script Fails
- Check Docker is installed: `docker --version`
- Check docker-compose: `docker-compose --version`
- Check logs: `docker logs nexrel-orthanc-prod`

### Vercel Issues
- Verify all environment variables are set
- Check variable names match exactly
- Redeploy after adding variables

### Webhook Not Working
- Verify webhook URL is correct
- Check webhook secret matches
- Check Orthanc logs: `docker logs nexrel-orthanc-prod`

---

## Need Help?

- **Full Guide**: `docs/DEPLOYMENT_STEP_BY_STEP.md`
- **Vercel Setup**: `docs/VERCEL_SETUP_GUIDE.md`
- **Orthanc Guide**: `docs/ORTHANC_DEPLOYMENT_GUIDE.md`

---

**Ready to deploy!** 🚀
