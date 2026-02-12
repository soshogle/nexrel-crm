# Vercel Production Deployment

## Issue: Deployments going to Preview instead of Production

Vercel defaults to `main` as the production branch. This project uses `master`, so pushes to `master` were creating **preview** deployments instead of **production**.

---

## Fix: Set Production Branch to `master`

1. **Go to:** [Vercel Project Settings](https://vercel.com/soshogle/nexrel-crm/settings) 
2. In the left sidebar, click **Environments** (not Git)
3. **Find:** "Production Branch" fieldset (not under Git - it's under Environments)
4. **Change to:** `master` and click **Save**

> The Production Branch setting lives in **Environments**, not Git. See [Vercel docs](https://vercel.com/guides/can-i-use-a-non-default-branch-for-production).

After this, every push to `master` will deploy to **production** automatically.

---

## Immediate: Promote current deployment to production

To get the latest code to production right now:

1. **Go to:** https://vercel.com/soshogle/nexrel-crm
2. **Deployments** → click the latest deployment
3. **"..."** (three dots) → **Promote to Production**

---

## CLI: Force production deploy

```bash
npx vercel --prod
```

Requires `vercel` CLI and project linked (`vercel link`).
