# Owner Websites

**Architecture:** Owner websites are **separate from nexrel-crm**. Each website has its own GitHub repo. Commits and deployments happen in the owner's repo.

- **nexrel-crm** = CRM only (do not commit website code here)
- **Darksword Armory** = [soshogle/darksword-armory](https://github.com/soshogle/darksword-armory) — all commits go there

## Structure (Reference/Template)

The `owner-websites/` folder in nexrel-crm may contain templates or references. The actual deployment source is the owner's repo:

```
owner-websites/
├── eyal-darksword/     # Template/reference (deployed from soshogle/darksword-armory)
└── ...
```

## Adding a New Owner

1. Create a new GitHub repo for the owner (e.g. `soshogle/owner2-website`)
2. Clone the darksword-armory template, replace `data/` with new owner's product data
3. Update `.env` with the new owner's Neon database URL and branding
4. Run `pnpm db:push` and `node seed-db.mjs` for the new database
5. Create a new Vercel project connected to the owner's repo

## Deployment

See [../docs/OWNER_WEBSITE_DEPLOYMENT.md](../docs/OWNER_WEBSITE_DEPLOYMENT.md) for Darksword Armory deployment steps.

**Important:** Commits for the website must be made in the owner's repo (`soshogle/darksword-armory`), not in nexrel-crm.
