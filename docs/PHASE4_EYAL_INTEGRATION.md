# Phase 4: Eyal's Darksword Armory Integration

Integrate Eyal's site into the CRM products system **without affecting his live site**.

## Prerequisites

- [ ] **Backup first:** `npx tsx scripts/phase0-backup-eyal-darksword.ts`
- [ ] His site stays live at https://darksword-armory.vercel.app

---

## 4a – Prep (CRM)

```bash
npx tsx scripts/phase4a-eyal-website-secret.ts
```

- Adds `websiteSecret` to his Website record
- Prints env vars for 4c
- Exclusion stays in place

---

## 4b – Code (Sync to darksword-armory repo)

The products API is now in `owner-websites/eyal-darksword/`:

- `server/nexrel-products-api.ts` – REST API at `/api/nexrel/products`
- `server/db.ts` – added `createProduct`, `deleteProduct`
- `server/_core/index.ts` – registers the routes

**Sync to live repo:**

1. Copy these changes to `soshogle/darksword-armory`
2. Deploy to a **preview branch** first (e.g. `git checkout -b phase4-products-api`)
3. Push and let Vercel create a preview deployment
4. Test the preview URL: `GET https://darksword-armory-git-phase4-xxx.vercel.app/api/nexrel/products` (with x-website-secret header)
5. If OK, merge to main and deploy to production

---

## 4c – Env (Vercel)

Add to Eyal's Vercel project (darksword-armory) → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `WEBSITE_SECRET` | From 4a script output |
| `NEXREL_CRM_URL` | https://www.nexrel.soshogle.com |
| `NEXREL_WEBSITE_ID` | `cmlkk9awe0002puiqm64iqw7t` |
| `WEBSITE_VOICE_CONFIG_SECRET` | Same as WEBSITE_SECRET (for voice config fetch) |

Apply to **Production**, **Preview**, **Development**.

### Voice AI (optional)

To enable the Voice AI expert (Theodora-style UI, swordsman prompt):

1. **CRM:** Run `npx tsx scripts/enable-eyal-voice-ai.ts` to enable voice on Eyal's website
2. **Vercel:** Add `WEBSITE_VOICE_CONFIG_SECRET` (same value as WEBSITE_SECRET)
3. The floating voice bubble will appear; visitors can ask about swords, armor, metallurgy in any language

---

## 4d – Enable (CRM)

When 4b and 4c are done and tested on preview:

```bash
# In CRM .env
EYAL_PRODUCTS_API_ENABLED=true
```

Then redeploy the CRM. The products proxy will stop excluding Eyal's site.

To disable: set `EYAL_PRODUCTS_API_ENABLED=false` or remove it.

---

## 4e – Validate

1. Log in to CRM as Eyal
2. Go to Websites → Darksword Armory → Products tab
3. Verify products load
4. Test edit (change a product name, save)
5. Verify live site still works: https://darksword-armory.vercel.app
6. Verify products, cart, checkout unchanged for users

---

## Rollback

If anything breaks:

1. Set `EYAL_PRODUCTS_API_ENABLED=false` in CRM
2. Revert code in darksword-armory repo
3. Restore from `backups/eyal-darksword-crm-YYYYMMDD.json` if needed
