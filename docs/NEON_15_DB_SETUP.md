# Create 15 Neon DBs and Run Migrations

Step-by-step guide to create 1 Meta + 14 Industry databases in Neon, get pooled connection strings, and run Prisma migrations.

---

## Option A: Neon Console (Manual)

### 1. Create 15 projects

1. Go to [console.neon.tech](https://console.neon.tech)
2. For each DB below, click **New Project**:
   - Name: `nexrel-meta` (User, Session, Account, Agency)
   - Name: `nexrel-accounting`
   - Name: `nexrel-restaurant`
   - Name: `nexrel-sports-club`
   - Name: `nexrel-construction`
   - Name: `nexrel-law`
   - Name: `nexrel-medical`
   - Name: `nexrel-dentist`
   - Name: `nexrel-medical-spa`
   - Name: `nexrel-optometrist`
   - Name: `nexrel-health-clinic`
   - Name: `nexrel-real-estate`
   - Name: `nexrel-hospital`
   - Name: `nexrel-technology`
   - Name: `nexrel-orthodontist`

3. Each project gets a default branch with a database. No extra setup needed.

### 2. Get pooled connection strings

For **each project**:

1. Open the project → **Dashboard**
2. Click **Connect** (or Connection details)
3. Enable **Connection pooling** (toggle on)
4. Copy the connection string – it will look like:
   ```
   postgresql://user:pass@ep-xxx-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   The `-pooler` in the hostname means it uses PgBouncer (recommended for Vercel).

5. Map each URL to the correct env var:

| Project            | Env var                    |
|--------------------|----------------------------|
| nexrel-meta        | `DATABASE_URL_META`        |
| nexrel-accounting  | `DATABASE_URL_ACCOUNTING`  |
| nexrel-restaurant  | `DATABASE_URL_RESTAURANT`  |
| nexrel-sports-club | `DATABASE_URL_SPORTS_CLUB` |
| nexrel-construction| `DATABASE_URL_CONSTRUCTION`|
| nexrel-law         | `DATABASE_URL_LAW`         |
| nexrel-medical     | `DATABASE_URL_MEDICAL`     |
| nexrel-dentist     | `DATABASE_URL_DENTIST`     |
| nexrel-medical-spa  | `DATABASE_URL_MEDICAL_SPA` |
| nexrel-optometrist | `DATABASE_URL_OPTOMETRIST` |
| nexrel-health-clinic| `DATABASE_URL_HEALTH_CLINIC`|
| nexrel-real-estate | `DATABASE_URL_REAL_ESTATE` |
| nexrel-hospital    | `DATABASE_URL_HOSPITAL`    |
| nexrel-technology  | `DATABASE_URL_TECHNOLOGY`  |
| nexrel-orthodontist| `DATABASE_URL_ORTHODONTIST`|

### 3. Set env vars

**Local (.env):**

```bash
# Keep existing DATABASE_URL as source (for migration) or point to Meta
DATABASE_URL="postgresql://..."   # Your current/source DB

DATABASE_URL_META="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_REAL_ESTATE="postgresql://..."
DATABASE_URL_MEDICAL="postgresql://..."
# ... etc for all 15
```

**Vercel:**

1. Project → Settings → Environment Variables
2. Add each `DATABASE_URL_*` (Production, Preview, Development as needed)
3. Use the **pooled** connection strings for serverless

---

## Option B: Neon API (Scripted)

If you have a Neon API key:

```bash
# Install Neon CLI
npm i -g neonctl

# Auth
neon auth
# or: export NEON_API_KEY=your-key

# Create projects (example for one)
neon projects create --name nexrel-meta
# Repeat for all 15, or use the API directly
```

See [Neon API Reference](https://api-docs.neon.tech/) for `POST /projects`.

---

## Run migrations on each DB

Use the script:

```bash
npx tsx scripts/migrate-all-dbs.ts
```

This runs `prisma migrate deploy` against each `DATABASE_URL_*` set in your `.env`.

**Or manually:**

```bash
# Meta
DATABASE_URL="$DATABASE_URL_META" npx prisma migrate deploy

# Each industry
DATABASE_URL="$DATABASE_URL_REAL_ESTATE" npx prisma migrate deploy
DATABASE_URL="$DATABASE_URL_MEDICAL" npx prisma migrate deploy
# ... etc
```

**Note:** Use **direct** (non-pooled) connection strings for migrations if you hit PgBouncer limits. Prisma migrate usually works with pooled connections; if it fails, switch to the direct URL from Neon (Connection pooling toggle off).

---

## Pooled vs direct

| Use case              | Connection type |
|-----------------------|-----------------|
| Vercel / serverless   | **Pooled** (host contains `-pooler`) |
| Migrations            | Direct or pooled (direct if issues)   |
| Long-running scripts  | Direct or pooled                     |

To get a direct URL in Neon: turn **Connection pooling** off and copy the connection string.

---

## Checklist

- [ ] 15 Neon projects created
- [ ] Pooled connection strings copied for each
- [ ] `.env` updated with all `DATABASE_URL_*`
- [ ] Vercel env vars set (if deploying)
- [ ] `npx tsx scripts/migrate-all-dbs.ts` run successfully
