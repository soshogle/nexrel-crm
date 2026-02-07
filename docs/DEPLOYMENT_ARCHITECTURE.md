# Deployment Architecture Explained

## Two-Part System

Your DICOM system has **two components** that need different hosting:

---

## Part 1: Next.js App → Vercel ✅

**What:** Your Next.js application (the CRM with DICOM features)

**Where:** Vercel (or can be deployed there)

**Why Vercel:**
- ✅ Serverless, auto-scaling
- ✅ Easy deployments
- ✅ Built for Next.js
- ✅ Free tier available

**Status:** 
- Can be deployed to Vercel now
- Or may already be there

**What it does:**
- Serves the web interface
- Handles API endpoints (`/api/dental/...`)
- Receives webhooks from Orthanc
- Processes DICOM files

---

## Part 2: Orthanc DICOM Server → Separate Server ⚠️

**What:** Orthanc DICOM server (receives X-ray images)

**Where:** **MUST be on a separate server** (VPS, cloud instance, etc.)

**Why NOT Vercel:**
- ❌ Vercel is serverless (functions, not servers)
- ❌ Can't run long-running processes
- ❌ Can't listen on port 4242 (DICOM port)
- ❌ Can't maintain persistent connections
- ❌ X-ray machines need to connect directly

**Why Separate Server:**
- ✅ Needs to run 24/7
- ✅ Must listen on port 4242 for DICOM
- ✅ Receives direct connections from X-ray machines
- ✅ Stores DICOM files temporarily

**Options:**
1. **VPS** (DigitalOcean, Linode, Vultr) - $5-10/month
2. **AWS EC2** - Pay as you go
3. **Google Cloud Compute** - Pay as you go
4. **Azure VM** - Pay as you go
5. **On-premise server** - If you have one

---

## How They Connect

```
┌─────────────────┐
│  X-Ray Machine  │
│  (Carestream,   │
│   Planmeca)     │
└────────┬────────┘
         │ DICOM C-STORE (Port 4242)
         │ Direct connection
         ▼
┌─────────────────┐
│  Orthanc Server │ ← Separate Server (VPS/Cloud)
│  (Port 4242)    │   - Runs 24/7
│  (Port 8042)    │   - Receives DICOM files
└────────┬────────┘
         │ REST API Webhook (HTTPS)
         │ Calls Next.js API
         ▼
┌─────────────────┐
│  Next.js App    │ ← Vercel
│  (Vercel)       │   - Serverless
│  /api/dental/   │   - Handles webhooks
└─────────────────┘
```

---

## Current Status

### Next.js App
- ✅ **Code:** Ready
- ⏭️ **Deployment:** Can deploy to Vercel now
- ⏭️ **Status:** May already be on Vercel (check your Vercel dashboard)

### Orthanc Server
- ✅ **Code:** Ready (Docker setup)
- ❌ **Deployment:** Needs separate server
- ⏭️ **Status:** Not deployed yet

---

## What You Need

### Option 1: Deploy Orthanc to VPS (Recommended)

**Get a VPS:**
- DigitalOcean Droplet ($5-10/month)
- Linode ($5/month)
- Vultr ($2.50/month)
- AWS EC2 (pay as you go)

**Then:**
```bash
# SSH into your VPS
ssh user@your-server.com

# Clone repo and deploy
git clone <your-repo>
cd nexrel-crm
./scripts/deploy-all.sh
```

### Option 2: Use Existing Server

If you already have a server:
```bash
# Just run the script
./scripts/deploy-all.sh
```

---

## Cost Estimate

| Component | Hosting | Cost |
|-----------|---------|------|
| Next.js App | Vercel | Free (or $20/month Pro) |
| Orthanc Server | VPS | $5-10/month |
| **Total** | | **$5-10/month** |

---

## Quick Setup Options

### Option A: DigitalOcean (Easiest)

1. **Create Droplet:**
   - Go to: https://www.digitalocean.com
   - Create Droplet ($5/month)
   - Choose Ubuntu
   - Add SSH key

2. **Deploy:**
   ```bash
   ssh root@your-droplet-ip
   git clone <your-repo>
   cd nexrel-crm
   ./scripts/deploy-all.sh
   ```

### Option B: AWS EC2

1. **Launch Instance:**
   - Go to: AWS Console → EC2
   - Launch t2.micro (free tier)
   - Choose Ubuntu

2. **Deploy:**
   ```bash
   ssh -i your-key.pem ubuntu@ec2-ip
   git clone <your-repo>
   cd nexrel-crm
   ./scripts/deploy-all.sh
   ```

---

## Summary

- **Next.js App:** ✅ Can be on Vercel (or already is)
- **Orthanc Server:** ⚠️ Needs separate server (VPS/cloud)
- **Why:** Vercel can't run Orthanc (serverless limitation)
- **Cost:** ~$5-10/month for VPS

---

## Next Steps

1. **Check if Next.js is on Vercel:**
   - Go to: https://vercel.com/dashboard
   - See if your project is there

2. **Get a VPS for Orthanc:**
   - Choose provider (DigitalOcean recommended)
   - Create instance
   - Run `./scripts/deploy-all.sh`

3. **Connect them:**
   - Set environment variables in Vercel
   - Configure webhook

---

**Questions?** The architecture is: **Vercel (Next.js) + VPS (Orthanc)**
