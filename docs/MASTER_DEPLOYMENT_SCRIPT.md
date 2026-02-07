# Master Deployment Script Guide

## Overview

The `scripts/deploy-all.sh` script is a **single command** that handles the entire DICOM infrastructure deployment:

1. ✅ Checks prerequisites
2. ✅ Gets configuration (interactive)
3. ✅ Deploys Orthanc server
4. ✅ Creates environment files
5. ✅ Configures webhook script
6. ✅ Tests integration
7. ✅ Prints summary with next steps

---

## Quick Start

### Run the Script

```bash
cd /path/to/nexrel-crm
./scripts/deploy-all.sh
```

That's it! The script will guide you through everything.

---

## What It Does

### Step 1: Prerequisites Check
- ✅ Verifies Docker is installed
- ✅ Verifies docker-compose is installed
- ✅ Verifies curl is installed
- ⚠️ Warns if jq is missing (optional)

### Step 2: Configuration
- Prompts for:
  - Orthanc domain (e.g., `orthanc.yourdomain.com`)
  - API domain (e.g., `your-app.vercel.app`)
  - Orthanc username (default: `orthanc`)
  - Orthanc password (generates random if not provided)
  - Webhook secret (generates random if not provided)
- Saves configuration to `.deployment-config.json`
- Can reuse configuration on subsequent runs

### Step 3: Deploy Orthanc
- Creates necessary directories
- Creates production docker-compose file
- Builds Orthanc container
- Starts Orthanc container
- Waits for Orthanc to be ready
- Verifies deployment

### Step 4: Create Files
- Creates `.env.orthanc.production` (for Vercel)
- Creates `nginx-orthanc.conf` (for Nginx setup)
- Creates webhook Lua script (`/tmp/orthanc-webhook.lua`)

### Step 5: Test Integration
- Tests health check endpoint
- Tests Orthanc connection
- Tests Docker container status
- Provides test summary

### Step 6: Print Summary
- Shows all configuration
- Lists created files
- Provides next steps

---

## Configuration File

The script creates `.deployment-config.json` to save your configuration:

```json
{
  "orthanc_domain": "orthanc.yourdomain.com",
  "api_domain": "your-app.vercel.app",
  "orthanc_username": "orthanc",
  "orthanc_password": "generated-password",
  "webhook_secret": "generated-secret",
  "deployed_at": "2026-02-02T15:30:00Z"
}
```

**To reuse configuration:**
- Run script again
- Choose "y" when asked to use existing configuration

---

## Output Files

After running the script, you'll have:

1. **`.env.orthanc.production`**
   - Environment variables for Vercel
   - Copy these to Vercel Dashboard

2. **`nginx-orthanc.conf`**
   - Nginx configuration for reverse proxy
   - Copy to `/etc/nginx/sites-available/orthanc`

3. **`/tmp/orthanc-webhook.lua`**
   - Webhook Lua script
   - Copy to Orthanc Configuration → Lua Scripts

4. **`docker-compose.orthanc.prod.yml`**
   - Production Docker Compose file
   - Used to manage Orthanc container

5. **`.deployment-config.json`**
   - Saved configuration
   - Used for subsequent runs

---

## Testing the Script

Before deploying, test the script logic:

```bash
./scripts/test-deploy-all.sh
```

This tests:
- ✅ Script syntax
- ✅ Required functions
- ✅ File structure
- ✅ Configuration logic

**Note:** This tests logic only, not actual deployment.

---

## Troubleshooting

### Script Fails at Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Orthanc Fails to Start

```bash
# Check logs
docker logs nexrel-orthanc-prod

# Check if ports are in use
netstat -tulpn | grep -E '4242|8042'

# Restart container
docker restart nexrel-orthanc-prod
```

### Configuration Issues

```bash
# View saved configuration
cat .deployment-config.json

# Delete and reconfigure
rm .deployment-config.json
./scripts/deploy-all.sh
```

---

## Next Steps After Running Script

1. **Set up Nginx** (if using domain):
   ```bash
   sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc
   sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **Set up SSL**:
   ```bash
   sudo certbot --nginx -d orthanc.yourdomain.com
   ```

3. **Configure Webhook in Orthanc**:
   - Access: `http://localhost:8042`
   - Login with credentials from script
   - Go to Configuration → Lua Scripts
   - Copy script from `/tmp/orthanc-webhook.lua`

4. **Add to Vercel**:
   - Copy values from `.env.orthanc.production`
   - Add to Vercel Dashboard → Environment Variables
   - Redeploy

5. **Configure X-Ray Machines**:
   - Point to Orthanc server
   - Port: 4242
   - AE Title: NEXREL-CRM

---

## Script Features

- ✅ **Interactive**: Prompts for all needed information
- ✅ **Smart Defaults**: Generates passwords/secrets if not provided
- ✅ **Error Handling**: Stops on errors, provides helpful messages
- ✅ **Colored Output**: Easy to read success/error messages
- ✅ **Configurable**: Saves config for reuse
- ✅ **Tested**: Includes test script to verify logic
- ✅ **Complete**: Handles entire deployment process

---

## Example Run

```bash
$ ./scripts/deploy-all.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Nexrel CRM DICOM Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Checking Prerequisites
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Docker is installed
✅ docker-compose is installed
✅ curl is installed
✅ All prerequisites met!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Please provide the following information:

Enter Orthanc domain (e.g., orthanc.yourdomain.com): orthanc.example.com
Enter API domain (e.g., your-app.vercel.app): my-app.vercel.app
Enter Orthanc username (default: orthanc): 
Enter Orthanc password (or press Enter for random): 
Generated password: xK9mP2qR8vL3nT7wY5zA1bC4dE6fG8h
Enter webhook secret (or press Enter for random): 
Generated webhook secret: jH5kL9mN2pQ4rS6tU8vW1xY3zA5bC7d

✅ Configuration saved to .deployment-config.json

[... deployment continues ...]

✅ Deployment script completed!
```

---

**Last Updated**: February 2, 2026
**Status**: Ready to Use
