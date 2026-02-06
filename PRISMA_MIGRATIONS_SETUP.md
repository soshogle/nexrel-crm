# Prisma Migrations Setup Guide

## ✅ Migration System Status

**Status:** Properly configured and ready for use

**Current State:**
- ✅ Baseline migration created: `20260205231643_baseline`
- ✅ Migration marked as applied (database already matches schema)
- ✅ Migration lock file configured
- ✅ All dental Phase 1 tables included in baseline

---

## 📋 How Migrations Work Now

### Development Workflow

When you make schema changes:

1. **Edit `prisma/schema.prisma`** - Make your changes
2. **Create migration:**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```
   This will:
   - Create a new migration file in `prisma/migrations/`
   - Apply it to your development database
   - Generate the Prisma client

3. **Commit migration files** - Add the new migration folder to git

### Production Workflow

1. **Deploy code** - Including new migration files
2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```
   This applies only new migrations (safe, won't re-run old ones)

---

## 🗂️ Migration Files Structure

```
prisma/
├── migrations/
│   ├── migration_lock.toml          # Database provider lock
│   ├── 20260205231643_baseline/     # Baseline (all current tables)
│   │   └── migration.sql
│   └── [future migrations]/          # Future changes
│       └── migration.sql
└── schema.prisma                     # Current schema
```

---

## 🔧 Common Commands

### Check Migration Status
```bash
npx prisma migrate status
```
Shows which migrations are applied and which are pending.

### Create New Migration
```bash
npx prisma migrate dev --name add_new_feature
```
Creates and applies a new migration.

### Apply Migrations (Production)
```bash
npx prisma migrate deploy
```
Applies pending migrations without creating new ones.

### Reset Database (Development Only!)
```bash
npx prisma migrate reset
```
⚠️ **WARNING:** This deletes all data! Only use in development.

### Generate Prisma Client
```bash
npx prisma generate
```
Regenerates the Prisma client after schema changes.

---

## 📊 What's in the Baseline Migration

The baseline migration (`20260205231643_baseline`) includes:

- ✅ All existing tables (User, Lead, Deal, etc.)
- ✅ All existing enums
- ✅ **All dental Phase 1 tables:**
  - DentalOdontogram
  - DentalPeriodontalChart
  - DentalTreatmentPlan
  - DentalProcedure
  - DentalForm
  - DentalFormResponse
- ✅ **All Law 25 document storage tables:**
  - PatientDocument
  - DocumentVersion
  - DocumentConsent
  - DocumentAccessLog
  - DataAccessRequest
  - DataBreach
- ✅ All indexes and relationships

---

## 🚀 Next Steps

### For New Schema Changes:

1. **Edit `prisma/schema.prisma`**
2. **Run:** `npx prisma migrate dev --name descriptive_name`
3. **Commit** the new migration folder
4. **Deploy** - Migrations will run automatically in production

### Example: Adding a New Field

```bash
# 1. Edit schema.prisma - add new field to Lead model
# 2. Create migration
npx prisma migrate dev --name add_phone_verified_to_lead

# 3. Commit the new migration folder
git add prisma/migrations/
git commit -m "Add phoneVerified field to Lead"
```

---

## ⚠️ Important Notes

### Never Edit Existing Migrations

- ✅ **DO:** Create new migrations for changes
- ❌ **DON'T:** Edit existing migration files
- ❌ **DON'T:** Delete migration files (unless resetting)

### Migration History is Important

- Migrations are tracked in the database
- Each migration is numbered and timestamped
- Production uses `migrate deploy` (safer than `db push`)

### Development vs Production

- **Development:** Use `prisma migrate dev` (creates + applies)
- **Production:** Use `prisma migrate deploy` (applies only)
- **Never use:** `prisma db push` in production (no history)

---

## 🔍 Troubleshooting

### "Migration already applied" Error

If you see this, the migration is already in the database. This is normal if you've already synced the schema.

### "Drift detected" Warning

This means your database doesn't match your migrations. To fix:
1. Check what's different: `npx prisma migrate status`
2. Create a new migration to sync: `npx prisma migrate dev --name fix_drift`

### Migration Failed Mid-Way

1. Check the error message
2. Fix the issue in your schema
3. Create a new migration: `npx prisma migrate dev --name fix_issue`
4. The failed migration will be marked, new one will apply

---

## 📚 Additional Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Migration Best Practices](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [Production Migrations](https://www.prisma.io/docs/guides/database/production-troubleshooting)

---

## ✅ Migration System Verified

- ✅ Baseline migration created and marked as applied
- ✅ Migration lock file configured
- ✅ Database schema matches migrations
- ✅ Ready for future migrations

**Last Updated:** After dental Phase 1 migration setup
