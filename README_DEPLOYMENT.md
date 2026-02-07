# 🚀 One-Command Deployment

## Deploy Everything with One Script

```bash
./scripts/deploy-all.sh
```

That's it! The script handles:
- ✅ Prerequisites check
- ✅ Configuration (interactive)
- ✅ Orthanc deployment
- ✅ Environment files
- ✅ Webhook setup
- ✅ Integration testing
- ✅ Summary with next steps

---

## Quick Reference

| Task | Command |
|------|---------|
| **Deploy Everything** | `./scripts/deploy-all.sh` |
| **Test Script** | `./scripts/test-deploy-all.sh` |
| **Deploy Orthanc Only** | `./scripts/setup-orthanc-production.sh` |
| **Configure Webhook** | `./scripts/configure-orthanc-webhook.sh` |
| **Test Integration** | `./scripts/test-dicom-integration.sh` |

---

## What You Need

1. **Server/VPS** with Docker installed
2. **Domain name** for Orthanc (optional, can use IP)
3. **Vercel account** (for Next.js app)
4. **SSH access** to your server

---

## After Running Script

1. Copy `.env.orthanc.production` values to Vercel
2. Set up Nginx (if using domain)
3. Configure webhook in Orthanc UI
4. Configure X-ray machines

See `docs/MASTER_DEPLOYMENT_SCRIPT.md` for details.

---

**Ready to deploy!** 🎉
