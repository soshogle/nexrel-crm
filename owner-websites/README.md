# Owner Websites

Each owner gets their own e-commerce site in a subdirectory. All sites share the same codebase; each has its own data and branding.

## Structure

```
owner-websites/
├── eyal-darksword/     # Darksword Armory (eyal@darksword-armory.com)
├── owner2-site/        # Future owner
└── owner3-site/       # Future owner
```

## Adding a New Owner

1. Copy an existing site folder (e.g. `eyal-darksword`) to a new folder (e.g. `owner2-site`)
2. Replace the `data/` folder with the new owner's product data
3. Update `.env` with the new owner's Neon database URL and branding
4. Run `pnpm db:push` and `node seed-db.mjs` for the new database
5. Create a new Vercel project pointing to this subdirectory

## Deployment

See [eyal-darksword/DEPLOYMENT.md](eyal-darksword/DEPLOYMENT.md) for Darksword Armory deployment steps.
