# Vercel Environment Variables Setup Guide

## Quick Steps

After running `./scripts/deploy-all.sh`, you'll have a `.env.orthanc.production` file.

### Step 1: View Environment Variables

```bash
cat .env.orthanc.production
```

### Step 2: Add to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: **Settings** → **Environment Variables**
4. Add each variable from `.env.orthanc.production`:

| Variable Name | Value (from file) | Environment |
|--------------|-------------------|-------------|
| `ORTHANC_BASE_URL` | `https://orthanc.yourdomain.com` | Production |
| `ORTHANC_USERNAME` | `orthanc` | Production |
| `ORTHANC_PASSWORD` | `<from file>` | Production |
| `DICOM_WEBHOOK_SECRET` | `<from file>` | Production |
| `DICOM_AE_TITLE` | `NEXREL-CRM` | Production |
| `ORTHANC_HOST` | `orthanc.yourdomain.com` | Production |
| `ORTHANC_PORT` | `4242` | Production |

5. Click **Save**
6. **Redeploy** your project

---

## Webhook Configuration

After setting environment variables, configure the webhook in Orthanc:

1. Access Orthanc: `http://localhost:8042` (or your domain)
2. Login with credentials from `.env.orthanc.production`
3. Go to: **Configuration** → **Lua Scripts**
4. Copy script from: `/tmp/orthanc-webhook.lua`
5. Paste into Lua Scripts section
6. Save

---

## Nginx/SSL Setup

If using a domain:

```bash
# Copy Nginx config
sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc

# Enable site
sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Set up SSL
sudo certbot --nginx -d orthanc.yourdomain.com
```

---

**That's it!** Your DICOM integration is now configured.
