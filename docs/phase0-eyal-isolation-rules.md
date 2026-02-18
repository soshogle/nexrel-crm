# Phase 0: Eyal's Darksword Armory — Isolation Rules

**Purpose:** Ensure Eyal's live Darksword Armory site is never affected by ecommerce automation implementation.

---

## Protected Site

| Field | Value |
|-------|-------|
| **Website ID** | `cmlkk9awe0002puiqm64iqw7t` |
| **Owner** | eyal@darksword-armory.com |
| **Owner Name** | Eyal Azerad |
| **Live URL** | https://darksword-armory.vercel.app |
| **Deployment** | soshogle/darksword-armory (owner's repo) |
| **Template Type** | PRODUCT |
| **Product Count** | 367 |
| **Page Count** | 26 |
| **CRM Lookup** | `user.email = 'eyal@darksword-armory.com'` |

---

## Isolation Rules (MUST NOT)

1. **No automatic changes** to Eyal's Website record
2. **No provisioning** for his site (no Neon create, no Vercel create)
3. **No migrations** on his database
4. **No code changes** to his deployed site
5. **No env var changes** on his Vercel project
6. **No inclusion** in any bulk/automated operations

---

## Implementation Safeguards

When adding provisioning, migrations, or automation:

- **Exclude by owner email:** Skip if `website.user.email === 'eyal@darksword-armory.com'`
- **Exclude by website ID:** Skip if `website.id === 'cmlkk9awe0002puiqm64iqw7t'`
- **Exclude by URL:** Skip if `vercelDeploymentUrl` contains `darksword-armory.vercel.app`
- **Opt-in only:** New features (e.g. Products API) apply only to sites explicitly opted in

```ts
// Example exclusion check
const EYAL_DARKSWORD_WEBSITE_ID = 'cmlkk9awe0002puiqm64iqw7t';
if (websiteId === EYAL_DARKSWORD_WEBSITE_ID) return; // Skip
```

---

## Backup Location

Backups created by `npx tsx scripts/phase0-backup-eyal-darksword.ts`:

- `backups/eyal-darksword-state-YYYYMMDD.json` — State snapshot
- `backups/eyal-darksword-crm-YYYYMMDD.json` — CRM website record
- `backups/eyal-darksword-products-YYYYMMDD.json` — Products and pages

---

## Rollback

If any change accidentally affects Eyal's site:

1. Restore from `backups/eyal-darksword-crm-YYYYMMDD.json` (CRM data)
2. Revert code changes
3. If his Neon DB was modified: restore from Neon's point-in-time recovery (owner must do this)

---

## Last Updated

Phase 0 — Pre-implementation backup and isolation rules.
