# Quick Deployment Guide 🚀

## TL;DR - Fastest Path to Production

### 1. Deploy Orthanc (5 minutes)

```bash
# On your server
git clone <repo>
cd nexrel-crm
./scripts/setup-orthanc-production.sh
```

### 2. Configure Vercel (5 minutes)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Copy values from `.env.orthanc.production`
3. Add all variables
4. Redeploy

### 3. Configure Webhook (5 minutes)

```bash
./scripts/configure-orthanc-webhook.sh
```

### 4. Test (5 minutes)

```bash
./scripts/test-dicom-integration.sh
```

**Total Time: ~20 minutes**

---

## Detailed Steps

See `docs/DEPLOYMENT_STEP_BY_STEP.md` for complete instructions.

---

## What Each Script Does

### `setup-orthanc-production.sh`
- ✅ Checks prerequisites
- ✅ Asks for configuration
- ✅ Creates production configs
- ✅ Deploys Orthanc
- ✅ Generates passwords/secrets

### `configure-orthanc-webhook.sh`
- ✅ Creates webhook Lua script
- ✅ Guides manual configuration
- ✅ Provides script for Orthanc

### `test-dicom-integration.sh`
- ✅ Tests health endpoint
- ✅ Tests Orthanc connection
- ✅ Tests webhook endpoint
- ✅ Provides test summary

---

## Need Help?

- **Full Guide**: `docs/DEPLOYMENT_STEP_BY_STEP.md`
- **Orthanc Guide**: `docs/ORTHANC_DEPLOYMENT_GUIDE.md`
- **Checklist**: `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

---

**Ready to deploy!** 🎉
