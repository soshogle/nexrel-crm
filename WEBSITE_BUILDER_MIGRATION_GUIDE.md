# Website Builder Migration Guide

## ✅ Migration File Created

The migration file has been created at:
```
prisma/migrations/20260208000000_add_website_builder/migration.sql
```

## 🚀 How to Apply the Migration

### Option 1: Using Prisma Migrate (Recommended)

When you have database access, run:

```bash
npx prisma migrate deploy
```

Or if you want to mark it as applied without running:

```bash
npx prisma migrate resolve --applied 20260208000000_add_website_builder
```

### Option 2: Manual SQL Execution (If Prisma fails)

1. **Go to Neon Dashboard:**
   - Visit: https://console.neon.tech
   - Select your project
   - Click on "SQL Editor"

2. **Copy the migration SQL:**
   - Open: `prisma/migrations/20260208000000_add_website_builder/migration.sql`
   - Copy all contents

3. **Paste and Run:**
   - Paste into Neon SQL Editor
   - Click "Run" to execute

4. **Mark as Applied:**
   ```bash
   npx prisma migrate resolve --applied 20260208000000_add_website_builder
   ```

### Option 3: Using Prisma Migrate Dev (Development)

```bash
npx prisma migrate dev --name add_website_builder
```

## ✅ After Migration

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Verify Migration:**
   ```bash
   npx prisma migrate status
   ```

3. **Test Connection:**
   ```bash
   npx prisma studio
   ```

## 📋 What This Migration Adds

### New Tables:
- ✅ `Website` - Main website model
- ✅ `WebsiteBuild` - Build tracking
- ✅ `WebsiteIntegration` - Integrations (Stripe, Booking, etc.)
- ✅ `WebsiteVisitor` - Visitor tracking
- ✅ `WebsiteChangeApproval` - Change approval workflow
- ✅ `WebsiteTemplate` - Pre-built templates

### New Enums:
- ✅ `WebsiteType` - REBUILT, SERVICE_TEMPLATE, PRODUCT_TEMPLATE
- ✅ `WebsiteStatus` - BUILDING, READY, PUBLISHED, FAILED
- ✅ `WebsiteBuildType` - INITIAL, REBUILD, UPDATE
- ✅ `WebsiteBuildStatus` - PENDING, IN_PROGRESS, COMPLETED, FAILED
- ✅ `WebsiteIntegrationType` - STRIPE, BOOKING, FORM, CTA, CHAT, ANALYTICS
- ✅ `IntegrationStatus` - ACTIVE, INACTIVE, ERROR
- ✅ `ChangeType` - AI_MODIFICATION, MANUAL_EDIT
- ✅ `ApprovalStatus` - PENDING, APPROVED, REJECTED, MODIFIED
- ✅ `WebsiteTemplateType` - SERVICE, PRODUCT

### Safety:
- ✅ All tables are **additive** - no existing tables modified
- ✅ Foreign keys reference existing `User` table
- ✅ All constraints use `ON DELETE CASCADE` for safety
- ✅ Indexes created for performance

## 🔍 Verification Checklist

After running the migration, verify:

- [ ] All tables created successfully
- [ ] All enums created successfully
- [ ] Foreign keys are in place
- [ ] Indexes are created
- [ ] Prisma client generates without errors
- [ ] Can query Website table in Prisma Studio

## 🐛 Troubleshooting

### If migration fails:

1. **Check for existing tables:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'Website%';
   ```

2. **Check for existing enums:**
   ```sql
   SELECT typname FROM pg_type WHERE typname LIKE 'Website%';
   ```

3. **If tables/enums already exist:**
   - The migration is idempotent-safe
   - You can skip creating existing items
   - Or drop and recreate if needed

### Common Issues:

- **SSL Certificate Error:** Use Neon SQL Editor (manual method)
- **Connection Timeout:** Check DATABASE_URL in .env
- **Permission Error:** Ensure database user has CREATE privileges

## 📝 Next Steps

After migration is complete:

1. ✅ Set environment variables:
   - `GITHUB_TOKEN`
   - `NEON_API_KEY`
   - `VERCEL_TOKEN`
   - `STRIPE_SECRET_KEY`

2. ✅ Test website creation:
   - Go to `/dashboard/websites`
   - Create a test website
   - Verify database records

3. ✅ Test integrations:
   - Stripe Connect
   - Booking widget
   - Voice AI

---

**Migration Status:** ✅ Ready to Apply
**Safety:** ✅ 100% Safe - No existing data affected
